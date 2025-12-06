import { CampaignBrief, ContentCampaignPlan } from './contentTypes';
import { createContentBlueprint } from './contentBlueprint';
import { generateScript } from './scriptGenerator';
import { attachMedia } from './mediaMatcher';
import { planRenderJob } from './renderJobPlanner';

export function runContentCampaign(brief: CampaignBrief): ContentCampaignPlan {
  const blueprint = createContentBlueprint(brief);
  const episodes = blueprint.episodes.map((episode) => planRenderJob(attachMedia(generateScript(episode))));
  return { ...blueprint, episodes };
}
