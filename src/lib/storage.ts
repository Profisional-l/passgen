import type { EncryptedVault } from './types';

const DB_NAME = 'crypt-keeper';
const STORE_NAME = 'vault';
const DB_VERSION = 1;

export type StoredVault = { login: string; payload: EncryptedVault };

function ensureBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser.');
  }
}

function openDb(): Promise<IDBDatabase> {
  ensureBrowser();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function persistEncryptedVault(login: string, payload: EncryptedVault): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ login, payload }, 'latest');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadEncryptedVault(): Promise<StoredVault | null> {
  const db = await openDb();
  const result = await new Promise<StoredVault | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get('latest');
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function clearEncryptedVault(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('latest');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

