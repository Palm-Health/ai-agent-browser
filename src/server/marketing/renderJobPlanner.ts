import { EpisodeRenderPlan } from './contentTypes';

export function planRenderJob(plan: EpisodeRenderPlan): EpisodeRenderPlan {
  return { ...plan, assets: [...plan.assets, 'render:queued'] };
}
