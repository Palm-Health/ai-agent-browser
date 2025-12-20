import { MissionRequest, MissionType, Subtask } from './orchestratorTypes';

export interface MissionTemplate {
  type: MissionType;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  suggestedSubtasks: Omit<Subtask, 'id'>[];
  requiredPermissions: string[];
}

export const missionTemplates: MissionTemplate[] = [
  {
    type: 'marketing.campaign',
    name: 'Launch marketing campaign',
    description: 'Plan and launch a multi-channel marketing campaign with approvals.',
    inputSchema: {
      goal: 'Campaign goal or KPI',
      budget: 'Optional budget constraints',
      channels: 'Preferred channels',
    },
    suggestedSubtasks: [
      { agent: 'marketing', description: 'Draft campaign creative options', tool: 'marketing.generate_campaign' },
      { agent: 'browser', description: 'Research competitor positioning', tool: 'browser.plan' },
      { agent: 'marketing', description: 'Assemble final campaign brief', tool: 'marketing.compile_brief' },
    ],
    requiredPermissions: ['marketing:plan', 'browser:read'],
  },
  {
    type: 'marketing.daily_content',
    name: 'Daily content plan',
    description: 'Generate and schedule daily social posts with media sourcing.',
    inputSchema: {
      cadence: 'Posting frequency',
      tone: 'Brand voice cues',
    },
    suggestedSubtasks: [
      { agent: 'marketing', description: 'Generate post ideas', tool: 'marketing.generate_daily' },
      { agent: 'browser', description: 'Identify trending audio or hashtags', tool: 'browser.plan' },
      { agent: 'marketing', description: 'Assemble schedule with captions', tool: 'marketing.schedule' },
    ],
    requiredPermissions: ['marketing:plan', 'browser:read'],
  },
  {
    type: 'analytics.youtube',
    name: 'YouTube analytics',
    description: 'Gather performance metrics and summarize insights.',
    inputSchema: {
      channel: 'Channel handle',
    },
    suggestedSubtasks: [
      { agent: 'browser', description: 'Collect analytics from dashboard', tool: 'browser.plan' },
      { agent: 'marketing', description: 'Summarize insights and opportunities', tool: 'marketing.summarize' },
    ],
    requiredPermissions: ['browser:read'],
  },
  {
    type: 'analytics.tiktok',
    name: 'TikTok analytics',
    description: 'Collect TikTok metrics and propose experiments.',
    inputSchema: {
      handle: 'TikTok account handle',
    },
    suggestedSubtasks: [
      { agent: 'browser', description: 'Collect performance metrics', tool: 'browser.plan' },
      { agent: 'marketing', description: 'Generate recommendations', tool: 'marketing.summarize' },
    ],
    requiredPermissions: ['browser:read'],
  },
  {
    type: 'clinical.research',
    name: 'Clinical research',
    description: 'Research clinical topics using RAG and literature tools.',
    inputSchema: {
      topic: 'Clinical topic or question',
      practiceId: 'Optional practice context',
    },
    suggestedSubtasks: [
      { agent: 'clinical', description: 'Retrieve clinical evidence', tool: 'clinical.search' },
      { agent: 'clinical', description: 'Summarize findings', tool: 'clinical.summarize' },
    ],
    requiredPermissions: ['clinical:read'],
  },
  {
    type: 'clinical.pathway',
    name: 'Clinical pathway planning',
    description: 'Draft a care pathway with decision points.',
    inputSchema: {
      condition: 'Target condition',
      practiceId: 'Practice identifier',
    },
    suggestedSubtasks: [
      { agent: 'clinical', description: 'Draft pathway', tool: 'clinical.pathway' },
      { agent: 'shadow', description: 'Record pathway execution data', tool: 'shadow.start_session' },
    ],
    requiredPermissions: ['clinical:write'],
  },
  {
    type: 'onboarding.practice',
    name: 'Practice onboarding',
    description: 'Set up a new practice instance with guardrails.',
    inputSchema: {
      practiceName: 'Name of practice',
      owner: 'Primary contact',
    },
    suggestedSubtasks: [
      { agent: 'selfhealing', description: 'Check platform health', tool: 'healing.run_supervisor' },
      { agent: 'marketing', description: 'Load brand defaults', tool: 'marketing.load_brand' },
      { agent: 'browser', description: 'Validate external integrations', tool: 'browser.plan' },
    ],
    requiredPermissions: ['system:setup', 'browser:read'],
  },
  {
    type: 'system.self_heal',
    name: 'Self-heal failing flows',
    description: 'Audit broken flows and apply patches.',
    inputSchema: {
      incident: 'Recent incident identifier',
    },
    suggestedSubtasks: [
      { agent: 'selfhealing', description: 'Diagnose failure signatures', tool: 'healing.run_supervisor' },
      { agent: 'browser', description: 'Replay failing workflow', tool: 'browser.plan' },
    ],
    requiredPermissions: ['system:heal'],
  },
  {
    type: 'system.shadow_learn',
    name: 'Shadow learn new workflow',
    description: 'Record human workflow to learn selectors and patterns.',
    inputSchema: {
      flow: 'Flow identifier',
    },
    suggestedSubtasks: [
      { agent: 'shadow', description: 'Begin recording session', tool: 'shadow.start_session' },
      { agent: 'shadow', description: 'Summarize captured actions', tool: 'shadow.summarize' },
    ],
    requiredPermissions: ['system:shadow'],
  },
];

export function getMissionTemplate(type: MissionType) {
  return missionTemplates.find((template) => template.type === type);
}

export function listMissionTemplates() {
  return missionTemplates.map((template) => ({
    type: template.type,
    name: template.name,
    description: template.description,
  }));
}

export function seedPlanFromTemplate(request: MissionRequest): Subtask[] {
  const template = getMissionTemplate(request.type);
  if (!template) return [];

  return template.suggestedSubtasks.map((subtask, index) => ({
    ...subtask,
    id: `${request.id}-seed-${index + 1}`,
  }));
}
