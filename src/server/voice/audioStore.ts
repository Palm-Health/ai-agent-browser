import crypto from 'crypto';

const audioStore = new Map<string, { buffer: Buffer; mimeType: string }>();

export function saveAudioBuffer(buffer: Buffer, mimeType: string): string {
  const id = crypto.randomUUID();
  audioStore.set(id, { buffer, mimeType });
  return id;
}

export function getAudioBuffer(id: string): { buffer: Buffer; mimeType: string } | null {
  return audioStore.get(id) ?? null;
}
