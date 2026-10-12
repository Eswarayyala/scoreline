# Owner and support dashboard setup

## What the dashboard controls

- The owner dashboard and support dashboard open from the signed-in account menu.
- Owner and support staff can review reports and pending blogs, publish or decline blogs, and edit or delete blog posts. Authors can edit or delete their own posts; edits return to the review queue.
- Signed-in players can submit historical tournament records for review. Approved submissions become public archive entries. Owner/support can also turn published blogs into structured archive entries.
- Only the owner can create, edit, enable/disable, schedule, or delete plain-text safety and motivation popups.
- Only the owner can grant or remove support access. Support staff cannot change roles, popup settings, or tournament data.
- All players can submit a report. The report queue is private to accounts with an owner or support role.
- Popups are read from `sitePopups` and are shown at most once per day or browser session, according to the setting. Safety disclaimers are chosen before motivation messages. Optional start/end times are local browser times.

## One-time owner setup

The first owner role must be bootstrapped in Firebase Console because no signed-in website user should be able to make themselves an owner.

1. Open Firebase Console for project `scoreliner` → Authentication → Users.
2. Copy the UID for the account that should own GrindInfo.
3. Open Firestore Database → Data. Create a root collection named `siteRoles`.
4. Create a document whose document ID is that exact UID.
5. Add these fields:
   - `role` — string — `owner`
   - `enabled` — boolean — `true`
   - `updatedAt` — number (integer) — current Unix time in milliseconds
6. Sign into GrindInfo with that account, then open the account menu → Owner dashboard.

Never let a player create or edit `siteRoles` records from the public app. The Firestore rules intentionally prevent users from granting themselves owner access and prevent the dashboard from changing an owner record.

## Adding support staff

After the owner document and updated rules are published, use Owner dashboard → Support access. Paste the trusted person's Firebase Authentication UID. Support users must already have a GrindInfo account. Removing access disables that UID's support role; it does not delete their account or content. Support can review reports and pending blogs, manage blog posts, and review archive submissions. Support cannot manage popups or grant roles.

For role changes to take effect, the person's app should be refreshed. Existing entries in the older `moderators` collection continue to control the older blog/archive moderator tools; that legacy role does not grant access to the new report inbox.

## Publishing the rules

The pull request updates the repository's `firestore.rules`; merging does not publish these rules to Firebase. After review and merge, paste the complete current `firestore.rules` into Firebase Console → Firestore Database → Rules and publish it. The new dashboard features will not work until the matching rules are active and the owner document exists. Content edits, archive approvals, and staff actions use atomic Firestore batches. The owner-only activity view is an application activity log: staff documents are append-only through these rules, but client-written records are not tamper-proof forensic evidence.

## Popup writing guidance

Use short, plain-text messages. The popup form does not accept HTML or scripts. A changed popup gets a new version, so a player who dismissed the previous version can see the updated one. Disable or delete outdated notices from the owner dashboard.


