import { ShadowFlow } from './shadowTypes';

export function suggestImprovements(flow: ShadowFlow): string[] {
  return [`Optimize ${flow.description}`];
}
