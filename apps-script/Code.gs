/* ===== FOH nightly checklist PDF (Google Apps Script, runs in Clay's Google account) =====
   Every 5 minutes it checks whether a business day's checklist has locked (30 min after closing; see config.js).
   Then, once per day:
     1. records the lock in the database (so nothing changes after the PDF),
     2. makes a PDF of what was and wasn't done, with photos, and saves it in Drive
        "The Yardery — Clay / 11 FOH Cleaning Checklists",
     3. adds "Cleaning checklist for <date>" and the PDF to the end of Clay's draft "Yardery Daily Recap — <date>",
        or, if there's no such draft by 5 AM, creates that draft with just the line and the PDF, addressed like the
        latest "Yardery Daily Recap" email in the inbox (no addresses are stored in this public code).
   It never sends email. The schedule, task lists and PDF layout come from the live site (config.js, tasks.js,
   report.js), so they stay in step with the staff page without editing this script.
   Setup: open the project, choose "setup" and Run (see FOH-NIGHTLY-PDF.md). */

var SITE = 'https://5jfwkzfvg4-hash.github.io/yardery-foh/';
var FOLDER_ID = '1tZaB6237HVKR-he2SdaktLjWY45LyHsc';   // Drive: The Yardery — Clay / 11 FOH Cleaning Checklists
var AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/';
var FIRESTORE_URL = 'https://firestore.googleapis.com/v1/';

/* Run once: starts the 5-minute timer. Only days from today on are archived. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'tick') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(5).create();
  var S = loadSite_(), off = offsetFn_(S.config);
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('since')) props.setProperty('since', S.report.businessDay(now_(), S.config, off));
  Logger.log('FOH nightly PDF is on. Archiving business days from ' + props.getProperty('since') + '.');
  tick();
}

/* Optional check: makes a PDF of today's checklist so far, named "(test)", without locking or touching email. */
function testNow() {
  var S = loadSite_(), off = offsetFn_(S.config);
  var day = S.report.businessDay(now_(), S.config, off);
  var file = makePdf_(S, day, off, {test: true});
  Logger.log('Test PDF: ' + file.getUrl());
}

