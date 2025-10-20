export interface Credential {
  id?: string;
  url: string;
  username: string;
  password: string;
  name?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PasswordManagerAdapter {
  name: string;
  isInstalled(): Promise<boolean>;
  connect(): Promise<boolean>;
  getCredentialsForUrl(url: string): Promise<Credential[]>;
  saveCredential(credential: Credential): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * Bitwarden adapter (CLI-based)
 */
export class BitwardenAdapter implements PasswordManagerAdapter {
  name = 'Bitwarden';
  private connected = false;

  async isInstalled(): Promise<boolean> {
    // Check if Bitwarden CLI is installed
    // This would require executing: bw --version
    return false; // Placeholder
  }

  async connect(): Promise<boolean> {
    // Connect to Bitwarden CLI
    // This would require: bw login or bw unlock
    this.connected = false;
    return this.connected;
  }

  async getCredentialsForUrl(url: string): Promise<Credential[]> {
    if (!this.connected) {
      throw new Error('Not connected to Bitwarden');
    }
    // Execute: bw list items --url <url>
    return [];
  }

  async saveCredential(credential: Credential): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to Bitwarden');
    }
    // Execute: bw create item
  }

  async disconnect(): Promise<void> {
    // Execute: bw lock
    this.connected = false;
  }
}

/**
 * 1Password adapter (CLI-based)
 */
export class OnePasswordAdapter implements PasswordManagerAdapter {
  name = '1Password';
  private connected = false;

  async isInstalled(): Promise<boolean> {
    // Check if 1Password CLI is installed
    // This would require executing: op --version
    return false; // Placeholder
  }

  async connect(): Promise<boolean> {
    // Connect to 1Password CLI
    // This would require: op signin
    this.connected = false;
    return this.connected;
  }

  async getCredentialsForUrl(url: string): Promise<Credential[]> {
    if (!this.connected) {
      throw new Error('Not connected to 1Password');
    }
    // Execute: op item list --categories Login --url <url>
    return [];
  }

  async saveCredential(credential: Credential): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to 1Password');
    }
    // Execute: op item create
  }

  async disconnect(): Promise<void> {
    // Execute: op signout
    this.connected = false;
  }
}

/**
 * LastPass adapter (CLI-based)
 */
export class LastPassAdapter implements PasswordManagerAdapter {
  name = 'LastPass';
  private connected = false;

  async isInstalled(): Promise<boolean> {
    // Check if LastPass CLI is installed
    // This would require executing: lpass --version
    return false; // Placeholder
  }

  async connect(): Promise<boolean> {
    // Connect to LastPass CLI
    // This would require: lpass login
    this.connected = false;
    return this.connected;
  }

  async getCredentialsForUrl(url: string): Promise<Credential[]> {
    if (!this.connected) {
      throw new Error('Not connected to LastPass');
    }
    // Execute: lpass show --url <url>
    return [];
  }

  async saveCredential(credential: Credential): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to LastPass');
    }
    // Execute: lpass add
  }

  async disconnect(): Promise<void> {
    // Execute: lpass logout
    this.connected = false;
  }
}

/**
 * Built-in password manager (stores in IndexedDB)
 */
export class BuiltInPasswordManager implements PasswordManagerAdapter {
  name = 'Built-in';
  private connected = true;

  async isInstalled(): Promise<boolean> {
    return true; // Always available
  }

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async getCredentialsForUrl(url: string): Promise<Credential[]> {
    // Get from IndexedDB
    const credentials = await this.getAllCredentials();
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    return credentials.filter(cred => {
      try {
        const credUrl = new URL(cred.url);
        return credUrl.hostname === domain;
      } catch {
        return false;
      }
    });
  }

  async saveCredential(credential: Credential): Promise<void> {
    // Save to IndexedDB
    const dbName = 'ai-agent-browser-db';
    const storeName = 'passwords';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        const credentialWithMeta = {
          ...credential,
          id: credential.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: credential.createdAt || new Date(),
          updatedAt: new Date(),
        };

        const addRequest = store.put(credentialWithMeta);

        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async disconnect(): Promise<void> {
    // Nothing to disconnect for built-in manager
    this.connected = false;
  }

  private async getAllCredentials(): Promise<Credential[]> {
    const dbName = 'ai-agent-browser-db';
    const storeName = 'passwords';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Password Manager Service
 * Manages multiple password manager adapters
 */
export class PasswordManagerService {
  private adapters: Map<string, PasswordManagerAdapter> = new Map();
  private activeAdapter: PasswordManagerAdapter | null = null;

  constructor() {
    // Register built-in password manager
    this.registerAdapter(new BuiltInPasswordManager());
    
    // Register third-party adapters
    this.registerAdapter(new BitwardenAdapter());
    this.registerAdapter(new OnePasswordAdapter());
    this.registerAdapter(new LastPassAdapter());

    // Set built-in as default
    this.activeAdapter = this.adapters.get('Built-in') || null;
  }

  /**
   * Register a password manager adapter
   */
  registerAdapter(adapter: PasswordManagerAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get all registered adapters
   */
  getAdapters(): PasswordManagerAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Detect installed password managers
   */
  async detectInstalledManagers(): Promise<string[]> {
    const installed: string[] = [];

    for (const adapter of this.adapters.values()) {
      if (await adapter.isInstalled()) {
        installed.push(adapter.name);
      }
    }

    return installed;
  }

  /**
   * Set active password manager
   */
  async setActiveManager(name: string): Promise<boolean> {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Password manager '${name}' not found`);
    }

    // Disconnect current adapter
    if (this.activeAdapter) {
      await this.activeAdapter.disconnect();
    }

    // Connect to new adapter
    const connected = await adapter.connect();
    if (connected) {
      this.activeAdapter = adapter;
      return true;
    }

    return false;
  }

  /**
   * Get active password manager
   */
  getActiveManager(): PasswordManagerAdapter | null {
    return this.activeAdapter;
  }

  /**
   * Get credentials for current page
   */
  async getCredentialsForCurrentPage(url: string): Promise<Credential[]> {
    if (!this.activeAdapter) {
      throw new Error('No active password manager');
    }

    return await this.activeAdapter.getCredentialsForUrl(url);
  }

  /**
   * Save new credential
   */
  async saveCredential(credential: Credential): Promise<void> {
    if (!this.activeAdapter) {
      throw new Error('No active password manager');
    }

    await this.activeAdapter.saveCredential(credential);
  }

  /**
   * Generate strong password
   */
  generatePassword(length: number = 16, options?: {
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
  }): string {
    const opts = {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      ...options,
    };

    let charset = '';
    if (opts.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (opts.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (opts.includeNumbers) charset += '0123456789';
    if (opts.includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset.length === 0) {
      throw new Error('At least one character type must be included');
    }

    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    return password;
  }

  /**
   * Check password strength
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 12 characters');

    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Common patterns
    if (/^[0-9]+$/.test(password)) {
      score -= 2;
      feedback.push('Avoid using only numbers');
    }

    if (/^[a-zA-Z]+$/.test(password)) {
      score -= 1;
      feedback.push('Mix letters with numbers and symbols');
    }

    return {
      score: Math.max(0, Math.min(5, score)),
      feedback,
    };
  }
}

export const passwordManagerService = new PasswordManagerService();

