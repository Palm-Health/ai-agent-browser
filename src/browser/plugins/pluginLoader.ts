import { access, constants, readFile, readdir } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  DomainSkillMatch,
  LoadedPlugin,
  PluginContext,
  PluginEntry,
  PluginLoaderOptions,
  PluginManifest,
  PluginModule,
  PluginPermission,
  SkillPackDefinition,
} from './pluginTypes';

export class PluginLoader {
  private plugins = new Map<string, LoadedPlugin>();
  private domainIndex = new Map<string, Set<string>>();
  private skillIndex = new Map<string, DomainSkillBucket>();
  private readonly allowedPermissions: PluginPermission[];
  private readonly pluginDirectory?: string;
  private readonly browserApi?: PluginLoaderOptions['browserApi'];
  private readonly domApi?: PluginLoaderOptions['domApi'];
  private readonly mcpApi?: PluginLoaderOptions['mcpApi'];
  private readonly vaultApi?: PluginLoaderOptions['vaultApi'];

  constructor(options: PluginLoaderOptions = {}) {
    this.allowedPermissions = options.allowedPermissions ?? ['browser', 'dom', 'mcp', 'vault'];
    this.pluginDirectory = options.pluginDirectory;
    this.browserApi = options.browserApi;
    this.domApi = options.domApi;
    this.mcpApi = options.mcpApi;
    this.vaultApi = options.vaultApi;
  }

  async loadPlugin(manifestPath: string): Promise<LoadedPlugin> {
    const manifest = await this.loadManifest(manifestPath);
    this.validatePermissions(manifest);

    const module = await this.importModule(manifestPath, manifest);
    const context = this.createContext(manifest);
    const entry = await module.createPlugin(context);

    const loaded: LoadedPlugin = { manifest, entry, status: 'loaded' };
    this.plugins.set(manifest.id, loaded);
    this.indexDomains(manifest, entry);

    await entry.hooks.activate?.();
    return loaded;
  }

  async loadPluginsFromDirectory(directory = this.pluginDirectory): Promise<LoadedPlugin[]> {
    if (!directory) return [];

    const manifests: string[] = [];
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        manifests.push(path.join(directory, entry.name));
      }

