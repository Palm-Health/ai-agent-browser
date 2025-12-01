export type MissionType =
  | 'marketing.campaign'
  | 'marketing.daily_content'
  | 'analytics.youtube'
  | 'analytics.tiktok'
  | 'clinical.research'
  | 'clinical.pathway'
  | 'onboarding.practice'
  | 'system.self_heal'
  | 'system.shadow_learn'
  | 'custom';

export interface MissionRequest {
  id: string;
  userId: string;
  brandId?: string;
  practiceId?: string;
  type: MissionType;
  goal: string;
  constraints?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface Subtask {
  id: string;
  agent: string;
  description: string;
  tool?: string;
  input?: any;
  dependsOn?: string[];
}

export interface MissionPlan {
  missionId: string;
  summary: string;
  subtasks: Subtask[];
  orchestrationGraph: any;
  issues?: string[];
}

export interface MissionResult {
  missionId: string;
  success: boolean;
  results: Record<string, unknown>;
  issues?: string[];
  logs?: string[];
}
