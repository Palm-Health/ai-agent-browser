import { cacheProposal } from './forgeState';
import { ForgeCandidate, ForgeChangeProposal } from './forgeTypes';

function suggestSkillId(candidate: ForgeCandidate): string {
  if (candidate.targetSkillId) return candidate.targetSkillId;
  if (candidate.virtualDomain) {
    return candidate.virtualDomain.replace(/[^a-zA-Z0-9]+/g, '-');
  }
  return `forge-skill-${Date.now()}`;
}

export async function proposeSkillChanges(candidate: ForgeCandidate): Promise<ForgeChangeProposal> {
  const suggestedSkillId = suggestSkillId(candidate);

  const selectorChanges = candidate.selectors.map(selector => ({
    action: 'add-or-update',
    name: selector.name || selector.selector,
    selector: selector.selector,
    usageCount: selector.usageCount,
    successRate: selector.successRate,
  }));

  const workflowChanges = candidate.workflows.map(workflow => ({
    action: 'add-or-update',
    name: workflow.name,
    description: workflow.description,
    steps: workflow.steps,
    successRate: workflow.successRate,
    failurePatterns: workflow.failurePatterns || [],
  }));

  const proposal: ForgeChangeProposal = {
    targetSkillId: candidate.targetSkillId,
    newSkillId: suggestedSkillId,
    summary: `Proposed skill updates for ${candidate.virtualDomain || suggestedSkillId}`,
    selectorChanges,
    workflowChanges,
  };

  cacheProposal(candidate.id, proposal);
  return proposal;
}
