export interface STTResult {
  text: string;
  confidence?: number;
  raw?: unknown;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  options?: { language?: string; prompt?: string }
): Promise<STTResult> {
  const promptHint = options?.prompt ? ` prompt="${options.prompt}"` : '';
  return {
    text: '[transcription placeholder]',
    confidence: 0.0,
    raw: { bytes: audioBuffer.length, language: options?.language, prompt: promptHint },
  };
}
