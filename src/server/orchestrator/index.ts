import { buildMissionContext } from './context';
import { executeMissionPlan } from './executor';
import { planMission } from './planner';
import { listMissionTemplates } from './missionRegistry';
import { MissionRequest, MissionResult } from './orchestratorTypes';

export async function runMission(request: MissionRequest): Promise<MissionResult> {
  const context = request.context || (await buildMissionContext(request));
  const plan = await planMission({ ...request, context });
  return executeMissionPlan(plan);
}

export async function orchestratorStatus() {
  return {
    recent: [],
    health: 'ok',
  };
}

export { planMission, executeMissionPlan, buildMissionContext, listMissionTemplates };
