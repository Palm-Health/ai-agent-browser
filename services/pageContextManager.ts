import { PageContext } from './vaultProtocol';

export class PageContextManager {
  private contexts: Map<string, PageContext> = new Map();

  setContext(tabId: string, context: PageContext): void {
    this.contexts.set(tabId, context);
  }

  getContext(tabId: string): PageContext | undefined {
    return this.contexts.get(tabId);
  }

  clear(tabId: string): void {
    this.contexts.delete(tabId);
  }
}

export const pageContextManager = new PageContextManager();
