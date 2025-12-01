import fs from 'node:fs/promises';
import path from 'node:path';
import type { ContentCampaignBrief, ContentEpisodePlan } from './contentBlueprint';
import { generateCampaignPlan } from './contentBlueprint';
import type { EpisodeMediaSelection } from './mediaMatcher';
import { selectMediaForEpisode } from './mediaMatcher';
import type { EpisodeRenderPlan } from './renderJobPlanner';
import { createRenderJobsForEpisode } from './renderJobPlanner';
import type { EpisodeScript } from './scriptGenerator';
import { generateEpisodeScript } from './scriptGenerator';

export interface CampaignExecutionResult {
  campaignBrief: ContentCampaignBrief;
  episodes: ContentEpisodePlan[];
  episodeMedia: Record<string, EpisodeMediaSelection>;
  episodeScripts: Record<string, EpisodeScript>;
  episodeRenderPlans: Record<string, EpisodeRenderPlan>;
}

export interface EpisodePlanningResult {
  plan: ContentEpisodePlan;
  media: EpisodeMediaSelection;
  script: EpisodeScript;
  renderPlan: EpisodeRenderPlan;
}

const STORE_DIR = path.join(process.cwd(), 'data');
const CAMPAIGN_STORE = path.join(STORE_DIR, 'content-campaigns.json');

async function loadCampaigns(): Promise<any[]> {
  try {
    const raw = await fs.readFile(CAMPAIGN_STORE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

async function persistCampaign(record: any): Promise<void> {
  const campaigns = await loadCampaigns();
  campaigns.push(record);
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(CAMPAIGN_STORE, JSON.stringify(campaigns, null, 2), 'utf-8');
}

export async function runContentCampaign(brief: ContentCampaignBrief): Promise<CampaignExecutionResult> {
  const episodes = await generateCampaignPlan(brief);
  const episodeMedia: Record<string, EpisodeMediaSelection> = {};
  const episodeScripts: Record<string, EpisodeScript> = {};
  const episodeRenderPlans: Record<string, EpisodeRenderPlan> = {};

  for (const episode of episodes) {
    const media = await selectMediaForEpisode(episode, brief.persona);
    episodeMedia[episode.id] = media;

    const script = await generateEpisodeScript(episode, media, brief);
    episodeScripts[episode.id] = script;

    const renderPlan = await createRenderJobsForEpisode(episode, media, script, brief);
    episodeRenderPlans[episode.id] = renderPlan;
  }

  const record = {
    id: `campaign-${Date.now()}`,
    brief,
    episodes,
    episodeMedia,
    episodeScripts,
    episodeRenderPlans,
    createdAt: new Date().toISOString(),
  };
  await persistCampaign(record);

  return {
    campaignBrief: brief,
    episodes,
    episodeMedia,
    episodeScripts,
    episodeRenderPlans,
  };
}

export async function planEpisode(
  input: Pick<ContentCampaignBrief, 'persona' | 'platforms' | 'theme'> & { angle?: string },
): Promise<EpisodePlanningResult> {
  const campaignBrief: ContentCampaignBrief = {
    theme: input.theme,
    persona: input.persona,
    platforms: input.platforms,
    durationDays: 1,
    frequencyPerDay: 1,
    tone: 'fast',
  };

  const [episode] = await generateCampaignPlan(campaignBrief);
  if (input.angle) {
    episode.angle = input.angle;
    episode.hookIdea = `Hook: ${input.angle}`;
  }

  const media = await selectMediaForEpisode(episode, input.persona);
  const script = await generateEpisodeScript(episode, media, campaignBrief);
  const renderPlan = await createRenderJobsForEpisode(episode, media, script, campaignBrief);

  return { plan: episode, media, script, renderPlan };
}
