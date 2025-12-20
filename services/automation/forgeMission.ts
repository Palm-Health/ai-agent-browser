import { mineForgeCandidates } from '../../src/browser/forge/forgeMiner';
import { proposeSkillChanges } from '../../src/browser/forge/forgeSynthesizer';
import { applyForgeProposal } from '../../src/browser/forge/forgeApplier';

export type ForgeMissionMode = 'preview' | 'apply';

export interface ForgeMissionInput {
  domain?: string;
  skillId?: string;
  autoApply?: boolean;
}

export interface ForgeMissionResult {
  proposals: Array<{ candidateId: string; summary: string; preview?: string }>;
}

export async function runForgeMission(input: ForgeMissionInput = {}, mode: ForgeMissionMode = 'preview'): Promise<ForgeMissionResult> {
  const candidates = await mineForgeCandidates();
  const filtered = input.domain ? candidates.filter(candidate => candidate.virtualDomain?.includes(input.domain)) : candidates;

  const proposals = [] as ForgeMissionResult['proposals'];
  for (const candidate of filtered) {
    const proposal = await proposeSkillChanges(candidate);
    if (mode === 'apply' || input.autoApply) {
      const result = await applyForgeProposal(proposal, 'apply');
      proposals.push({ candidateId: candidate.id, summary: proposal.summary, preview: result.newSkillFilePath });
    } else {
      const preview = await applyForgeProposal(proposal, 'preview');
      proposals.push({ candidateId: candidate.id, summary: proposal.summary, preview: preview.previewDiff });
    }
  }

  return { proposals };
}

export const ForgeMissionType = 'system.forge_skills';
