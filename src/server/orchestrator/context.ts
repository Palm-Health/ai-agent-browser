import { MissionRequest } from './orchestratorTypes';

interface ToolAvailability {
  available: string[];
  degraded: string[];
}

interface MissionContext {
  brandProfile?: Record<string, any>;
  personaProfile?: Record<string, any>;
  toolAvailability: ToolAvailability;
  safety: {
    safeMode: boolean;
    simulationMode: boolean;
    tenantBoundaries: { brandId?: string; practiceId?: string };
    bannedAgents?: string[];
  };
  analytics?: Record<string, any>;
  healingMemory?: Record<string, any>;
  calendar?: Record<string, any>;
  recentMissions?: any[];
  constraints?: Record<string, unknown>;
}

export async function buildMissionContext(
  request: MissionRequest
): Promise<Record<string, any>> {
  const { brandId, practiceId } = request;

  // Placeholder hooks for future integrations
  const brandProfile = brandId
    ? { id: brandId, tone: 'default', approvalsRequired: true }
    : undefined;
  const personaProfile = brandProfile
    ? { audience: 'general', guardrails: ['no-phi', 'respect-consent'] }
    : undefined;

  const toolAvailability: ToolAvailability = {
    available: ['browser.plan', 'browser.run', 'marketing.generate_campaign'],
    degraded: ['clinical.search'],
  };

  const missionContext: MissionContext = {
    brandProfile,
    personaProfile,
    toolAvailability,
    safety: {
      safeMode: true,
      simulationMode: false,
      tenantBoundaries: { brandId, practiceId },
      bannedAgents: [],
    },
    analytics: { lastCampaign: { status: 'ok' } },
    healingMemory: { brittleSelectors: ['#legacy-button'] },
    calendar: { timezone: 'UTC' },
    recentMissions: [],
    constraints: request.constraints,
  };

  return missionContext;
}
