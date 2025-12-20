import { buildMissionContext } from './context';
import {
  MissionPlan,
  MissionRequest,
  Subtask,
} from './orchestratorTypes';
import { seedPlanFromTemplate } from './missionRegistry';

function generateOrchestrationGraph(subtasks: Subtask[]) {
  return {
    nodes: subtasks.map((task) => ({ id: task.id, label: task.description })),
    edges: subtasks.flatMap((task) =>
      (task.dependsOn || []).map((dependency) => ({ from: dependency, to: task.id }))
    ),
  };
}

function validateConstraints(request: MissionRequest, context: Record<string, any>) {
  const issues: string[] = [];
  if (context.safety?.safeMode && request.type.startsWith('clinical')) {
    issues.push('Clinical workflows running in safe mode may be read-only.');
  }
  if (request.constraints?.budget && Number(request.constraints.budget) > 100000) {
    issues.push('Budget exceeds default guardrail.');
  }
  return issues;
}

function enrichSubtasksWithContext(subtasks: Subtask[], context: Record<string, any>) {
  return subtasks.map((subtask) => ({
    ...subtask,
    input: {
      ...(subtask.input || {}),
      brandProfile: context.brandProfile,
      personaProfile: context.personaProfile,
      analytics: context.analytics,
    },
  }));
}

export async function planMission(request: MissionRequest): Promise<MissionPlan> {
  const context = request.context || (await buildMissionContext(request));
  const seededSubtasks = seedPlanFromTemplate(request);

  const defaultSubtasks: Subtask[] = seededSubtasks.length
    ? seededSubtasks
    : [
        {
          id: `${request.id}-browser-assess`,
          agent: 'browser',
          description: 'Perform reconnaissance to collect signals',
          tool: 'browser.plan',
        },
        {
          id: `${request.id}-report`,
          agent: 'marketing',
          description: 'Summarize findings for user review',
          tool: 'marketing.summarize',
          dependsOn: [`${request.id}-browser-assess`],
        },
      ];

  const subtasks = enrichSubtasksWithContext(defaultSubtasks, context);
  const issues = validateConstraints(request, context);
  const orchestrationGraph = generateOrchestrationGraph(subtasks);

  return {
    missionId: request.id,
    summary:
      request.goal || 'Mission requested. Subtasks generated with available templates.',
    subtasks,
    orchestrationGraph,
    issues,
  } as MissionPlan;
}
