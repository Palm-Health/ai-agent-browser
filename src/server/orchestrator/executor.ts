import { routeToAgent } from './agentRouter';
import { MissionPlan, MissionResult, Subtask } from './orchestratorTypes';

function topologicalSort(subtasks: Subtask[]): Subtask[] {
  const visited = new Set<string>();
  const result: Subtask[] = [];

  function visit(task: Subtask) {
    if (visited.has(task.id)) return;
    visited.add(task.id);
    (task.dependsOn || [])
      .map((id) => subtasks.find((t) => t.id === id))
      .filter(Boolean)
      .forEach((dependency) => visit(dependency!));
    result.push(task);
  }

  subtasks.forEach((task) => visit(task));
  return result;
}

function checkAgentPermission(subtask: Subtask, plan: MissionPlan) {
  if (plan.issues?.length) {
    return { allowed: false, reason: plan.issues.join('; ') };
  }
  if (subtask.agent === 'marketing' && subtask.description.toLowerCase().includes('phi')) {
    return { allowed: false, reason: 'Marketing agents cannot access PHI.' };
  }
  return { allowed: true };
}

export async function executeMissionPlan(plan: MissionPlan): Promise<MissionResult> {
  const orderedSubtasks = topologicalSort(plan.subtasks);
  const logs: string[] = [];
  const results: Record<string, unknown> = {};
  const issues: string[] = [];

  for (const subtask of orderedSubtasks) {
    const permission = checkAgentPermission(subtask, plan);
    if (!permission.allowed) {
      issues.push(`Blocked ${subtask.id}: ${permission.reason}`);
      continue;
    }

    try {
      const result = await routeToAgent(subtask);
      results[subtask.id] = result;
      if (!result?.success) {
        issues.push(`Subtask ${subtask.id} failed: ${result?.error || 'unknown error'}`);
      }
      logs.push(`Executed ${subtask.id} with agent ${subtask.agent}`);
    } catch (error: any) {
      issues.push(`Subtask ${subtask.id} threw: ${error?.message || 'unknown error'}`);
    }
  }

  return {
    missionId: plan.missionId,
    success: issues.length === 0,
    results,
    issues,
    logs,
  };
}
