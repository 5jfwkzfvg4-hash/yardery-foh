# FOH — The Yardery cleaning checklists

**Staff link:** https://5jfwkzfvg4-hash.github.io/yardery-foh/

One page (`index.html`), plain HTML/CSS/JavaScript, no build step. Checks are shared live between every phone
through Firebase (Cloud Firestore, free Spark plan, anonymous sign-in, so staff need no passwords).

## Change a task's wording (on GitHub, no tools needed)
1. Open https://github.com/5jfwkzfvg4-hash/yardery-foh/blob/main/index.html
2. Click the **pencil** icon (top right of the file). On a phone: the **⋯** menu, then **Edit file**.
3. Press **Ctrl+F** (iPhone: share menu, **Find on Page**) and search for the words you want to change.
   Tasks look like `['c-tvs','TVs off']`. Change only the words inside the quotes after the id:
   - `['c-tvs','TVs off']` → `['c-tvs','All TVs off']`. Leave `c-tvs` alone; it's how the database knows the task.
   - Keep the quotes and commas. For an apostrophe use `’` (as in `don’t`); a plain `'` breaks the page.
4. Click **Commit changes…**, then **Commit changes**. The live page updates in about a minute.
5. Open the staff link and check the page still loads. If it shows a blank list, undo it: open the file's
   **History**, click the last change, then **⋯ → Revert** (or ask Claude).

New task: copy a whole line, give it a **new** id (lowercase letters, numbers and dashes, never reused).
Photo tags are the `PHOTO` list; Food Code links are the `['3-302.12']` part.

## Make someone a manager (can uncheck anyone's task)
1. Have them open the staff link on their phone, enter their first name and check any task.
2. Firebase console → **Firestore Database** → **Data** → `locations` → `sanford` → `devices`.
   Tap the entry whose panel shows their `name`, and copy its ID (their device id).
3. Add the id in two places (or send it to Claude):
   - `firestore.rules`, in `managerIds()`: `'sanford': ['id1', 'id2']`. Then paste the whole file into
     Firebase → **Firestore Database** → **Rules** → **Publish**.
   - `index.html`, in the config block's `managers:[ ]` list (so their phone knows to allow it).
4. To remove a manager, delete the id from both places and publish the rules again.
   A new phone (or a cleared browser) gets a new device id, so repeat for it.

## Where the records are
Firestore → `locations/{locationId}/days/{date}/checks/{taskId}` and `.../weeks/{Monday's date}/checks/{taskId}`.
Each check: task id, first name, device id, server time, tap time. Nothing deletes old days or weeks.
An uncheck removes that one check. Only first names are stored: never pay, SSNs, bank details or passwords.

## What is public, and what protects the data
The Firebase config in `index.html` (apiKey, projectId, appId…) is **not a secret**. It's like a street address:
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
- `index.html` — the page. **Location settings are the `FOH_CONFIG` block near the top.**
- `firestore.rules` — the security rules (paste into Firebase → Firestore → Rules → Publish whenever this file changes).
- `NEW-LOCATION.md` — one-page checklist for opening a new store.
- `tests/` — automatic checks (for whoever maintains the code): `npm install`, then `npm test`
  (needs Java 11+; runs everything against Firebase's local emulator, never the real database).
