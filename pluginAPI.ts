import { sentinel } from './src/browser/sentinel/sentinel';
import { predictFailure } from './src/browser/sentinel/predictive';

export function getBrowserHealth() {
  const snapshot = sentinel.getHealthSnapshot();
  const riskAssessment = predictFailure(snapshot.events);

  const health: 'ok' | 'warning' | 'danger' =
    riskAssessment.risk === 'high' ? 'danger' : riskAssessment.risk === 'medium' ? 'warning' : 'ok';

  return {
    health,
    lastEvents: snapshot.events.slice(-10),
    riskAssessment,
  };
}

export function subscribeToBrowserEvents(cb: (event: any) => void) {
  sentinel.subscribe(cb);
  return () => sentinel.unsubscribe(cb);
}
