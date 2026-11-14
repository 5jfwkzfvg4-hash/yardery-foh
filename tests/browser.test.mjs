// Two-browser test against the Firebase emulator (run with: npm test).
// Phone-width (390 px) and desktop windows, live sync, uncheck rules, offline, day rules, no sideways scroll, no console errors.
import http from 'node:http';
import {TUE, ny} from './dates.mjs';
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
  if (!/^(index\.html|manage\.html|config\.js|tasks\.js|report\.js|reminders\.js|proposals\/tasks\.json)$/.test(file)) { r.writeHead(404); return r.end(); }
  const body = file === 'config.js' ? (path.startsWith('/noconfig/') ? noCfg : testCfg) : readFileSync(file === 'proposals/tasks.json' ? 'tests/fixtures/proposal.json' : file);
  r.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8'}); r.end(body);
}).listen(0);
const URL = `http://127.0.0.1:${server.address().port}/`;
const sdkDir = new URL_('../node_modules/firebase/', import.meta.url);
function URL_(p, b) { return new globalThis.URL(p, b); }
mkdirSync('tests/shots', {recursive: true});

let n = 0, bad = 0;
async function t(name, fn) { n++; try { await fn(); console.log('PASS', name); } catch (e) { bad++; console.log('FAIL', name, '-', e.message.split('\n')[0]); } }
const ok = (c, m) => { if (!c) throw new Error(m); };

