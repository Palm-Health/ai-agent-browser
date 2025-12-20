import { sentinel } from '../../src/browser/sentinel/sentinel';
import { predictFailure } from '../../src/browser/sentinel/predictive';
import { runPreHeals } from '../../src/browser/sentinel/preheal';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

class FakeElement {
  className: string;
  private attrs: Record<string, string>;
  constructor(className = '', attrs: Record<string, string> = {}) {
    this.className = className;
    this.attrs = attrs;
  }
  getAttribute(name: string) {
    return this.attrs[name];
  }
  click() {}
}

class FakeMutationObserver {
  static lastInstance: FakeMutationObserver | null = null;
  constructor(private cb: (records: any[]) => void) {
    FakeMutationObserver.lastInstance = this;
  }
  observe() {}
  disconnect() {}
  fire(records: any[]) {
    this.cb(records);
  }
}

async function testDomMutationEvent() {
  (global as any).HTMLElement = FakeElement;
  (global as any).MutationObserver = FakeMutationObserver as any;
  (global as any).document = {
    documentElement: {},
    body: {},
    querySelector: () => null,
    querySelectorAll: () => [],
  } as any;
  (global as any).window = Object.assign(global, { setTimeout, clearTimeout, fetch: async () => ({ status: 200 }) });

  const events: any[] = [];
  const handler = (event: any) => events.push(event);
  sentinel.subscribe(handler);
  sentinel.startMonitoring({ url: 'http://example.com', snapshotMode: true });

  const popup = new FakeElement('popup-banner', { role: 'dialog' });
  FakeMutationObserver.lastInstance?.fire([{ addedNodes: [popup] }]);
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert(events.some((event) => event.type === 'popup-detected'), 'Popup detection should emit event');
  sentinel.unsubscribe(handler);
}

function testPredictiveRisk() {
  const risk = predictFailure([
    { type: 'missing-selector', timestamp: '', url: 'http://example.com' },
  ]);
  assert(risk.risk === 'high', 'Missing selector should lead to high risk');
}

async function testPreHeals() {
  const actions = await runPreHeals(
    {
      evaluate: async () => true,
      waitForSelector: async () => true,
      reloadSkillPack: async () => true,
      waitForTimeout: async () => true,
    },
    ['Attempt to close overlay via known selectors', 'Attempt selector recovery']
  );
  assert(actions.length >= 1, 'Preheal should perform at least one action');
}

(async () => {
  await testDomMutationEvent();
  testPredictiveRisk();
  await testPreHeals();
  console.log('sentinel-smoke: all scenarios passed');
})();
