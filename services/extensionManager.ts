export interface Extension {
  id: string;
  name: string;
  version: string;
  manifestVersion: 2 | 3;
  enabled: boolean;
  permissions: string[];
  description?: string;
  icons?: { [size: string]: string };
  author?: string;
}

/**
 * Extension Manager
 * Manages browser extensions with whitelist support
 */
export class ExtensionManager {
  private extensions: Map<string, Extension> = new Map();
  private readonly STORAGE_KEY = 'installed-extensions';

  // Whitelisted extensions (by name or ID)
  private readonly whitelistedExtensions = [
    'uBlock Origin',
    'Dark Reader',
    'Grammarly',
    'LastPass',
    '1Password',
    'Bitwarden',
    'Privacy Badger',
    'HTTPS Everywhere',
    'Honey',
    'Pocket',
  ];

  constructor() {
    this.loadExtensions();
  }

  /**
   * Load extension from .crx file or directory
   * Note: Full implementation requires Electron session.loadExtension
   */
  async loadExtension(path: string): Promise<Extension> {
    // This is a simplified implementation
    // Full implementation would use Electron's session.loadExtension()
    
    throw new Error('Extension loading not yet fully implemented. Requires Electron session API integration.');
    
    // Mock implementation for development:
    // const extension: Extension = {
    //   id: Date.now().toString(),
    //   name: 'Test Extension',
    //   version: '1.0.0',
    //   manifestVersion: 3,
    //   enabled: true,
    //   permissions: [],
    // };
    // 
    // if (!this.isWhitelisted(extension.name)) {
    //   throw new Error(`Extension "${extension.name}" is not whitelisted`);
    // }
    // 
    // this.extensions.set(extension.id, extension);
    // this.saveExtensions();
    // 
    // return extension;
  }

  /**
   * Check if extension is whitelisted
   */
  isWhitelisted(nameOrId: string): boolean {
    return this.whitelistedExtensions.some(
      allowed => allowed.toLowerCase() === nameOrId.toLowerCase()
    );
  }

  /**
   * Get whitelisted extension names
   */
  getWhitelistedExtensions(): string[] {
    return [...this.whitelistedExtensions];
  }

  /**
   * Enable extension
   */
  async enableExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    extension.enabled = true;
    this.extensions.set(extensionId, extension);
    this.saveExtensions();

    // In full implementation, would call Electron API to enable extension
  }

  /**
   * Disable extension
   */
  async disableExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    extension.enabled = false;
    this.extensions.set(extensionId, extension);
    this.saveExtensions();

    // In full implementation, would call Electron API to disable extension
  }

  /**
   * Toggle extension enabled state
   */
  async toggleExtension(extensionId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await this.enableExtension(extensionId);
    } else {
      await this.disableExtension(extensionId);
    }
  }

  /**
   * Get installed extensions
   */
  getInstalledExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get extension by ID
   */
  getExtension(extensionId: string): Extension | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Remove extension
   */
  async removeExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    this.extensions.delete(extensionId);
    this.saveExtensions();

    // In full implementation, would call Electron API to unload extension
  }

  /**
   * Check if extension is installed
   */
  isInstalled(extensionId: string): boolean {
    return this.extensions.has(extensionId);
  }

  /**
   * Get enabled extensions
   */
  getEnabledExtensions(): Extension[] {
    return Array.from(this.extensions.values()).filter(ext => ext.enabled);
  }

  /**
   * Get disabled extensions
   */
  getDisabledExtensions(): Extension[] {
    return Array.from(this.extensions.values()).filter(ext => !ext.enabled);
  }

  /**
   * Validate extension manifest
   */
  validateManifest(manifest: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!manifest.name) errors.push('Missing name');
    if (!manifest.version) errors.push('Missing version');
    if (!manifest.manifest_version) errors.push('Missing manifest_version');
    
    if (manifest.manifest_version !== 2 && manifest.manifest_version !== 3) {
      errors.push('Invalid manifest_version (must be 2 or 3)');
    }

    if (!this.isWhitelisted(manifest.name)) {
      errors.push(`Extension "${manifest.name}" is not whitelisted`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get extension permissions
   */
  getExtensionPermissions(extensionId: string): string[] {
    const extension = this.extensions.get(extensionId);
    return extension?.permissions || [];
  }

  /**
   * Check if extension has permission
   */
  hasPermission(extensionId: string, permission: string): boolean {
    const extension = this.extensions.get(extensionId);
    return extension?.permissions.includes(permission) || false;
  }

  /**
   * Save extensions to localStorage
   */
  private saveExtensions(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const extensionsArray = Array.from(this.extensions.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(extensionsArray));
    }
  }

  /**
   * Load extensions from localStorage
   */
  private loadExtensions(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const extensionsStr = localStorage.getItem(this.STORAGE_KEY);
      if (extensionsStr) {
        try {
          const extensionsArray = JSON.parse(extensionsStr);
          this.extensions = new Map(extensionsArray);
        } catch (error) {
          console.error('Failed to load extensions:', error);
        }
      }
    }
  }

  /**
   * Clear all extensions
   */
  clearAllExtensions(): void {
    this.extensions.clear();
    this.saveExtensions();
  }

  /**
   * Get extension statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    whitelisted: number;
  } {
    const all = this.getInstalledExtensions();
    return {
      total: all.length,
      enabled: all.filter(e => e.enabled).length,
      disabled: all.filter(e => !e.enabled).length,
      whitelisted: this.whitelistedExtensions.length,
    };
  }

  /**
   * Export extensions list
   */
  exportExtensions(): string {
    const extensions = this.getInstalledExtensions();
    return JSON.stringify(extensions, null, 2);
  }

  /**
   * Import extensions list
   */
  async importExtensions(json: string): Promise<void> {
    const extensions: Extension[] = JSON.parse(json);
    
    for (const ext of extensions) {
      if (this.isWhitelisted(ext.name)) {
        this.extensions.set(ext.id, ext);
      } else {
        console.warn(`Skipping non-whitelisted extension: ${ext.name}`);
      }
    }

    this.saveExtensions();
  }
}

export const extensionManager = new ExtensionManager();

