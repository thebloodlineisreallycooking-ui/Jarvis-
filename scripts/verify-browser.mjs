import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import https from 'node:https';
import http from 'node:http';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTestServer } from './verify-production.mjs';

// Playwright is a verification tool, not an app/runtime dependency. Install it
// externally and set PLAYWRIGHT_MODULE to its index.js when it is not resolvable.
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(process.env.JARVIS_REVIEW_OUTPUT || '/tmp/jarvis-etapp-1-review');
assert.ok(!output.startsWith(`${root}/`) && output !== root, 'Keep screenshots and reports outside the repository');
await mkdir(output, { recursive: true });
const server = await startTestServer(root);
let proxy;
let browser;
const findings = [];
const issues = [];
try {
  const keyFile = join(server.directory, 'local-key.pem');
  const certFile = join(server.directory, 'local-cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
  proxy = https.createServer({ key: await readFile(keyFile), cert: await readFile(certFile) }, (req, res) => {
    const upstream = http.request(`${server.url}${req.url}`, { method: req.method, headers: req.headers }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(upstream);
  });
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const origin = `https://127.0.0.1:${proxy.address().port}`;
  const engineNames = (process.env.JARVIS_REVIEW_ENGINES || 'chromium,webkit').split(',');
  for (const engineName of engineNames) {
    browser = await ({ chromium, webkit }[engineName]).launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => issues.push({ engineName, message: error.message }));
    const waitReady = () => page.locator('.request-state').filter({ hasText: 'READY' }).waitFor();
    const login = async () => {
      await page.getByLabel('Username', { exact: true }).fill(server.credentials.username);
      await page.getByLabel('Password', { exact: true }).fill(server.credentials.password);
      await page.getByRole('button', { name: 'Enter JARVIS' }).click();
      await waitReady();
    };
    const navigate = async view => {
      await page.locator('#command').evaluate(input => input.blur()).catch(() => {});
      await page.locator(`[data-view="${view}"]`).click();
      await page.locator(`.view-${view}`).waitFor();
    };
    const capture = async name => {
      const layout = await page.evaluate(() => ({
        width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        inputSizes: [...document.querySelectorAll('input')].map(input => parseFloat(getComputedStyle(input).fontSize)),
        smallControls: [...document.querySelectorAll('button:not(:disabled)')].filter(button => {
          const rect = button.getBoundingClientRect(); return rect.width > 0 && (rect.width < 44 || rect.height < 44);
        }).map(button => button.getAttribute('aria-label') || button.textContent),
      }));
      assert.ok(layout.documentWidth <= layout.width, `${name}: sideways page overflow ${JSON.stringify(layout)}`);
      assert.ok(layout.inputSizes.every(size => size >= 16), `${name}: small input type`);
      assert.deepEqual(layout.smallControls, [], `${name}: small touch targets`);
      await page.screenshot({ path: join(output, `${engineName}-${name}.png`), fullPage: true });
      findings.push({ engineName, name, ...layout });
    };
    await page.goto(origin);
    await page.getByLabel('Username', { exact: true }).waitFor();
    await capture('login');
    await login();
    // First engine gets truly empty persisted content. Later engines inspect the
    // same temporary server using an empty mocked response for the empty matrix.
    if (engineName !== engineNames[0]) {
      await page.route('**/api/tasks', route => route.fulfill({ json: { tasks: [] } }));
      await page.route('**/api/messages', route => route.fulfill({ json: { messages: [] } }));
      await page.reload(); await waitReady();
    }
    for (const width of [390, 430, 820]) {
      await page.setViewportSize({ width, height: width === 820 ? 1180 : 844 });
      for (const view of ['command', 'voice', 'agents']) { await navigate(view); await capture(`${width}-empty-${view}`); }
    }
    if (engineName !== engineNames[0]) await page.unrouteAll();
    for (let i = 0; i < 30; i++) {
      const response = await context.request.post(`${origin}/api/commands`, { data: { text: `Add a task to ${i === 0 ? 'LångUppgiftUtanMellanslag'.repeat(7) : `review item ${i} with a detailed note for the mobile workspace`}`, mode: 'live' } });
      assert.equal(response.status(), 201);
    }
    await page.reload(); await waitReady();
    for (const width of [390, 430, 820]) {
      await page.setViewportSize({ width, height: width === 820 ? 1180 : 844 });
      for (const view of ['command', 'voice', 'agents']) { await navigate(view); await capture(`${width}-filled-${view}`); }
    }
    await navigate('command');
    assert.ok(await page.locator('.conversation').evaluate(region => region.scrollHeight > region.clientHeight), 'Long history should scroll');
    await page.locator('.conversation').evaluate(region => { region.scrollTop = 0; });
    assert.equal(await page.locator('.conversation').evaluate(region => region.scrollTop), 0);
    await page.getByRole('button', { name: 'Demo', exact: true }).click();
    await page.getByLabel('Command', { exact: true }).fill('Add a task to temporary browser demo');
    await page.getByRole('button', { name: 'Send command' }).click();
    await waitReady();
    assert.equal(await page.locator('.conversation article').count(), 2);
    await page.getByRole('button', { name: 'Live', exact: true }).click();
    assert.ok(await page.locator('.conversation article').count() >= 60);
    assert.equal(await page.locator('.conversation').getByText('Task added: temporary browser demo (Demo only — not saved)', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Demo', exact: true }).click();
    await page.reload(); await waitReady();
    await page.getByRole('button', { name: 'Demo', exact: true }).click();
    assert.equal(await page.locator('.conversation article').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    await page.getByRole('button', { name: 'Live', exact: true }).click();
    // Delay a real Live response, switch to Demo, then release it.
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/api/commands', async route => { const response = await route.fetch(); await held; await route.fulfill({ response }); });
    await page.getByLabel('Command', { exact: true }).fill('Add a task to delayed Live result');
    await page.getByRole('button', { name: 'Send command' }).click();
    await page.locator('.request-state').filter({ hasText: 'SAVING LIVE' }).waitFor();
    assert.match(await page.locator('.core-stage .core').getAttribute('aria-label'), /saving live/);
    await page.getByRole('button', { name: 'Demo', exact: true }).click();
    release(); await waitReady(); await page.unroute('**/api/commands');
    assert.equal(await page.locator('.conversation article').count(), 0);
    await page.getByRole('button', { name: 'Live', exact: true }).click();
    assert.equal(await page.locator('.conversation').getByText('Task added: delayed Live result', { exact: true }).count(), 1);
    // Network error keeps the draft, session and prior history visible.
    await page.route('**/api/commands', route => route.abort('failed'));
    await page.getByLabel('Command', { exact: true }).fill('Add a task to retained private draft');
    await page.getByRole('button', { name: 'Send command' }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.locator('.request-state').textContent(), /ERROR/);
    assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'Add a task to retained private draft');
    assert.ok(await page.locator('.conversation article').count() >= 62);
    await page.unroute('**/api/commands');
    await capture('network-error');
    // Reduced height and enlarged root type retain reachable input/errors.
    for (const width of [390, 430, 820]) {
      await page.setViewportSize({ width, height: 360 });
      await navigate('voice');
      await page.getByLabel('Command', { exact: true }).scrollIntoViewIfNeeded();
      await page.getByLabel('Command', { exact: true }).focus();
      assert.notEqual(await page.getByLabel('Command', { exact: true }).evaluate(input => getComputedStyle(input).outlineStyle), 'none');
      await capture(`${width}-short-focus-error`);
      await page.getByRole('alert').scrollIntoViewIfNeeded();
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await capture(`${width}-large-text`);
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate('command');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.deepEqual(await page.locator('.core-stage .core').evaluate(core => [...core.querySelectorAll('*')].flatMap(element => ['', '::before', '::after'].map(pseudo => getComputedStyle(element, pseudo || null).animationName)).filter(name => name !== 'none')), []);
    await capture('reduced-motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Explicitly emulate the visibility event/property; not an OS background test.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.locator('.halo-outer').first().evaluate(element => getComputedStyle(element, '::before').animationPlayState), 'paused');
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    // Failed logout remains authenticated; confirmed logout clears private state.
    await page.route('**/api/auth/logout', route => route.fulfill({ status: 503, json: { error: 'test outage' } }));
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByText(/Sign out was not confirmed/).waitFor();
    assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'Add a task to retained private draft');
    await page.unroute('**/api/auth/logout');
    await page.getByRole('button', { name: 'Try signing out again' }).click();
    await page.getByLabel('Username', { exact: true }).waitFor();
    await login();
    assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), '');
    await page.getByRole('button', { name: 'Demo', exact: true }).click();
    assert.equal(await page.locator('.conversation article').count(), 0);
    // A 401 clears the session. Initial 5xx has retry instead of login.
    await page.route('**/api/commands', route => route.fulfill({ status: 401, json: { error: 'expired' } }));
    await page.getByLabel('Command', { exact: true }).fill('Add a task to expire');
    await page.getByRole('button', { name: 'Send command' }).click();
    await page.getByLabel('Username', { exact: true }).waitFor();
    assert.equal(await page.getByText('Your session has ended. Sign in again.').count(), 1);
    await page.unroute('**/api/commands');
    await page.route('**/api/tasks', route => route.fulfill({ status: 503, json: { error: 'test outage' } }));
    await page.reload();
    await page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Password', { exact: true }).count(), 0);
    await capture('initial-outage');
    await page.unroute('**/api/tasks');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await waitReady();
    await context.close(); await browser.close(); browser = undefined;
    console.log(`PASS ${engineName}: empty/filled views at 390/430/820, long history, Live/Demo, delayed mode change, errors, logout, 401, focus, 200% root text, short height, reduced motion and simulated visibility.`);
  }
  assert.deepEqual(issues, [], 'Browser runtime errors');
  await writeFile(join(output, 'results.json'), JSON.stringify({ findings, issues, limitations: 'Desktop browser emulation. Reduced height does not test a real iOS keyboard. Visibility was simulated.' }, null, 2));
  console.log(`Review artifacts outside repository: ${output}`);
} finally {
  if (browser) await browser.close();
  if (proxy) await new Promise(resolve => proxy.close(resolve));
  await server.close();
}
