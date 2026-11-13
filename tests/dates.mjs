// Test dates relative to today, so the tests never go stale: TUE is the most recent Tuesday whose
// 10:30 PM lock (plus the rules' 4-hour margin) is already past, so it is always 1–8 days old.
import {createRequire} from 'node:module';
const R = createRequire(import.meta.url)('../report.js');
const TZ = 'America/New_York';
export const off = ms => { const p = {}; new Intl.DateTimeFormat('en-US', {timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'})
  .formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; }); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms; };
export const addDays = R.addDays;
export const ny = (day, h, m = 0, s = 0) => new Date(R.wallToMs(day, h * 60 + m, off) + s * 1000).toISOString();   // NY wall time -> ISO
export const TUE = (() => {
  for (let i = 0; i < 9; i++) {
    const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    if (R.dow(day) === 2 && Date.now() >= Date.parse(addDays(day, 1) + 'T03:30:00Z') + 60000) return day;
  }
})();
export const MON = addDays(TUE, -1);
export const longDate = R.longDate, shortDate = R.shortDate;
