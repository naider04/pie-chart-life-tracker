import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { Board, FirebaseSyncConfig } from '../types';

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

const FIREBASE_CONFIG_KEY = 'triad_firebase_config';

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

export function initFirebase(config?: FirebaseSyncConfig): boolean {
  try {
    const conf = config || getSavedFirebaseConfig();
    if (!conf || !conf.projectId) {
      return false;
    }
    if (getApps().length === 0) {
      appInstance = initializeApp({
        apiKey: conf.apiKey || 'mock-key',
        authDomain: conf.authDomain || `${conf.projectId}.firebaseapp.com`,
        projectId: conf.projectId,
        storageBucket: conf.storageBucket || `${conf.projectId}.appspot.com`,
        messagingSenderId: conf.messagingSenderId || '123456789',
        appId: conf.appId || '1:123456789:web:abcdef',
      });
    } else {
      appInstance = getApps()[0];
    }
    dbInstance = getFirestore(appInstance, conf.firestoreDatabaseId || '(default)');
    authInstance = getAuth(appInstance);
    return true;
  } catch (err) {
    console.warn('Firebase init warning:', err);
    return false;
  }
}

export async function syncBoardToFirestore(board: Board): Promise<boolean> {
  if (!dbInstance) {
    const ok = initFirebase();
    if (!ok || !dbInstance) return false;
  }
  try {
    const boardRef = doc(dbInstance, 'boards', board.id);
    await setDoc(boardRef, {
      id: board.id,
      title: board.title,
      createdAt: new Date(board.createdAt).toISOString(),
      updatedAt: new Date(board.updatedAt).toISOString(),
      categories: board.categories,
      presentPairs: board.presentPairs,
      focusPairs: board.focusPairs,
      achievePairs: board.achievePairs,
      snapshots: board.snapshots,
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Could not sync board to Firestore (local storage remains active):', e);
    return false;
  }
}

export async function loadBoardsFromFirestore(): Promise<Board[] | null> {
  if (!dbInstance) {
    const ok = initFirebase();
    if (!ok || !dbInstance) return null;
  }
  try {
    const boardsCol = collection(dbInstance, 'boards');
    const snapshot = await getDocs(boardsCol);
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
      });
    });
    return boards;
  } catch (e) {
    console.warn('Could not fetch boards from Firestore:', e);
    return null;
  }
}
