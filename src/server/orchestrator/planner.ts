import { MissionRequest, MissionPlan, MissionPlanTask } from './orchestratorTypes';
import { getMissionTemplate } from './missionRegistry';

export function planMission(request: MissionRequest): MissionPlan {
  const template = getMissionTemplate(request.agentHint || request.id);
  const primaryAgent = request.agentHint || template?.defaultAgent || 'browser';
  const tasks: MissionPlanTask[] = (request.tasks?.length ? request.tasks : [request.goal]).map((task, idx) => ({
    id: `${request.id}-task-${idx}`,
    agent: primaryAgent,
    description: task,
    status: 'planned',
  }));

  if (tasks.length === 0) {
    tasks.push({
      id: `${request.id}-task-0`,
      agent: primaryAgent,
      description: request.goal,
      status: 'planned',
    });
  }

  return {
    id: `plan-${request.id}`,
    mission: request,
    tasks,
    createdAt: new Date().toISOString(),
  };
}
