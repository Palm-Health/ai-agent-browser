import { ShadowEvent, ShadowSession } from './shadowTypes';

const sessions: Record<string, ShadowSession> = {};

export function startShadowSession(): ShadowSession {
  const session: ShadowSession = { id: `shadow-${Date.now()}`, events: [] };
  sessions[session.id] = session;
  return session;
}

export function recordShadowEvent(sessionId: string, event: ShadowEvent) {
  sessions[sessionId]?.events.push(event);
}

export function endShadowSession(sessionId: string): ShadowSession | undefined {
  const session = sessions[sessionId];
  delete sessions[sessionId];
  return session;
}

export function listShadowSessions(): ShadowSession[] {
  return Object.values(sessions);
}
