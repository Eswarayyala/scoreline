# GrindInfo Phase 2 setup notes

This change is prepared on the `phase-2-community-tournament-tools` branch for review. It does not publish Firestore rules or deploy the website.

## Features in this phase

- Free tournament registration requests. The tournament host or a co-host approves or declines each request.
- Optional prize information in INR. It does not collect or process money.
- Co-hosts can be added or removed by Firebase account UID. A co-host cannot transfer ownership or delete the tournament.
- Tournament links can be copied from the tournament detail page. Visitors need to sign in to open the app and view the linked tournament.
- A player can request to connect with the tournament host. Accepted requests do not create a direct-message feature.
- Players and tournaments can be reported for abuse/harassment, scams/fraud, inappropriate content, or another concern. Reports are private to platform moderators.
- A moderator-only CSV import and read-only archive page for signed-in players.

## Set up the first moderator

The app intentionally cannot grant a moderator role to any user. After the rules in `firestore.rules` are reviewed and published, use Firebase Console → Firestore Database → Data to create a document:

- Collection: `moderators`
- Document ID: the trusted moderator's Firebase Authentication UID
- Field: `enabled` (boolean) = `true`

Only that UID can read its own role document from the app. App users cannot create, edit, list, or delete moderator documents. Use a trusted platform account and remove the document to revoke access.

Find a UID in Firebase Console → Authentication → Users → open the account row and copy its **User UID**. For co-host access, the tournament owner pastes the co-host's UID into that tournament's **Co-host access** panel.

## Importing historical results

Go to **Esports archive** and use **Import CSV** while signed in as a moderator. Start with `docs/esports-archive-template.csv`. Required columns are `tournament`, `game`, `eventDate`, and `winner`; `runnerUp`, `mvp`, and `source` are optional. Imports accept at most 200 rows and a 1 MB file. Duplicate tournament/game/date rows already on the site are skipped.

The site does not contain a verified three-year history dataset yet. Gather and check the event results and source links before importing them.

## Publishing safely

The current live Firestore rules in Firebase project `scoreliner` differ from the repository rules: live player documents currently allow public reads, and the new reports, registrations, co-host and archive collections do not have rules yet. Review the complete `firestore.rules` file in this branch before publishing it in Firebase Console → Firestore Database → Rules. It restricts player reads to the owner or players who opted into discovery, validates the existing profile fields including avatars, and secures the new collections. Do not paste a partial fragment; publish the complete reviewed file before using Phase 2 features.

The branch changes do not alter Firebase Authentication authorized domains and do not fix the separate Google sign-in preview issue. Theme persistence is also a separate follow-up.
