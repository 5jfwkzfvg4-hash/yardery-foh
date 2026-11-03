// Two-browser test against the Firebase emulator (run with: npm test).
// Phone-width (390 px) and desktop windows, live sync, uncheck rules, offline, day rules, no sideways scroll, no console errors.
import http from 'node:http';
import {readFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const html = readFileSync('index.html', 'utf8');
const ver = html.match(/firebasejs\/([\d.]+)\//)[1];
// The tests never touch the real database: config.js gets a demo project and the pages talk to the local emulator.
const cfg = readFileSync('config.js', 'utf8');
const testCfg = cfg.replace(/firebase:\{[\s\S]*?\n  \},/, "firebase:{apiKey:'demo-key',authDomain:'demo-yardery.firebaseapp.com',projectId:'demo-yardery',appId:'demo'},");
const noCfg = cfg.replace(/firebase:\{[\s\S]*?\n  \},/, "firebase:{apiKey:'',projectId:''},");
if (testCfg === cfg || noCfg === cfg) throw new Error('config block not found');
const server = http.createServer((q, r) => {
  const path = q.url.split('?')[0], file = path.replace(/^\/(noconfig\/)?/, '') || 'index.html';
  if (!/^(index\.html|manage\.html|config\.js|tasks\.js)$/.test(file)) { r.writeHead(404); return r.end(); }
  const body = file === 'config.js' ? (path.startsWith('/noconfig/') ? noCfg : testCfg) : readFileSync(file);
  r.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8'}); r.end(body);
}).listen(0);
const URL = `http://127.0.0.1:${server.address().port}/`;
const sdkDir = new URL_('../node_modules/firebase/', import.meta.url);
function URL_(p, b) { return new globalThis.URL(p, b); }
mkdirSync('tests/shots', {recursive: true});

let n = 0, bad = 0;
async function t(name, fn) { n++; try { await fn(); console.log('PASS', name); } catch (e) { bad++; console.log('FAIL', name, '-', e.message.split('\n')[0]); } }
const ok = (c, m) => { if (!c) throw new Error(m); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
const errors = [];
async function open(label, opts, url = URL + '?emulator=1') {
  const ctx = await browser.newContext(opts);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(new RegExp(`www\\.gstatic\\.com/firebasejs/${ver.replace(/\./g, '\\.')}/`), r =>
    r.fulfill({contentType: 'text/javascript', body: readFileSync(new globalThis.URL(r.request().url().split('/').pop(), sdkDir))}));
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED|Failed to load resource/.test(m.text() + (m.location().url || ''))) errors.push(label + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(label + ': ' + e.message));
  await page.goto(url);
  return {ctx, page};
}
const phone = {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true};
const desk = {viewport: {width: 1280, height: 900}};
const A = await open('phone', phone), B = await open('desktop', desk);
const pa = A.page, pb = B.page;
const pressed = (p, id) => p.getAttribute('#chk-' + id, 'aria-pressed');
const waitPressed = (p, id, v) => p.waitForFunction(([id, v]) => document.getElementById('chk-' + id)?.getAttribute('aria-pressed') === v, [id, v], {timeout: 5000});

await t('first visit asks for a first name', async () => { ok(await pa.isVisible('#setup'), 'setup hidden'); });
await pa.fill('#firstName', 'ana'); await pa.click('.go');
await pb.fill('#firstName', 'Ben'); await pb.click('.go');
await t('name is remembered and capitalized', async () => { ok((await pa.textContent('#whoName')) === 'Ana', 'name'); });
await pa.click('#tab-daily');
await pa.waitForFunction(() => document.querySelectorAll('#dailyLists .box').length > 30);

await t('check on phone shows on desktop Home within 5 s (team count + name)', async () => {
  await pa.click('#chk-o-dust');
  await pb.waitForFunction(() => document.getElementById('sumDayPct').textContent !== '0%' && document.getElementById('sumDayWho').textContent.includes('Ana'), null, {timeout: 5000});
});
await t('desktop Daily tab shows it checked by Ana with the time', async () => {
  await pb.click('#tab-daily'); await waitPressed(pb, 'o-dust', 'true');
  const who = await pb.textContent('#chk-o-dust + .t .who'); ok(/^Ana · \d{1,2}:\d{2}/.test(who), who);
});
await t("another employee can't uncheck it (message shown, stays checked)", async () => {
  await pb.click('#chk-o-dust'); await pb.waitForSelector('.toast.show');
  ok((await pb.textContent('#toast')).includes('Only Ana or a manager'), await pb.textContent('#toast'));
  await pb.waitForTimeout(800); ok(await pressed(pb, 'o-dust') === 'true', 'was unchecked');
});
await t('the person who checked it can uncheck it; desktop updates live', async () => {
  await pa.click('#chk-o-dust'); await waitPressed(pb, 'o-dust', 'false');
});
await t('desktop check shows on phone live', async () => {
  await pb.click('#chk-o-bartop'); await waitPressed(pa, 'o-bartop', 'true');
});
await t("weekly: today's group is tagged Today and Home shows 'Weekly · <day>' for the team", async () => {
  await pa.click('#tab-weekly');
  const first = await pa.evaluate(() => { const h = [...document.querySelectorAll('#weeklyLists .grp')].find(x => x.querySelector('.today')); return h && h.nextElementSibling.querySelector('.box, ul .box')?.id || h?.nextElementSibling?.nextElementSibling?.querySelector('.box')?.id; });
  ok(first, 'no Today group'); await pa.click('#' + first);
  await pb.click('#tab-home');
  await pb.waitForFunction(() => /^Weekly · \w+day$/.test(document.getElementById('sumWeekLbl').textContent) && document.getElementById('sumWeekPct').textContent !== '0%', null, {timeout: 5000});
});
await t('offline: note shows, check made offline syncs after reconnect', async () => {
  await pa.click('#tab-daily');
  await A.ctx.setOffline(true); await pa.waitForSelector('#offline:not([hidden])', {timeout: 3000});
  ok((await pa.textContent('#offline')) === 'Offline — will sync', 'text');
  await pa.click('#chk-o-taps'); await waitPressed(pa, 'o-taps', 'true');
  await pb.click('#tab-daily'); await pb.waitForTimeout(1500); ok(await pressed(pb, 'o-taps') === 'false', 'synced while offline?');
  await pa.screenshot({path: 'tests/shots/phone-offline.png'});
  await A.ctx.setOffline(false); await pa.waitForSelector('#offline[hidden]', {state: 'attached', timeout: 3000});
  await waitPressed(pb, 'o-taps', 'true');
});
await A.ctx.setOffline(false);
await t('name stays after reload, and comes back from Firebase if the phone forgets it', async () => {
  await pa.reload(); await pa.waitForTimeout(500); ok(!(await pa.isVisible('#setup')), 'asked again');
  await pa.evaluate(() => localStorage.removeItem('foh-name')); await pa.reload();
  await pa.waitForFunction(() => document.getElementById('setup').hidden && document.getElementById('whoName').textContent === 'Ana', null, {timeout: 6000});
});
await t('a manager can uncheck anyone', async () => {
  const H = {Authorization: 'Bearer owner', 'content-type': 'application/json'};
  const base = 'http://127.0.0.1:8080/v1/projects/demo-yardery/databases/(default)/documents/locations/sanford/';
  const devs = await (await fetch(base + 'devices', {headers: H})).json();
  const ben = devs.documents.find(d => d.fields.name.stringValue === 'Ben').name.split('/').pop();
  await fetch(base + 'managers?documentId=' + ben, {method: 'POST', headers: H, body: JSON.stringify({fields: {name: {stringValue: 'Ben'}}})});
  await pb.waitForTimeout(800);
  await pb.click('#chk-o-taps'); await waitPressed(pa, 'o-taps', 'false');
});
await t('manager page: a non-manager phone sees its device ID instead of the editor', async () => {
  const p = await A.ctx.newPage(); await p.goto(URL + 'manage.html?emulator=1');
  await p.waitForSelector('#gateId:not([hidden])', {timeout: 8000});
  ok((await p.textContent('#uid')).length > 10 && await p.isHidden('#editor'), 'gate');
  await p.close();
});
let pm;
await t('manager page: rename, assign a position, move and add tasks, Save; staff phone updates live', async () => {
  pm = await B.ctx.newPage(); pm.on('pageerror', e => errors.push('manage: ' + e.message));
  pm.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('manage: ' + m.text()); });
  await pm.goto(URL + 'manage.html?emulator=1');
  await pm.waitForSelector('#editor:not([hidden])', {timeout: 8000});
  ok((await pm.inputValue('#t-o-dust')) === 'Walls, ceilings, and lights brushed', 'built-in list not loaded');
  await pm.fill('#t-o-dust', 'Walls, ceilings, lights and fans brushed');
  await pm.locator('li:has(#t-o-dust) .chip', {hasText: 'AM Bartender'}).click();
  await pm.locator('li:has(#t-o-taps) select.move').selectOption({label: 'Daily › Close · Bar breakdown'});
  await pm.locator('.grp', {has: pm.locator('#t-c-tvs')}).locator('.btn.add').click();
  await pm.keyboard.type('Patio heaters off');
  ok(!(await pm.isDisabled('#save')), 'save disabled');
  await pm.click('#save');
  await pa.click('#tab-daily');
  await pa.waitForFunction(() => document.querySelector('#chk-o-dust + .t .ttl')?.textContent === 'Walls, ceilings, lights and fans brushed', null, {timeout: 6000});
  const tags = await pa.textContent('#chk-o-dust + .t .tags'); ok(tags.includes('AM Bartender'), 'no position tag: ' + tags);
  const order = await pa.evaluate(() => [...document.querySelectorAll('#dailyLists .ttl')].map(x => x.textContent));
  ok(order.indexOf('Beer taps on') > order.indexOf('Wells broken down; every bottle wiped and locked up'), 'not moved');
  ok(order.includes('Patio heaters off'), 'new task missing');
  ok(await pm.isDisabled('#save'), 'still dirty after save');
});
await t('manager page: removing a task (two taps) removes it from staff phones', async () => {
  const rm = pm.locator('li:has(#t-c-tvs) .btn.danger'); await rm.click(); await rm.click(); await pm.click('#save');
  await pa.waitForFunction(() => !document.getElementById('chk-c-tvs'), null, {timeout: 6000});
});
await t('manager page: a task with no wording cannot be saved', async () => {
  await pm.locator('.grp').first().locator('.btn.add').click(); await pm.click('#save');
  await pm.waitForSelector('.toast.show'); ok((await pm.textContent('#toast')).includes('has no wording'), await pm.textContent('#toast'));
  await pm.click('#discard'); ok(await pm.isDisabled('#save'), 'discard failed');
});
await t('manager page: positions can be added and renamed everywhere', async () => {
  await pm.click('#tabs button[data-tab=positions]'); await pm.fill('#newPos', 'Server'); await pm.click('#addPos');
  const first = pm.locator('#posList .pos-row input').first(); await first.fill('AM Bar'); await first.press('Enter'); await first.blur();
  await pm.click('#save');
  await pa.waitForFunction(() => document.querySelector('#chk-o-dust + .t .tags')?.textContent.includes('AM Bar') && !document.querySelector('#chk-o-dust + .t .tags').textContent.includes('AM Bartender'), null, {timeout: 6000});
});
await t('manager page has no sideways scrolling at 390 px', async () => {
  const p = await (await browser.newContext(phone)).newPage(); await p.route(/fonts\./, r => r.abort());
  await p.route(new RegExp('www\\.gstatic\\.com/firebasejs/'), r => r.abort());
  await p.goto(URL + 'manage.html'); const w = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  ok(w[0] <= w[1], String(w));
  await pm.setViewportSize({width: 390, height: 844}); await pm.click('#tabs button[data-tab=daily]');
  const w2 = await pm.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); ok(w2[0] <= w2[1], 'editor ' + w2);
  await pm.screenshot({path: 'tests/shots/manage-phone.png'}); await p.context().close();
});
await t('no sideways scrolling at 390 px and desktop', async () => {
  for (const [p, tab] of [[pa, 'home'], [pa, 'daily'], [pa, 'weekly'], [pb, 'daily'], [pb, 'weekly']]) {
    await p.click('#tab-' + tab);
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(w[0] <= w[1], tab + ' ' + w);
  }
  await pa.click('#tab-daily'); await pa.screenshot({path: 'tests/shots/phone-daily.png'});
  await pa.click('#tab-home'); await pa.screenshot({path: 'tests/shots/phone-home.png'});
  await pb.click('#tab-home'); await pb.screenshot({path: 'tests/shots/desktop-home.png'});
});

