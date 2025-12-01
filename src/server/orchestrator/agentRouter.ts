import { MissionRequest } from './orchestratorTypes';

export function routeToAgent(request: MissionRequest): string {
  if (request.agentHint) return request.agentHint;
  if (request.goal.toLowerCase().includes('marketing')) return 'marketing';
  if (request.goal.toLowerCase().includes('voice')) return 'voice';
  return 'browser';
}
