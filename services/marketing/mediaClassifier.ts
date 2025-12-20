import { getVideoMetadata } from '../media/mediaFs';

export type ClipClassification = {
  path: string;
  type: 'hook' | 'broll' | 'talking_head' | 'other';
  topics?: string[];
  persona?: string[];
  platformFit?: string[];
};

function inferTypeFromMetadata(meta: Awaited<ReturnType<typeof getVideoMetadata>>): ClipClassification['type'] {
  if (!meta.orientation) return 'other';
  if (meta.orientation === '9:16') return 'hook';
  if (meta.orientation === '16:9' && (meta.durationSeconds || 0) > 90) return 'talking_head';
  return 'broll';
}

function inferPlatforms(meta: Awaited<ReturnType<typeof getVideoMetadata>>): string[] {
  const platforms: string[] = [];
  if (meta.orientation === '9:16') {
    platforms.push('tiktok', 'reels', 'ytshorts');
  } else {
    platforms.push('youtube', 'web');
  }
  if ((meta.durationSeconds || 0) < 20) platforms.push('ads');
  return Array.from(new Set(platforms));
}

export async function classifyLocalClip(path: string): Promise<ClipClassification> {
  const meta = await getVideoMetadata(path);
  const filename = path.toLowerCase();

  const topics: string[] = [];
  if (/burnout|health|patient/.test(filename)) topics.push('healthcare');
  if (/ai|agent|automation/.test(filename)) topics.push('automation');
  if (/demo|walkthrough/.test(filename)) topics.push('product_demo');

  const persona: string[] = [];
  if (/patient/.test(filename)) persona.push('patient');
  if (/clinician|doctor/.test(filename)) persona.push('clinician');
  if (/marketer|creator/.test(filename)) persona.push('marketer');

  const type = inferTypeFromMetadata(meta);

  return {
    path: meta.path,
    type,
    topics,
    persona,
    platformFit: inferPlatforms(meta),
  };
}
