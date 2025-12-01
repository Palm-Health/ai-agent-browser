import React, { useEffect, useState } from 'react';
import { BrowserHealthEvent } from '../sentinel/sentinel';
import { predictFailure } from '../sentinel/predictive';
import { sentinel } from '../sentinel/sentinel';

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  bottom: '12px',
  right: '12px',
  background: 'rgba(0,0,0,0.7)',
  color: '#fff',
  padding: '10px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  zIndex: 9999,
  maxWidth: '320px',
};

export const SentinelOverlay: React.FC = () => {
  const [events, setEvents] = useState<BrowserHealthEvent[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggle = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, []);

  useEffect(() => {
    const handler = (event: BrowserHealthEvent) => setEvents((prev) => [...prev.slice(-20), event]);
    sentinel.subscribe(handler);
    return () => sentinel.unsubscribe(handler);
  }, []);

  if (!visible) return null;

  const assessment = predictFailure(events);

  return (
    <div style={overlayStyles}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Browser Sentinel</div>
      <div style={{ marginBottom: 6 }}>Risk: {assessment.risk.toUpperCase()}</div>
      <div style={{ marginBottom: 6 }}>
        <strong>Recent Events</strong>
        <ul style={{ paddingLeft: 16, margin: 0, marginTop: 4 }}>
          {events.slice(-5).map((event, idx) => (
            <li key={idx}>{event.type}</li>
          ))}
        </ul>
      </div>
      {assessment.reasons.length > 0 && (
        <div>
          <strong>Warnings</strong>
          <ul style={{ paddingLeft: 16, margin: 0, marginTop: 4 }}>
            {assessment.reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SentinelOverlay;
