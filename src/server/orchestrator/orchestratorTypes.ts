export interface MissionRequest {
  id: string;
  goal: string;
  agentHint?: string;
  tasks?: string[];
  metadata?: Record<string, any>;
}

export interface MissionPlanTask {
  id: string;
  agent: string;
  description: string;
  status: 'planned' | 'running' | 'complete';
}

export interface MissionPlan {
  id: string;
  mission: MissionRequest;
  tasks: MissionPlanTask[];
  createdAt: string;
}

export interface MissionResult {
  id: string;
  missionId: string;
  success: boolean;
  summary: string;
  outputs?: Record<string, any>;
}
