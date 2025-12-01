import { MissionRequest, MissionType } from '../orchestrator/orchestratorTypes';
import { VoiceCommand } from './voiceTypes';

function classifyMissionType(transcript: string): { type: MissionType; rationale: string } {
  const text = transcript.toLowerCase();

  if (text.includes('self heal') || text.includes('health check') || text.includes('repair')) {
    return { type: 'system.self_heal', rationale: 'Detected request for system health or repair.' };
  }

  if (text.includes('shadow')) {
    return { type: 'system.shadow_learn', rationale: 'Mentions shadow learning or observation.' };
  }

  if (text.includes('onboard') || text.includes('new practice')) {
    return { type: 'onboarding.practice', rationale: 'References onboarding a practice.' };
  }

  if (text.includes('clinical') || text.includes('pathway')) {
    return { type: 'clinical.pathway', rationale: 'Clinical pathway or workflow mentioned.' };
  }

  if (text.includes('research') || text.includes('study')) {
    return { type: 'clinical.research', rationale: 'Research-oriented language detected.' };
  }

  if (text.includes('analytics') || text.includes('report') || text.includes('metrics')) {
    if (text.includes('youtube')) {
      return { type: 'analytics.youtube', rationale: 'Analytics tied to YouTube requested.' };
    }
    if (text.includes('tiktok')) {
      return { type: 'analytics.tiktok', rationale: 'Analytics tied to TikTok requested.' };
    }
    return { type: 'analytics.youtube', rationale: 'Analytics requested; defaulting to YouTube analytics.' };
  }

  if (text.includes('daily') || text.includes('every day')) {
    return { type: 'marketing.daily_content', rationale: 'Daily cadence implied in transcript.' };
  }

  if (text.includes('campaign') || text.includes('week') || text.includes('plan')) {
    return { type: 'marketing.campaign', rationale: 'Campaign or planning keywords detected.' };
  }

  return { type: 'custom', rationale: 'Defaulted to custom mission type.' };
}

export async function interpretVoiceCommand(cmd: VoiceCommand): Promise<MissionRequest> {
  const { type, rationale } = classifyMissionType(cmd.transcript);
  const mission: MissionRequest = {
    id: `mission-${cmd.id}`,
    userId: cmd.userId,
    brandId: cmd.brandId,
    practiceId: cmd.practiceId,
    type,
    goal: cmd.transcript.trim(),
    constraints: {},
    context: {
      source: 'voice',
      rationale,
      rawTranscript: cmd.transcript,
      voiceContext: cmd.context,
    },
  };

  if (cmd.context?.lastMissionId) {
    mission.context = {
      ...mission.context,
      followupTo: cmd.context.lastMissionId,
    };
  }

  return mission;
}
