// IndexedDB Offline Queue Manager for SAARTHI
const DB_NAME = 'saarthi_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'queued_reports';

export interface QueuedReport {
  idempotencyKey: string;
  reportText: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'error';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'idempotencyKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueReport(reportText: string, idempotencyKey?: string): Promise<QueuedReport> {
  const db = await openDB();
  const key = idempotencyKey || `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const item: QueuedReport = {
    idempotencyKey: key,
    reportText,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedReports(): Promise<QueuedReport[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: QueuedReport[] = req.result || [];
        // Return in submission order (chronological by timestamp)
        items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OFFLINE STORE] Error getting queued reports:', err);
    return [];
  }
}

export async function removeQueuedReport(idempotencyKey: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(idempotencyKey);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const reports = await getQueuedReports();
  return reports.length;
}
