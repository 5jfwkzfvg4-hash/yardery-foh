// Look-and-feel check across screen sizes, light/dark and orientation (run with: npm run qa).
// For every device × color scheme × page it measures: sideways scrolling, things sticking off the screen,
// tap targets smaller than 40×40 px, text smaller than 12 px, text/background contrast below WCAG AA,
// the top bar's height, and console errors. Writes tests/shots/qa/report.json and screenshots.
import http from 'node:http';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {TUE, ny} from './dates.mjs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const OUT = 'tests/shots/qa'; mkdirSync(OUT, {recursive: true});
const ver = readFileSync('index.html', 'utf8').match(/firebasejs\/([\d.]+)\//)[1];
const cfg = readFileSync('config.js', 'utf8').replace(/firebase:\{[\s\S]*?\n  \},/, "firebase:{apiKey:'demo-key',authDomain:'demo-yardery.firebaseapp.com',projectId:'demo-yardery',appId:'demo'},");
const server = http.createServer((q, r) => {
  const file = q.url.split('?')[0].split('#')[0].replace(/^\//, '') || 'index.html';
  if (!/^(index\.html|manage\.html|config\.js|tasks\.js|report\.js|reminders\.js|proposals\/tasks\.json)$/.test(file)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8'});
  r.end(file === 'config.js' ? cfg : file === 'proposals/tasks.json' ? '{"ops":[]}' : readFileSync(file));
}).listen(0);
const URL = `http://127.0.0.1:${server.address().port}/`;
const sdkDir = new globalThis.URL('../node_modules/firebase/', import.meta.url);
const FS = 'http://127.0.0.1:8080/v1/projects/demo-yardery/databases/(default)/documents/locations/sanford/';
const H = {Authorization: 'Bearer owner', 'content-type': 'application/json'};
const s = v => ({stringValue: v}), arr = v => ({arrayValue: {values: v}}), map = f => ({mapValue: {fields: f}});

// realistic data: a few checks by three people, a delivery, a party, an often-missed task
const now = new Date().toISOString();
for (const [id, name] of [['o-dust', 'Ana'], ['o-bartop', 'Ben'], ['o-display', 'Ana'], ['o-wells', 'Carmen'], ['o-ice', 'Ben']])
  await fetch(FS + 'days/' + TUE + '/checks?documentId=' + id, {method: 'POST', headers: H, body: JSON.stringify({fields: {task: s(id), name: s(name), uid: s('u-' + name), day: s(TUE), at: {timestampValue: now}, tappedAt: {timestampValue: ny(TUE, 11)}}})});
await fetch(FS + 'board/current', {method: 'PATCH', headers: H, body: JSON.stringify({fields: {
  deliveries: arr([map({day: s(TUE), label: s('Wayne Densch (beer)'), maybe: {booleanValue: false}}), map({day: s(new Date(Date.parse(TUE) + 2 * 864e5).toISOString().slice(0, 10)), label: s('Breakthru Beverage (liquor/wine)')})]),
  events: arr([map({day: s(TUE), time: s('5:00–8:00 PM'), guests: {integerValue: '25'}, what: s('40th birthday'), pkg: s('Deluxe package')})]),
  holidays: arr([]), missed: arr([map({id: s('o-tvs'), t: s('TVs on, sports playing'), done: {integerValue: '2'}, of: {integerValue: '6'}})])}})});

const DEVICES = [
  ['phone-small-320', {width: 320, height: 568, mobile: true}],
  ['galaxy-360', {width: 360, height: 740, mobile: true}],
  ['iphone-se-375', {width: 375, height: 667, mobile: true}],
  ['iphone-393', {width: 393, height: 852, mobile: true}],
  ['pixel-412', {width: 412, height: 915, mobile: true}],
  ['phone-landscape', {width: 844, height: 390, mobile: true}],
  ['ipad-portrait', {width: 820, height: 1180, mobile: true}],
  ['ipad-landscape', {width: 1180, height: 820, mobile: true}],
  ['laptop-1366', {width: 1366, height: 768}],
  ['desktop-1920', {width: 1920, height: 1080}],
];
const SHOTS = new Set(['galaxy-360', 'iphone-393', 'phone-landscape', 'ipad-portrait', 'desktop-1920']);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});

function measure() {   // runs in the page
  const out = {overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, header: 0, offscreen: [], smallTap: [], tinyText: [], lowContrast: []};
  const hdr = document.querySelector('header'); out.header = hdr ? Math.round(hdr.getBoundingClientRect().height) : 0;
  const vw = document.documentElement.clientWidth;
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]'); };
  const name = e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) + ' "' + (e.textContent || e.value || '').trim().slice(0, 30) + '"';
  const rgb = c => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 1]; };
  const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = e => { for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if ((c[3] ?? 1) > 0.5) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || e.closest('.toast')) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.right > vw + 1 && cs.position !== 'fixed' && !e.closest('.list,.nflist,[style*="overflow"]')) out.offscreen.push(name(e));
    if (e.matches('button,a,input:not([type=hidden]),select,summary,textarea') && (r.height < 40 || r.width < 40) && !e.matches('.linkbtn,.photo-link,a.tag,.rem a,.foot a') && !(e.matches('input[type=checkbox]') && e.closest('label') && e.closest('label').getBoundingClientRect().height >= 40 && r.width >= 20))
      out.smallTap.push(name(e) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own) {
      const fs = parseFloat(cs.fontSize); if (fs < 12) out.tinyText.push(name(e) + ' ' + fs + 'px');
      const fg = rgb(cs.color), bg = bgOf(e), L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const large = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
      if (ratio < (large ? 3 : 4.5) && !e.closest('del,s') && cs.textDecorationLine.indexOf('line-through') < 0) out.lowContrast.push(name(e) + ' ' + ratio.toFixed(2));
    }
  }
  for (const k of ['offscreen', 'smallTap', 'tinyText', 'lowContrast']) out[k] = [...new Set(out[k])];
  return out;
}

