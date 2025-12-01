import { promises as fs } from 'fs';
import path from 'path';
import { PageContext } from './vaultProtocol';

export interface SkillWorkflowStep {
  action: 'goto' | 'click' | 'waitForSelector' | 'extractText';
  selector?: string;
  url?: string;
  description?: string;
}

export interface SkillPack {
  id: string;
  domain: string[];
  selectors: Record<string, string>;
  workflows: Record<string, SkillWorkflowStep[]>;
}

export class SkillManager {
  private skills: Map<string, SkillPack> = new Map();
  private loaded = false;

  constructor(private skillsDir: string = path.join(process.cwd(), 'browser', 'skills')) {}

  async loadSkills(): Promise<void> {
    if (this.loaded) return;
    const exists = await this.exists(this.skillsDir);
    if (!exists) {
      this.loaded = true;
      return;
    }

    const entries = await fs.readdir(this.skillsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.skill.json')) continue;
      const raw = await fs.readFile(path.join(this.skillsDir, entry), 'utf8');
      const skill = JSON.parse(raw) as SkillPack;
      this.skills.set(skill.id, skill);
    }

    this.loaded = true;
  }

  async getActiveSkillForPage(pageContext: PageContext): Promise<SkillPack | null> {
    await this.loadSkills();

    if (pageContext.snapshotId && pageContext.virtualDomain) {
      const skill = this.matchSkillByDomain(pageContext.virtualDomain);
      if (skill) return skill;
    }

    const hintSkill = this.getSkillByHint(pageContext.skillHint);
    if (hintSkill) {
      return hintSkill;
    }

    if (pageContext.virtualDomain) {
      const skill = this.matchSkillByDomain(pageContext.virtualDomain);
      if (skill) return skill;
    }

    const liveDomain = this.safeDomainFromUrl(pageContext.url);
    if (liveDomain) {
      const skill = this.matchSkillByDomain(liveDomain);
      if (skill) return skill;
    }

    return null;
  }

  getSkillById(id: string): SkillPack | null {
    return this.skills.get(id) ?? null;
  }

  getSkillByHint(hint?: string | null): SkillPack | null {
    if (!hint) return null;
    const normalized = hint.toLowerCase();
    return this.skills.get(normalized) ?? null;
  }

  private matchSkillByDomain(domain: string): SkillPack | null {
    for (const skill of this.skills.values()) {
      if (skill.domain.some(d => domain === d || domain.endsWith(d))) {
        return skill;
      }
    }
    return null;
  }

  private safeDomainFromUrl(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  private async exists(target: string): Promise<boolean> {
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }
}

export const skillManager = new SkillManager();
