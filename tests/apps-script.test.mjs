// Runs apps-script/Code.gs outside Google: Drive, Gmail, timers and the Apps Script helpers are stand-ins;
// Firebase is the local emulator (with the data the browser test left: Tue Nov 3, 2026, locked, with photos).
import vm from 'node:vm';
import {TUE, MON, ny, addDays, longDate, shortDate} from './dates.mjs';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
mkdirSync('tests/shots', {recursive: true});

let n = 0, bad = 0;
function t(name, fn) { n++; try { fn(); console.log('PASS', name); } catch (e) { bad++; console.log('FAIL', name, '-', e.message.split('\n')[0]); } }
const ok = (c, m) => { if (!c) throw new Error(m); };

const testCfg = readFileSync('config.js', 'utf8').replace(/firebase:\{[\s\S]*?\n  \},/, "firebase:{apiKey:'demo-key',projectId:'demo-yardery'},");
const site = {'config.js': testCfg, 'tasks.js': readFileSync('tasks.js', 'utf8'), 'report.js': readFileSync('report.js', 'utf8')};
function http(url, opt = {}) {
  const f = url.startsWith('https://5jfwkzfvg4-hash.github.io/yardery-foh/') && url.split('/').pop().split('?')[0];
  if (f) return resp(site[f] ? 200 : 404, site[f] || '');
  const args = ['-s', '-w', '\n%{http_code}', '-X', (opt.method || 'get').toUpperCase(), url];
  Object.entries(opt.headers || {}).forEach(([k, v]) => args.push('-H', k + ': ' + v));
  if (opt.contentType) args.push('-H', 'Content-Type: ' + opt.contentType);
  if (opt.payload) args.push('--data-binary', '@-');
  const out = execFileSync('curl', args, {input: opt.payload || '', maxBuffer: 64e6, env: {...process.env, NO_PROXY: '127.0.0.1', no_proxy: '127.0.0.1'}}).toString();
  const i = out.lastIndexOf('\n'); return resp(+out.slice(i + 1), out.slice(0, i));
}
function resp(code, body) { return {getResponseCode: () => code, getContentText: () => body}; }

