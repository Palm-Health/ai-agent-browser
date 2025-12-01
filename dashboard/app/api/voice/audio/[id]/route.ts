import { NextResponse } from 'next/server';
import { getAudioBuffer } from '../../../../../../src/server/voice/audioStore';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const audio = getAudioBuffer(params.id);
  if (!audio) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
  }

  return new NextResponse(audio.buffer, {
    status: 200,
    headers: {
      'Content-Type': audio.mimeType,
      'Content-Length': audio.buffer.byteLength.toString(),
      'Cache-Control': 'public, max-age=60',
    },
  });
}
