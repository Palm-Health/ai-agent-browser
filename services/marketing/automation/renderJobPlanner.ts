import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ContentCampaignBrief, ContentEpisodePlan } from './contentBlueprint';
import type { EpisodeMediaSelection } from './mediaMatcher';
import type { EpisodeScript } from './scriptGenerator';

export interface EpisodeRenderPlan {
  episodeId: string;
  renderJobIds: string[];
}

const STORE_DIR = path.join(process.cwd(), 'data');
const RENDER_STORE = path.join(STORE_DIR, 'render-jobs.json');

async function loadRenderJobs(): Promise<any[]> {
  try {
    const raw = await fs.readFile(RENDER_STORE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

async function persistRenderJobs(jobs: any[]): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(RENDER_STORE, JSON.stringify(jobs, null, 2), 'utf-8');
}

export async function createRenderJobsForEpisode(
  episode: ContentEpisodePlan,
  media: EpisodeMediaSelection,
  script: EpisodeScript,
  brief: ContentCampaignBrief,
): Promise<EpisodeRenderPlan> {
  const existing = await loadRenderJobs();
  const renderJobIds: string[] = [];

  for (const platform of episode.platforms) {
    const jobId = randomUUID();
    renderJobIds.push(jobId);
    existing.push({
      id: jobId,
      episodeId: episode.id,
      platform,
      template: 'vertical_educational',
      hook_asset_id: media.hookAssetId,
      broll_asset_ids: media.brollAssetIds,
      script: script.script,
      captions: script.captions,
      cta: script.cta,
      hashtags: script.hashtags,
      thumbnailPrompt: script.thumbnailPrompt,
      persona: brief.persona,
      theme: brief.theme,
      tone: brief.tone,
      output_orientation: '9:16',
      created_at: new Date().toISOString(),
    });
  }

  await persistRenderJobs(existing);

  return { episodeId: episode.id, renderJobIds };
}