const drive = [], props = new Map(), triggers = [];
let drafts = [], created = [];
function blob(content, type, name) { return {content, type, name, getAs(t) { return blob(content, t, name); }, setName(x) { this.name = x; return this; }, getName() { return this.name; }}; }
function draft(subject, body) {
  const d = {subject, body, html: '<div>' + body + '</div>', atts: [], to: 'me@example.com', updated: 0,
    getMessage: () => ({getSubject: () => d.subject, getTo: () => d.to, getCc: () => '', getBcc: () => '', getPlainBody: () => d.body, getBody: () => d.html,
      getAttachments: () => d.atts}),
    update(to, subj, body, o) { d.updated++; d.to = to; d.subject = subj; d.body = body; d.html = o.htmlBody; d.atts = o.attachments; }};
  return d;
}
const ctx = {
  UrlFetchApp: {fetch: http},
  Utilities: {newBlob: blob, formatDate(date, tz, fmt) {
    const p = {}; new Intl.DateTimeFormat('en-US', {timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
      .formatToParts(date).forEach(x => { p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, '0')}:${p.minute}:${p.second}`; }},
  DriveApp: {getFolderById: id => ({createFile(b) { const f = {id: 'f' + drive.length, folder: id, blob: b, getId: () => f.id, getName: () => b.name, getUrl: () => 'drive://' + f.id, getBlob: () => b}; drive.push(f); return f; }}),
    getFileById: id => drive.find(f => f.id === id)},
  GmailApp: {getDrafts: () => drafts, createDraft(to, subject, body, o) { created.push({to, subject, body, o}); },
    search: () => [{getMessages: () => [{getFrom: () => 'GM <gm@example.com>', getTo: () => 'a@example.com, Me <me@example.com>', getCc: () => 'b@example.com'}]}]},
  Session: {getActiveUser: () => ({getEmail: () => 'me@example.com'})},
  PropertiesService: {getScriptProperties: () => ({getProperty: k => props.has(k) ? props.get(k) : null, setProperty: (k, v) => props.set(k, v)})},
  LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock() {}})},
  ScriptApp: {getProjectTriggers: () => triggers, deleteTrigger() {}, newTrigger: h => ({timeBased: () => ({everyMinutes: m => ({create: () => triggers.push({h, m, getHandlerFunction: () => h})})})})},
  Logger: {log() {}}, console, JSON, Date, Math, Object, Array, String, Number, RegExp, Error, encodeURIComponent, Intl, Set,
};
vm.createContext(ctx);
vm.runInContext(readFileSync('apps-script/Code.gs', 'utf8') +
  "\nAUTH_URL='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/';FIRESTORE_URL='http://127.0.0.1:8080/v1/';var NOW_FOR_TESTS=0;", ctx);
const at = iso => { ctx.NOW_FOR_TESTS = Date.parse(iso); vm.runInContext('NOW_FOR_TESTS=' + ctx.NOW_FOR_TESTS, ctx); };

at(ny(TUE, 11)); props.set('since', TUE);
t('setup starts a 5-minute timer and archives nothing during the day', () => {
  vm.runInContext('setup()', ctx); ok(triggers.length === 1 && triggers[0].m === 5, 'trigger'); ok(drive.length === 0, 'pdf too early');
});
t('10:30 PM Tuesday (lock minute): still nothing', () => { at(ny(TUE, 22, 30, 30)); vm.runInContext('tick()', ctx); ok(drive.length === 0, 'pdf before lock+1min'); });
const WORDS = longDate(TUE).split(', ').slice(1).join(', '), LINE = 'Cleaning checklist for ' + longDate(TUE);
drafts = [draft('Yardery Daily Recap — ' + WORDS, 'The Numbers\nNet Sales: $1,000')];
t('10:35 PM: one PDF for Tuesday in the FOH folder, named by the business day', () => {
  at(ny(TUE, 22, 35)); vm.runInContext('tick()', ctx);
  ok(drive.length === 1 && drive[0].folder === '1tZaB6237HVKR-he2SdaktLjWY45LyHsc', 'pdf not saved');
  ok(drive[0].blob.name === 'FOH Cleaning Checklist — ' + shortDate(TUE) + '.pdf' && drive[0].blob.type === 'application/pdf', drive[0].blob.name);
});
const html = drive[0] ? drive[0].blob.content : '';
writeFileSync('tests/shots/report.html', html);
t('the PDF shows done and not-done tasks, who and when, and the photos', () => {
  ok(html.includes(longDate(TUE)), 'date');
  ok(/NOT DONE/.test(html) && /Done<\/td><td>Ana/.test(html), 'status');
  ok((html.match(/<img src="data:image\/jpeg/g) || []).length >= 3, 'photos');
  ok(html.includes('Men’s restroom') || html.includes('Men&#x27;s') || html.includes('Men'), 'photo spot labels');
});
t('the recap draft gets the line and the PDF at the end (kept: subject, recap text)', () => {
  const d = drafts[0]; ok(d.updated === 1, 'not updated');
  ok(d.body.startsWith('The Numbers') && d.body.trim().endsWith(LINE), d.body);
  ok(d.html.endsWith('<p>' + LINE + '</p>'), d.html);
  ok(d.atts.length === 1 && d.atts[0].name.endsWith('.pdf'), 'attachment');
});
t('runs again: no second PDF, no second attachment', () => { at(ny(TUE, 22, 40)); vm.runInContext('tick()', ctx); ok(drive.length === 1 && drafts[0].updated === 1, 'repeated'); });

// No recap draft: wait until 5 AM, then create one
props.delete('mail:' + TUE); drafts = [draft('Yardery Daily Recap — ' + longDate(MON).split(', ').slice(1).join(', '), 'old')];
t('no recap draft at 1 AM: waits', () => { at(ny(addDays(TUE, 1), 1)); vm.runInContext('tick()', ctx); ok(created.length === 0 && drafts[0].updated === 0, 'too early / wrong draft'); });
t('no recap draft at 5:05 AM: creates "Yardery Daily Recap — <date>" with the line and PDF', () => {
  at(ny(addDays(TUE, 1), 5, 5)); vm.runInContext('tick()', ctx);
  ok(created.length === 1, 'no draft'); const c = created[0];
  ok(c.subject === 'Yardery Daily Recap — ' + WORDS && c.body.startsWith(LINE), c.subject + ' / ' + c.body);
  ok(c.o.attachments.length === 1 && c.to === 'gm@example.com,a@example.com,b@example.com', 'attachment/recipients');
});
t('Monday is skipped (closed)', () => { at(ny(TUE, 3)); props.set('since', MON); const before = drive.length; vm.runInContext('tick()', ctx); ok(drive.length === before, 'archived a Monday'); });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
const page = await browser.newPage(); await page.setContent(html);
await page.pdf({path: 'tests/shots/report-sample.pdf', format: 'Letter', margin: {top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in'}, printBackground: true});
await page.setViewportSize({width: 816, height: 1056}); await page.screenshot({path: 'tests/shots/report-page1.png'});
await browser.close();
console.log(`\n${n - bad} of ${n} nightly-PDF script checks passed`);
process.exit(bad ? 1 : 0);
