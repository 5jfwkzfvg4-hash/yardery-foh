// Makes the printable QR posters (Letter size): node tools/poster.mjs [staff link] [location name]
// Writes FOH-QR-Poster.pdf/.png (color) and FOH-QR-Poster-BW.pdf/.png (black and white, no ink-heavy fills).
// For a new store, run it with that store's link.
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const QR = require('qrcode');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const link = process.argv[2] || 'https://5jfwkzfvg4-hash.github.io/yardery-foh/';
const place = process.argv[3] || 'The Yardery';
const font = f => 'data:font/woff2;base64,' + readFileSync(require.resolve('@fontsource/' + f)).toString('base64');
const qrFor = dark => QR.toString(link, {type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: {dark, light: '#FFFFFF'}});
const shown = link.replace(/^https?:\/\//, '').replace(/\/$/, '');
const esc = s => s.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));

const page_ = (qr, bw) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Bitter;font-weight:700;src:url(${font('bitter/files/bitter-latin-700-normal.woff2')})}
@font-face{font-family:Bitter;font-weight:800;src:url(${font('bitter/files/bitter-latin-800-normal.woff2')})}
@font-face{font-family:PS;font-weight:400;src:url(${font('public-sans/files/public-sans-latin-400-normal.woff2')})}
@font-face{font-family:PS;font-weight:600;src:url(${font('public-sans/files/public-sans-latin-600-normal.woff2')})}
@font-face{font-family:PS;font-weight:700;src:url(${font('public-sans/files/public-sans-latin-700-normal.woff2')})}
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box}html,body{margin:0}
body{width:8.5in;height:11in;font-family:PS,sans-serif;color:#1E241A;background:#F7F8F3;display:flex;flex-direction:column;-webkit-print-color-adjust:exact;print-color-adjust:exact}
header{background:#2F5233;color:#fff;padding:.45in .6in .4in;border-bottom:.09in solid #E4A821}
header h1{font:800 64pt/1 Bitter,serif;margin:0}
header p{margin:.1in 0 0;font:600 15pt PS;letter-spacing:.12em;text-transform:uppercase;opacity:.9}
main{flex:1;display:flex;flex-direction:column;align-items:center;padding:.3in .6in 0;text-align:center}
h2{font:700 30pt/1.15 Bitter,serif;color:#2F5233;margin:0 0 .2in}
.qr{background:#fff;border:2px solid #DCDFD5;border-radius:.2in;padding:.3in}
.qr svg{display:block;width:3.9in;height:3.9in}
.url{font:600 13pt PS;color:#5B6653;margin:.16in 0 .3in}
ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:.18in;width:100%;text-align:left}
li{background:#fff;border:1px solid #DCDFD5;border-radius:.14in;padding:.16in .16in .18in;font:400 12.5pt/1.35 PS}
li b{display:block;font:800 22pt/1 Bitter,serif;color:#E4A821;margin-bottom:.06in}
li strong{font-weight:700}
footer{padding:.2in .6in .3in;font:400 11pt/1.4 PS;color:#5B6653;text-align:center}
${bw ? `body{background:#fff;color:#000}header{background:#fff;color:#000;border-bottom:.06in solid #000}header p{opacity:1}h2{color:#000}.qr{border:2px solid #000}.url,footer{color:#000}li{border:1.5px solid #000}li b{color:#000}` : ''}
</style></head><body>
<header><h1>FOH</h1><p>${esc(place)} · Cleaning checklists</p></header>
<main>
<h2>Scan to open today’s checklists</h2>
<div class="qr">${qr}</div>
<div class="url">${esc(shown)}</div>
<ol>
<li><b>1</b><strong>Scan</strong> with your phone’s camera and tap the link.</li>
<li><b>2</b><strong>Type your first name</strong> once. Your phone remembers you.</li>
<li><b>3</b><strong>Tap the box</strong> when a task is done. The whole team sees it live.</li>
</ol>
</main>
<footer><strong>Tip: add it to your home screen.</strong><br>iPhone: Share › Add to Home Screen · Android: ⋮ › Add to Home screen<br>Only the person who checked a task, or a manager, can uncheck it.</footer>
</body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
for (const [bw, name] of [[false, 'FOH-QR-Poster'], [true, 'FOH-QR-Poster-BW']]) {
const page = await browser.newPage({viewport: {width: 816, height: 1056}, deviceScaleFactor: 2});
await page.setContent(page_(await qrFor(bw ? '#000000' : '#1E241A'), bw)); await page.evaluate(() => document.fonts.ready);
const over = await page.evaluate(() => document.documentElement.scrollHeight > 1056);
const hgt = await page.evaluate(() => document.documentElement.scrollHeight); if (over) throw new Error('poster does not fit on one page: ' + hgt);
await page.pdf({path: name + '.pdf', width: '8.5in', height: '11in', printBackground: true});
await page.screenshot({path: name + '.png'});
await page.close();
}
await browser.close();
console.log('Wrote FOH-QR-Poster(.pdf/.png) and FOH-QR-Poster-BW(.pdf/.png) for', link);
