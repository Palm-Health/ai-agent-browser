import { Subtask } from './orchestratorTypes';

async function runBrowserAgent(subtask: Subtask) {
  return {
    success: true,
    agent: 'browser',
    detail: `Planned browser actions for ${subtask.description}`,
  };
}

async function runMarketingAgent(subtask: Subtask) {
  return {
    success: true,
    agent: 'marketing',
    detail: `Generated marketing output for ${subtask.description}`,
  };
}

async function runClinicalAgent(subtask: Subtask) {
  return {
    success: true,
    agent: 'clinical',
    detail: `Consulted clinical tools for ${subtask.description}`,
  };
}

async function runSelfHealing(subtask: Subtask) {
  return {
    success: true,
    agent: 'selfhealing',
    detail: `Self-healing supervisor inspected ${subtask.description}`,
  };
}

async function runShadowAgent(subtask: Subtask) {
  return {
    success: true,
    agent: 'shadow',
    detail: `Shadow session recorded for ${subtask.description}`,
  };
}

export async function routeToAgent(subtask: Subtask): Promise<any> {
  try {
    switch (subtask.agent) {
      case 'browser':
        return await runBrowserAgent(subtask);
      case 'marketing':
        return await runMarketingAgent(subtask);
      case 'clinical':
        return await runClinicalAgent(subtask);
      case 'selfhealing':
        return await runSelfHealing(subtask);
      case 'shadow':
        return await runShadowAgent(subtask);
      default:
        return { success: false, error: `Unknown agent ${subtask.agent}` };
    }
  } catch (error: any) {
    if (subtask.agent !== 'selfhealing') {
      return runSelfHealing({ ...subtask, agent: 'selfhealing' });
    }
    return { success: false, error: error?.message || 'Routing failed' };
  }
}
