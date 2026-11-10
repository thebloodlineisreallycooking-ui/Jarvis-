import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTestServer } from './verify-production.mjs';

// Only disposable local credentials/DB/certificates. Never accepts production URL.
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(process.env.JARVIS_REVIEW_OUTPUT || '/tmp/jarvis-foundation-review');
assert.ok(!output.startsWith(`${root}/`) && output !== root, 'Keep private artifacts outside source control');
await mkdir(output, { recursive: true });
const findings = [], issues = [];
for (const engineName of (process.env.JARVIS_REVIEW_ENGINES || 'chromium').split(',')) {
  const server = await startTestServer(root);
  let proxy, browser;
  try {
    const keyFile = join(server.directory, 'local-key.pem'), certFile = join(server.directory, 'local-cert.pem');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
    proxy = https.createServer({ key: await readFile(keyFile), cert: await readFile(certFile) }, (req, res) => {
      const upstream = http.request(`${server.url}${req.url}`, { method: req.method, headers: req.headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
      upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
    });
    await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
    const origin = `https://127.0.0.1:${proxy.address().port}`;
    browser = await ({ chromium, webkit }[engineName]).launch({ headless: true, ...(engineName === 'chromium' && process.env.JARVIS_CHROMIUM_PATH ? { executablePath: process.env.JARVIS_CHROMIUM_PATH } : {}) });
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      window.__mediaCalls = 0; window.__speechCalls = 0;
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { window.__mediaCalls++; throw new Error('Microphone forbidden in this test'); };
      if (window.speechSynthesis) window.speechSynthesis.speak = () => { window.__speechCalls++; throw new Error('Browser speech forbidden in this test'); };
    });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', error => issues.push({ engineName, message: error.message }));
    const waitIdle = () => page.locator('.request-state').filter({ hasText: /AI EJ ANSLUTEN|DEMO · LOCAL/ }).waitFor();
    const login = async () => { await page.getByLabel('Username', { exact: true }).fill(server.credentials.username); await page.getByLabel('Password', { exact: true }).fill(server.credentials.password); await page.getByRole('button', { name: 'Enter JARVIS' }).click(); await waitIdle(); };
    const navigate = async view => { await page.locator('#command').evaluate(input => input.blur()).catch(() => {}); await page.locator(`[data-view="${view}"]`).click(); await page.locator(`.view-${view}`).waitFor(); };
    const capture = async name => {
      const layout = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        inputSizes: [...document.querySelectorAll('input,textarea,select')].map(input => parseFloat(getComputedStyle(input).fontSize)),
        smallControls: [...document.querySelectorAll('button:not(:disabled)')].filter(button => { const rect = button.getBoundingClientRect(); return rect.width > 0 && (rect.width < 43.9 || rect.height < 43.9); }).map(button => button.getAttribute('aria-label') || button.textContent) }));
      if (layout.documentWidth > layout.width + 1) { await page.screenshot({ path: join(output, `${engineName}-failed-${name}.png`), fullPage: true }); layout.overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && el.getBoundingClientRect().width > 0).slice(-12).map(el => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width }))); }
      assert.ok(layout.documentWidth <= layout.width + 1, `${name}: horizontal overflow ${JSON.stringify(layout)}`);
      assert.ok(layout.inputSizes.every(size => size >= 16), `${name}: small input text`); assert.deepEqual(layout.smallControls, [], `${name}: small controls`);
      await page.screenshot({ path: join(output, `${engineName}-${name}.png`), fullPage: true }); findings.push({ engineName, version: browser.version(), name, ...layout });
    };
    const post = async (path, data, method = 'post') => { const response = await context.request[method](`${origin}/api${path}`, { headers: { Origin: origin }, data }); assert.ok(response.ok(), `${path}: HTTP ${response.status()} ${await response.text()}`); return response.json(); };
    await page.goto(origin); await page.getByLabel('Username', { exact: true }).waitFor(); await capture('login'); await login();
    for (const width of [320, 390, 430, 820]) { await page.setViewportSize({ width, height: width === 820 ? 1180 : 844 }); for (const view of ['command', 'voice', 'agents']) { await navigate(view); await capture(`${width}-empty-${view}`); } }
    await page.setViewportSize({ width: 390, height: 844 }); await navigate('command');
    const conversationId = await page.getByLabel('Samtal', { exact: true }).inputValue();
    const envelope = () => ({ requestId: randomUUID(), conversationId, mode: 'live' });
    for (let i = 0; i < 35; i++) await post('/commands', { ...envelope(), text: `Add a task to ${i === 0 ? 'LångSvenskUppgiftUtanMellanslag'.repeat(6) : `synthetic review item ${i}`}` });
    await post('/commands', { ...envelope(), text: 'https://example.invalid/' + 'långt'.repeat(120) });
    await post('/commands', { ...envelope(), text: '<img src=x onerror="window.__xssExecuted=true">' });
    await page.reload(); await waitIdle();
    for (const width of [320, 390, 430, 820]) { await page.setViewportSize({ width, height: width === 820 ? 1180 : 844 }); for (const view of ['command', 'voice', 'agents']) { await navigate(view); await capture(`${width}-filled-${view}`); } }
    assert.equal(await page.evaluate(() => window.__xssExecuted), undefined);
    await navigate('command');
    // Older pages preserve the visible old-message anchor instead of jumping.
    const region = page.locator('.conversation'); await region.evaluate(el => { el.scrollTop = 0; });
    const anchor = await region.locator('article').first().getAttribute('data-message-id');
    const beforeTop = await page.locator(`[data-message-id="${anchor}"]`).evaluate(el => el.getBoundingClientRect().top);
    await page.getByRole('button', { name: 'Läs äldre historik' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.conversation article').length === 74);
    const afterTop = await page.locator(`[data-message-id="${anchor}"]`).evaluate(el => el.getBoundingClientRect().top);
    assert.ok(Math.abs(beforeTop - afterTop) < 3, `Older-history scroll moved ${afterTop - beforeTop}`);
    // Read away from the bottom: new content offers a jump, retaining position.
    await region.evaluate(el => { el.scrollTop = 120; });
    await page.getByLabel('Command', { exact: true }).fill('Add a task to while reading history');
    await page.getByRole('button', { name: 'Send command' }).click(); await waitIdle();
    await page.getByRole('button', { name: 'Nytt innehåll · Hoppa till slutet' }).waitFor();
    await page.getByRole('button', { name: 'Nytt innehåll · Hoppa till slutet' }).click();
    // Task edit/complete/reopen/delete, exact confirmation and focus restoration.
    await page.getByRole('button', { name: 'Visa uppgifter', exact: true }).click();
    await page.getByRole('button', { name: 'Ny uppgift', exact: true }).click(); await page.getByLabel('Titel', { exact: true }).fill('Browser lifecycle');
    await page.getByRole('button', { name: 'Spara uppgift' }).click(); await waitIdle();
    await page.getByRole('button', { name: 'Redigera Browser lifecycle', exact: true }).click(); await page.getByLabel('Titel', { exact: true }).fill('Browser edited'); await page.getByRole('button', { name: 'Spara uppgift' }).click(); await waitIdle();
    await page.getByRole('button', { name: 'Slutför Browser edited', exact: true }).click(); await waitIdle();
    await page.getByRole('button', { name: 'Återöppna Browser edited', exact: true }).click(); await waitIdle();
    const deleteButton = page.getByRole('button', { name: 'Radera Browser edited', exact: true }); await deleteButton.click();
    await page.getByRole('dialog', { name: 'Radera uppgift?' }).waitFor(); assert.match(await page.getByRole('dialog').textContent(), /Browser edited/);
    assert.equal(await page.getByRole('button', { name: 'Behåll uppgiften' }).evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Escape'); assert.equal(await deleteButton.evaluate(el => document.activeElement === el), true);
    await deleteButton.click(); await page.getByRole('button', { name: 'Radera uppgiften', exact: true }).click(); await waitIdle(); assert.equal(await deleteButton.count(), 0);
    // Accessible keyboard dialog loop and long content at narrow width.
    await page.getByRole('button', { name: 'Ny uppgift', exact: true }).click(); await page.getByLabel('Titel', { exact: true }).fill('x'.repeat(201)); assert.equal(await page.getByRole('button', { name: 'Spara uppgift' }).isDisabled(), true);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true);
    await capture('task-dialog'); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Dölj uppgifter', exact: true }).click();
    // Conversation rename/archive/reopen and per-thread drafts.
    await page.getByLabel('Command', { exact: true }).fill('First private draft'); await page.locator('#command').evaluate(el => el.blur());
    await page.getByRole('button', { name: 'Nytt samtal', exact: true }).click(); await page.getByLabel('Samtalsnamn', { exact: true }).fill('Browser second'); await page.getByRole('button', { name: 'Spara samtal' }).click(); await waitIdle();
    const secondId = await page.getByLabel('Samtal', { exact: true }).inputValue(); assert.notEqual(secondId, conversationId);
    await page.getByLabel('Command', { exact: true }).fill('Second private draft');
    await page.getByLabel('Samtal', { exact: true }).selectOption(conversationId); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'First private draft');
    await page.getByLabel('Samtal', { exact: true }).selectOption(secondId); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'Second private draft');
    await page.getByRole('button', { name: 'Byt namn', exact: true }).click(); await page.getByLabel('Samtalsnamn', { exact: true }).fill('Renamed second'); await page.getByRole('button', { name: 'Spara samtal' }).click(); await waitIdle();
    await page.getByRole('button', { name: 'Arkivera samtal', exact: true }).click(); await waitIdle(); assert.equal(await page.getByLabel('Command', { exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Återöppna samtal', exact: true }).click(); await waitIdle(); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'Second private draft');
    // Hold a committed response, navigate to a different thread and mode.
    let release; const held = new Promise(resolve => { release = resolve; });
    await page.route('**/api/commands', async route => { const response = await route.fetch(); await held; await route.fulfill({ response }); });
    await page.getByLabel('Command', { exact: true }).fill('Add a task to delayed Live result'); await page.getByRole('button', { name: 'Send command' }).click();
    await page.locator('.request-state').filter({ hasText: 'SAVING LIVE' }).waitFor();
    await page.getByLabel('Samtal', { exact: true }).selectOption(conversationId); await page.getByRole('button', { name: 'Demo', exact: true }).click(); await navigate('voice');
    release(); await waitIdle(); await page.unroute('**/api/commands'); assert.equal(await page.locator('.conversation article').count(), 0);
    await page.getByRole('button', { name: 'Live', exact: true }).click(); await page.getByLabel('Samtal', { exact: true }).selectOption(secondId);
    assert.equal(await page.getByText('Task added: delayed Live result', { exact: true }).count(), 1);
    // Demo does no mutation requests, including complete/edit/delete.
    const mutationRequests = []; const track = req => { if (['POST', 'PATCH', 'DELETE'].includes(req.method())) mutationRequests.push(req.url()); }; page.on('request', track);
    await page.getByRole('button', { name: 'Demo', exact: true }).click(); await page.getByLabel('Command', { exact: true }).fill('Add a task to browser demo'); await page.getByRole('button', { name: 'Send command' }).click(); await waitIdle();
    await page.getByRole('button', { name: 'Visa uppgifter', exact: true }).click(); await page.getByRole('button', { name: 'Slutför browser demo', exact: true }).click(); await page.getByRole('button', { name: 'Återöppna browser demo', exact: true }).click();
    await page.getByRole('button', { name: 'Radera browser demo', exact: true }).click(); await page.getByRole('button', { name: 'Radera uppgiften', exact: true }).click();
    page.off('request', track); assert.deepEqual(mutationRequests, []); await page.getByRole('button', { name: 'Dölj uppgifter', exact: true }).click();
    await page.reload(); await waitIdle(); await page.getByRole('button', { name: 'Demo', exact: true }).click(); assert.equal(await page.locator('.conversation article').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0); assert.deepEqual(await page.evaluate(async () => await caches.keys()), []);
    // Lose the response after server commit; explicit retry retains request ID.
    await page.getByRole('button', { name: 'Live', exact: true }).click(); const attempts = [];
    await page.route('**/api/commands', async route => { attempts.push(route.request().postDataJSON()); await route.fetch(); await route.abort('failed'); });
    await page.getByLabel('Command', { exact: true }).fill('Add a task to lost response'); await page.getByRole('button', { name: 'Send command' }).click(); await page.getByText('Resultat okänt — kan vara sparat', { exact: false }).waitFor();
    await page.unroute('**/api/commands');
    await page.route('**/api/commands', async route => { attempts.push(route.request().postDataJSON()); await route.continue(); });
    await page.getByRole('button', { name: 'Försök samma operation igen' }).click(); await waitIdle(); await page.unroute('**/api/commands'); assert.deepEqual(attempts[0], attempts[1]);
    assert.equal(await page.getByText('Task added: lost response', { exact: true }).count(), 1);
    // Error preservation, 320 reflow, 200% root text and short-height focus.
    await page.route('**/api/commands', route => route.abort('failed'));
    await page.getByLabel('Command', { exact: true }).fill('Retained error draft'); await page.getByRole('button', { name: 'Send command' }).click(); await page.getByRole('alert').waitFor(); await page.unroute('**/api/commands');
    for (const width of [320, 390, 430, 820]) {
      await page.setViewportSize({ width, height: 360 }); await navigate('voice'); await page.getByLabel('Command', { exact: true }).scrollIntoViewIfNeeded(); await page.getByLabel('Command', { exact: true }).focus();
      assert.notEqual(await page.getByLabel('Command', { exact: true }).evaluate(input => getComputedStyle(input).outlineStyle), 'none'); await capture(`${width}-short-error`);
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); await capture(`${width}-large-text`); await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    }
    await page.setViewportSize({ width: 390, height: 844 }); await navigate('command');
    await page.emulateMedia({ reducedMotion: 'reduce' }); assert.deepEqual(await page.locator('.core-stage .core').evaluate(core => [...core.querySelectorAll('*')].flatMap(el => ['', '::before', '::after'].map(pseudo => getComputedStyle(el, pseudo || null).animationName)).filter(name => name !== 'none')), []); await capture('reduced-motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.locator('.halo-outer').first().evaluate(el => getComputedStyle(el, '::before').animationPlayState), 'paused'); await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    assert.deepEqual(await page.evaluate(() => [window.__mediaCalls, window.__speechCalls]), [0, 0]);
    // Failed logout remains unconfirmed; real logout clears drafts and Demo.
    await page.route('**/api/auth/logout', route => route.fulfill({ status: 503, json: { error: 'synthetic outage' } }));
    await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.getByText(/Sign out was not confirmed/).waitFor(); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'Retained error draft');
    await page.unroute('**/api/auth/logout'); await page.getByRole('button', { name: 'Try signing out again' }).click(); await page.getByLabel('Username', { exact: true }).waitFor(); await login(); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), '');
    await page.route('**/api/commands', route => route.fulfill({ status: 401, json: { error: 'expired' } })); await page.getByLabel('Command', { exact: true }).fill('expire session'); await page.getByRole('button', { name: 'Send command' }).click(); await page.getByLabel('Username', { exact: true }).waitFor();
    assert.equal(await page.getByText('Your session has ended. Sign in again.').count(), 1); await page.unroute('**/api/commands');
    await page.route('**/api/tasks?*', route => route.fulfill({ status: 503, json: { error: 'synthetic outage' } })); await page.reload(); await page.getByRole('button', { name: 'Try again', exact: true }).waitFor(); assert.equal(await page.getByLabel('Password', { exact: true }).count(), 0); await capture('initial-outage');
    await page.unroute('**/api/tasks?*'); await page.getByRole('button', { name: 'Try again', exact: true }).click(); await waitIdle();
    assert.deepEqual(issues, [], 'Browser runtime errors'); await context.close();
    console.log(`PASS ${engineName} ${browser.version()}: three views empty/filled at 320/390/430/820, task lifecycle/dialog focus, thread/draft/archive isolation, scroll anchors, unknown retry, Demo without writes, logout/401/outage, 200% text, 360px height, reduced motion and zero media activation.`);
  } finally { if (browser) await browser.close(); if (proxy) await new Promise(resolve => proxy.close(resolve)); await server.close(); }
}
await writeFile(join(output, 'results.json'), JSON.stringify({ findings, issues, limitations: 'Desktop browser emulation, not physical iOS Safari, OS keyboard, audio or real provider verification. Visibility explicitly simulated.' }, null, 2));
console.log(`Artifacts outside repository: ${output}`);
