import { Tab } from '../types';

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  tabIds: string[];
  collapsed: boolean;
}

export interface ExtendedTab extends Tab {
  pinned?: boolean;
  muted?: boolean;
  groupId?: string;
}

/**
 * Tab Manager
 * Handles advanced tab features like pinning, grouping, and recently closed tabs
 */
export class TabManager {
  private recentlyClosed: ExtendedTab[] = [];
  private readonly MAX_RECENTLY_CLOSED = 10;
  private tabGroups: Map<string, TabGroup> = new Map();
  private tabs: Map<string, ExtendedTab> = new Map();

  /**
   * Register a tab
   */
  registerTab(tab: Tab): void {
    const extendedTab: ExtendedTab = {
      ...tab,
      pinned: false,
      muted: false,
    };
    this.tabs.set(tab.browserViewId || tab.id.toString(), extendedTab);
  }

  /**
   * Unregister a tab
   */
  unregisterTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      // Add to recently closed
      this.recentlyClosed.unshift(tab);
      if (this.recentlyClosed.length > this.MAX_RECENTLY_CLOSED) {
        this.recentlyClosed.pop();
      }
      
      // Remove from group if in one
      if (tab.groupId) {
        const group = this.tabGroups.get(tab.groupId);
        if (group) {
          group.tabIds = group.tabIds.filter(id => id !== tabId);
        }
      }
    }
    
    this.tabs.delete(tabId);
  }

  /**
   * Pin a tab
   */
  pinTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.pinned = true;
      this.tabs.set(tabId, tab);
    }
  }

  /**
   * Unpin a tab
   */
  unpinTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.pinned = false;
      this.tabs.set(tabId, tab);
    }
  }

  /**
   * Check if tab is pinned
   */
  isPinned(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    return tab?.pinned || false;
  }

  /**
   * Duplicate a tab
   */
  duplicateTab(tabId: string): ExtendedTab | null {
    const tab = this.tabs.get(tabId);
    if (!tab) return null;

    const newTab: ExtendedTab = {
      ...tab,
      id: Date.now(),
      browserViewId: `tab-${Date.now()}`,
      pinned: false, // Duplicated tabs are not pinned
    };

    this.tabs.set(newTab.browserViewId!, newTab);
    return newTab;
  }

  /**
   * Mute a tab
   */
  muteTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.muted = true;
      this.tabs.set(tabId, tab);
    }
  }

  /**
   * Unmute a tab
   */
  unmuteTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.muted = false;
      this.tabs.set(tabId, tab);
    }
  }

  /**
   * Check if tab is muted
   */
  isMuted(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    return tab?.muted || false;
  }

  /**
   * Create a tab group
   */
  createTabGroup(name: string, color: string): TabGroup {
    const group: TabGroup = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      color,
      tabIds: [],
      collapsed: false,
    };

    this.tabGroups.set(group.id, group);
    return group;
  }

  /**
   * Add tab to group
   */
  addTabToGroup(tabId: string, groupId: string): void {
    const tab = this.tabs.get(tabId);
    const group = this.tabGroups.get(groupId);

    if (!tab || !group) return;

    // Remove from old group if in one
    if (tab.groupId) {
      const oldGroup = this.tabGroups.get(tab.groupId);
      if (oldGroup) {
        oldGroup.tabIds = oldGroup.tabIds.filter(id => id !== tabId);
      }
    }

    // Add to new group
    tab.groupId = groupId;
    if (!group.tabIds.includes(tabId)) {
      group.tabIds.push(tabId);
    }

    this.tabs.set(tabId, tab);
  }

  /**
   * Remove tab from group
   */
  removeTabFromGroup(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.groupId) return;

    const group = this.tabGroups.get(tab.groupId);
    if (group) {
      group.tabIds = group.tabIds.filter(id => id !== tabId);
    }

    tab.groupId = undefined;
    this.tabs.set(tabId, tab);
  }

  /**
   * Get tab group
   */
  getTabGroup(groupId: string): TabGroup | undefined {
    return this.tabGroups.get(groupId);
  }

  /**
   * Get all tab groups
   */
  getAllTabGroups(): TabGroup[] {
    return Array.from(this.tabGroups.values());
  }

  /**
   * Delete tab group
   */
  deleteTabGroup(groupId: string): void {
    const group = this.tabGroups.get(groupId);
    if (!group) return;

    // Remove group from all tabs
    group.tabIds.forEach(tabId => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.groupId = undefined;
        this.tabs.set(tabId, tab);
      }
    });

    this.tabGroups.delete(groupId);
  }

  /**
   * Collapse tab group
   */
  collapseGroup(groupId: string): void {
    const group = this.tabGroups.get(groupId);
    if (group) {
      group.collapsed = true;
      this.tabGroups.set(groupId, group);
    }
  }

  /**
   * Expand tab group
   */
  expandGroup(groupId: string): void {
    const group = this.tabGroups.get(groupId);
    if (group) {
      group.collapsed = false;
      this.tabGroups.set(groupId, group);
    }
  }

  /**
   * Get recently closed tabs
   */
  getRecentlyClosed(): ExtendedTab[] {
    return [...this.recentlyClosed];
  }

  /**
   * Reopen last closed tab
   */
  reopenClosedTab(): ExtendedTab | null {
    const tab = this.recentlyClosed.shift();
    if (tab) {
      // Generate new IDs
      const newTab: ExtendedTab = {
        ...tab,
        id: Date.now(),
        browserViewId: `tab-${Date.now()}`,
      };
      this.tabs.set(newTab.browserViewId!, newTab);
      return newTab;
    }
    return null;
  }

  /**
   * Clear recently closed tabs
   */
  clearRecentlyClosed(): void {
    this.recentlyClosed = [];
  }

  /**
   * Get tab by ID
   */
  getTab(tabId: string): ExtendedTab | undefined {
    return this.tabs.get(tabId);
  }

  /**
   * Get all tabs
   */
  getAllTabs(): ExtendedTab[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Get pinned tabs
   */
  getPinnedTabs(): ExtendedTab[] {
    return Array.from(this.tabs.values()).filter(tab => tab.pinned);
  }

  /**
   * Get unpinned tabs
   */
  getUnpinnedTabs(): ExtendedTab[] {
    return Array.from(this.tabs.values()).filter(tab => !tab.pinned);
  }

  /**
   * Sort tabs (pinned first, then by group)
   */
  sortTabs(tabs: ExtendedTab[]): ExtendedTab[] {
    return tabs.sort((a, b) => {
      // Pinned tabs first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // Then by group
      if (a.groupId && !b.groupId) return -1;
      if (!a.groupId && b.groupId) return 1;
      if (a.groupId && b.groupId && a.groupId !== b.groupId) {
        return a.groupId.localeCompare(b.groupId);
      }

      // Then by ID
      return a.id - b.id;
    });
  }

  /**
   * Save tab state to localStorage
   */
  saveState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const state = {
        tabs: Array.from(this.tabs.entries()),
        groups: Array.from(this.tabGroups.entries()),
        recentlyClosed: this.recentlyClosed,
      };
      localStorage.setItem('tab-manager-state', JSON.stringify(state));
    }
  }

  /**
   * Load tab state from localStorage
   */
  loadState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stateStr = localStorage.getItem('tab-manager-state');
      if (stateStr) {
        try {
          const state = JSON.parse(stateStr);
          this.tabs = new Map(state.tabs);
          this.tabGroups = new Map(state.groups);
          this.recentlyClosed = state.recentlyClosed || [];
        } catch (error) {
          console.error('Failed to load tab manager state:', error);
        }
      }
    }
  }
}

export const tabManager = new TabManager();

