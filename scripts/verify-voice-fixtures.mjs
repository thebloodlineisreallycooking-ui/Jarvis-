import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = new URL(process.env.JARVIS_FIXTURE_ORIGIN || 'http://127.0.0.1:5186');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname), 'Fixtures must run on a local development server');
const output = resolve(process.env.JARVIS_REVIEW_OUTPUT || '/tmp/jarvis-ui-fixtures');
const root = fileURLToPath(new URL('..', import.meta.url));
assert.ok(!output.startsWith(root) && output !== root.slice(0, -1), 'Keep artifacts outside the repository');
await mkdir(output, { recursive: true });
const browser=await chromium.launch({headless:true, ...(process.env.JARVIS_CHROMIUM_PATH ? {executablePath:process.env.JARVIS_CHROMIUM_PATH} : {})});
try {
const page=await browser.newPage({viewport:{width:390,height:844}});let api=0,media=0;
await page.addInitScript(()=>{window.__media=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__media++;throw Error('No microphone')};if(window.speechSynthesis)window.speechSynthesis.speak=()=>{window.__media++;throw Error('No speech')};});
page.on('request',r=>{if(r.url().includes('/api/'))api++;});
await page.goto(new URL('/fixtures/voice-states.html', origin).href);
for(const state of ['unconfigured','permission','recording','transcribing','responding','speaking','stopped','failed']){
 await page.getByLabel('Prototyptillstånd').selectOption(state);await page.getByText('Designprototyp · Ingen ljudfunktion',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`${output}/fixture-${state}.png`});
}
await page.getByLabel('Prototyptillstånd').selectOption('recording');
assert.ok(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)>0);
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
await page.emulateMedia({reducedMotion:'no-preference'});
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
assert.ok(await page.locator('.core-aura').evaluate(e=>getComputedStyle(e).animationPlayState==='paused'));
media=await page.evaluate(()=>window.__media);assert.equal(media,0);assert.equal(api,0);
console.log('PASS 8 isolated voice states, narrow layout, reduced motion, hidden pause; zero API/media calls.');
}finally{await browser.close();}
