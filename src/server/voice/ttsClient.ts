export interface TTSResult {
  audioBuffer: Buffer;
  mimeType: string;
}

export async function synthesizeSpeech(
  text: string,
  options?: { voiceId?: string; speakingStyle?: string }
): Promise<TTSResult | null> {
  if (!text.trim()) {
    return null;
  }

  return {
    audioBuffer: Buffer.from(text, 'utf-8'),
    mimeType: 'audio/wav',
  };
}
