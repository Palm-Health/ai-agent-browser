import path from 'node:path';
import { classifyLocalClip } from '../mediaClassifier';
import { listMediaFiles, resolveMediaPath } from '../../media/mediaFs';
import type { ContentEpisodePlan, Platform } from './contentBlueprint';

export interface MediaAssetRecord {
  id: string;
  path: string;
  topics?: string[];
  persona?: string[];
  platformFit?: string[];
  orientation?: '9:16' | '16:9' | '1:1' | 'other';
  strength_score?: number;
  created_at?: string;
  tags?: string[];
}

export interface MediaHookRecord extends MediaAssetRecord {
  hookScore?: number;
}

export interface MediaMatchParams {
  persona: 'patient' | 'clinician' | 'investor';
  topics: string[];
  platforms: Platform[];
  orientation?: '9:16' | '16:9';
  maxClips?: number;
}

export interface EpisodeMediaSelection {
  episodeId: string;
  hookAssetId?: string;
  brollAssetIds: string[];
  notes?: string;
}

async function loadLocalMediaLibrary(): Promise<MediaAssetRecord[]> {
  const mediaRoot = await resolveMediaPath('.');
  const files = await listMediaFiles('.', ['.mp4', '.mov', '.mkv', '.webm']).catch(() => []);
  const results: MediaAssetRecord[] = [];

  for (const absolute of files) {
    const relative = path.relative(mediaRoot, absolute);
    const classification = await classifyLocalClip(relative).catch(() => null);
    results.push({
      id: relative,
      path: relative,
      topics: classification?.topics,
      persona: classification?.persona,
      platformFit: classification?.platformFit,
      orientation: classification?.type === 'hook' ? '9:16' : undefined,
      strength_score: classification?.type === 'hook' ? 0.7 : 0.5,
      tags: classification?.topics,
    });
  }

  return results;
}

function scoreAsset(asset: MediaAssetRecord, params: MediaMatchParams): number {
  let score = 0;
  if (asset.platformFit?.some(p => params.platforms.includes(p as Platform))) score += 2;
  if (asset.orientation && params.orientation && asset.orientation === params.orientation) score += 1;
  if (asset.topics && params.topics.some(topic => asset.topics?.includes(topic))) score += 1;
  if (asset.persona?.includes(params.persona)) score += 1.5;
  if (asset.strength_score) score += asset.strength_score;
  return score;
}

export async function findHookCandidates(params: MediaMatchParams): Promise<MediaHookRecord[]> {
  const library = await loadLocalMediaLibrary();
  const hooks = library.filter(item => item.orientation === '9:16');
  const ranked = hooks
    .map(item => ({ ...item, score: scoreAsset(item, params) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, params.maxClips || 3);
  return ranked.map(item => ({ ...item, hookScore: item.score })) as MediaHookRecord[];
}

export async function findBrollCandidates(params: MediaMatchParams): Promise<MediaAssetRecord[]> {
  const library = await loadLocalMediaLibrary();
  const brolls = library.filter(item => item.orientation !== '9:16');
  return brolls
    .map(item => ({ ...item, score: scoreAsset(item, params) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, params.maxClips || 5);
}

export async function selectMediaForEpisode(
  episode: ContentEpisodePlan,
  persona: 'patient' | 'clinician' | 'investor' = 'patient',
): Promise<EpisodeMediaSelection> {
  const params: MediaMatchParams = {
    persona,
    topics: [episode.theme, episode.angle],
    platforms: episode.platforms,
    orientation: '9:16',
    maxClips: 5,
  };

  const [hookCandidates, brollCandidates] = await Promise.all([
    findHookCandidates(params),
    findBrollCandidates(params),
  ]);

  return {
    episodeId: episode.id,
    hookAssetId: hookCandidates[0]?.id,
    brollAssetIds: brollCandidates.map(item => item.id).slice(0, 3),
    notes: hookCandidates.length === 0 ? 'No hook candidates found; consider recording a new opener.' : undefined,
  };
}
