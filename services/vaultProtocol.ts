import path from 'path';
import { vaultService, VaultSnapshotMeta } from './vaultService';

export interface PageContext {
  url: string;
  virtualDomain?: string;
  snapshotId?: string;
  skillHint?: string;
  isVaultSnapshot: boolean;
}

export class VaultProtocol {
  private readonly vaultPrefix = 'vault://page/';

  async resolve(url: string): Promise<{ html?: string; meta?: VaultSnapshotMeta; pageContext: PageContext }> {
    if (!this.isVaultPage(url)) {
      return {
        pageContext: {
          url,
          isVaultSnapshot: false,
        },
      };
    }

    const snapshotId = this.extractSnapshotId(url);
    const snapshot = snapshotId ? await vaultService.getSnapshotById(snapshotId) : null;

    if (!snapshot || !snapshot.meta) {
      return {
        pageContext: {
          url,
          snapshotId,
          isVaultSnapshot: true,
        },
      };
    }

    return {
      html: snapshot.html,
      meta: snapshot.meta,
      pageContext: this.buildPageContext(url, snapshot.meta),
    };
  }

  isVaultPage(url: string): boolean {
    return url.startsWith(this.vaultPrefix);
  }

  extractSnapshotId(url: string): string | null {
    if (!this.isVaultPage(url)) return null;
    return url.replace(this.vaultPrefix, '').split('?')[0];
  }

  buildPageContext(url: string, meta: VaultSnapshotMeta): PageContext {
    return {
      url,
      virtualDomain: meta.domain,
      snapshotId: meta.id,
      skillHint: meta.skillHint,
      isVaultSnapshot: true,
    };
  }

  buildLivePageContext(url: string): PageContext {
    let virtualDomain: string | undefined;
    try {
      virtualDomain = new URL(url).hostname;
    } catch {
      virtualDomain = undefined;
    }

    return {
      url,
      virtualDomain,
      isVaultSnapshot: false,
    };
  }

  metaPath(id: string): string {
    return path.join(process.cwd(), 'PalmVault', 'meta', `${id}.json`);
  }
}

export const vaultProtocol = new VaultProtocol();
