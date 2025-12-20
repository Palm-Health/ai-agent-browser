import { vaultProtocol, PageContext } from './vaultProtocol';
import { vaultService } from './vaultService';
import { skillManager, SkillPack } from './skillManager';
import { pageContextManager } from './pageContextManager';

interface PluginAPIOptions {
  getActiveTabId?: () => string | null;
  navigate?: (tabId: string, url: string) => Promise<void>;
}

export class PluginAPI {
  constructor(private options: PluginAPIOptions = {}) {}

  getPageContext(tabId?: string): PageContext | undefined {
    const targetTab = tabId ?? this.options.getActiveTabId?.() ?? undefined;
    if (!targetTab) return undefined;
    return pageContextManager.getContext(targetTab);
  }

  async resolveContextForUrl(url: string): Promise<PageContext> {
    const result = await vaultProtocol.resolve(url);
    return result.pageContext;
  }

  readonly vault = {
    getSnapshotMeta: (id: string) => vaultService.getSnapshotMeta(id),
    openSnapshot: async (id: string, tabId?: string) => {
      const url = vaultService.openSnapshot(id);
      const targetTab = tabId ?? this.options.getActiveTabId?.();
      if (url && targetTab && this.options.navigate) {
        await this.options.navigate(targetTab, url);
      }
      return url;
    },
  };

  readonly skills = {
    getActiveSkill: async (tabId?: string): Promise<SkillPack | null> => {
      const context = this.getPageContext(tabId);
      if (!context) return null;
      return skillManager.getActiveSkillForPage(context);
    },
  };
}

export const pluginAPI = new PluginAPI();
