import { Bookmark, AppConfig } from '../types';
import { HistoryEntry } from './importService';

export interface BrowserSession {
  id: string;
  name: string;
  tabs: Array<{ url: string; title: string }>;
  activeTabId: string;
  timestamp: Date;
}

export interface BackupData {
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  settings: AppConfig;
  sessions: BrowserSession[];
  version: string;
}

/**
 * Centralized storage service using IndexedDB for large data
 * and localStorage for small configuration
 */
export class StorageService {
  private dbName = 'ai-agent-browser-db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('url', 'url', { unique: false });
          historyStore.createIndex('visitTime', 'visitTime', { unique: false });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('passwords')) {
          const passwordStore = db.createObjectStore('passwords', { keyPath: 'id', autoIncrement: true });
          passwordStore.createIndex('url', 'url', { unique: false });
        }
      };
    });
  }

  /**
   * Save data to IndexedDB
   */
  async saveToLocal(storeName: string, key: string, data: any): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({ id: key, data, timestamp: new Date() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data from IndexedDB
   */
  async getFromLocal(storeName: string, key: string): Promise<any> {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all items from a store
   */
  async getAllFromStore(storeName: string): Promise<any[]> {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete data from IndexedDB
   */
  async deleteFromLocal(storeName: string, key: string): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clearStore(storeName: string): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export all data as a JSON blob
   */
  async exportAllData(): Promise<Blob> {
    const bookmarks = await this.getAllFromStore('bookmarks');
    const history = await this.getAllFromStore('history');
    const sessions = await this.getAllFromStore('sessions');

    // Get settings from localStorage
    let settings = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      const configStr = localStorage.getItem('ai-agent-browser-config');
      if (configStr) {
        settings = JSON.parse(configStr);
      }
    }

    const backupData: BackupData = {
      bookmarks: bookmarks.map(b => b.data || b),
      history: history.map(h => h.data || h),
      settings: settings as AppConfig,
      sessions: sessions.map(s => s.data || s),
      version: '1.0',
    };

    const json = JSON.stringify(backupData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Import all data from a JSON blob
   */
  async importAllData(blob: Blob): Promise<void> {
    const text = await blob.text();
    const data: BackupData = JSON.parse(text);

    // Validate version
    if (!data.version) {
      throw new Error('Invalid backup data: missing version');
    }

    // Import bookmarks
    if (data.bookmarks && Array.isArray(data.bookmarks)) {
      await this.clearStore('bookmarks');
      for (const bookmark of data.bookmarks) {
        await this.saveToLocal('bookmarks', bookmark.id, bookmark);
      }
    }

    // Import history
    if (data.history && Array.isArray(data.history)) {
      await this.clearStore('history');
      for (const entry of data.history) {
        await this.saveToLocal('history', Date.now().toString() + Math.random(), entry);
      }
    }

    // Import sessions
    if (data.sessions && Array.isArray(data.sessions)) {
      await this.clearStore('sessions');
      for (const session of data.sessions) {
        await this.saveToLocal('sessions', session.id, session);
      }
    }

    // Import settings
    if (data.settings && typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('ai-agent-browser-config', JSON.stringify(data.settings));
    }
  }

  /**
   * Optional cloud backup (placeholder for future implementation)
   */
  async backupToCloud(data: BackupData): Promise<void> {
    // This would integrate with a cloud storage service
    // For now, just log that it's not implemented
    console.warn('Cloud backup not yet implemented');
    throw new Error('Cloud backup not yet implemented');
  }

  /**
   * Optional cloud restore (placeholder for future implementation)
   */
  async restoreFromCloud(): Promise<BackupData> {
    // This would integrate with a cloud storage service
    console.warn('Cloud restore not yet implemented');
    throw new Error('Cloud restore not yet implemented');
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    bookmarks: number;
    history: number;
    sessions: number;
    total: number;
  }> {
    const bookmarks = await this.getAllFromStore('bookmarks');
    const history = await this.getAllFromStore('history');
    const sessions = await this.getAllFromStore('sessions');

    return {
      bookmarks: bookmarks.length,
      history: history.length,
      sessions: sessions.length,
      total: bookmarks.length + history.length + sessions.length,
    };
  }
}

export const storageService = new StorageService();

