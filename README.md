# FOH — The Yardery cleaning checklists

**Staff link:** https://5jfwkzfvg4-hash.github.io/yardery-foh/

One page (`index.html`), plain HTML/CSS/JavaScript, no build step. Checks are shared live between every phone
through Firebase (Cloud Firestore, free Spark plan, anonymous sign-in, so staff need no passwords).

## Staff Home page
- Opens on Home the first time each business day, and again whenever 2 hours have passed since; otherwise it
  resumes the tab and spot where that phone left off.
- **Top:** who delegates (text in `reminders.js` → `duty`).
- **Today:** beer/liquor deliveries today (bartender puts the order away), parties today, live "AM tasks left" (after
  4 PM) and "left open" (at close), the tasks most often missed over the last 7 open days, one Food Code tip a day
  (`reminders.js` → `health`, rotates by date) and one service standard a day (`tasks.js` → `STANDARDS`).
- **Progress:** Daily / Weekly / Monthly boxes, and **Team today**: each person's share of today's tasks.
- **Not finished:** button under Progress with today's open tasks and photos; opens a list by section.
  Tapping a task jumps to it on its checklist.
- **Coming up:** parties, deliveries and holidays for the next 7 days.
- Deliveries, parties, holidays and often-missed come from the nightly script (`locations/{id}/board/current`); the
  script's sign-in must be listed in `firestore.rules` → `scriptIds()`.

## Edit tasks: the manager page
**https://5jfwkzfvg4-hash.github.io/yardery-foh/manage.html**. Manager phones also see a **Manager page** link on the staff page (under the Home boxes, and next to "Not you?"); staff phones never see it.
- **Daily / Weekly / Monthly tabs:** change a task's wording or details, **Move to…** another section or day,
  **Remove** (tap twice), **+ Add task**. Daily and Monthly sections can be added, renamed, reordered and removed;
  Weekly has one section per day. **Photo & Food Code** holds the Photo tag, photo spots and code links.
- **☰ Arrange order:** switches to one line per task; drag the ☰ handle (finger or mouse) to a new spot, or use ↑ ↓.
  Tap **Done arranging**, then **Save**.
- Nothing changes for staff until you tap **Save**; then every phone shows the new list within seconds.
  **Discard** throws away unsaved edits. Every save is also kept as a copy (Firestore `taskHistory`), so an
  older list can be brought back.
- Rewording keeps a task's checks; removing a task hides it, but its past checks stay in the records.
- A phone that isn't a manager sees its **device ID** with a Copy button instead: that's how to add a manager (below).

Before the first Save, phones use the built-in lists in `tasks.js` (editable on GitHub with the pencil icon).
After the first Save, edit tasks only on the manager page; `tasks.js` is then just the starting list for new stores.

## Make someone a manager (can uncheck anyone's task)
1. Have them open **manage.html** (link above) on their phone and tap **Copy device ID**, then send it to you.
2. Add the id in two places (or send it to Claude):
   - `firestore.rules`, in `managerIds()`: `'sanford': ['id1', 'id2']`. Then paste the whole file into
     Firebase → **Firestore Database** → **Rules** → **Publish**.
   - `config.js`, in the `managers:[ ]` list (so their phone knows to allow it).
3. To remove a manager, delete the id from both places and publish the rules again.
   A new phone (or a cleared browser) gets a new device id, so repeat for it.

## Photo tasks
Tapping the box on a **Photo** task opens the camera inside the page (live view → **Take photo** → preview →
**Retake** or **Use photo**). Only the camera can be used, never the camera roll. Restroom tasks ask for one photo
per spot. The task is checked off only after the last **Use photo**; **Cancel** leaves it unchecked. A checked
photo task shows **View photo** for the whole team.
- The first time, the phone asks to allow the camera: tap **Allow**. If it was blocked: iPhone Safari → **aA** →
  **Website Settings** → **Camera** → **Allow**; Android Chrome → lock icon by the address → **Permissions** → **Camera**.