// Day rules in America/New_York: before 5 AM is still the previous day; week starts Monday.
async function dayAt(iso) {
  const ctx = await browser.newContext(desk); await ctx.route(/fonts\.|gstatic/, r => r.abort());
  const p = await ctx.newPage(); await p.clock.setFixedTime(new Date(iso)); await p.goto(URL + 'noconfig/');
  const r = [await p.textContent('#dayDate'), await p.textContent('#weekDate'), await p.textContent('#sumWeekLbl'), await p.textContent('#toast')];
  await ctx.close(); return r;
}
await t('4:59 AM New York Wednesday still counts as Tuesday', async () => { const r = await dayAt('2026-11-04T09:59:00Z'); ok(r[0].startsWith('Tuesday, November 3') && r[2] === 'Weekly · Tuesday', r); });
await t('5:00 AM New York is the new day', async () => { const r = await dayAt('2026-11-04T10:00:00Z'); ok(r[0].startsWith('Wednesday, November 4'), r); });
await t('Monday 3 AM is still last week (Sunday close)', async () => { const r = await dayAt('2026-11-09T08:00:00Z'); ok(r[0].startsWith('Sunday') && r[1].startsWith('Week of November 2'), r); });
await t('Monday 6 AM starts a new week', async () => { const r = await dayAt('2026-11-09T11:00:00Z'); ok(r[1].startsWith('Week of November 9'), r); });
await t('works in summer time (EDT) too', async () => { const r = await dayAt('2026-07-07T08:30:00Z'); ok(r[0].startsWith('Monday, July 6'), r); });
await t('without Firebase settings the page says so instead of failing silently', async () => { const r = await dayAt('2026-11-04T15:00:00Z'); ok(r[3].includes('Not connected'), r[3]); });

await t('no console errors', async () => { ok(!errors.length, errors.join(' | ')); });
await browser.close(); server.close();
console.log(`\n${n - bad} of ${n} browser checks passed`);
process.exit(bad ? 1 : 0);
