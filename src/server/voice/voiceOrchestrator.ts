import { buildMissionContext, executeMissionPlan, planMission } from '../orchestrator';
import { MissionPlan, MissionRequest, MissionResult } from '../orchestrator/orchestratorTypes';
import { saveAudioBuffer } from './audioStore';
import { synthesizeSpeech } from './ttsClient';
import { interpretVoiceCommand } from './voiceInterpreter';
import { VoiceCommand, VoiceResponse } from './voiceTypes';

function summarizePlan(plan: MissionPlan): string {
  const agentCounts = plan.subtasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.agent] = (acc[task.agent] || 0) + 1;
    return acc;
  }, {});
  const primaryAgents = Object.entries(agentCounts)
    .map(([agent, count]) => `${agent} x${count}`)
    .join(', ');
  return `Planned ${plan.subtasks.length} steps across ${primaryAgents || 'agents'}: ${plan.summary}`;
}

function summarizeResult(plan: MissionPlan, result: MissionResult): string {
  if (!result.success) {
    return `Mission ${plan.missionId} encountered issues: ${(result.issues || []).join('; ') || 'see logs'}`;
  }
  return `Mission ${plan.missionId} completed with ${Object.keys(result.results).length} result entries.`;
}

export async function handleVoiceCommand(
  cmd: VoiceCommand,
  options?: { mode?: 'plan' | 'run'; simulate?: boolean }
): Promise<VoiceResponse> {
  const mode = options?.mode ?? 'plan';
  const mission = await interpretVoiceCommand(cmd);
  const missionWithContext: MissionRequest = {
    ...mission,
    context: mission.context || (await buildMissionContext(mission)),
  };

  if (options?.simulate) {
    missionWithContext.context = {
      ...missionWithContext.context,
      simulation: true,
    };
  }

  let plan: MissionPlan | null = null;
  let missionResult: MissionResult | null = null;

  if (mode === 'plan') {
    plan = await planMission(missionWithContext);
  } else {
    plan = await planMission(missionWithContext);
    missionResult = await executeMissionPlan(plan);
  }

  const summary = missionResult
    ? summarizeResult(plan, missionResult)
    : plan
      ? summarizePlan(plan)
      : 'No plan generated.';

  const tts = await synthesizeSpeech(summary, {});
  const ttsUrl = tts ? `/api/voice/audio/${saveAudioBuffer(tts.audioBuffer, tts.mimeType)}` : undefined;

  return {
    commandId: cmd.id,
    missionId: plan?.missionId ?? mission.id,
    transcriptSummary: summary,
    ttsUrl,
    followupHints: [
      'Try: "Make that campaign longer"',
      'Ask: "Run in simulation mode first"',
    ],
  };
}
