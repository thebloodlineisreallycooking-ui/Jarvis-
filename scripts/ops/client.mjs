// Invoke only through authenticated loopback control, never the public site.
import http from 'node:http';
import { lstatSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { productionConfiguration, SERVICE_ID } from './database.mjs';

export function operation(controlFile, action, id, confirmService) {
  return new Promise((resolve, reject) => {
    const info = lstatSync(controlFile);
    if (!info.isFile() || info.isSymbolicLink() || info.uid !== process.getuid() || (info.mode & 0o777) !== 0o600) throw new Error('Unsafe control file permissions');
    const { port, token } = JSON.parse(readFileSync(controlFile, 'utf8'));
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid local control endpoint');
    const body = action === 'status' ? null : JSON.stringify({ action, id, confirmService });
    const req = http.request({ hostname: '127.0.0.1', port, path: body ? '/operation' : '/status', method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}) } }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; if (data.length > 16384) req.destroy(new Error('Unexpected response size')); });
      res.on('end', () => {
        try { const value = JSON.parse(data); if (res.statusCode !== 200) reject(new Error(value.error || 'Operation failed')); else resolve(value); }
        catch (error) { reject(error); }
      });
    });
    req.on('error', reject); req.end(body);
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [action, id, confirmation] = process.argv.slice(2);
  const config = productionConfiguration();
  if (!['status', 'backup', 'capture', 'verify', 'restore'].includes(action)) throw new Error('Use status, backup, capture, verify or restore');
  const needsId = action === 'restore' || action === 'verify';
  const confirm = needsId ? confirmation : id;
  if (action !== 'status' && confirm !== SERVICE_ID) throw new Error(`Append the exact service ID ${SERVICE_ID}`);
  try { console.log(JSON.stringify(await operation(config.controlFile, action, needsId ? id : undefined, confirm), null, 2)); }
  catch (error) {
    console.error(error.message);
    console.error('Operation did not complete. Keep maintenance enabled. Do not retry by restarting JARVIS.');
    process.exitCode = 1;
  }
}