const report = [], errors = [];
for (const [dev, v] of DEVICES) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({viewport: {width: v.width, height: v.height}, isMobile: !!v.mobile, hasTouch: !!v.mobile, colorScheme: scheme, deviceScaleFactor: 1});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(new RegExp(`www\\.gstatic\\.com/firebasejs/${ver.replace(/\./g, '\\.')}/`), r => r.fulfill({contentType: 'text/javascript', body: readFileSync(new globalThis.URL(r.request().url().split('/').pop(), sdkDir))}));
  await ctx.addInitScript(() => { try { localStorage.setItem('foh-name', 'Dana'); } catch (e) {} });
  const p = await ctx.newPage(); await p.clock.setFixedTime(new Date(ny(TUE, 17, 30)));
  p.on('pageerror', e => errors.push(dev + '/' + scheme + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(dev + '/' + scheme + ': ' + m.text()); });
  const pages = [
    ['home', async () => { await p.goto(URL + '?emulator=1'); await p.waitForFunction(() => document.getElementById('team').textContent.includes('Carmen'), null, {timeout: 10000}); }],
    ['daily', async () => { await p.click('#tab-daily'); await p.waitForTimeout(150); }],
    ['notfinished', async () => { await p.click('#tab-home'); await p.click('#nfBtn'); await p.waitForTimeout(150); }],
    ['manager', async () => {
      await p.goto(URL + 'manage.html?emulator=1'); await p.waitForSelector('#gateId:not([hidden]),#editor:not([hidden])', {timeout: 10000});
      if (await p.isVisible('#gateId')) { const uid = await p.textContent('#uid');
        await fetch(FS + 'managers?documentId=' + uid, {method: 'POST', headers: H, body: JSON.stringify({fields: {}})}); await p.reload(); }
      await p.waitForSelector('#editor:not([hidden])', {timeout: 10000}); await p.waitForTimeout(200); }],
    ['arrange', async () => { await p.click('#arrangeBtn'); await p.waitForTimeout(150); }],
  ];
  for (const [pg, go] of pages) {
    await go(); await p.evaluate(() => window.scrollTo(0, 0));
    const m = await p.evaluate(measure); report.push({dev, scheme, page: pg, ...m});
    if (SHOTS.has(dev)) await p.screenshot({path: `${OUT}/${dev}-${scheme}-${pg}.png`});
  }
  await ctx.close();
}
// ---- speed (iPhone-size, emulator on this machine; real phones add their network time) ----
const speed = {};
{
  const mk = async () => { const c = await browser.newContext({viewport: {width: 393, height: 852}, isMobile: true, hasTouch: true});
    await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await c.route(new RegExp(`www\\.gstatic\\.com/firebasejs/${ver.replace(/\./g, '\\.')}/`), r => r.fulfill({contentType: 'text/javascript', body: readFileSync(new globalThis.URL(r.request().url().split('/').pop(), sdkDir))}));
    await c.addInitScript(() => { try { localStorage.setItem('foh-name', 'Sam'); } catch (e) {} });
    const p = await c.newPage(); await p.clock.setFixedTime(new Date(ny(TUE, 12))); return p; };
  const a = await mk(), b = await mk();
  let t0 = Date.now(); await a.goto(URL + '?emulator=1'); await a.waitForSelector('#dailyLists .box', {state: 'attached'}); speed.firstListsMs = Date.now() - t0;
  await a.waitForFunction(() => document.getElementById('team').textContent.includes('Carmen'), null, {timeout: 10000}); speed.teamDataMs = Date.now() - t0;
  await b.goto(URL + '?emulator=1'); await b.waitForFunction(() => document.getElementById('team').textContent.includes('Carmen'), null, {timeout: 10000});
  await a.click('#tab-daily'); await b.click('#tab-daily');
  speed.tabSwitchMs = await a.evaluate(() => { const t = performance.now(); document.getElementById('tab-weekly').click(); document.getElementById('tab-daily').click(); return Math.round((performance.now() - t) / 2 * 10) / 10; });
  const id = await a.evaluate(() => document.querySelector('#dailyLists ul.list .box:not([aria-pressed="true"])').id);
  const tapStart = Date.now(); await a.click('#' + id); await a.waitForFunction(i => document.getElementById(i).getAttribute('aria-pressed') === 'true', id); speed.tapToCheckedMs = Date.now() - tapStart;
  await b.waitForFunction(i => document.getElementById(i) && document.getElementById(i).getAttribute('aria-pressed') === 'true', id, {timeout: 10000}); speed.otherPhoneSeesItMs = Date.now() - tapStart;
  speed.rebuildMs = await a.evaluate(() => { const t = performance.now(); for (let i = 0; i < 10; i++) document.getElementById('tab-home').click(); return Math.round((performance.now() - t) / 10 * 10) / 10; });
  await a.context().close(); await b.context().close();
}
console.log('Speed: ' + JSON.stringify(speed));
await browser.close(); server.close();
writeFileSync(OUT + '/report.json', JSON.stringify({report, errors}, null, 1));
const bad = report.filter(r => r.overflowX > 0 || r.offscreen.length || r.smallTap.length || r.tinyText.length || r.lowContrast.length);
console.log(`QA: ${report.length} page views, ${bad.length} with findings, ${errors.length} console errors`);
for (const r of bad) console.log(`- ${r.dev}/${r.scheme}/${r.page}: ` + [r.overflowX > 0 && 'sideways ' + r.overflowX + 'px', r.offscreen.length && 'off-screen ' + r.offscreen.slice(0, 3).join('; '),
  r.smallTap.length && 'small taps ' + r.smallTap.slice(0, 4).join('; '), r.tinyText.length && 'tiny text ' + r.tinyText.slice(0, 3).join('; '),
  r.lowContrast.length && 'low contrast ' + r.lowContrast.slice(0, 4).join('; ')].filter(Boolean).join(' | '));
for (const e of errors.slice(0, 10)) console.log('ERROR ' + e);
console.log('Top bar height: ' + [...new Set(report.map(r => r.dev + ' ' + r.header))].filter((x, i, a) => a.findIndex(y => y.split(' ')[0] === x.split(' ')[0]) === i).join(', '));
process.exit(0);
