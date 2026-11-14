/* ===== FOH schedule + nightly report (shared) =====
   Used by the staff page (countdown and lock), the Google Apps Script that makes the nightly PDF
   (apps-script/Code.gs fetches this file), and the tests. Plain JavaScript, no browser-only features:
   time zones come from the caller's offset function so it also runs in Apps Script. */
(function (root) {
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DEFAULT_SCHEDULE = {closedDays: [1], closeHour: {0: 20, 2: 22, 3: 22, 4: 22, 5: 24, 6: 24}, lockMinutes: 30};

  function parts(day) { var p = day.split('-'); return {y: +p[0], m: +p[1], d: +p[2]}; }
  function utcMidnight(day) { var p = parts(day); return Date.UTC(p.y, p.m - 1, p.d); }
  function dow(day) { return new Date(utcMidnight(day)).getUTCDay(); }
  function addDays(day, n) { return new Date(utcMidnight(day) + n * 864e5).toISOString().slice(0, 10); }
  function schedule(cfg) { return (cfg && cfg.schedule) || DEFAULT_SCHEDULE; }
  function isClosed(day, cfg) { return schedule(cfg).closedDays.indexOf(dow(day)) >= 0; }
  /* wall-clock time `minutes` after midnight of `day` in the store's zone, as a UTC instant (ms).
     offset(ms) = (local wall time - UTC) in ms at that instant. */
  function wallToMs(day, minutes, offset) {
    var guess = utcMidnight(day) + minutes * 60000, t = guess - offset(guess);
    return guess - offset(t);
  }
  function closeAt(day, cfg, offset) {
    var h = schedule(cfg).closeHour[dow(day)];
    return h == null ? null : wallToMs(day, h * 60, offset);
  }
  function lockAt(day, cfg, offset) {
    var c = closeAt(day, cfg, offset);
    return c == null ? null : c + schedule(cfg).lockMinutes * 60000;
  }
  /* the business day at instant `ms`: before the cutoff hour (5 AM) still counts as the previous day */
  function businessDay(ms, cfg, offset) {
    var local = new Date(ms + offset(ms)), cut = (cfg && Number.isInteger(cfg.dayCutoffHour)) ? cfg.dayCutoffHour : 5;
    var day = local.toISOString().slice(0, 10);
    return local.getUTCHours() < cut ? addDays(day, -1) : day;
  }
  function monthOf(day) { return day.slice(0, 8) + '01'; }
  function mondayOf(day) { return addDays(day, -((dow(day) + 6) % 7)); }
  /* 'open' | 'countdown' | 'locked' | 'closed' for business day `day` at instant `now` */
  function state(day, now, cfg, offset) {
    if (isClosed(day, cfg)) return 'closed';
    var c = closeAt(day, cfg, offset), l = lockAt(day, cfg, offset);
    if (c == null) return 'closed';
    return now < c ? 'open' : now < l ? 'countdown' : 'locked';
  }
  function longDate(day) { var p = parts(day); return DAYS[dow(day)] + ', ' + MONTHS[p.m - 1] + ' ' + p.d + ', ' + p.y; }
  function shortDate(day) { var p = parts(day); return DAYS[dow(day)].slice(0, 3) + ' ' + p.m + '/' + p.d + '/' + p.y; }
  function clock(ms, offset) {
    var d = new Date(ms + offset(ms)), h = d.getUTCHours(), m = d.getUTCMinutes();
    return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  /* built-in lists (tasks.js arrays) -> saved-list objects, same shape the manager page saves */
  function fromBuiltIn(T) {
    var PH = T.PHOTO || new Set(), SL = T.SLOTS || {};
    var has = function (id) { return PH.has ? PH.has(id) : PH.indexOf(id) >= 0; };
    function conv(gs) {
      return (gs || []).map(function (g) {
        return {role: g.role, note: g.note || '', day: typeof g.day === 'number' ? g.day : null,
          items: g.items.map(function (i) { return {id: i[0], t: i[1], d: i[2] || '', c: i[3] || [], p: has(i[0]), s: SL[i[0]] || [], pos: [], who: []}; })};
      });
    }
    return {daily: conv(T.DAILY), weekly: conv(T.WEEKLY), monthly: conv(T.MONTHLY), positions: []};
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }

  /* data: {day, location, tasks:{daily,weekly}, dayChecks:{id:{name,at(ms),photos:[ids],slots:[]}},
            weekChecks:{id:{...,day}}, photos:{id:dataUrl}, lockedAt(ms), generatedAt(ms)}  -> HTML (simple tables:
            Apps Script's HTML-to-PDF converter handles tables and <img> but not flexbox or grid) */
  function build(data, offset) {
    var day = data.day, dw = dow(day), photos = data.photos || {};
    function photoCell(rec) {
      if (!rec || !rec.photos || !rec.photos.length) return '';
      return '<div class="ph">' + rec.photos.map(function (pid, i) {
        var src = photos[pid], lbl = (rec.slots && rec.slots[i]) ? '<div class="pl">' + esc(rec.slots[i]) + '</div>' : '';
        return '<span class="pi">' + lbl + (src ? '<img src="' + src + '" width="220">' : '<div class="miss">Photo not uploaded</div>') + '</span>';
      }).join('') + '</div>';
    }
    function rows(items, checks, kind) {
      return items.map(function (it) {
        var rec = checks[it.id], ok = rec && rec.done, tags = [];
        if (it.p) tags.push(rec && rec.photos && rec.photos.length ? 'Photo' : '<b>Photo required</b>');
        if (rec && rec.need > 1) tags.push(rec.rounds.length + ' of ' + rec.need + ' checks');
        else if ((it.r || 1) > 1) tags.push('0 of ' + it.r + ' checks');
        var whoWhen = rec ? rec.rounds.map(function (r) { return esc(r.name) + ' <span class="t">' + (r.day && r.day !== day ? esc(shortDate(r.day).slice(4)) + ' ' : '') + clock(r.at, offset) + '</span>'; }).join('<br>') : '';
        var status = ok ? '<td class="ok">&#10003; Done</td><td>' + whoWhen + '</td>'
          : '<td class="no">&#10007; NOT DONE' + (rec ? '<br>(' + rec.rounds.length + ' of ' + rec.need + ')' : '') + '</td><td>' + whoWhen + '</td>';
        return '<tr class="' + (ok ? 'd' : 'n') + '">' + status + '<td><b>' + esc(it.t) + '</b>' +
          (it.d ? '<div class="dd">' + esc(it.d) + '</div>' : '') +
          (tags.length ? '<div class="tg">' + tags.join(' · ') + '</div>' : '') + photoCell(rec) + '</td></tr>';
      }).join('');
    }
    function table(title, items, checks, note) {
      var done = items.filter(function (i) { return checks[i.id] && checks[i.id].done; }).length;
      return '<h3>' + esc(title) + ' <span class="c">' + done + ' of ' + items.length + '</span></h3>' +
        (note ? '<p class="note">' + esc(note) + '</p>' : '') +
        '<table><thead><tr><th style="width:15%">Status</th><th style="width:17%">Who · when</th><th>Task</th></tr></thead><tbody>' +
        rows(items, checks) + '</tbody></table>';
    }
    var daily = data.tasks.daily || [], weekly = data.tasks.weekly || [], monthly = data.tasks.monthly || [];
    /* repeat checks: checks/{id}, {id}~2, {id}~3 … are one task; done when it has all the checks it needs (it.r) */
    var need = {};
    [daily, weekly, monthly].forEach(function (L) { L.forEach(function (g) { (g.items || []).forEach(function (i) { need[i.id] = i.r || 1; }); }); });
    function agg(raw) {
      var by = {}, out = {};
      Object.keys(raw || {}).forEach(function (k) { var b = k.split('~')[0]; (by[b] = by[b] || []).push(raw[k]); });
      Object.keys(by).forEach(function (b) {
        var rs = by[b].sort(function (x, y) { return x.at - y.at; }), last = rs[rs.length - 1], n = need[b] || 1;
        out[b] = {name: last.name, at: last.at, day: last.day, rounds: rs, need: n, done: rs.length >= n,
          photos: [].concat.apply([], rs.map(function (r) { return r.photos || []; })),
          slots: [].concat.apply([], rs.map(function (r) { return (r.photos || []).map(function (_, k) { return (r.slots || [])[k] || ''; }); }))};
      });
      return out;
    }
    var weekRaw = {};
    Object.keys(data.weekChecks || {}).forEach(function (k) { if ((data.weekChecks[k].day || '') === day) weekRaw[k] = data.weekChecks[k]; });
    var dayChecks = agg(data.dayChecks), weekChecks = agg(weekRaw), monthChecks = agg(data.monthChecks);
    var isD = function (c, id) { return c[id] && c[id].done; };
    var all = [].concat.apply([], daily.map(function (g) { return g.items; }));
    var dDone = all.filter(function (i) { return isD(dayChecks, i.id); }).length;
    var wg = weekly.filter(function (g) { return g.day === dw; })[0];
    var wDone = wg ? wg.items.filter(function (i) { return isD(weekChecks, i.id); }).length : 0;
    var inToday = {}; if (wg) wg.items.forEach(function (i) { inToday[i.id] = 1; });
    var extra = [].concat.apply([], weekly.map(function (g) { return g.items; })).filter(function (i) { return isD(weekChecks, i.id) && !inToday[i.id]; });
    var missing = all.filter(function (i) { return !isD(dayChecks, i.id); }).concat(wg ? wg.items.filter(function (i) { return !isD(weekChecks, i.id); }) : []);
    var pct = all.length ? Math.round(dDone / all.length * 100) : 0;
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>FOH Cleaning Checklist — ' + esc(shortDate(day)) + '</title><style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:11pt;margin:0}' +
      'h1{font-size:20pt;margin:0 0 2pt}h2{font-size:14pt;margin:16pt 0 4pt;border-bottom:2px solid #111;padding-bottom:2pt}' +
      'h3{font-size:12pt;margin:12pt 0 4pt}h3 .c{font-weight:normal;color:#444}.sub{color:#333;margin:0 0 8pt}' +
      'table{width:100%;border-collapse:collapse;margin:0 0 6pt}th,td{border:1px solid #999;padding:4pt 5pt;vertical-align:top;text-align:left}' +
      'th{background:#eee;font-size:9.5pt}.ok{font-weight:bold;color:#1d5e2a}.no{font-weight:bold;color:#a11d1d}tr.n td{background:#fbeaea}' +
      '.t{color:#444;font-size:9.5pt}.dd{color:#444;font-size:9.5pt;margin-top:2pt}.tg{font-size:9pt;color:#333;margin-top:2pt}' +
      '.note{font-size:9.5pt;color:#444;margin:0 0 4pt}.sum td{border:1px solid #999;font-size:11pt}.big{font-size:16pt;font-weight:bold}' +
      '.ph{margin-top:4pt}.pi{display:inline-block;margin:0 6pt 6pt 0;vertical-align:top}.pl{font-size:9pt;font-weight:bold}' +
      'img{border:1px solid #999}.miss{font-size:9pt;color:#a11d1d;border:1px dashed #a11d1d;padding:6pt}.foot{font-size:9pt;color:#444;margin-top:14pt}' +
      'ul{margin:2pt 0 0 14pt;padding:0}li{margin:1pt 0}' +
      '</style></head><body>' +
      '<h1>FOH Cleaning Checklist</h1><p class="sub">' + esc(data.location || 'The Yardery') + ' · <b>' + esc(longDate(day)) + '</b>' +
      (data.lockedAt ? ' · locked at ' + clock(data.lockedAt, offset) : '') + '</p>' +
      '<table class="sum"><tr><td><div class="big">' + pct + '%</div>Daily: ' + dDone + ' of ' + all.length + ' tasks done</td>' +
      '<td><div class="big">' + (wg ? Math.round(wDone / wg.items.length * 100) + '%' : '—') + '</div>Weekly · ' + DAYS[dw] + ': ' +
      (wg ? wDone + ' of ' + wg.items.length + ' done' : 'no weekly list') + '</td></tr></table>' +
      (missing.length ? '<h2>Not done (' + missing.length + ')</h2><ul>' + missing.map(function (i) { return '<li>' + esc(i.t) + '</li>'; }).join('') + '</ul>'
                      : '<h2>Everything was done</h2>') +
      '<h2>Daily</h2>' + daily.map(function (g) { return table(g.role, g.items, dayChecks, g.note); }).join('') +
      '<h2>Weekly · ' + DAYS[dw] + '</h2>' + (wg ? table(wg.role, wg.items, weekChecks, wg.note) : '<p>No weekly tasks for ' + DAYS[dw] + '.</p>') +
      (extra.length ? table('Other weekly tasks done today', extra, weekChecks) : '') +
      (monthly.length ? '<h2>Monthly · ' + MONTHS[parts(day).m - 1] + ' (so far this month)</h2>' +
        monthly.map(function (g) { return table(g.role, g.items, monthChecks, g.note); }).join('') : '') +
      '<p class="foot">Made automatically when the checklist locked. Times are ' + esc(data.timeZoneLabel || 'Eastern') + '. ' +
      (data.generatedAt ? 'Generated ' + esc(shortDate(businessDay(data.generatedAt, null, offset))) + ' ' + clock(data.generatedAt, offset) + '.' : '') + '</p>' +
      '</body></html>';
    return html;
  }

  var api = {DEFAULT_SCHEDULE: DEFAULT_SCHEDULE, wallToMs: wallToMs, dow: dow, addDays: addDays, isClosed: isClosed, closeAt: closeAt, lockAt: lockAt,
    businessDay: businessDay, mondayOf: mondayOf, monthOf: monthOf, state: state, longDate: longDate, shortDate: shortDate, clock: clock,
    fromBuiltIn: fromBuiltIn, build: build, DAYS: DAYS};
  root.FOHReport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
