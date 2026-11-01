import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getAuth, Auth, signInAnonymously, User } from 'firebase/auth';
import { Board, FirebaseSyncConfig } from '../types';

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let authReady: Promise<User | null> | null = null;

const FIREBASE_CONFIG_KEY = 'triad_firebase_config';

const DEFAULT_SNAPSHOT_INTERVALS = { present: 2, focus: 2, achieve: 2 };

export function getSavedFirebaseConfig(): FirebaseSyncConfig | null {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFirebaseConfig(config: FirebaseSyncConfig | null): void {
  if (!config) {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
  } else {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  }
}

async function signInIfNeeded(): Promise<User | null> {
  if (!authInstance) return null;
  if (authInstance.currentUser) return authInstance.currentUser;
  if (!authReady) {
    authReady = signInAnonymously(authInstance)
      .then(cred => cred.user)
      .catch(err => {
        console.warn('Firebase anonymous sign-in failed:', err);
        authReady = null;
        return null;
      });
  }
  return authReady;
}

/**
 * Initializes Firebase with the full web-app config and signs the user in
 * anonymously so the Firestore security rules (which require request.auth)
 * can be satisfied without a login screen.
 */
export async function initFirebase(config?: FirebaseSyncConfig): Promise<boolean> {
  try {
    const conf = config || getSavedFirebaseConfig();
    if (!conf || !conf.projectId || !conf.apiKey || !conf.appId) {
      return false;
    }

    const existingApps = getApps();
    if (existingApps.length > 0) {
      const currentProjectId = (existingApps[0].options as { projectId?: string }).projectId;
      if (currentProjectId && currentProjectId !== conf.projectId) {
        await Promise.all(existingApps.map(app => deleteApp(app)));
        appInstance = null;
        dbInstance = null;
        authInstance = null;
        authReady = null;
      }
    }

    if (getApps().length === 0) {
      appInstance = initializeApp({
        apiKey: conf.apiKey,
        authDomain: conf.authDomain || `${conf.projectId}.firebaseapp.com`,
        projectId: conf.projectId,
        storageBucket: conf.storageBucket || `${conf.projectId}.appspot.com`,
        messagingSenderId: conf.messagingSenderId,
        appId: conf.appId,
      });
    } else {
      appInstance = getApps()[0];
    }

    dbInstance = getFirestore(appInstance, conf.firestoreDatabaseId || '(default)');
    authInstance = getAuth(appInstance);
    await signInIfNeeded();
    return true;
  } catch (err) {
    console.warn('Firebase init warning:', err);
    return false;
  }
}

export function getFirebaseUser(): User | null {
  return authInstance?.currentUser ?? null;
}

function boardToDoc(board: Board, userId: string) {
  return {
    id: board.id,
    userId,
    title: board.title,
    createdAt: new Date(board.createdAt).toISOString(),
    updatedAt: new Date(board.updatedAt).toISOString(),
    categories: board.categories,
    presentPairs: board.presentPairs,
    focusPairs: board.focusPairs,
    achievePairs: board.achievePairs,
    snapshots: board.snapshots,
    snapshotIntervals: board.snapshotIntervals,
  };
}

export async function syncBoardToFirestore(board: Board): Promise<boolean> {
  const ok = await initFirebase();
  if (!ok || !dbInstance) return false;

  const user = authInstance?.currentUser ?? (await signInIfNeeded());
  if (!user) return false;

  try {
    await setDoc(doc(dbInstance, 'boards', board.id), boardToDoc(board, user.uid), {
      merge: true,
    });
    return true;
  } catch (e) {
    console.warn('Could not sync board to Firestore (local storage remains active):', e);
    return false;
  }
}

export async function loadBoardsFromFirestore(): Promise<Board[] | null> {
  const ok = await initFirebase();
  if (!ok || !dbInstance) return null;

  const user = authInstance?.currentUser ?? (await signInIfNeeded());
  if (!user) return null;

  try {
    const boardsQuery = query(
      collection(dbInstance, 'boards'),
      where('userId', '==', user.uid)
    );
    const snapshot = await getDocs(boardsQuery);
    const boards: Board[] = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      boards.push({
        id: d.id || docSnap.id,
        title: d.title || 'Untitled Board',
        createdAt: d.createdAt ? new Date(d.createdAt).getTime() : Date.now(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt).getTime() : Date.now(),
        categories: d.categories || [],
        presentPairs: d.presentPairs || {},
        focusPairs: d.focusPairs || {},
        achievePairs: d.achievePairs || {},
        snapshots: d.snapshots || [],
        snapshotIntervals: d.snapshotIntervals || { ...DEFAULT_SNAPSHOT_INTERVALS },
      });
    });
    return boards;
  } catch (e) {
    console.warn('Could not fetch boards from Firestore:', e);
    return null;
  }
}
