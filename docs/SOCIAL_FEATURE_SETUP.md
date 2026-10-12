# Social and safety feature setup

This update keeps friend chat and account-ban records protected by Firestore rules. Live online status uses Firebase Realtime Database and is intentionally inactive until that database exists and its URL is configured. The online indicator cannot be accurately implemented with periodic Firestore writes without creating unnecessary reads and writes.

## What works after the website and Firestore rules update

- A tournament safety disclaimer appears before a join request is written. Cancel leaves the registration unchanged. The owner can set the wording in the dashboard's Safety disclaimer popup; a default safety message is used if no enabled disclaimer exists.
- Owner-created general popups appear randomly every 15 to 30 minutes while the tab is visible. They pause while another dialog is open or the tab is hidden. Existing popup documents remain readable.
- Accepted friends appear in the floating Friends list and can send private text messages. Only the two accepted friends can read the conversation or send messages; message edits and deletes are disabled.
- Reports can be marked reviewing or considered. The owner can ban or unban a reported player; support can review reports but cannot change account access. Bans go through a callable Cloud Function that checks the owner's `siteRoles` record, disables or enables the Firebase Authentication account, updates Firestore's `siteBans` record, and logs the action.
- A banned account is denied by Firestore rules and signed out by the app when its ban record arrives.

## Turn on live online status

1. In Firebase Console for `scoreliner`, open **Build → Realtime Database** and create a database. Choose a region close to the existing Firestore database; the current Firestore location is `nam5` (North America multi-region). Firebase may show billing or plan requirements before creation.
2. Copy the database URL shown in Realtime Database. Add it as `VITE_FIREBASE_DATABASE_URL` in the local `.env` file based on `.env.example` and as a Vercel environment variable for Preview and Production. Redeploy the website after setting the Vercel variable.
3. Before deploying the Realtime Database rules and presence functions, set the Firebase Functions parameter `GRINDINFO_RTDB_URL` to the same database URL. Keep the generated `.env.scoreliner` file private; it is ignored by Git.
4. After the PR is merged, use an updated checkout of the repository. In a terminal opened in that repository folder, install the server dependencies and publish both rule files and the Functions together:

   ```text
   npm install --prefix functions
   firebase deploy --project scoreliner --only firestore:rules,database,functions
   ```

   When the Firebase CLI asks for `GRINDINFO_RTDB_URL`, enter the exact Realtime Database URL from the console. Realtime presence is then limited to accepted friends; only the Functions can create the friendship links used to authorize presence reads.

Cloud Functions deployment may require upgrading the Firebase project to the Blaze plan. The code does not deploy anything or change Firebase billing settings. Do not make a ban decision on a report until the function has been deployed; the dashboard will show a clear failure message if it is missing.

## Manual edits later

- Edit the default join warning in `src/App.jsx` inside `RegistrationPanel`.
- Edit the random interval in `src/App.jsx` inside the popup scheduler effect (15 and 15 minutes represent the minimum and random range).
- Profile editing is linked from the header area on **Find players**. Friend requests are linked from the floating Friends panel.
- Change active popup wording and dates in **Owner dashboard → Popups**.
- Change how bans are checked or audited in `functions/index.js`; never move owner verification into client-only code.
- Change Realtime Database presence access in `database.rules.json` and its trusted friend-link sync in `functions/index.js`.
