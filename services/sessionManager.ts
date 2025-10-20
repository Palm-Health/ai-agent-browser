import { storageService, BrowserSession } from './storageService';

/**
 * Session Manager
 * Handles saving and restoring browser sessions
 */
export class SessionManager {
  private readonly LAST_SESSION_KEY = 'last-session';
  private readonly AUTO_SAVE_KEY = 'auto-save-enabled';
  private autoSaveEnabled = false;

  constructor() {
    this.loadAutoSavePreference();
    this.setupAutoSave();
  }

  /**
   * Save current session
   */
  async saveSession(tabs: Array<{ url: string; title: string }>, activeTabId: string, name?: string): Promise<BrowserSession> {
    const session: BrowserSession = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: name || `Session ${new Date().toLocaleString()}`,
      tabs,
      activeTabId,
      timestamp: new Date(),
    };

    await storageService.saveToLocal('sessions', session.id, session);
    
    // Also save as last session
    await this.saveLastSession(session);

    return session;
  }

  /**
   * Restore a session
   */
  async restoreSession(sessionId: string): Promise<BrowserSession | null> {
    const session = await storageService.getFromLocal('sessions', sessionId);
    return session;
  }

  /**
   * Get all saved sessions
   */
  async getSavedSessions(): Promise<BrowserSession[]> {
    const sessions = await storageService.getAllFromStore('sessions');
    return sessions
      .map((s: any) => s.data || s)
      .sort((a: BrowserSession, b: BrowserSession) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await storageService.deleteFromLocal('sessions', sessionId);
  }

  /**
   * Save last session
   */
  private async saveLastSession(session: BrowserSession): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.LAST_SESSION_KEY, JSON.stringify(session));
    }
  }

  /**
   * Get last session
   */
  async getLastSession(): Promise<BrowserSession | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const sessionStr = localStorage.getItem(this.LAST_SESSION_KEY);
      if (sessionStr) {
        try {
          return JSON.parse(sessionStr);
        } catch (error) {
          console.error('Failed to parse last session:', error);
        }
      }
    }
    return null;
  }

  /**
   * Restore last session on startup
   */
  async restoreLastSession(): Promise<BrowserSession | null> {
    return await this.getLastSession();
  }

  /**
   * Enable auto-save
   */
  enableAutoSave(): void {
    this.autoSaveEnabled = true;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.AUTO_SAVE_KEY, 'true');
    }
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    this.autoSaveEnabled = false;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.AUTO_SAVE_KEY, 'false');
    }
  }

  /**
   * Check if auto-save is enabled
   */
  isAutoSaveEnabled(): boolean {
    return this.autoSaveEnabled;
  }

  /**
   * Load auto-save preference
   */
  private loadAutoSavePreference(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const enabled = localStorage.getItem(this.AUTO_SAVE_KEY);
      this.autoSaveEnabled = enabled === 'true';
    }
  }

  /**
   * Setup auto-save on window close
   */
  private setupAutoSave(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.autoSaveEnabled) {
          // Auto-save will be handled by the app component
          // This just ensures the event listener is set up
        }
      });
    }
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    await storageService.clearStore('sessions');
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.LAST_SESSION_KEY);
    }
  }

  /**
   * Export session to JSON
   */
  exportSession(session: BrowserSession): string {
    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session from JSON
   */
  async importSession(json: string): Promise<BrowserSession> {
    const session: BrowserSession = JSON.parse(json);
    
    // Generate new ID to avoid conflicts
    session.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    session.timestamp = new Date();

    await storageService.saveToLocal('sessions', session.id, session);
    return session;
  }
}

export const sessionManager = new SessionManager();

