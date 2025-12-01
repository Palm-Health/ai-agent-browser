import { EpisodeRenderPlan } from './contentTypes';

export function attachMedia(plan: EpisodeRenderPlan): EpisodeRenderPlan {
  return {
    ...plan,
    assets: [...plan.assets, 'stock:placeholder'],
  };
}
