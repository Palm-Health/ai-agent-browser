export interface ForgeCandidate {
  id: string;
  source: 'shadow' | 'sentinel' | 'manual';
  createdAt: string;

  virtualDomain?: string;
  urlSample?: string;
  snapshotId?: string;

  selectors: Array<{
    name?: string;
    selector: string;
    usageCount: number;
    successRate: number;
    lastSeenAt: string;
  }>;

  workflows: Array<{
    name: string;
    description: string;
    steps: any[];
    successRate: number;
    failurePatterns?: string[];
  }>;

  targetSkillId?: string;

  status: 'candidate' | 'approved' | 'rejected' | 'merged';
  notes?: string;
}

export interface ForgeChangeProposal {
  targetSkillId?: string;
  newSkillId?: string;
  summary: string;
  selectorChanges: any[];
  workflowChanges: any[];
}
