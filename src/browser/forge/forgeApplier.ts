import fs from 'fs/promises';
import path from 'path';
import { getForgeCandidate, updateForgeCandidate } from './forgeState';
import { ForgeChangeProposal } from './forgeTypes';

const SKILL_DIR = path.join(process.cwd(), 'src', 'browser', 'skills');

interface SkillPack {
  id: string;
  domains?: string[];
  selectors: any[];
  workflows: any[];
  description?: string;
  metadata?: Record<string, any>;
}

async function ensureSkillDir(): Promise<void> {
  await fs.mkdir(SKILL_DIR, { recursive: true });
}

async function loadSkillPack(skillId: string): Promise<SkillPack | null> {
  const filePath = path.join(SKILL_DIR, `${skillId}.skill.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as SkillPack;
  } catch (error) {
    return null;
  }
}

function mergeSkill(existing: SkillPack | null, proposal: ForgeChangeProposal): SkillPack {
  const base: SkillPack = existing || {
    id: proposal.targetSkillId || proposal.newSkillId || `forge-${Date.now()}`,
    selectors: [],
    workflows: [],
    metadata: {},
    description: proposal.summary,
  };

  const selectors = [...base.selectors];
  for (const change of proposal.selectorChanges) {
    const index = selectors.findIndex(sel => sel.name === change.name || sel.selector === change.selector);
    if (index >= 0) {
      selectors[index] = { ...selectors[index], ...change };
    } else {
      selectors.push(change);
    }
  }

  const workflows = [...base.workflows];
  for (const change of proposal.workflowChanges) {
    const index = workflows.findIndex(wf => wf.name === change.name);
    if (index >= 0) {
      workflows[index] = { ...workflows[index], ...change };
    } else {
      workflows.push(change);
    }
  }

  return {
    ...base,
    selectors,
    workflows,
    description: proposal.summary,
    metadata: {
      ...base.metadata,
      generatedBy: 'browser-forge',
      generatedAt: new Date().toISOString(),
    },
  };
}

function createDiff(current: SkillPack | null, updated: SkillPack): string {
  const currentString = JSON.stringify(current || {}, null, 2);
  const updatedString = JSON.stringify(updated, null, 2);
  const currentLines = currentString.split('\n').map(line => `- ${line}`);
  const updatedLines = updatedString.split('\n').map(line => `+ ${line}`);
  return ['--- current', '+++ proposed', ...currentLines, ...updatedLines].join('\n');
}

async function writeSkillPack(updated: SkillPack): Promise<string> {
  await ensureSkillDir();
  const filePath = path.join(SKILL_DIR, `${updated.id}.skill.json`);
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
  return filePath;
}

export async function applyForgeProposal(
  proposal: ForgeChangeProposal,
  mode: 'preview' | 'apply'
): Promise<{ previewDiff?: string; applied: boolean; newSkillFilePath?: string }>
{
  await ensureSkillDir();
  const existing = proposal.targetSkillId ? await loadSkillPack(proposal.targetSkillId) : null;
  const updated = mergeSkill(existing, proposal);

  if (mode === 'preview') {
    return {
      previewDiff: createDiff(existing, updated),
      applied: false,
    };
  }

  const newSkillFilePath = await writeSkillPack(updated);
  const candidate = proposal.targetSkillId ? getForgeCandidate(proposal.targetSkillId) : undefined;
  if (candidate) {
    updateForgeCandidate({ ...candidate, status: 'merged' });
  }

  return {
    applied: true,
    newSkillFilePath,
  };
}
