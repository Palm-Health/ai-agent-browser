import { sentinel } from '../../browser/sentinel/sentinel';
import { predictFailure } from '../../browser/sentinel/predictive';
import { runPreHeals } from '../../browser/sentinel/preheal';

export interface AgentContext {
  page: any;
  workflowId?: string;
  virtualDomain?: string;
}

export class AgentRouter {
  constructor(private healingSupervisor?: (context: any) => Promise<void>) {}

  async executeWithSentinel(context: AgentContext, runner: () => Promise<void>) {
    const { page } = context;
    sentinel.startMonitoring({
      url: page?.url?.() || 'about:blank',
      virtualDomain: context.virtualDomain,
      snapshotMode: Boolean(page?.isSnapshot),
      skillSelectors: page?.skillSelectors,
    });

    const events: any[] = [];
    const listener = (event: any) => events.push(event);
    sentinel.subscribe(listener);

    try {
      const result = await runner();
      return result;
    } catch (error) {
      await this.handleSentinelFindings(context, events);
      throw error;
    } finally {
      sentinel.unsubscribe(listener);
    }
  }

  private async handleSentinelFindings(context: AgentContext, events: any[]) {
    const assessment = predictFailure(events);

    if (assessment.risk === 'high') {
      await this.healingSupervisor?.({
        workflowId: context.workflowId,
        events,
        assessment,
      });
      await runPreHeals(context.page, assessment.suggestedPreHeals, events);
    }
  }
}

export const agentRouter = new AgentRouter();