// A fake camera (moving test pattern) stands in for the phone camera.
const browser = await chromium.launch({args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
const errors = [];
const OPEN_TIME = ny(TUE, 11);   // the most recent Tuesday, 11 AM in Sanford
async function open(label, opts, url = URL + '?emulator=1') {
  const ctx = await browser.newContext(opts);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(new RegExp(`www\\.gstatic\\.com/firebasejs/${ver.replace(/\./g, '\\.')}/`), r =>
    r.fulfill({contentType: 'text/javascript', body: readFileSync(new globalThis.URL(r.request().url().split('/').pop(), sdkDir))}));
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED|Failed to load resource/.test(m.text() + (m.location().url || ''))) errors.push(label + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(label + ': ' + e.message));
  await page.clock.setFixedTime(new Date(OPEN_TIME));   // a Tuesday morning, so the checklist is open
  await page.goto(url);
  return {ctx, page};
}
const phone = {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, permissions: ['camera']};
const desk = {viewport: {width: 1280, height: 900}, permissions: ['camera']};
const A = await open('phone', phone), B = await open('desktop', desk);
const pa = A.page, pb = B.page;
const pressed = (p, id) => p.getAttribute('#chk-' + id, 'aria-pressed');
const openDone = p => p.evaluate(() => document.querySelectorAll('details.donebox').forEach(d => { d.open = true; }));
const waitPressed = (p, id, v) => p.waitForFunction(([id, v]) => document.getElementById('chk-' + id)?.getAttribute('aria-pressed') === v, [id, v], {timeout: 5000});

await t('first visit asks for a first name', async () => { ok(await pa.isVisible('#setup'), 'setup hidden'); });
await pa.fill('#firstName', 'ana'); await pa.click('#setupForm .go');
await pb.fill('#firstName', 'Ben'); await pb.click('#setupForm .go');
await t('Home: duty reminder, health code of the day with Food Code link, standard of the day', async () => {
  await pa.click('#tab-home');
  ok((await pa.textContent('#duty')).includes('Bartender on duty'), 'duty');
  const rem = await pa.textContent('#reminders'); ok(rem.includes('Health code') && rem.includes('Standard'), rem);
  ok((await pa.getAttribute('#reminders a', 'href')).includes('Food-Code'), 'no code link');
  ok(rem.includes('Change the sanitizer water and rag every 2 hours') && rem.includes('before you can close out your shift') && rem.includes('Bathrooms have not been kept up'), 'standing reminders missing');
});
await t('Home shows the service standards card', async () => {
  await pa.click('#tab-home'); const txt = await pa.textContent('#standards');
  ok(await pa.isVisible('#standards') && txt.includes('See it, clean it') && txt.includes('No guest refills their own drink'), txt);
});
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
await t('a checked task leaves the list on every phone and shows under "Done today" with who and when', async () => {
  const inMain = await pb.evaluate(() => !!document.querySelector('#dailyLists > ul.list #chk-o-dust'));
  const inDone = await pb.evaluate(() => !!document.querySelector('#dailyLists details.donebox #chk-o-dust'));
  ok(!inMain && inDone, 'main ' + inMain + ' done ' + inDone);
  ok(/^Done today \(\d+\)$/.test(await pb.textContent('#dailyLists details.donebox summary')), 'summary');
  ok(await pb.isHidden('#chk-o-dust'), 'done section should start closed');
  await pa.click('#tab-daily'); await pa.evaluate(() => { const d = document.querySelector('#dailyLists details.donebox'); if (d) { d.open = true; d.scrollIntoView(); } }); await pa.screenshot({path: 'tests/shots/phone-done.png'});
  await pa.evaluate(() => document.querySelectorAll('details.donebox').forEach(d => { d.open = false; }));
});
await t("another employee can't uncheck it (message shown, stays checked)", async () => {
  await openDone(pb); await pb.click('#chk-o-dust'); await pb.waitForSelector('.toast.show');
  ok((await pb.textContent('#toast')).includes('Only Ana or a manager'), await pb.textContent('#toast'));
  await pb.waitForTimeout(800); ok(await pressed(pb, 'o-dust') === 'true', 'was unchecked');
});
await t('the person who checked it can uncheck it; desktop updates live', async () => {
  await openDone(pa); await pa.click('#chk-o-dust'); await waitPressed(pb, 'o-dust', 'false');
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
await t('photo task: camera opens (camera only), Take photo shows a preview with Retake / Use photo', async () => {
  await pa.click('#tab-daily');
  ok(await pa.getAttribute('#camFile', 'capture') === 'environment', 'fallback input must open the camera, not the camera roll');
  await pa.click('#chk-o-garnish'); await pa.waitForSelector('#cam:not([hidden])');
  await pa.waitForFunction(() => document.getElementById('camVideo').videoWidth > 0 && !document.getElementById('camSnap').disabled, null, {timeout: 6000});
  ok(await pa.isHidden('#camUse') && await pa.isHidden('#camRetake'), 'use/retake before a photo');
  await pa.click('#camSnap');
  ok(await pa.isVisible('#camShot') && await pa.isVisible('#camRetake') && await pa.isVisible('#camUse') && await pa.isHidden('#camVideo'), 'no preview');
  ok((await pa.getAttribute('#camShot', 'src')).startsWith('data:image/jpeg;base64,'), 'not a jpeg');
  await pa.screenshot({path: 'tests/shots/phone-photo-preview.png'});
  await pa.click('#camRetake'); await pa.waitForFunction(() => !document.getElementById('camVideo').hidden && document.getElementById('camVideo').videoWidth > 0, null, {timeout: 6000});
  ok(await pa.isHidden('#camShot'), 'retake did not go back to the camera');
  ok(await pressed(pa, 'o-garnish') === 'false', 'checked before Use photo');
  await pa.click('#camSnap'); await pa.click('#camUse');
  await pa.waitForSelector('#cam', {state: 'hidden'}); await waitPressed(pa, 'o-garnish', 'true');
});
await t('photo task: the other phone sees the check and can view the photo', async () => {
  await pb.click('#tab-daily'); await waitPressed(pb, 'o-garnish', 'true');
  await openDone(pb); await pb.click('#chk-o-garnish + .t .photo-link'); await pb.waitForSelector('#viewImgs img', {timeout: 6000});
  ok((await pb.getAttribute('#viewImgs img', 'src')).startsWith('data:image/jpeg'), 'no image'); await pb.click('#viewClose');
});
await t('photo task with two spots asks for each (Men\u2019s, then Women\u2019s restroom)', async () => {
  await pa.click('#chk-c-rest'); await pa.waitForFunction(() => !document.getElementById('camSnap').disabled, null, {timeout: 6000});
  ok((await pa.textContent('#camStep')).includes('Photo 1 of 2'), await pa.textContent('#camStep'));
  await pa.click('#camSnap'); await pa.click('#camUse');
  await pa.waitForFunction(() => document.getElementById('camStep').textContent.includes('Photo 2 of 2') && !document.getElementById('camSnap').disabled, null, {timeout: 6000});
  await pa.click('#camSnap'); await pa.click('#camUse'); await waitPressed(pb, 'c-rest', 'true');
  ok((await pb.textContent('#chk-c-rest + .t .photo-link')) === 'View photos (2)', 'two photos');
});
await t('photo task: Cancel leaves it unchecked', async () => {
  await pa.click('#chk-c-sinks'); await pa.waitForSelector('#cam:not([hidden])'); await pa.click('#camClose');
  await pa.waitForSelector('#cam', {state: 'hidden'}); ok(await pressed(pa, 'c-sinks') === 'false', 'checked without a photo');
});
await t('Home: team progress shows each person with their share of today\'s tasks', async () => {
  await pb.click('#tab-home'); await pb.waitForFunction(() => /Ana[\s\S]*%/.test(document.getElementById('team').textContent), null, {timeout: 6000});
  const txt = await pb.textContent('#team'); ok(/Ana\d+% · \d+ task/.test(txt.replace(/\s+/g, '')) || /Ana.*%/.test(txt), txt);
});
await t('Home: delivery and party reminders from the calendar board, and the next 7 days', async () => {
  const H = {Authorization: 'Bearer owner', 'content-type': 'application/json'};
  const day = await pa.evaluate(() => document.getElementById('todayTitle').textContent);
  const iso = TUE, next = new Date(Date.parse(TUE + 'T12:00:00Z') + 2 * 864e5).toISOString().slice(0, 10);
  const arr = v => ({arrayValue: {values: v}}), m = f => ({mapValue: {fields: f}}), str = v => ({stringValue: v});
  const body = {fields: {deliveries: arr([m({day: str(iso), label: str('Wayne Densch (beer)')}), m({day: str(next), label: str('Breakthru Beverage (liquor/wine)')})]),
    events: arr([m({day: str(iso), time: str('5:00–8:00 PM'), what: str('30th birthday'), guests: {integerValue: '20'}, pkg: str('Standard package')})]),
    holidays: arr([]), missed: arr([m({id: str('o-tvs'), t: str('TVs on, sports playing'), done: {integerValue: '2'}, of: {integerValue: '6'}})])}};
  const r = await fetch('http://127.0.0.1:8080/v1/projects/demo-yardery/databases/(default)/documents/locations/sanford/board/current', {method: 'PATCH', headers: H, body: JSON.stringify(body)});
  ok(r.ok, 'seed ' + r.status);
  await pa.click('#tab-home');
  await pa.waitForFunction(() => document.getElementById('reminders').textContent.includes('Wayne Densch (beer) today'), null, {timeout: 6000});
  const rem = await pa.textContent('#reminders');
  ok(rem.includes('Nothing on the kegs') && rem.includes('30th birthday') && rem.includes('TVs on, sports playing') && rem.includes('2 of the last 6'), rem);
  ok(await pa.isVisible('#soonCard') && (await pa.textContent('#soonList')).includes('Breakthru Beverage'), 'coming up');
  await pa.screenshot({path: 'tests/shots/phone-home.png', fullPage: true});
});
await t('Opening the site: Home first; within 2 hours it resumes where you left off; after 2 hours, Home again', async () => {
  const ctx = await browser.newContext(phone); await ctx.route(/fonts\.|gstatic/, r => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('foh-name', 'Eve'); } catch (e) {} });
  const p = await ctx.newPage(); await p.clock.setFixedTime(new Date(OPEN_TIME));
  await p.goto(URL + 'noconfig/#daily'); await p.waitForTimeout(200);
  ok(await p.isVisible('#home') && await p.isHidden('#daily'), 'first open did not land on Home');
  await p.click('#tab-weekly'); await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(400);
  await p.clock.setFixedTime(new Date(Date.parse(OPEN_TIME) + 90 * 60e3)); await p.reload(); await p.waitForTimeout(300);
  ok(await p.isVisible('#weekly'), 'did not resume within 2 hours');
  ok(await p.evaluate(() => window.scrollY) > 100, 'scroll not restored');
  await p.clock.setFixedTime(new Date(Date.parse(OPEN_TIME) + 125 * 60e3)); await p.reload(); await p.waitForTimeout(300);
  ok(await p.isVisible('#home'), 'did not go Home after 2 hours');
  await ctx.close();
});
await t('Not finished: count on Home, list by section, position filter, tap jumps to the task', async () => {
  await pa.click('#tab-home'); const c = await pa.textContent('#nfCount'); ok(/\d+ tasks left today/.test(c), c);
  await pa.click('#nfBtn'); ok(await pa.isVisible('#notdone'), 'not open'); await pa.screenshot({path: 'tests/shots/phone-notfinished.png'});
  const n = await pa.locator('#nfList .nfrow').count(); ok(n > 10, 'rows ' + n);
  ok(!(await pa.textContent('#nfList')).includes('Entire bar top and display shelves wiped down'), 'shows a finished task');
  const filters = await pa.locator('#nfFilters button').allTextContents(); ok(filters.includes('Mine'), filters.join());
  await pa.click('#nfFilters button:text-is("Mine")'); const mine = await pa.locator('#nfList .nfrow').count(); ok(mine < n, 'mine did not filter');
  await pa.click('#nfFilters button:text-is("All")');
  const first = await pa.locator('#nfList .nfrow .ttl').first().textContent(); await pa.locator('#nfList .nfrow').first().click();
  ok(await pa.isVisible('#daily'), 'did not go to Daily'); await pa.waitForSelector('.task.flash');
  ok((await pa.textContent('.task.flash .ttl')) === first, 'wrong task');
  await pa.click('#tab-home');
});
await t('a manager can uncheck anyone', async () => {
  const H = {Authorization: 'Bearer owner', 'content-type': 'application/json'};
  const base = 'http://127.0.0.1:8080/v1/projects/demo-yardery/databases/(default)/documents/locations/sanford/';
  const devs = await (await fetch(base + 'devices', {headers: H})).json();
  const ben = devs.documents.find(d => d.fields.name.stringValue === 'Ben').name.split('/').pop();
  await fetch(base + 'managers?documentId=' + ben, {method: 'POST', headers: H, body: JSON.stringify({fields: {name: {stringValue: 'Ben'}}})});
  await pb.waitForTimeout(800);
  await pb.click('#tab-daily'); await openDone(pb); await pb.click('#chk-o-taps'); await waitPressed(pa, 'o-taps', 'false');
});
await t('staff page shows the Manager page link only on manager phones', async () => {
  await pb.reload(); await pb.click('#tab-home'); await pb.waitForSelector('.mgr-home a.mgr:not([hidden])', {timeout: 8000});
  ok(await pa.locator('a.mgr:visible').count() === 0, 'staff phone sees the manager link');
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
  const chips = await pm.locator('li:has(#t-o-dust) > .row .chip').allTextContents(); ok(chips.join('|') === 'AM Bar|PM Bar|AM Server|PM Server|Food Runner', 'positions: ' + chips);
  await pm.click('#tabs button[data-tab=positions]'); await pm.waitForFunction(() => /Ana[\s\S]*Ben/.test(document.getElementById('peopleList').textContent), null, {timeout: 6000});
  await pm.click('#tabs button[data-tab=daily]');
  await pm.fill('#t-o-dust', 'Walls, ceilings, lights and fans brushed');
  await pm.locator('li:has(#t-o-dust) .chip', {hasText: /^AM Bar$/}).click();
  await pm.locator('li:has(#t-o-dust) details.people summary').click();
  await pm.locator('li:has(#t-o-dust) details.people .chip', {hasText: /^Ana$/}).click();
  await pm.locator('li:has(#t-o-taps) select.move').selectOption({label: 'Daily › Close · Bar breakdown'});
  await pm.locator('.grp', {has: pm.locator('#t-c-tvs')}).locator('.btn.add').click();
  await pm.keyboard.type('Patio heaters off');
  ok(!(await pm.isDisabled('#save')), 'save disabled');
  await pm.click('#save');
  await pa.click('#tab-daily');
  await pa.waitForFunction(() => document.querySelector('#chk-o-dust + .t .ttl')?.textContent === 'Walls, ceilings, lights and fans brushed', null, {timeout: 6000});
  const tags = await pa.textContent('#chk-o-dust + .t .tags'); ok(tags.includes('AM Bar') && tags.includes('For Ana'), 'no position/person tag: ' + tags);
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
  await pm.click('#tabs button[data-tab=positions]'); await pm.fill('#newPos', 'Host'); await pm.click('#addPos');
  const first = pm.locator('#posList .pos-row input').first(); await first.fill('AM Bar Lead'); await first.press('Enter'); await first.blur();
  await pm.click('#save');
  await pa.waitForFunction(() => document.querySelector('#chk-o-dust + .t .tags')?.textContent.includes('AM Bar Lead'), null, {timeout: 6000});
});
await t('manager page: prepared changes are offered, added in place with one tap, and reach staff after Save', async () => {
  await pm.reload(); await pm.waitForSelector('#proposal:not([hidden])', {timeout: 8000});
  const items = await pm.locator('#propList li').allTextContents();
  ok(items.length === 12 && items.includes('New monthly section: Monthly · Deep clean') && items.includes('Add to Close · Bar breakdown: Syrup bottles wiped') && items.includes('Add to Sunday: ALL cut fruit and juices in pour bottles thrown out'), items.join(' | '));
  ok(items.includes('“Beer taps on” → “Beer taps turned on”') && !items.some(x => x.includes('Should not apply')) && items.some(x => x.startsWith('Section “Open · Floor”')), 'edits: ' + items.join(' | '));
  await pm.click('#propAdd'); ok(await pm.isHidden('#proposal') && !(await pm.isDisabled('#save')), 'not added');
  ok((await pm.inputValue('#t-c-syrup')) === 'Syrup bottles wiped', 'syrup missing');
  await pm.click('#save');
  await pa.click('#tab-daily'); await pa.waitForSelector('#chk-c-syrup', {timeout: 6000});
  const order = await pa.evaluate(() => [...document.querySelectorAll('#dailyLists .box')].map(b => b.id));
  ok(order.indexOf('chk-c-wellin') === order.indexOf('chk-c-bottles') + 1 && order.indexOf('chk-c-syrup') === order.indexOf('chk-c-wellin') + 1, 'wrong place');
  ok((await pa.textContent('#chk-c-syrup + .t .tags')).includes('PM Bar'), 'no position');
  ok((await pa.textContent('#chk-o-taps + .t .ttl')) === 'Beer taps turned on', 'edit not live');
  ok((await pa.textContent('#dailyLists')).includes('Open · Floor & entry'), 'section rename not live');
  await pa.waitForSelector('#tab-monthly:not([hidden])', {timeout: 6000}); await pa.click('#tab-monthly');
  await pa.click('#chk-m-walls'); await waitPressed(pa, 'm-walls', 'true');
  await pb.click('#tab-home'); await pb.waitForFunction(() => document.getElementById('sumMonthPct').textContent === '100%', null, {timeout: 6000});
  await pm.reload(); await pm.waitForSelector('#editor:not([hidden])'); await pm.waitForTimeout(800);
  ok(await pm.isHidden('#proposal'), 'offered again after saving');
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

// Closing countdown and lock (Tue closes 10 PM, locks 10:30 PM; closed Mondays)
async function at(iso) {
  const ctx = await browser.newContext(phone); await ctx.route(/fonts\.|gstatic/, r => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('foh-name', 'Dee'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push('at: ' + e.message));
  await p.clock.setFixedTime(new Date(iso)); await p.goto(URL + 'noconfig/#daily'); await p.waitForTimeout(300); await p.click('#tab-daily'); return p;
}
await t('before closing: no countdown', async () => { const p = await at('2026-11-04T01:59:00Z'); ok(await p.isHidden('#lockbar'), 'bar shown'); await p.context().close(); });
await t('10:10 PM Tuesday: countdown shows 20:00 left', async () => {
  const p = await at('2026-11-04T03:10:00Z'); const txt = await p.textContent('#lockbar');
  ok(await p.isVisible('#lockbar') && txt.includes('locks in 20:00'), txt);
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); ok(w[0] <= w[1], 'sideways scroll during countdown ' + w);
  await p.screenshot({path: 'tests/shots/phone-countdown.png'}); await p.context().close();
});
await t('12:15 AM Saturday: Friday\'s countdown (closes at midnight) shows 15:00', async () => {
  const p = await at('2026-11-07T05:15:00Z'); ok((await p.textContent('#lockbar')).includes('locks in 15:00'), await p.textContent('#lockbar'));
  ok((await p.textContent('#dayDate')).startsWith('Friday'), 'not Friday'); await p.context().close();
});
await t('10:31 PM Tuesday: locked; tapping a task says so and changes nothing', async () => {
  const p = await at('2026-11-04T03:31:00Z'); ok((await p.textContent('#lockbar')).includes('locked'), await p.textContent('#lockbar'));
  await p.click('#chk-o-dust'); await p.waitForSelector('.toast.show'); ok((await p.textContent('#toast')).includes('locked'), await p.textContent('#toast'));
  ok(await p.isHidden('#cam'), 'camera opened'); await p.context().close();
});
await t('Monday: closed, no checklists, Home says Closed', async () => {
  const p = await at('2026-11-02T17:00:00Z'); ok(await p.isHidden('#dailyLists') && await p.isVisible('#dayClosed'), 'lists shown');
  await p.click('#tab-home'); ok((await p.textContent('#sumDayPct')) === 'Closed', await p.textContent('#sumDayPct'));
  await p.screenshot({path: 'tests/shots/phone-monday.png'}); await p.context().close();
});
await t('a phone open at lock time records the lock; then the database refuses changes', async () => {
  const H = {Authorization: 'Bearer owner'};
  const r = await fetch('http://127.0.0.1:8080/v1/projects/demo-yardery/databases/(default)/documents/locations/sanford/locks/' + TUE, {headers: H});
  ok(r.status === 404, 'lock exists early');
  const ctx = await browser.newContext(phone); await ctx.route(/fonts\./, r => r.abort());
  await ctx.route(new RegExp(`www\\.gstatic\\.com/firebasejs/${ver.replace(/\./g, '\\.')}/`), r =>
    r.fulfill({contentType: 'text/javascript', body: readFileSync(new globalThis.URL(r.request().url().split('/').pop(), sdkDir))}));
  const p = await ctx.newPage(); await p.clock.setFixedTime(new Date(ny(TUE, 22, 31)));
  await p.goto(URL + '?emulator=1#daily'); await p.fill('#firstName', 'Cy'); await p.click('#setupForm .go');
  let found = false; for (let i = 0; i < 40 && !found; i++) { await p.waitForTimeout(250); found = (await fetch('http://127.0.0.1:8080/v1/projects/demo-yardery/databases/(default)/documents/locations/sanford/locks/' + TUE, {headers: H})).status === 200; }
  ok(found, 'no lock record'); await ctx.close();
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