      if (entry.isDirectory()) {
        const nestedManifest = path.join(directory, entry.name, 'manifest.json');
        if (await this.fileExists(nestedManifest)) {
          manifests.push(nestedManifest);
        }
      }
    }

    const loaded: LoadedPlugin[] = [];
    for (const manifestPath of manifests) {
      try {
        const plugin = await this.loadPlugin(manifestPath);
        loaded.push(plugin);
      } catch (error) {
        loaded.push({
          manifest: {
            id: manifestPath,
            name: manifestPath,
            permissions: [],
            entry: '',
          },
          entry: { hooks: {} },
          status: 'failed',
        });
        console.error(`Failed to load plugin from ${manifestPath}`, error);
      }
    }

    return loaded;
  }

  getLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string): LoadedPlugin | undefined {
    return this.plugins.get(id);
  }

  getSkillPacksForDomain(domain: string): DomainSkillMatch[] {
    const matchedSkills = this.findSkillPacksForHostname(domain);
    return matchedSkills;
  }

  async notifyNavigation(url: string): Promise<void> {
    const hostname = this.extractHostname(url);
    if (!hostname) return;

    const matchingPlugins = this.findPluginsForHostname(hostname);
    for (const plugin of matchingPlugins) {
      await plugin.entry.hooks.onDomainMatched?.(hostname);
    }
  }

  private async loadManifest(manifestPath: string): Promise<PluginManifest> {
    const raw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as PluginManifest;
    this.validateManifest(manifest, manifestPath);
    return manifest;
  }

  private validateManifest(manifest: PluginManifest, manifestPath: string): void {
    const errors: string[] = [];

    if (!manifest.id) errors.push('Missing id');
    if (!manifest.name) errors.push('Missing name');
    if (!manifest.entry) errors.push('Missing entry');
    if (manifest.entry && typeof manifest.entry !== 'string') {
      errors.push('entry must be a string path');
    }
    if (!Array.isArray(manifest.permissions)) errors.push('Missing permissions');

    if (manifest.domains && !Array.isArray(manifest.domains)) {
      errors.push('domains must be an array of hostnames');
    }

    if (errors.length) {
      throw new Error(`Invalid manifest at ${manifestPath}: ${errors.join(', ')}`);
    }
  }

  private validatePermissions(manifest: PluginManifest): void {
    const disallowed = manifest.permissions.filter(
      permission => !this.allowedPermissions.includes(permission)
    );

    if (disallowed.length) {
      throw new Error(
        `Plugin ${manifest.id} requests unsupported permissions: ${disallowed.join(', ')}`
      );
    }
  }

  private async importModule(manifestPath: string, manifest: PluginManifest): Promise<PluginModule> {
    const resolvedEntry = path.isAbsolute(manifest.entry)
      ? manifest.entry
      : path.join(path.dirname(manifestPath), manifest.entry);

    const module = (await import(pathToFileURL(resolvedEntry).href)) as PluginModule;

    if (!module?.createPlugin) {
      throw new Error(`Plugin ${manifest.id} did not export a createPlugin function`);
    }

    return module;
  }

  private createContext(manifest: PluginManifest): PluginContext {
    return {
      manifest,
      permissions: manifest.permissions,
      browser: manifest.permissions.includes('browser') ? this.browserApi : undefined,
      dom: manifest.permissions.includes('dom') ? this.domApi : undefined,
      mcp: manifest.permissions.includes('mcp') ? this.mcpApi : undefined,
      vault: manifest.permissions.includes('vault') ? this.vaultApi : undefined,
    };
  }

  private indexDomains(manifest: PluginManifest, entry: PluginEntry): void {
    if (manifest.domains) {
      for (const domain of manifest.domains) {
        if (!this.domainIndex.has(domain)) {
          this.domainIndex.set(domain, new Set());
        }
        this.domainIndex.get(domain)!.add(manifest.id);
      }
    }

    if (entry.skills) {
      for (const skill of entry.skills) {
        if (!skill.domain) continue;

        if (!this.skillIndex.has(skill.domain)) {
          this.skillIndex.set(skill.domain, { domain: skill.domain, skills: [] });
        }

        this.skillIndex.get(skill.domain)!.skills.push({
          pluginId: manifest.id,
          pluginName: manifest.name,
          manifest,
          skill,
        });

        if (!this.domainIndex.has(skill.domain)) {
          this.domainIndex.set(skill.domain, new Set());
        }
        this.domainIndex.get(skill.domain)!.add(manifest.id);
      }
    }
  }

  private extractHostname(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error('Failed to parse URL for navigation notification', error);
      return null;
    }
  }

  private findPluginsForHostname(hostname: string): LoadedPlugin[] {
    const matching = new Set<LoadedPlugin>();

    for (const [domain, pluginIds] of this.domainIndex.entries()) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        for (const pluginId of pluginIds) {
          const plugin = this.plugins.get(pluginId);
          if (plugin) {
            matching.add(plugin);
          }
        }
      }
    }

    return Array.from(matching.values());
  }

  private findSkillPacksForHostname(hostname: string): DomainSkillMatch[] {
    const matchesByPlugin = new Map<string, DomainSkillBucket>();

    for (const bucket of this.skillIndex.values()) {
      if (hostname === bucket.domain || hostname.endsWith(`.${bucket.domain}`)) {
        for (const entry of bucket.skills) {
          if (!matchesByPlugin.has(entry.pluginId)) {
            matchesByPlugin.set(entry.pluginId, {
              domain: bucket.domain,
              skills: [],
            });
          }

          matchesByPlugin.get(entry.pluginId)!.skills.push(entry);
        }
      }
    }

    return Array.from(matchesByPlugin.values()).map(bucket => ({
      pluginId: bucket.skills[0]?.pluginId ?? '',
      pluginName: bucket.skills[0]?.pluginName ?? '',
      manifest: bucket.skills[0]?.manifest!,
      skills: bucket.skills.map(entry => entry.skill),
    }));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

interface DomainSkillBucket {
  domain: string;
  skills: DomainSkillEntry[];
}

interface DomainSkillEntry {
  pluginId: string;
  pluginName: string;
  manifest: PluginManifest;
  skill: SkillPackDefinition;
}
