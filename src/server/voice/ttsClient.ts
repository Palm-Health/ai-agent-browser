export async function synthesizeSpeech(text: string): Promise<string> {
  return `audio:${Buffer.from(text).toString('base64')}`;
}
