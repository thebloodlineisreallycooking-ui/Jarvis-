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
const output = resolve(process.env.JARVIS_REVIEW_OUTPUT || '/tmp/jarvis-ui-review');
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
    const waitIdle = () => page.locator('.request-state[data-status*="AI EJ ANSLUTEN"], .request-state[data-status="DEMO · LOCAL"]').waitFor();
    const login = async () => { await page.getByLabel('Användarnamn', { exact: true }).fill(server.credentials.username); await page.getByLabel('Lösenord', { exact: true }).fill(server.credentials.password); await page.getByRole('button', { name: 'Öppna JARVIS' }).click(); await waitIdle(); };
    const navigate = async view => { await page.evaluate(() => document.getElementById('command')?.blur()); await page.locator(`[data-view="${view}"]`).click(); await page.locator(`.view-${view}`).waitFor(); };
    const chooseConversation = async title => {
      await page.getByRole('button', { name: /^Välj samtal:/ }).click();
      await page.locator('.conversation-list button').filter({ has: page.getByText(title, { exact: true }) }).click();
    };
    const taskMenu = async title => page.getByRole('button', { name: `Alternativ för ${title}`, exact: true }).click();
    const conversationMenu = async name => { await page.getByRole('button', { name: 'Samtalsalternativ', exact: true }).click(); await page.getByRole('button', { name, exact: true }).click(); };
    const closeTasks = () => page.getByRole('button', { name: 'Stäng Dina uppgifter', exact: true }).click();
    const sizes = [[320, 844], [390, 844], [430, 932], [820, 1180], [1440, 900]];
    const capture = async name => {
      const layout = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        inputSizes: [...document.querySelectorAll('input,textarea,select')].map(input => parseFloat(getComputedStyle(input).fontSize)),
        smallControls: [...document.querySelectorAll('button:not(:disabled)')].filter(button => { const rect = button.getBoundingClientRect(); return rect.width > 0 && (rect.width < 43.9 || rect.height < 43.9); }).map(button => button.getAttribute('aria-label') || button.textContent) }));
      if (layout.documentWidth > layout.width + 1) { await page.screenshot({ path: join(output, `${engineName}-failed-${name}.png`), fullPage: false, animations: 'disabled' }); layout.overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && el.getBoundingClientRect().width > 0).slice(-12).map(el => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width }))); }
      assert.ok(layout.documentWidth <= layout.width + 1, `${name}: horizontal overflow ${JSON.stringify(layout)}`);
      assert.ok(layout.inputSizes.every(size => size >= 16), `${name}: small input text`); assert.deepEqual(layout.smallControls, [], `${name}: small controls`);
      await page.screenshot({ path: join(output, `${engineName}-${name}.png`), fullPage: false, animations: 'disabled' }); findings.push({ engineName, version: browser.version(), name, ...layout });
    };
    const post = async (path, data, method = 'post') => { const response = await context.request[method](`${origin}/api${path}`, { headers: { Origin: origin }, data }); assert.ok(response.ok(), `${path}: HTTP ${response.status()} ${await response.text()}`); return response.json(); };
    await page.goto(origin); await page.getByLabel('Användarnamn', { exact: true }).waitFor();
    for (const [width, height] of sizes) { await page.setViewportSize({ width, height }); await capture(`${width}-login`); }
    assert.equal(await page.getByText('Din session har avslutats. Logga in igen.').count(), 0, 'A first visit is a neutral login');
    const opened = performance.now(); await login();
    findings.push({ name: 'local-login-to-ready', milliseconds: Math.round(performance.now() - opened), navigation: await page.evaluate(() => performance.getEntriesByType('navigation')[0].toJSON()) });
    // Suggestions never submit; plain Enter and IME confirmation never send.
    let exampleWrites = 0; const examplesTrack = request => { if (request.method() === 'POST') exampleWrites++; }; page.on('request', examplesTrack);
    await page.getByRole('button', { name: /Planera veckan/ }).click();
    const input = page.getByLabel('Command', { exact: true }); assert.equal(await input.inputValue(), 'Lägg till en uppgift att planera veckan');
    await input.press('Enter'); assert.ok((await input.inputValue()).includes('\n'));
    await input.evaluate(el => { el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true, bubbles: true })); el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); });
    assert.equal(exampleWrites, 0); page.off('request', examplesTrack); await input.fill('');
    for (const [width, height] of sizes) { await page.setViewportSize({ width, height }); for (const view of ['command', 'voice', 'agents']) { await navigate(view); await capture(`${width}-empty-${view}`); } }
    await page.setViewportSize({ width: 390, height: 844 }); await navigate('command');
    const firstConversation = (await (await context.request.get(`${origin}/api/conversations`)).json()).conversations[0];
    const conversationId = firstConversation.id;
    const envelope = () => ({ requestId: randomUUID(), conversationId, mode: 'live' });
    for (let i = 0; i < 35; i++) await post('/commands', { ...envelope(), text: `Add a task to ${i === 0 ? 'LångSvenskUppgiftUtanMellanslag'.repeat(6) : `synthetic review item ${i}`}` });
    await post('/commands', { ...envelope(), text: 'https://example.invalid/' + 'långt'.repeat(120) });
    await post('/commands', { ...envelope(), text: '<img src=x onerror="window.__xssExecuted=true">' });
    await page.reload(); await waitIdle();
    for (const [width, height] of sizes) { await page.setViewportSize({ width, height }); for (const view of ['command', 'voice', 'agents']) { await navigate(view); await capture(`${width}-filled-${view}`); if (width === 1440 && view === 'command') assert.ok(await page.locator('.composer-dock').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight + 1), 'Desktop composer must fit the viewport'); } }
    assert.equal(await page.evaluate(() => window.__xssExecuted), undefined);
    findings.push({ name: 'filled-runtime', tasks: 35, storedMessages: 74, domElements: await page.locator('*').count(), timing: await page.evaluate(() => ({ paints: performance.getEntriesByType('paint').map(e => e.toJSON()), resources: performance.getEntriesByType('resource').filter(e => /\.(js|css)$/.test(e.name)).map(e => ({ type: e.initiatorType, duration: +e.duration.toFixed(1), decodedBytes: e.decodedBodySize })) })) });
    // Mobile uses document scrolling; loading older history preserves its anchor too.
    await page.setViewportSize({ width: 390, height: 844 }); await navigate('command');
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileAnchor = await page.locator('.conversation article').first().getAttribute('data-message-id');
    const mobileBefore = await page.locator(`[data-message-id="${mobileAnchor}"]`).evaluate(el => el.getBoundingClientRect().top);
    await page.getByRole('button', { name: 'Läs äldre historik' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.conversation article').length === 74);
    const mobileAfter = await page.locator(`[data-message-id="${mobileAnchor}"]`).evaluate(el => el.getBoundingClientRect().top);
    assert.ok(Math.abs(mobileAfter - mobileBefore) < 3, `Mobile history moved ${mobileAfter - mobileBefore}`);
    findings.push({ name: 'mobile-history-anchor', delta: mobileAfter - mobileBefore });
    await page.reload(); await waitIdle();
    await page.setViewportSize({ width: 820, height: 1180 }); await navigate('command');
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
    await page.getByRole('button', { name: 'Ny uppgift', exact: true }).click();
    await page.locator('#command').evaluate(el => el.focus());
    assert.equal(await page.getByRole('dialog', { name: 'Ny uppgift', exact: true }).evaluate(el => el.contains(document.activeElement)), true, 'Background must be inert');
    await page.getByLabel('Titel', { exact: true }).fill('Browser lifecycle');
    await page.getByRole('button', { name: 'Spara uppgift' }).click(); await waitIdle();
    await taskMenu('Browser lifecycle'); await page.getByRole('button', { name: 'Redigera uppgift', exact: true }).click(); await page.getByLabel('Titel', { exact: true }).fill('Browser edited'); await page.getByRole('button', { name: 'Spara uppgift' }).click(); await waitIdle();
    await page.getByRole('checkbox', { name: 'Slutför Browser edited', exact: true }).click(); await waitIdle();
    await page.getByRole('checkbox', { name: 'Återöppna Browser edited', exact: true }).click(); await waitIdle();
    const deleteButton = page.getByRole('button', { name: 'Alternativ för Browser edited', exact: true }); await deleteButton.click(); await page.getByRole('button', { name: 'Radera uppgift', exact: true }).click();
    await page.getByRole('dialog', { name: 'Radera uppgift?' }).waitFor(); assert.match(await page.getByRole('dialog', { name: 'Radera uppgift?' }).textContent(), /Browser edited/);
    assert.equal(await page.getByRole('button', { name: 'Behåll uppgiften' }).evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Escape'); assert.equal(await deleteButton.evaluate(el => document.activeElement === el), true);
    await deleteButton.click(); await page.getByRole('button', { name: 'Radera uppgift', exact: true }).click(); await page.getByRole('button', { name: 'Radera uppgiften', exact: true }).click(); await waitIdle(); assert.equal(await deleteButton.count(), 0);
    // Accessible keyboard dialog loop and long content at narrow width.
    await page.getByRole('button', { name: 'Ny uppgift', exact: true }).click(); await page.getByLabel('Titel', { exact: true }).fill('x'.repeat(201)); assert.equal(await page.getByRole('button', { name: 'Spara uppgift' }).isDisabled(), true);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => [...document.querySelectorAll('dialog[open]')].at(-1).contains(document.activeElement)), true);
    await capture('task-dialog'); await page.keyboard.press('Escape');
    await page.getByLabel('Sök uppgifter', { exact: true }).fill('synthetic review item 12'); await page.getByRole('button', { name: 'Sök', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.task-row').length === 1);
    await capture('task-search'); await page.setViewportSize({ width: 390, height: 844 }); await capture('390-task-sheet'); await page.setViewportSize({ width: 820, height: 1180 });
    await page.getByLabel('Sök uppgifter', { exact: true }).fill('no-match-review'); await page.getByRole('button', { name: 'Sök', exact: true }).click(); await page.getByText('Ingen träff den här gången').waitFor(); await capture('task-empty-search');
    await page.getByRole('button', { name: 'Rensa sökningen' }).click(); await page.waitForFunction(() => document.querySelectorAll('.task-row').length > 30);
    await closeTasks();
    // Conversation rename/archive/reopen and per-thread drafts.
    await page.getByLabel('Command', { exact: true }).fill('First private draft'); await page.locator('#command').evaluate(el => el.blur());
    await page.getByRole('button', { name: 'Nytt samtal', exact: true }).click(); await page.getByLabel('Samtalsnamn', { exact: true }).fill('Browser second'); await page.getByRole('button', { name: 'Spara samtal' }).click(); await waitIdle();
    assert.equal(await page.getByRole('button', { name: 'Nytt innehåll · Hoppa till slutet' }).count(), 0, 'An empty new thread must not claim new content');
    const secondId = (await (await context.request.get(`${origin}/api/conversations`)).json()).conversations.find(c => c.title === 'Browser second').id; assert.notEqual(secondId, conversationId);
    await page.getByLabel('Command', { exact: true }).fill('Second private draft');
    await chooseConversation(firstConversation.title); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'First private draft');
    await chooseConversation('Browser second'); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'Second private draft');
    const renamedTitle = 'Långt svenskt samtalsnamn '.repeat(4).slice(0, 100);
    await conversationMenu('Byt namn'); await page.getByLabel('Samtalsnamn', { exact: true }).fill(renamedTitle); await page.getByRole('button', { name: 'Spara samtal' }).click(); await waitIdle();
    await conversationMenu('Arkivera samtal'); await waitIdle(); assert.equal(await page.getByLabel('Command', { exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Återöppna samtal', exact: true }).click(); await waitIdle(); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'Second private draft');
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: /^Välj samtal:/ }).click(); await capture('390-conversation-sheet'); await page.keyboard.press('Escape'); await page.setViewportSize({ width: 820, height: 1180 });
    // Hold a committed response, navigate to a different thread and mode.
    let release; const held = new Promise(resolve => { release = resolve; });
    await page.route('**/api/commands', async route => { const response = await route.fetch(); await held; await route.fulfill({ response }); });
    await page.getByLabel('Command', { exact: true }).fill('Add a task to delayed Live result'); await page.getByRole('button', { name: 'Send command' }).click();
    await page.locator('.request-state[data-status="SAVING LIVE"]').waitFor();
    await chooseConversation(firstConversation.title); await page.getByRole('button', { name: 'Demo', exact: true }).click(); await navigate('voice');
    release(); await waitIdle(); await page.unroute('**/api/commands'); assert.equal(await page.locator('.conversation article').count(), 0);
    await page.getByRole('button', { name: 'Live', exact: true }).click(); await chooseConversation(renamedTitle);
    assert.equal(await page.getByText('Task added: delayed Live result', { exact: true }).count(), 1);
    // Demo does no mutation requests, including complete/edit/delete.
    const mutationRequests = []; const track = req => { if (['POST', 'PATCH', 'DELETE'].includes(req.method())) mutationRequests.push(req.url()); }; page.on('request', track);
    await page.getByRole('button', { name: 'Demo', exact: true }).click(); await page.getByLabel('Command', { exact: true }).fill('Add a task to browser demo'); await page.getByRole('button', { name: 'Send command' }).click(); await waitIdle();
    await page.getByRole('button', { name: 'Visa uppgifter', exact: true }).click(); await page.getByRole('checkbox', { name: 'Slutför browser demo', exact: true }).click(); await page.getByRole('checkbox', { name: 'Återöppna browser demo', exact: true }).click();
    await taskMenu('browser demo'); await page.getByRole('button', { name: 'Radera uppgift', exact: true }).click(); await page.getByRole('button', { name: 'Radera uppgiften', exact: true }).click();
    page.off('request', track); assert.deepEqual(mutationRequests, []); await closeTasks();
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
    // Permission and server failures remain visible without losing the draft.
    for (const status of [403, 500]) {
      await page.route('**/api/commands', route => route.fulfill({ status, json: { error: 'synthetic review failure' } }));
      await input.fill(`Retained ${status} draft`); await page.getByRole('button', { name: 'Send command' }).click(); await page.getByRole('alert').waitFor();
      assert.equal(await input.inputValue(), `Retained ${status} draft`); await capture(`http-${status}`); await page.unroute('**/api/commands');
      await page.getByRole('button', { name: 'Läs in aktuella data', exact: true }).click(); await waitIdle();
    }
    await input.fill('x'.repeat(2001)); assert.equal(await page.getByRole('button', { name: 'Send command' }).isDisabled(), true); assert.equal(await input.getAttribute('aria-invalid'), 'true'); await capture('composer-validation'); await input.fill('');
    // Error preservation, 320 reflow, 200% root text and short-height focus.
    await page.route('**/api/commands', route => route.abort('failed'));
    await page.getByLabel('Command', { exact: true }).fill('Retained error draft'); await page.getByRole('button', { name: 'Send command' }).click(); await page.getByRole('alert').waitFor(); await page.unroute('**/api/commands');
    for (const width of [320, 390, 430, 820]) {
      await page.setViewportSize({ width, height: 420 }); await navigate('voice'); await page.getByLabel('Command', { exact: true }).scrollIntoViewIfNeeded(); await page.getByLabel('Command', { exact: true }).focus();
      assert.notEqual(await page.getByLabel('Command', { exact: true }).evaluate(input => getComputedStyle(input).outlineStyle), 'none'); await capture(`${width}-short-error`);
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); await input.scrollIntoViewIfNeeded(); assert.ok(await page.locator('.skip-link').evaluate(el => el.getBoundingClientRect().bottom <= 0), 'Unfocused skip link must stay hidden at large text'); await capture(`${width}-large-text`); await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    }
    await page.setViewportSize({ width: 1440, height: 900 }); await navigate('command');
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await capture('200-percent-css-zoom'); await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    await page.setViewportSize({ width: 390, height: 844 }); await navigate('command');
    await page.emulateMedia({ reducedMotion: 'reduce' }); assert.deepEqual(await page.locator('.core').first().evaluate(core => [...core.querySelectorAll('*')].flatMap(el => ['', '::before', '::after'].map(pseudo => getComputedStyle(el, pseudo || null).animationName)).filter(name => name !== 'none')), []); await capture('reduced-motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.locator('.core-surface').first().evaluate(el => getComputedStyle(el).animationPlayState), 'paused'); await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    assert.deepEqual(await page.evaluate(() => [window.__mediaCalls, window.__speechCalls]), [0, 0]);
    // Failed logout remains unconfirmed; real logout clears drafts and Demo.
    await page.route('**/api/auth/logout', route => route.fulfill({ status: 503, json: { error: 'synthetic outage' } }));
    await page.getByRole('button', { name: 'Logga ut', exact: true }).click(); await page.getByText(/Sign out was not confirmed/).waitFor(); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), 'Retained error draft');
    await page.unroute('**/api/auth/logout'); await page.getByRole('button', { name: 'Försök logga ut igen' }).click(); await page.getByLabel('Användarnamn', { exact: true }).waitFor(); await login(); assert.equal(await page.getByLabel('Command', { exact: true }).inputValue(), '');
    await page.route('**/api/commands', route => route.fulfill({ status: 401, json: { error: 'expired' } })); await page.getByLabel('Command', { exact: true }).fill('expire session'); await page.getByRole('button', { name: 'Send command' }).click(); await page.getByLabel('Användarnamn', { exact: true }).waitFor();
    assert.equal(await page.getByText('Din session har avslutats. Logga in igen.').count(), 1); await page.unroute('**/api/commands');
    await page.route('**/api/tasks?*', route => route.fulfill({ status: 503, json: { error: 'synthetic outage' } })); await page.reload(); await page.getByRole('button', { name: 'Försök igen', exact: true }).waitFor(); assert.equal(await page.getByLabel('Lösenord', { exact: true }).count(), 0); await capture('initial-outage');
    await page.unroute('**/api/tasks?*'); await page.getByRole('button', { name: 'Försök igen', exact: true }).click(); await waitIdle();
    assert.deepEqual(issues, [], 'Browser runtime errors'); findings.push({ name: 'production-fixture-excluded', ok: !(await (await context.request.get(`${origin}/fixtures/voice-states.html`)).text()).includes('VoiceStates.tsx') }); await context.close();
    console.log(`PASS ${engineName} ${browser.version()}: three views empty/filled at 320/390/430/820/1440, task lifecycle/dialog focus, thread/draft/archive isolation, scroll anchors, unknown retry, Demo without writes, logout/401/outage, 200% text, 420px height, reduced motion and zero media activation.`);
  } finally { if (browser) await browser.close(); if (proxy) await new Promise(resolve => proxy.close(resolve)); await server.close(); }
}
await writeFile(join(output, 'results.json'), JSON.stringify({ findings, issues, limitations: 'Desktop browser emulation, not physical iOS Safari, OS keyboard, audio or real provider verification. Visibility explicitly simulated. 200% root text and CSS zoom are checked; native browser/OS zoom and keyboard still require a device test.' }, null, 2));
console.log(`Artifacts outside repository: ${output}`);
