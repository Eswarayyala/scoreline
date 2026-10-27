# Social and safety feature setup

This update keeps friend chat and account-ban records protected by Firestore rules. Live online status uses Firebase Realtime Database and is intentionally inactive until that database exists and its URL is configured. The online indicator cannot be accurately implemented with periodic Firestore writes without creating unnecessary reads and writes.

## What works after the website and Firestore rules update

- Visitors can browse tournament listings/details, published community blogs, and the esports archive without signing in. The first visit shows a compact sign-in choice; choosing **Browse as guest** opens the site, and the **Sign in / join** button in the header reopens the floating login panel at any time. Guest mode lasts for the current browser tab session.
- Guest users cannot create tournaments, request tournament registration, send friend requests or messages, report players/tournaments, request blog publication, or submit archive records. Those controls either remain hidden or open the sign-in panel. Firestore rules independently reject guest writes and keep player/friend/report/submission records private.
- Firestore rules grant access per document, not per field. Tournament documents currently include host/co-host Firebase UIDs and blog documents include `authorId`; these fields are technically visible to guests when their containing public document is read. The app does not display them, but fully hiding them requires moving those IDs into separate private documents.
- A tournament safety disclaimer appears before a join request is written. Cancel leaves the registration unchanged. The owner can set the wording in the dashboard's Safety disclaimer popup; a default safety message is used if no enabled disclaimer exists.
- Owner-created general popups appear randomly every 15 to 30 minutes while the tab is visible. They pause while another dialog is open or the tab is hidden. Existing popup documents remain readable.
- Accepted friends appear in the floating Friends list and can send private text messages. Only the two accepted friends can read the conversation or send messages; message edits and deletes are disabled.
- Profiles receive a server-assigned 8-digit GrindInfo number. Players can be found by their `Name#12345678` ID; co-host setup resolves that number to the internal Firebase account ID without asking people to copy a UID.
- Players can invite accepted friends from tournament details. Invitees see the invitation in the tournament list; accepting the invite does not register them. They still need to request a place and accept the registration disclaimer.
- Casual popup schedules can be random 15–30 minutes, hourly, once per visit, or gated by a configurable online-player threshold. High-traffic schedules require the Realtime Database status and Functions below.
- Reports can be marked reviewing or considered. The owner can ban or unban a reported player; support can review reports but cannot change account access. Bans go through a callable Cloud Function that checks the owner's `siteRoles` record, disables or enables the Firebase Authentication account, updates Firestore's `siteBans` record, and logs the action.
- A banned account is denied by Firestore rules and signed out by the app when its ban record arrives.

## GrindInfo ID sign-in with private email mappings

Email/password players can sign in with their GrindInfo ID after the account is linked. Public `handles` documents must contain only the public handle, owner UID, and creation time. The email lookup lives in `handleSignInLookup`, which clients cannot read or write; trusted Cloud Functions perform lookup and authentication.

Before enabling this flow:

1. Register a reCAPTCHA v3 site key in Firebase App Check for the website domains. Set `VITE_FIREBASE_APPCHECK_SITE_KEY` for Vercel Preview and Production.
2. Set the `GRINDINFO_WEB_API_KEY` Functions parameter to the Firebase Web API key for project `scoreliner`. The web API key is public Firebase configuration, not an Admin credential.
3. Deploy the matching Firestore rules and Functions. `signInWithHandle` and `syncHandleSignInLookup` enforce App Check. The project must support Cloud Functions deployment.
4. Existing email/password users should sign in with their email once so the trusted function can create a private mapping. New player-ID assignments create the private mapping server-side. Google-only accounts continue to use Google sign-in.
5. Run `functions/scripts/migrate-public-handle-emails.js` in dry-run mode with trusted Firebase Admin credentials. Review the counts, then pass `--apply` to move eligible email mappings into the private collection and remove the email field from public handle records. The script does not print email addresses.

Do not enable the ID sign-in UI until App Check, Functions, Firestore rules, and the migration are ready. The code change alone does not enable the flow in production.

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

The same Functions deployment assigns player numbers, tracks the aggregate online count for high-traffic popups, maintains accepted-friend presence links, and applies owner-only bans. The count is returned only to a signed-in caller; clients cannot read the global presence data or counter documents directly.

## Manual edits later

- Change guest navigation and the sign-in panel placement in `src/App.jsx` near `AuthScreen`, `Header`, and the section navigation; update which public collections guests can read in `firestore.rules` under `tournaments`, `blogPosts`, and `esportsArchive`.
- Edit the default join warning in `src/App.jsx` inside `RegistrationPanel`.
- Edit popup interval options and timing in `src/App.jsx` inside `OwnerDashboard` and the popup scheduler effect. The currently available choices are 15–30 minutes, hourly, once per visit, and a high-traffic online-count threshold.
- Profile editing is in the **account menu**. Friend requests are linked from the floating Friends panel.
- Change active popup wording and dates in **Owner dashboard → Popups**.
- Change how bans are checked or audited in `functions/index.js`; never move owner verification into client-only code.
- Change Realtime Database presence access in `database.rules.json` and its trusted friend-link sync in `functions/index.js`.

## Friends: remove and block

- The floating Friends panel controls remove, block, and unblock actions in `src/App.jsx` inside `FriendDock` and the nearby friend handlers.
- Block records live in `userBlocks/{blockerUid}_{blockedUid}`. The matching Firestore rules prevent new friend requests, accepted chat access, and tournament invitations while the block exists. Existing chat documents are retained but unavailable during the block.
- After merging the code, publish the updated `firestore.rules` from Firebase Console. The app cannot enforce block privacy without the matching rules.
- Online indicators and the “friend is online” toast use Realtime Database presence. The Firebase project currently reports no default Realtime Database instance. Configure an RTDB instance and its rules, then set `VITE_FIREBASE_DATABASE_URL` in the website’s environment and `GRINDINFO_RTDB_URL` for Functions before expecting online alerts.

## Public identity cleanup follow-up

Guest-readable tournament records currently include host/co-host user IDs, and published blog records include author user IDs. Removing those fields safely requires a private ownership/access collection plus a one-time migration of existing records. Do that as a separate reviewed update so tournament hosting, co-host permissions, blog editing, and guest browsing continue to work.
