import { EpisodeRenderPlan } from './contentTypes';

export function generateScript(plan: EpisodeRenderPlan): EpisodeRenderPlan {
  return {
    ...plan,
    script: plan.script || 'Generated script placeholder',
  };
}
