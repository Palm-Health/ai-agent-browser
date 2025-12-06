import { CampaignBrief, ContentCampaignPlan, EpisodeRenderPlan } from './contentTypes';

export function createContentBlueprint(brief: CampaignBrief): ContentCampaignPlan {
  const episodes: EpisodeRenderPlan[] = Array.from({ length: brief.episodeCount }).map((_, idx) => ({
    id: `episode-${idx}`,
    platform: brief.platform,
    script: `Episode ${idx + 1} script for ${brief.persona}`,
    assets: ['b-roll', 'voiceover'],
  }));

  return {
    campaignId: `campaign-${Date.now()}`,
    episodes,
  };
}
