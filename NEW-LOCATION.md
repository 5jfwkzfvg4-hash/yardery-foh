# New location checklist (about 15 minutes)

**You need:** a GitHub account and a Google account for the new store's owner or manager.

### 1. Copy the site
1. Open https://github.com/5jfwkzfvg4-hash/yardery-foh
2. Click the green **Use this template** button → **Create a new repository**.
   (Not there? In the original repo, open **Settings** → tick **Template repository** once.)
3. Name it, e.g. `yardery-foh-orlando`. Choose **Public**. Click **Create repository**.
4. In the new repo: **Settings** → **Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → **Save**.
   The store's link is `https://<github-name>.github.io/yardery-foh-orlando/`.

### 2. Pick the database (choose one)
- **A. Share Sanford's Firebase project** (easiest; the owner sees every store in one place).
  In Firebase → **Authentication** → **Settings** → **Authorized domains** → **Add domain**: `<github-name>.github.io`.
- **B. The store gets its own Firebase project** (better if the store is owned separately).
  Follow "Set up Firebase" below with a new project, then use its config in step 3.

### 3. Edit the config block (the only code change)
In the new repo open `index.html` → pencil icon → near the top, find `window.FOH_CONFIG={` and change:
| Setting | Example | Notes |
|---|---|---|
| `locationName` | `'The Yardery Orlando'` | shown at the top of the page |
| `locationId` | `'orlando'` | lowercase, numbers, dashes; **must be different for every store**; never change it later |
| `timeZone` | `'America/New_York'` | e.g. `'America/Chicago'` for Central time |
| `dayCutoffHour` | `5` | before this hour still counts as the previous day |
| `firebase` | `{apiKey:'…', …}` | option A: leave Sanford's; option B: paste the new project's config |
| `managers` | `['device id', …]` | the store's manager phones (step 4) |
Click **Commit changes**.

### 4. Check it
1. Open the new link on two phones, enter a first name on each.
2. Check a task on one: it should show on the other within a few seconds. Uncheck it again.
3. Add the store's managers (README → "Make someone a manager"; in the rules add a line like `'orlando': ['id1']`).
4. Outside Florida? The Food Code links point to Florida's adopted code (`CODE_URL` in `index.html`); swap in the state's.

### Set up Firebase (only for option B, or the very first store)
1. https://console.firebase.google.com → **Create a project** → name it → turn **Google Analytics off** → **Create project**.
2. **Build → Authentication → Get started** → **Sign-in method** → **Anonymous** → **Enable** → **Save**.
   Then **Settings** tab → **Authorized domains** → **Add domain** → `<github-name>.github.io`.
3. **Build → Firestore Database → Create database** → **Standard edition** → location **us-east1 (South Carolina)**
   (or nearest) → **Start in production mode** → **Create**.
4. **Rules** tab → delete everything → paste all of `firestore.rules` from the repo → **Publish**.
5. **Project settings** (gear icon) → **Your apps** → web icon **`</>`** → nickname `FOH` → leave Hosting unticked →
   **Register app** → copy the values from `firebaseConfig` into the `firebase:{…}` part of the config block.
Stays free on the Spark plan: a busy store uses only a few percent of the daily free limits.
