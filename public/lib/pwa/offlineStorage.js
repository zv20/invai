// Offline Storage Module for PWA
// Provides basic offline data persistence using IndexedDB

const STORAGE_NAME = 'invai-offline-storage';
const STORAGE_VERSION = 1;

let db = null;

// Initialize IndexedDB
function initOfflineStorage() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(STORAGE_NAME, STORAGE_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create object stores if they don't exist
      if (!database.objectStoreNames.contains('products')) {
        database.createObjectStore('products', { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains('batches')) {
        database.createObjectStore('batches', { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains('syncQueue')) {
        database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }

      console.log('IndexedDB upgraded to version', STORAGE_VERSION);
    };
  });
}

// Store data offline
async function storeOfflineData(storeName, data) {
  try {
    const database = await initOfflineStorage();
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    if (Array.isArray(data)) {
      // Clear existing data and store new array
      store.clear();
      data.forEach(item => store.add(item));
    } else {
      // Store single item
      store.put(data);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error storing offline data:', error);
    return false;
  }
}

// Retrieve offline data
async function getOfflineData(storeName, key = null) {
  try {
    const database = await initOfflineStorage();
    const transaction = database.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    if (key) {
      // Get single item by key
      const request = store.get(key);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } else {
      // Get all items
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  } catch (error) {
    console.error('Error retrieving offline data:', error);
    return null;
  }
}

// Add to sync queue
async function addToSyncQueue(action, data) {
  try {
    const database = await initOfflineStorage();
    const transaction = database.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    const queueItem = {
      action,
      data,
      timestamp: Date.now()
    };

    store.add(queueItem);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error adding to sync queue:', error);
    return false;
  }
}

// Get sync queue
async function getSyncQueue() {
  return await getOfflineData('syncQueue');
}

// Clear sync queue
async function clearSyncQueue() {
  try {
    const database = await initOfflineStorage();
    const transaction = database.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    store.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error clearing sync queue:', error);
    return false;
  }
}

// Export functions
window.offlineStorage = {
  init: initOfflineStorage,
  store: storeOfflineData,
  get: getOfflineData,
  addToSyncQueue,
  getSyncQueue,
  clearSyncQueue
};

console.log('Offline storage module loaded');
