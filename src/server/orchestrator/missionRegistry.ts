import { MissionRequest } from './orchestratorTypes';

export interface MissionTemplate {
  id: string;
  title: string;
  defaultAgent: string;
  description: string;
}

export const missionRegistry: MissionTemplate[] = [
  {
    id: 'marketing.campaign',
    title: 'Marketing Campaign Planner',
    defaultAgent: 'marketing',
    description: 'Generates a short-form marketing campaign plan.',
  },
  {
    id: 'browser.audit',
    title: 'Browser navigation and audit',
    defaultAgent: 'browser',
    description: 'Simple browser navigation for QA.',
  },
];

export function getMissionTemplate(id: string): MissionTemplate | undefined {
  return missionRegistry.find((entry) => entry.id === id);
}

export function createMissionRequestFromTemplate(id: string, overrides?: Partial<MissionRequest>): MissionRequest {
  const template = getMissionTemplate(id);
  return {
    id: overrides?.id || `mission-${id}-${Date.now()}`,
    goal: template?.description || 'generic mission',
    agentHint: template?.defaultAgent,
    tasks: overrides?.tasks || [],
    metadata: overrides?.metadata || {},
  };
}
