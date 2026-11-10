import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const tokens = Object.fromEntries([...(await readFile(`${root}/web/src/tokens.css`, 'utf8')).matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(match => [match[1], match[2]]));
const luminance = hex => { const rgb = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
const contrast = (a, b) => { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); };
const results = [];
// Solid semantic surfaces plus the brightest endpoint of the subtle canvas gradient.
for (const foreground of ['text', 'text-secondary', 'text-muted', 'accent', 'demo', 'success', 'error']) {
  for (const background of ['background', 'workspace', 'panel', 'surface-hover']) {
    const ratio = contrast(tokens[foreground], tokens[background]);
    assert.ok(ratio >= 4.5, `${foreground}/${background}: ${ratio}`);
    results.push({ foreground, background, ratio: +ratio.toFixed(2), minimum: 4.5 });
  }
}
for (const [foreground, background, minimum] of [['background', 'accent', 4.5], ['background', 'success', 4.5], ['control-line', 'workspace', 3], ['control-line', 'panel', 3], ['accent', 'surface-hover', 3]]) {
  const ratio = contrast(tokens[foreground], tokens[background]); assert.ok(ratio >= minimum, `${foreground}/${background}: ${ratio}`); results.push({ foreground, background, ratio: +ratio.toFixed(2), minimum });
}
for (const [foreground, background] of [[tokens['text-muted'], '#0c1724'], [tokens.error, '#20151f'], [tokens.demo, '#1b1a16']]) {
  const ratio = contrast(foreground, background); assert.ok(ratio >= 4.5); results.push({ foreground, background, ratio: +ratio.toFixed(2), minimum: 4.5 });
}
const assets = [];
for (const file of await readdir(`${root}/dist/web/assets`)) {
  const bytes = await readFile(`${root}/dist/web/assets/${file}`); assets.push({ file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
  if (file.endsWith('.js')) assert.ok(!bytes.toString().includes('Lyssnar på dig'), 'Development voice states must be excluded from production');
}
console.log(JSON.stringify({ contrast: results, assets, limits: 'WCAG sRGB solid-color calculations; not a claim of complete accessibility conformance or device performance.' }, null, 2));
