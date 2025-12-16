import { MissionRequest } from './orchestratorTypes';
import { routeToAgent } from './agentRouter';

export interface OrchestratorContext {
  mission: MissionRequest;
  preferredAgent: string;
  safe: boolean;
}

export function buildContext(request: MissionRequest): OrchestratorContext {
  return {
    mission: request,
    preferredAgent: routeToAgent(request),
    safe: process.env.SAFE_MODE !== 'false',
  };
}
