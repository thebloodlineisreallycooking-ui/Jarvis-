// Explicit temporary Render Start Command. Never starts JARVIS or migrations.
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, lstatSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { assertNoDatabaseUsers, createBackup, loadDatabase, privateDirectory, productionConfiguration, restoreBackup, runtimeStatus, verifyBackup } from './database.mjs';

export async function startMaintenance(config, { port = Number(process.env.PORT || 10000), Database, expectedOwner } = {}) {
  privateDirectory(config.ops);
  const token = randomBytes(32).toString('hex');
  let busy = false;
  const publicServer = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET' && req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'maintenance', applicationStarted: false }));
    }
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '300' });
    res.end('JARVIS är tillfälligt stängd för underhåll.');
  });
  // Bind the real service port first. A second maintenance process cannot steal
  // the private control file while the existing server is still on this port.
  await new Promise((resolve, reject) => { publicServer.once('error', reject); publicServer.listen(port, '0.0.0.0', resolve); });
  const control = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    const respond = (status, value) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    if (req.headers.authorization !== `Bearer ${token}`) return respond(401, { error: 'Local control authentication required' });
    if (req.method === 'GET' && req.url === '/status') return respond(200, { ...runtimeStatus(config), busy });
    if (req.method !== 'POST' || req.url !== '/operation') return respond(404, { error: 'Not found' });
    if (busy) return respond(409, { error: 'Another operation is running' });
    busy = true;
    try {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 1024) throw new Error('Request too large'); }
      const input = JSON.parse(body);
      if (input.confirmService !== config.serviceId) throw new Error('Explicit service confirmation required');
      if (!['backup', 'capture', 'verify', 'restore'].includes(input.action)) throw new Error('Unsupported operation');
      assertNoDatabaseUsers(config);
      const Driver = Database || loadDatabase();
      let result;
      if (input.action === 'backup' || input.action === 'capture') result = await createBackup(config, Driver, { release: input.action === 'backup', expectedOwner });
      else if (input.action === 'restore') result = await restoreBackup(config, Driver, input.id);
      else {
        const { manifest } = await verifyBackup(config, Driver, input.id);
        result = { verified: true, id: input.id, sha256: manifest.sha256, bytes: manifest.bytes, schema: manifest.schema };
      }
      respond(200, result);
    } catch (error) {
      // Never serialize SQLite errors/rows, credentials, or request contents.
      const safe = error.code ? `Operation failed (${error.code}). No application was started.` : error.message;
      respond(400, { error: safe, applicationStarted: false });
    } finally { busy = false; }
  });
  try {
    if (existsSync(config.controlFile)) {
      const info = lstatSync(config.controlFile);
      if (!info.isFile() || info.isSymbolicLink() || info.uid !== process.getuid()) throw new Error('Unsafe control file');
      unlinkSync(config.controlFile);
    }
    await new Promise((resolve, reject) => { control.once('error', reject); control.listen(0, '127.0.0.1', resolve); });
    writeFileSync(config.controlFile, JSON.stringify({ port: control.address().port, token }), { flag: 'wx', mode: 0o600 });
  } catch (error) { publicServer.close(); control.close(); throw error; }
  return { publicServer, control, close: async () => {
    await Promise.all([publicServer, control].map(server => new Promise(resolve => server.close(resolve))));
  } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = productionConfiguration();
  process.umask(0o077);
  const servers = await startMaintenance(config, { expectedOwner: process.env.JARVIS_OWNER_USERNAME });
  console.log('JARVIS maintenance listener ready; application and migrations are not started.');
  // On Render restart, this same Start Command starts maintenance again.
  // SIGTERM does not run an application fallback. Interrupted restore stays
  // journaled and the same restore command resumes it after maintenance restarts.
  const stop = () => { servers.close().finally(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref(); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
