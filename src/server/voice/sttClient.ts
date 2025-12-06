import { VoiceCommandPayload } from './voiceTypes';

export async function transcribeAudio(payload: VoiceCommandPayload): Promise<string> {
  return payload.text;
}
