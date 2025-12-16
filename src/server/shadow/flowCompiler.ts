import { ShadowFlow } from './shadowTypes';

export function compileFlow(flow: ShadowFlow): string {
  return `Compiled flow ${flow.id}`;
}
