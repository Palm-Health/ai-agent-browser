import { VoiceCommandPayload } from './voiceTypes';
import { MissionRequest } from '../orchestrator/orchestratorTypes';

export function interpretVoiceCommand(payload: VoiceCommandPayload): MissionRequest {
  return {
    id: `voice-${Date.now()}`,
    goal: payload.text,
    agentHint: payload.text.includes('marketing') ? 'marketing' : 'browser',
    metadata: { userId: payload.userId },
  };
}