- Photos are shrunk (about 60–120 KB each) and saved in Firestore `locations/{id}/photos`, because Firebase photo
  Storage now requires the paid plan. At ~20 photos a day the free 1 GB lasts roughly 1.5–2 years; ask Claude
  before then about exporting old photos or moving to Storage.

## Closing countdown, lock and nightly PDF
- **Schedule** (`config.js` → `schedule`): closed Monday (no checklists); close Tue–Thu 10 PM, Fri–Sat midnight,
  Sun 8 PM. At closing a 30-minute countdown shows on the staff page; then the day's checklist locks. The database
  refuses changes after the lock (rules `lockTs()`/`openDay()`; keep them in step if hours change).
- **Nightly PDF**: a Google Apps Script in Clay's account (`apps-script/Code.gs`, setup in `FOH-NIGHTLY-PDF.md`)
  saves a PDF of done / not done with photos to Drive "11 FOH Cleaning Checklists" and adds it to the recap draft.

## Where the records are
Firestore → `locations/{locationId}/days/{date}/checks/{taskId}`, `.../weeks/{Monday's date}/checks/{taskId}` and `.../months/{YYYY-MM-01}/checks/{taskId}`.
Each check: task id, first name, device id, server time, tap time (and photo ids for Photo tasks). Nothing deletes old days or weeks.
An uncheck removes that one check. Only first names are stored: never pay, SSNs, bank details or passwords.

## What is public, and what protects the data
The Firebase config in `config.js` (apiKey, projectId, appId…) is **not a secret**. It's like a street address:
it says which Firebase project the page talks to, and every visitor's browser gets it anyway. Google says so too.
What protects the data is `firestore.rules` (published in the Firebase console), plus these settings:
- Only phones signed in through Firebase (the site signs in automatically) can read or write. Nobody can browse other data.
- A check must carry the phone's own id and the real server time; nobody can edit a check or pose as someone else.
- Only the person who checked a task, or a manager, can uncheck it. Nobody can make themselves a manager.
- **Authorized domains** (Firebase → Authentication → Settings) lists only our github.io site, so other websites can't sign in.
- Optional, stronger: restrict the API key to our site (Google Cloud → Credentials) and turn on App Check (reCAPTCHA).
  Ask Claude to walk you through it. No rule can fully stop a skilled person from copying the public settings into
  their own script; App Check is the setting that does that.

## Files
- `config.js` — **the location settings** (name, id, time zone, cutoff hour, Firebase, managers). The only file a new store changes.
- `index.html` — the staff page. `manage.html` — the manager page (task editor).
- `tasks.js` — the built-in task lists (used until the first Save on the manager page).
- `reminders.js` — the Home page duty message and daily Food Code tips.
- `report.js` — closing schedule logic and the nightly PDF layout (shared by the staff page and the script).
- `apps-script/Code.gs` — the nightly PDF script (runs in Google Apps Script; see `FOH-NIGHTLY-PDF.md`).
- `firestore.rules` — the security rules (paste into Firebase → Firestore → Rules → Publish whenever this file changes).
- `NEW-LOCATION.md` — one-page checklist for opening a new store.
- `FOH-QR-Poster.pdf` (color) and `FOH-QR-Poster-BW.pdf` (black and white) — printable posters (Letter) with the staff link's QR code. For another store:
  `node tools/poster.mjs <store link> "<store name>"`.
- `npm run qa` — look-and-feel check: 10 screen sizes (320 px phone to 1920 px desktop, portrait and landscape) × light/dark ×
  staff and manager pages; flags sideways scrolling, off-screen items, small tap targets, tiny or low-contrast text, and measures speed.
- `tests/` — automatic checks (for whoever maintains the code): `npm install`, then `npm test`
  (needs Java 11+; runs everything against Firebase's local emulator, never the real database).
