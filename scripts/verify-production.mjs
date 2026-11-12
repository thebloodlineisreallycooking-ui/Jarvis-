import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function npm(args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`npm ${args.join(' ')} failed (${code}): ${output}`)));
  });
}
async function unusedPort() {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}

// Runs exclusively against disposable files and credentials. Never accepts a DB
// path or owner credentials from the caller/environment.
export async function startTestServer(root) {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-local-test-'));
  const port = await unusedPort();
  const credentials = { username: 'verification_owner', password: randomBytes(24).toString('base64url') };
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port), DATABASE_PATH: join(directory, 'test.db'),
    JARVIS_OWNER_USERNAME: credentials.username, JARVIS_OWNER_PASSWORD: credentials.password };
  const url = `http://127.0.0.1:${port}`;
  let processHandle;
  let output = '';
  async function stop() {
    const child = processHandle;
    processHandle = undefined;
    if (!child || child.exitCode !== null) return;
    const stopped = new Promise(resolve => child.once('exit', resolve));
    try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    await stopped;
  }
  async function start() {
    output = '';
    processHandle = spawn('npm', ['start'], { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    processHandle.stdout.on('data', chunk => { output += chunk; });
    processHandle.stderr.on('data', chunk => { output += chunk; });
    for (let attempt = 0; attempt < 200; attempt++) {
      if (processHandle.exitCode !== null) throw new Error(`Production process exited (${processHandle.exitCode}): ${output}`);
      try { if ((await fetch(`${url}/api/health`)).ok) return; } catch { /* Server is starting. */ }
      await delay(100);
    }
    throw new Error('Timed out waiting for local production startup');
  }
  async function close() { await stop(); await rm(directory, { recursive: true, force: true }); }
  try { await start(); }
  catch (error) { await close(); throw error; }
  return { url, credentials, directory, restart: async () => { await stop(); await start(); }, close };
}

async function verify() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const runtime = await mkdtemp(join(tmpdir(), 'jarvis-production-install-'));
  let server;
  try {
    // One source checkout; this disposable runtime copy contains no git, secrets,
    // production data, logs, screenshots or generated output from earlier runs.
    for (const path of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'server', 'shared', 'web']) {
      await cp(join(root, path), join(runtime, path), { recursive: true });
    }
    const env = { ...process.env, NODE_ENV: 'production' };
    console.log('Production verification: clean npm ci --include=dev');
    await npm(['ci', '--include=dev'], runtime, env);
    console.log('Production verification: npm run build');
    await npm(['run', 'build'], runtime, env);
    console.log('Production verification: remove dev dependencies, then npm start');
    await npm(['prune', '--omit=dev'], runtime, env);
    server = await startTestServer(runtime);
    assert.equal((await fetch(server.url)).status, 200);
    const login = await fetch(`${server.url}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(server.credentials) });
    assert.equal(login.status, 200);
    const cookieHeader = login.headers.get('set-cookie');
    assert.match(cookieHeader, /HttpOnly/i); assert.match(cookieHeader, /Secure/i); assert.match(cookieHeader, /SameSite=Strict/i);
    const headers = { cookie: cookieHeader.split(';')[0], 'content-type': 'application/json' };
    const command = await fetch(`${server.url}/api/commands`, { method: 'POST', headers, body: JSON.stringify({ text: 'Add a task to verify production restart', mode: 'live' }) });
    assert.equal(command.status, 201);
    const saved = await command.json();
    assert.deepEqual(saved.messages.map(message => message.role), ['user', 'assistant']);
    await server.restart();
    const tasks = await (await fetch(`${server.url}/api/tasks`, { headers })).json();
    const messages = await (await fetch(`${server.url}/api/messages`, { headers })).json();
    assert.equal(tasks.tasks[0].title, 'verify production restart');
    assert.deepEqual(messages.messages, saved.messages);
    const demo = await fetch(`${server.url}/api/commands`, { method: 'POST', headers, body: JSON.stringify({ text: 'Add a task to temporary demo', mode: 'demo' }) });
    assert.equal(demo.status, 200);
    assert.equal((await demo.json()).persisted, false);
    assert.equal((await (await fetch(`${server.url}/api/tasks`, { headers })).json()).tasks.length, 1);
    assert.equal((await fetch(`${server.url}/api/auth/register`, { method: 'POST', headers, body: JSON.stringify(server.credentials) })).status, 404);
    assert.equal((await fetch(`${server.url}/api/auth/logout`, { method: 'POST', headers })).status, 204);
    assert.equal((await fetch(`${server.url}/api/tasks`, { headers })).status, 401);
    console.log('PASS: production install/build/start without dev dependencies, static page, health, owner login, secure cookie, Live save, process restart, message order, Demo isolation, closed registration and logout.');
  } finally {
    if (server) await server.close();
    await rm(runtime, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  verify().catch(error => { console.error(error.message); process.exitCode = 1; });
}
