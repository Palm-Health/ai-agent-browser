export type VoiceSessionState = 'idle' | 'listening' | 'processing' | 'responding';

export interface VoiceCommand {
  id: string;
  userId: string;
  brandId?: string;
  practiceId?: string;
  transcript: string;
  createdAt: string;
  context?: Record<string, unknown>;
}

export interface VoiceResponse {
  commandId: string;
  missionId?: string;
  transcriptSummary: string;
  ttsUrl?: string;
  followupHints?: string[];
}

export interface VoiceMissionMapping {
  command: VoiceCommand;
  mission: import('../orchestrator/orchestratorTypes').MissionRequest;
}
