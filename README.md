# FOH — The Yardery cleaning checklists

**Staff link:** https://5jfwkzfvg4-hash.github.io/yardery-foh/

One page (`index.html`), plain HTML/CSS/JavaScript, no build step. Checks are shared live between every phone
through Firebase (Cloud Firestore, free Spark plan, anonymous sign-in, so staff need no passwords).

## Edit tasks: the manager page
**https://5jfwkzfvg4-hash.github.io/yardery-foh/manage.html** (bookmark it; it only opens on manager phones).
- **Daily / Weekly tabs:** change a task's wording or details, ↑ ↓ to reorder, **Move to…** another section or day,
  **Remove** (tap twice), **+ Add task**, and tap a **position** to assign it. Daily sections can be added, renamed,
  reordered and removed; Weekly has one section per day. **Photo & Food Code** holds the Photo tag and code links.
- **Positions tab:** add, rename (renames it on every task) or remove positions.
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

## Where the records are
Firestore → `locations/{locationId}/days/{date}/checks/{taskId}` and `.../weeks/{Monday's date}/checks/{taskId}`.
Each check: task id, first name, device id, server time, tap time. Nothing deletes old days or weeks.
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
- `firestore.rules` — the security rules (paste into Firebase → Firestore → Rules → Publish whenever this file changes).
- `NEW-LOCATION.md` — one-page checklist for opening a new store.
- `FOH-QR-Poster.pdf` — printable poster (Letter) with the staff link's QR code. For another store:
  `node tools/poster.mjs <store link> "<store name>"`.
- `tests/` — automatic checks (for whoever maintains the code): `npm install`, then `npm test`
  (needs Java 11+; runs everything against Firebase's local emulator, never the real database).
