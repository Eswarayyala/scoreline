import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault(), projectId: "scoreliner" });
const db = getFirestore();
const applyChanges = process.argv.includes("--apply");
const pageSize = 200;
let cursor = null;
let scanned = 0;
let migrated = 0;
let skipped = 0;

while (true) {
  let pageQuery = db.collection("handles").orderBy(FieldPath.documentId()).limit(pageSize);
  if (cursor) pageQuery = pageQuery.startAfter(cursor);
  const page = await pageQuery.get();
  if (page.empty) break;

  const batch = db.batch();
  let writes = 0;
  for (const snapshot of page.docs) {
    scanned += 1;
    const data = snapshot.data();
    if (typeof data.email !== "string" || !data.email.trim()) continue;
    const match = /^([a-z0-9_]{3,16})::(\d{4}|\d{8})$/i.exec(snapshot.id);
    const uid = typeof data.uid === "string" ? data.uid : "";
    const handle = typeof data.handle === "string" ? data.handle : "";
    const expectedHandle = match ? match[1].toLowerCase() + "#" + match[2] : "";
    if (!match || !uid || handle.toLowerCase() !== expectedHandle) {
      skipped += 1;
      continue;
    }
    migrated += 1;
    if (applyChanges) {
      const privateId = match[1].toLowerCase() + "::" + match[2];
      batch.set(db.doc("handleSignInLookup/" + privateId), {
        uid, email: data.email, handle, updatedAt: Date.now(),
      }, { merge: true });
      batch.update(snapshot.ref, { email: FieldValue.delete() });
      writes += 2;
    }
  }
  if (applyChanges && writes) await batch.commit();
  cursor = page.docs[page.docs.length - 1];
  if (page.size < pageSize) break;
}

console.log((applyChanges ? "Applied migration" : "Dry run") + ": " + migrated + " eligible handle records, " + skipped + " skipped, " + scanned + " scanned.");
if (!applyChanges && migrated) console.log("Review the counts, then rerun with --apply to move emails into private lookup records and delete them from public handles.");