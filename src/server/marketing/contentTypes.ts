export interface CampaignBrief {
  episodeCount: number;
  platform: string;
  persona: string;
  durationDays: number;
}

export interface EpisodeRenderPlan {
  id: string;
  platform: string;
  script: string;
  assets: string[];
}

export interface ContentCampaignPlan {
  campaignId: string;
  episodes: EpisodeRenderPlan[];
}
