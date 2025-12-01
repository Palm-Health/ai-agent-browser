import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { handleVoiceCommand } from '../../../../../src/server/voice/voiceOrchestrator';
import { transcribeAudio } from '../../../../../src/server/voice/sttClient';
import { VoiceCommand } from '../../../../../src/server/voice/voiceTypes';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Audio file missing' }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const stt = await transcribeAudio(buffer, { language: formData.get('language')?.toString() });
  const mode = (formData.get('mode')?.toString() as 'plan' | 'run' | undefined) ?? 'plan';
  const simulate = formData.get('simulate')?.toString() === 'true';

  const voiceCommand: VoiceCommand = {
    id: crypto.randomUUID(),
    userId: formData.get('userId')?.toString() || 'demo-user',
    brandId: formData.get('brandId')?.toString() || undefined,
    practiceId: formData.get('practiceId')?.toString() || undefined,
    transcript: stt.text,
    createdAt: new Date().toISOString(),
    context: {
      lastMissionId: formData.get('lastMissionId')?.toString() || undefined,
    },
  };

  const response = await handleVoiceCommand(voiceCommand, { mode, simulate });

  return NextResponse.json({
    transcript: stt.text,
    transcriptSummary: response.transcriptSummary,
    missionId: response.missionId,
    ttsUrl: response.ttsUrl,
    followupHints: response.followupHints,
  });
}
