import { ForgeCandidate } from './forgeTypes';
import { setForgeCandidates } from './forgeState';

interface ShadowFlow {
  id: string;
  domain: string;
  steps: Array<{ action: string; target?: string; value?: string; success: boolean }>;
  selectorsUsed: string[];
  success: boolean;
  urlSample?: string;
}

interface SentinelEvent {
  id: string;
  domain: string;
  type: 'missing-selector' | 'skill-pack-mismatch' | 'popup-detected';
  selector?: string;
  recovered?: boolean;
  timestamp: string;
}

const mockShadowFlows: ShadowFlow[] = [
  {
    id: 'shadow-1',
    domain: 'studio.youtube.com',
    success: true,
    selectorsUsed: ['#menu-button', 'button#create'],
    urlSample: 'https://studio.youtube.com/channel/analytics',
    steps: [
      { action: 'goto', target: 'https://studio.youtube.com', success: true },
      { action: 'click', target: '#menu-button', success: true },
      { action: 'click', target: 'button#create', success: true },
    ],
  },
  {
    id: 'shadow-2',
    domain: 'studio.youtube.com',
    success: false,
    selectorsUsed: ['#menu-button', 'button#create'],
    urlSample: 'https://studio.youtube.com/channel/analytics',
    steps: [
      { action: 'goto', target: 'https://studio.youtube.com', success: true },
      { action: 'click', target: '#menu-button', success: false },
    ],
  },
  {
    id: 'shadow-3',
    domain: 'ads.tiktok.com',
    success: true,
    selectorsUsed: ['.nav-link.analytics', 'button.export'],
    urlSample: 'https://ads.tiktok.com/analytics',
    steps: [
      { action: 'goto', target: 'https://ads.tiktok.com', success: true },
      { action: 'click', target: '.nav-link.analytics', success: true },
      { action: 'click', target: 'button.export', success: true },
    ],
  },
];

const mockSentinelEvents: SentinelEvent[] = [
  {
    id: 'sentinel-1',
    domain: 'studio.youtube.com',
    type: 'missing-selector',
    selector: '#menu-button',
    recovered: true,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'sentinel-2',
    domain: 'ads.tiktok.com',
    type: 'popup-detected',
    timestamp: new Date().toISOString(),
  },
];

function buildSelectorStats(flows: ShadowFlow[]): ForgeCandidate['selectors'] {
  const stats = new Map<string, { usageCount: number; successes: number; lastSeenAt: string }>();

  for (const flow of flows) {
    for (const selector of flow.selectorsUsed) {
      const current = stats.get(selector) || { usageCount: 0, successes: 0, lastSeenAt: '' };
      current.usageCount += 1;
      if (flow.success) current.successes += 1;
      current.lastSeenAt = new Date().toISOString();
      stats.set(selector, current);
    }
  }

  return Array.from(stats.entries()).map(([selector, detail]) => ({
    selector,
    usageCount: detail.usageCount,
    successRate: detail.usageCount === 0 ? 0 : Math.round((detail.successes / detail.usageCount) * 100) / 100,
    lastSeenAt: detail.lastSeenAt,
  }));
}

function buildWorkflows(flows: ShadowFlow[]): ForgeCandidate['workflows'] {
  return flows.map(flow => ({
    name: `${flow.domain}-workflow-${flow.id}`,
    description: `Learned from shadow flow ${flow.id}`,
    steps: flow.steps,
    successRate: flow.success ? 1 : 0,
    failurePatterns: flow.success ? [] : ['shadow divergence'],
  }));
}

export async function mineForgeCandidates(): Promise<ForgeCandidate[]> {
  const flowsByDomain = mockShadowFlows.reduce<Record<string, ShadowFlow[]>>((acc, flow) => {
    acc[flow.domain] = acc[flow.domain] || [];
    acc[flow.domain].push(flow);
    return acc;
  }, {});

  const candidates: ForgeCandidate[] = Object.entries(flowsByDomain).map(([domain, flows]) => {
    const selectors = buildSelectorStats(flows);
    const workflows = buildWorkflows(flows);
    const sentinelNotes = mockSentinelEvents.filter(event => event.domain === domain);

    return {
      id: `forge-${domain}`,
      source: 'shadow',
      createdAt: new Date().toISOString(),
      virtualDomain: domain,
      urlSample: flows[0]?.urlSample,
      selectors,
      workflows,
      targetSkillId: domain.includes('youtube') ? 'youtube' : undefined,
      status: 'candidate',
      notes: sentinelNotes.map(event => `${event.type}${event.selector ? `:${event.selector}` : ''}`).join(', '),
    };
  });

  setForgeCandidates(candidates);
  return candidates;
}
