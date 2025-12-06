import { ShadowFlow, ShadowSession } from './shadowTypes';

export function learnFlowsFromSession(session: ShadowSession): ShadowFlow[] {
  if (!session.events.length) return [];
  return [
    {
      id: `${session.id}-flow-0`,
      description: `Learned ${session.events.length} events`,
    },
  ];
}
