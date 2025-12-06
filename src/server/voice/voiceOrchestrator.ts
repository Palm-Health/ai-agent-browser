import { interpretVoiceCommand } from './voiceInterpreter';
import { transcribeAudio } from './sttClient';
import { synthesizeSpeech } from './ttsClient';
import { planMission, executeMissionPlan } from '../orchestrator';
import { MissionResult } from '../orchestrator/orchestratorTypes';
import { VoiceCommandPayload } from './voiceTypes';

export async function handleVoiceCommand(payload: VoiceCommandPayload): Promise<MissionResult> {
  const text = await transcribeAudio(payload);
  const mission = interpretVoiceCommand({ ...payload, text });
  const plan = planMission(mission);
  const result = await executeMissionPlan(plan);
  await synthesizeSpeech(result.summary);
  return result;
}
