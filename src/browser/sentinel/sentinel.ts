export type BrowserHealthEventType =
  | 'dom-change'
  | 'popup-detected'
  | 'missing-selector'
  | 'slow-network'
  | 'rate-limit'
  | 'login-banner'
  | 'skill-pack-mismatch';

export interface BrowserHealthEvent {
  type: BrowserHealthEventType;
  timestamp: string;
  url: string;
  virtualDomain?: string;
  meta?: Record<string, unknown>;
}

export interface SentinelSnapshot {
  events: BrowserHealthEvent[];
  lastEvent?: BrowserHealthEvent;
  isSnapshotMode: boolean;
}

type Subscriber = (event: BrowserHealthEvent) => void;

interface SentinelOptions {
  url: string;
  virtualDomain?: string;
  snapshotMode?: boolean;
  skillSelectors?: string[];
  enableOverlayDiagnostics?: boolean;
}

const MAX_EVENTS = 200;

/**
 * BrowserSentinel observes runtime activity and emits structured health events.
 * It intentionally keeps the implementation defensive and dependency-light so
 * it can run inside both live Chromium sessions and vault:// snapshots.
 */
export class BrowserSentinel {
  private subscribers: Set<Subscriber> = new Set();
  private events: BrowserHealthEvent[] = [];
  private mutationObserver?: MutationObserver;
  private layoutObserver?: PerformanceObserver;
  private removeNetworkPatch?: () => void;
  private currentOptions?: SentinelOptions;

  startMonitoring(options: SentinelOptions) {
    this.stop();
    this.currentOptions = options;

    this.observeDom();
    this.observeLayoutShifts();
    if (!options.snapshotMode) {
      this.observeNetwork();
    }
    if (options.skillSelectors?.length) {
      this.checkSkillSelectors(options.skillSelectors);
    }
  }

  stop() {
    this.mutationObserver?.disconnect();
    this.layoutObserver?.disconnect();
    this.removeNetworkPatch?.();
  }

  subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
  }

  unsubscribe(callback: Subscriber) {
    this.subscribers.delete(callback);
  }

  getHealthSnapshot(): SentinelSnapshot {
    return {
      events: [...this.events],
      lastEvent: this.events[this.events.length - 1],
      isSnapshotMode: Boolean(this.currentOptions?.snapshotMode),
    };
  }

  private emit(type: BrowserHealthEventType, meta?: Record<string, unknown>) {
    if (!this.currentOptions) return;
    const event: BrowserHealthEvent = {
      type,
      timestamp: new Date().toISOString(),
      url: this.currentOptions.url,
      virtualDomain: this.currentOptions.virtualDomain,
      meta: {
        snapshotMode: this.currentOptions.snapshotMode,
        ...meta,
      },
    };

    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }

    this.subscribers.forEach((callback) => callback(event));
  }

  private observeDom() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let mutationCounter = 0;
    let throttleHandle: number | undefined;
    const notifyDomChange = () => {
      if (mutationCounter === 0) return;
      this.emit('dom-change', { mutations: mutationCounter });
      mutationCounter = 0;
    };

    this.mutationObserver = new MutationObserver((mutations) => {
      mutationCounter += mutations.length;
      const popupDetected = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof HTMLElement)) return false;
          return (
            node.getAttribute('role') === 'dialog' ||
            node.getAttribute('aria-modal') === 'true' ||
            /popup|modal|dialog/i.test(node.className)
          );
        });
      });

      if (popupDetected) {
        this.emit('popup-detected', { reason: 'DOM mutation hinted modal' });
      }

      // If DOM is changing excessively, warn about potential skill-pack mismatch.
      if (mutationCounter > 50) {
        this.emit('skill-pack-mismatch', { reason: 'High mutation volume' });
        mutationCounter = 0;
      }

      // Throttle emission frequency.
      if (throttleHandle) {
        window.clearTimeout(throttleHandle);
      }
      throttleHandle = window.setTimeout(notifyDomChange, 250);
    });

    this.mutationObserver.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  private observeLayoutShifts() {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      this.layoutObserver = new PerformanceObserver((list) => {
        const shifts = list.getEntries().filter((entry) => (entry as any).value > 0) as any[];
        if (shifts.length >= 3) {
          this.emit('skill-pack-mismatch', { reason: 'Repeated layout shifts', count: shifts.length });
        }
      });
      this.layoutObserver.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit);
    } catch {
      // PerformanceObserver not available or unsupported entry type.
    }
  }

  private observeNetwork() {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch.bind(window);

    const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const start = performance.now();
      const response = await originalFetch(input, init);
      const duration = performance.now() - start;

      if (duration > 1500) {
        this.emit('slow-network', { duration });
      }

      if (response.status === 429) {
        this.emit('rate-limit', { url: response.url });
      }

      if (response.status === 401 || response.status === 403) {
        this.emit('login-banner', { url: response.url });
      }

      return response;
    };

    (window as any).fetch = patchedFetch;
    this.removeNetworkPatch = () => {
      (window as any).fetch = originalFetch;
    };
  }

  private checkSkillSelectors(selectors: string[]) {
    if (typeof document === 'undefined') return;
    const missing = selectors.filter((selector) => !document.querySelector(selector));
    if (missing.length) {
      this.emit('missing-selector', { selectors: missing });
    }
  }
}

export const sentinel = new BrowserSentinel();
