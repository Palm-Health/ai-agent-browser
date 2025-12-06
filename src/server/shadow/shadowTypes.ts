export interface ShadowSession {
  id: string;
  events: ShadowEvent[];
}

export interface ShadowEvent {
  type: string;
  payload: Record<string, any>;
}

export interface ShadowFlow {
  id: string;
  description: string;
}
