import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const STORAGE_KEY = "grindinfo.vaultBookmarks.v1";

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function useVaultBookmarks(uid) {
  const [slugs, setSlugs] = useState(() => readLocal(STORAGE_KEY, []));
  const [ready, setReady] = useState(!uid);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setSlugs(readLocal(STORAGE_KEY, []));
      setReady(true);
      return undefined;
    }
    setReady(false);
    getDoc(doc(db, "userVaultBookmarks", uid))
      .then((snap) => {
        if (!active) return;
        const remote = Array.isArray(snap.data()?.slugs) ? snap.data().slugs : [];
        const local = readLocal(STORAGE_KEY, []);
        const merged = [...new Set([...remote, ...local])].slice(0, 80);
        setSlugs(merged);
        writeLocal(STORAGE_KEY, merged);
        if (merged.length !== remote.length) {
          setDoc(doc(db, "userVaultBookmarks", uid), { slugs: merged, updatedAt: Date.now() }, { merge: true }).catch(() => {});
        }
      })
      .catch(() => {
        if (active) setSlugs(readLocal(STORAGE_KEY, []));
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  const persist = useCallback(
    (next) => {
      const clean = [...new Set(next.map(String))].slice(0, 80);
      setSlugs(clean);
      writeLocal(STORAGE_KEY, clean);
      if (uid) {
        setDoc(doc(db, "userVaultBookmarks", uid), { slugs: clean, updatedAt: Date.now() }, { merge: true }).catch(() => {});
      }
    },
    [uid],
  );

  const toggle = useCallback(
    (slug) => {
      const key = String(slug || "").trim();
      if (!key) return;
      persist(slugs.includes(key) ? slugs.filter((item) => item !== key) : [...slugs, key]);
    },
    [persist, slugs],
  );

  const has = useCallback((slug) => slugs.includes(String(slug || "")), [slugs]);

  return { slugs, ready, toggle, has };
}