function tick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var S = loadSite_(), C = S.config, R = S.report, off = offsetFn_(C), now = now_();
    var props = PropertiesService.getScriptProperties();
    var since = props.getProperty('since') || '0000-00-00';
    var today = R.businessDay(now, C, off);
    [R.addDays(today, -2), R.addDays(today, -1), today].forEach(function (day) {
      if (day < since || R.isClosed(day, C)) return;
      var lockAt = R.lockAt(day, C, off);
      if (lockAt == null || now < lockAt + 60000) return;
      if (!props.getProperty('pdf:' + day)) {
        var file = makePdf_(S, day, off, {lockAt: lockAt});
        props.setProperty('pdf:' + day, file.getId());
      }
      if (!props.getProperty('mail:' + day)) {
        var done = mail_(S, day, off, now, DriveApp.getFileById(props.getProperty('pdf:' + day)));
        if (done) props.setProperty('mail:' + day, done);
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- PDF ---------- */
function makePdf_(S, day, off, opt) {
  var C = S.config, R = S.report, auth = signIn_(C);
  try {
    var base = 'projects/' + C.firebase.projectId + '/databases/(default)/documents/locations/' + C.locationId + '/';
    if (!opt.test) lockDay_(auth, base, day);
    var saved = fsGet_(auth, base + 'config/tasks');
    var tasks = saved ? {daily: saved.daily || [], weekly: saved.weekly || []} : R.fromBuiltIn(S.tasks);
    var dayChecks = checks_(fsList_(auth, base + 'days/' + day + '/checks'));
    var weekChecks = checks_(fsList_(auth, base + 'weeks/' + R.mondayOf(day) + '/checks'));
    var photos = {};
    [dayChecks, weekChecks].forEach(function (set) {
      Object.keys(set).forEach(function (k) {
        if (set === weekChecks && set[k].day !== day) return;
        (set[k].photos || []).forEach(function (pid) {
          var p = fsGet_(auth, base + 'photos/' + pid);
          if (p && p.img) photos[pid] = p.img;
        });
      });
    });
    var html = R.build({day: day, location: C.locationName || 'The Yardery', tasks: tasks, dayChecks: dayChecks,
      weekChecks: weekChecks, photos: photos, lockedAt: opt.lockAt, generatedAt: now_()}, off);
    var name = 'FOH Cleaning Checklist — ' + R.shortDate(day) + (opt.test ? ' (test)' : '') + '.pdf';
    var pdf = Utilities.newBlob(html, 'text/html', 'checklist.html').getAs('application/pdf').setName(name);
    return DriveApp.getFolderById(FOLDER_ID).createFile(pdf);
  } finally {
    signOut_(C, auth);
  }
}
function checks_(docs) {
  var out = {};
  docs.forEach(function (d) {
    var x = d.data, t = x.tappedAt || x.at;
    out[d.id] = {name: x.name || '', at: t ? Date.parse(t) : 0, photos: x.photos || [], slots: x.slots || [], day: x.day || ''};
  });
  return out;
}

/* ---------- Email draft (never sent) ---------- */
function mail_(S, day, off, now, file) {
  var R = S.report, line = 'Cleaning checklist for ' + R.longDate(day);
  var dateWords = R.longDate(day).split(', ').slice(1).join(', ');   // "November 3, 2026"
  var pdf = file.getBlob().setName(file.getName());
  var drafts = GmailApp.getDrafts();
  for (var i = 0; i < drafts.length; i++) {
    var msg = drafts[i].getMessage(), subj = msg.getSubject() || '';
    if (!/daily recap/i.test(subj) || subj.indexOf(dateWords) < 0) continue;
    var atts = msg.getAttachments({includeInlineImages: true, includeAttachments: true});
    if (atts.some(function (a) { return a.getName() === file.getName(); })) return 'recap';
    drafts[i].update(msg.getTo(), subj, msg.getPlainBody() + '\n\n' + line + '\n', {
      htmlBody: msg.getBody() + '<p>' + line + '</p>', cc: msg.getCc(), bcc: msg.getBcc(),
      attachments: atts.concat([pdf])
    });
    return 'recap';
  }
  /* no recap draft: at 5 AM make one with just the line and the PDF */
  if (now >= R.wallToMs(R.addDays(day, 1), 5 * 60, off)) {
    GmailApp.createDraft(recapRecipients_(), 'Yardery Daily Recap — ' + dateWords, line + '\n', {htmlBody: '<p>' + line + '</p>', attachments: [pdf]});
    return 'new';
  }
  return '';
}

/* recipients of the latest recap email in the inbox (sender + To + Cc), without this account's own address */
function recapRecipients_() {
  var me = (Session.getActiveUser().getEmail() || '').toLowerCase(), seen = {}, out = [];
  var threads = GmailApp.search('subject:"Yardery Daily Recap" -in:drafts', 0, 10);
  for (var i = 0; i < threads.length && !out.length; i++) {
    var msgs = threads[i].getMessages(), m = msgs[0];
    [m.getFrom(), m.getTo(), m.getCc()].join(',').split(',').forEach(function (a) {
      var e = (a.match(/<([^>]+)>/) || [null, a])[1].trim().toLowerCase();
      if (e && e.indexOf('@') > 0 && e !== me && !seen[e]) { seen[e] = 1; out.push(e); }
    });
  }
  return out.join(',');
}

/* ---------- Site files (schedule, task lists, PDF layout) ---------- */
function loadSite_() {
  var holder = {};
  ['config.js', 'tasks.js', 'report.js'].forEach(function (f) {
    var res = UrlFetchApp.fetch(SITE + f + '?v=' + now_(), {muteHttpExceptions: true});
    if (res.getResponseCode() !== 200) throw new Error('Could not load ' + f + ' (' + res.getResponseCode() + ')');
    (new Function('window', res.getContentText())).call(holder, holder);
  });
  return {config: holder.FOH_CONFIG, tasks: holder.FOH_TASKS, report: holder.FOHReport};
}
function offsetFn_(C) {
  var tz = C.timeZone || 'America/New_York';
  return function (ms) { return Date.parse(Utilities.formatDate(new Date(ms), tz, "yyyy-MM-dd'T'HH:mm:ss") + 'Z') - Math.floor(ms / 1000) * 1000; };
}
function now_() { return (typeof NOW_FOR_TESTS !== 'undefined' && NOW_FOR_TESTS) ? NOW_FOR_TESTS : Date.now(); }

/* ---------- Firebase (signs in like a staff phone; the security rules apply) ---------- */
function signIn_(C) {
  var res = UrlFetchApp.fetch(AUTH_URL + 'accounts:signUp?key=' + C.firebase.apiKey,
    {method: 'post', contentType: 'application/json', payload: JSON.stringify({returnSecureToken: true}), muteHttpExceptions: true});
  var j = JSON.parse(res.getContentText());
  if (!j.idToken) throw new Error('Firebase sign-in failed: ' + res.getContentText());
  return j.idToken;
}
function signOut_(C, token) {   // removes the temporary sign-in so they don't pile up
  try { UrlFetchApp.fetch(AUTH_URL + 'accounts:delete?key=' + C.firebase.apiKey,
    {method: 'post', contentType: 'application/json', payload: JSON.stringify({idToken: token}), muteHttpExceptions: true}); } catch (e) {}
}
function fsGet_(token, path) {
  var res = UrlFetchApp.fetch(FIRESTORE_URL + path, {headers: {Authorization: 'Bearer ' + token}, muteHttpExceptions: true});
  if (res.getResponseCode() === 404) return null;
  if (res.getResponseCode() !== 200) throw new Error('Firestore ' + path + ': ' + res.getContentText());
  return val_({mapValue: {fields: JSON.parse(res.getContentText()).fields || {}}});
}
function fsList_(token, path) {
  var out = [], page = '';
  do {
    var res = UrlFetchApp.fetch(FIRESTORE_URL + path + '?pageSize=300' + (page ? '&pageToken=' + encodeURIComponent(page) : ''),
      {headers: {Authorization: 'Bearer ' + token}, muteHttpExceptions: true});
    if (res.getResponseCode() !== 200) throw new Error('Firestore ' + path + ': ' + res.getContentText());
    var j = JSON.parse(res.getContentText());
    (j.documents || []).forEach(function (d) { out.push({id: d.name.split('/').pop(), data: val_({mapValue: {fields: d.fields || {}}})}); });
    page = j.nextPageToken || '';
  } while (page);
  return out;
}
function lockDay_(token, base, day) {   // fails harmlessly if a phone already locked the day
  var name = base.replace(/\/$/, '') + '/locks/' + day;
  UrlFetchApp.fetch(FIRESTORE_URL + name.split('/documents/')[0] + '/documents:commit', {
    method: 'post', contentType: 'application/json', headers: {Authorization: 'Bearer ' + token}, muteHttpExceptions: true,
    payload: JSON.stringify({writes: [{update: {name: name, fields: {}}, updateTransforms: [{fieldPath: 'at', setToServerValue: 'REQUEST_TIME'}],
      currentDocument: {exists: false}}]})
  });
}
function val_(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val_);
  if ('mapValue' in v) { var o = {}, f = v.mapValue.fields || {}; Object.keys(f).forEach(function (k) { o[k] = val_(f[k]); }); return o; }
  return null;
}
