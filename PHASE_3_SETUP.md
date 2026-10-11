# Phase 3 setup notes

## What changed

- Profile editing and friend requests are in the account menu.
- Find Players has a name search that narrows the opted-in profiles returned by selected filters.
- Theme choice is saved in this browser.
- Tournaments have Active and Archive views. Closed tournaments and tournaments with posted results move to the archive. A tournament also moves to the archive view seven days after its end date (or start date if there is no end date).
- Community Blog accepts post requests. Submissions stay pending until a moderator publishes or declines them.
- Loading uses a small animated GrindInfo mark and respects reduced-motion settings.

## Firestore rules

After merging, copy the complete `firestore.rules` file into Firebase Console → Firestore Database → Rules, review it, then Publish. These rules are required for blog submissions, moderation actions, and tournament close/results updates. Do not replace the rules with an older copy.

## Choose blog moderators

For each trusted moderator, in Firebase Console → Firestore Database → Data, create:

- Collection: `moderators`
- Document ID: that person's Firebase Authentication user UID
- Field: `enabled` (boolean) = `true`

Only add people you trust to publish content or review abuse reports. The moderator document grants these powers.

## Where to edit later

- Main interface, profile search, tournament cards and blog UI: `src/App.jsx`
- Access and validation rules: `firestore.rules`
- Theme colours: the `THEME_CSS` block in `src/App.jsx`
- Game names and icons: `GAME_PRESETS` and `GAME_ICONS` in `src/App.jsx`

## Archive behavior and images

The seven-day move is calculated in the app when tournaments are shown. It is not a server timer, and it does not permanently delete records. A guaranteed scheduled cleanup needs a backend job; this update preserves archived tournament results.

This update does not upload image files. Firebase Storage billing is not enabled for this project, so image uploads require a separate billing and Storage-rules decision.
