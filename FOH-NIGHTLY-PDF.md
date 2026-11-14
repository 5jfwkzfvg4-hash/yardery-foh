# Nightly checklist PDF — one-time setup (about 5 minutes, on a computer)

What it does, every open night: 30 minutes after closing the staff page locks. Within 5 minutes a PDF of what
was and wasn't done (with photos) is saved in Drive **The Yardery — Clay › 11 FOH Cleaning Checklists**, and
"Cleaning checklist for <date>" plus the PDF are added to the end of your draft **Yardery Daily Recap — <date>**.
If you have no such draft by 5 AM, a draft with that subject is made with just the line and the PDF, addressed to
the same people as the latest "Yardery Daily Recap" email in your inbox. **Nothing is ever sent.**

It also keeps the staff **Home page** up to date every 30 minutes: beer and liquor deliveries from your calendar
(the all-day "🚚 … delivery" events), parties from the sanford@ booking calendar (time, guest count, occasion and
package only, never names, contacts or prices), holidays, and the tasks most often missed over the last 7 open days.

Closing times (in `config.js` → `schedule`): Sun 8 PM · Mon closed · Tue–Thu 10 PM · Fri–Sat midnight.
The date is always the business day: after midnight it's still the day the checklist was filled out.

## Turn it on
1. Sign in with your work Google account and open **https://script.google.com/home** → **New project**.
2. Click **Untitled project** (top left) and name it `FOH nightly PDF` → **Rename**.
3. Open **https://raw.githubusercontent.com/5jfwkzfvg4-hash/yardery-foh/main/apps-script/Code.gs**,
   select all (Ctrl/Cmd+A) and copy.
4. Back in the script, click in the code box, select all, paste over it, and click the **Save** (disk) icon.
5. In the toolbar's function menu (next to **Run** / **Debug**) choose **setup**, then click **Run**.
6. **Review permissions** → choose your work account → if you see "Google hasn't verified this app",
   click **Advanced** → **Go to FOH nightly PDF (unsafe)** (it's your own script) → **Allow**.
7. The log at the bottom says "FOH nightly PDF is on." and shows a **Home page board ID**. Copy that ID and send it
   to Claude; once it's added to the rules (and you publish them), deliveries and parties appear on the Home page.
   The PDF and email work right away either way.

## If the log says "does not have permission … calendar"
1. In the script, click the **gear (Project Settings)** and tick **Show "appsscript.json" manifest file in editor**.
2. Back in the editor (**< >** icon), open **appsscript.json**, select all, and paste over it everything from
   **https://raw.githubusercontent.com/5jfwkzfvg4-hash/yardery-foh/main/apps-script/appsscript.json** → **Save**.
3. Choose **setup** → **Run** → **Review permissions** → **Allow** (the list now includes your calendars).

## Check it (optional, recommended once)
Choose **testNow** in the function menu → **Run**. The log shows a link to a "(test)" PDF of today's checklist
so far. Open it and check the photos show. Delete the test PDF afterwards. Nothing is locked or emailed.

## Good to know
- To turn it off: in the script, the clock icon (**Triggers**) on the left → delete the `tick` trigger.
- Task changes, closing times and the PDF layout come from the live site, so you never edit this script for those.
- If your recap draft has pictures in its text, they come along as attachments after the PDF is added.
