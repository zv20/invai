/**
 * Offline Storage Manager
 * Uses IndexedDB for offline data persistence
 */

class OfflineStorage {
  constructor() {
    this.dbName = 'InvAI';
    this.version = 1;
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('IndexedDB upgrade needed');

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('sku', 'sku', { unique: false });
          productStore.createIndex('name', 'name', { unique: false });
          productStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Offline queue for API calls
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('type', 'type', { unique: false });
        }

        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionStore.createIndex('product_id', 'product_id', { unique: false });
          transactionStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Sync metadata
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Get all items from a store
   */
  async getAll(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get single item by key
   */
  async get(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add or update item
   */
  async put(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete item
   */
  async delete(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear entire store
   */
  async clear(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache products for offline access
   */
  async cacheProducts(products) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');

    products.forEach(product => {
      store.put({
        ...product,
        cached_at: new Date().toISOString()
      });
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get cached products
   */
  async getCachedProducts() {
    return this.getAll('products');
  }

  /**
   * Add request to offline queue
   */
  async queueRequest(type, method, url, data) {
    const request = {
      type,
      method,
      url,
      data,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    return this.put('offlineQueue', request);
  }

  /**
   * Get all queued requests
   */
  async getQueuedRequests() {
    return this.getAll('offlineQueue');
  }

  /**
   * Process offline queue
   */
  async processQueue() {
    const queue = await this.getQueuedRequests();
    const results = [];

    for (const request of queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token')
          },
          body: request.data ? JSON.stringify(request.data) : undefined
        });

        if (response.ok) {
          // Success - remove from queue
          await this.delete('offlineQueue', request.id);
          results.push({ id: request.id, success: true });
        } else {
          // Failed - increment retry count
          request.retries++;
          if (request.retries >= 3) {
            // Max retries reached - remove from queue
            await this.delete('offlineQueue', request.id);
            results.push({ id: request.id, success: false, error: 'Max retries' });
          } else {
            await this.put('offlineQueue', request);
            results.push({ id: request.id, success: false, error: 'Retry later' });
          }
        }
      } catch (error) {
        console.error('Queue processing error:', error);
        results.push({ id: request.id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get last sync time
   */
  async getLastSync(key = 'products') {
    const meta = await this.get('syncMeta', key);
    return meta ? meta.timestamp : null;
  }

  /**
   * Set last sync time
   */
  async setLastSync(key = 'products') {
    return this.put('syncMeta', {
      key,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if data needs sync
   */
  async needsSync(key = 'products', maxAgeMinutes = 30) {
    const lastSync = await this.getLastSync(key);
    if (!lastSync) return true;

    const lastSyncTime = new Date(lastSync);
    const now = new Date();
    const ageMinutes = (now - lastSyncTime) / (1000 * 60);

    return ageMinutes > maxAgeMinutes;
  }
}

// Export singleton instance
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineStorage;
} else {
  window.OfflineStorage = OfflineStorage;
}
