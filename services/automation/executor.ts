import { Action, Plan, PlanResult, ActionResult, PermissionService, AIBrowserBridge } from './actions';
import { PageContext } from '../vaultProtocol';

export class ActionExecutor {
  constructor(
    private bridge: AIBrowserBridge,
    private perms: PermissionService,
    private pageContextResolver?: (tabId: string) => PageContext | undefined,
  ) {}

  async runPlan(tabId: string, plan: Plan, signal?: AbortSignal): Promise<PlanResult> {
    const started = performance.now();
    const out: ActionResult[] = [];
    let ops = 0;

    const budgetMs = plan.budgetMs ?? 30_000;
    const budgetOps = plan.budgetOps ?? 40;

    for (const step of plan.steps) {
      if (signal?.aborted) return { planId: plan.id, results: out, elapsedMs: performance.now()-started, aborted: true };
      if (ops++ >= budgetOps) { out.push({ ok:false, code:'BUDGET_OPS_EXCEEDED' }); break; }
      if (performance.now() - started > budgetMs) { out.push({ ok:false, code:'BUDGET_TIME_EXCEEDED' }); break; }

      // per-op timeout
      const to = step.timeoutMs ?? 8_000;
      const res = await withTimeout(this.execOne(tabId, step), to).catch(e => ({ ok:false, code:e.code ?? 'EXEC_ERROR', data: String(e.message ?? e) }));
      out.push(res);
    }
    return { planId: plan.id, results: out, elapsedMs: performance.now()-started };
  }

  private async execOne(tabId: string, a: Action): Promise<ActionResult> {
    switch (a.kind) {
      case 'navigate':
        if (this.pageContextResolver?.(tabId)?.isVaultSnapshot) {
          return { ok:true, code:'SNAPSHOT_NAVIGATION_SKIPPED', meta:{ url: a.url } };
        }
        await this.perms.require('navigate_to_url', { tabId });
        await this.bridge.navigateTo(tabId, a.url);
        return { ok:true };
      case 'click':
        await this.perms.require('dom_click', { tabId, handle: a.handle });
        return await this.bridge.clickHandle(tabId, a.handle);
      case 'type':
        await this.perms.require('dom_type', { tabId, handle: a.handle });
        return await this.bridge.typeInto(tabId, a.handle, a.text, a.replace ?? false, a.delayMs ?? 0);
      case 'select':
        await this.perms.require('dom_select', { tabId, handle: a.handle });
        return await this.bridge.selectOption(tabId, a.handle, a.value);
      case 'waitFor':
        return await this.bridge.waitFor(tabId, a.selector, a.handle);
      case 'scrollIntoView':
        return await this.bridge.scrollIntoView(tabId, a.handle);
      case 'screenshot':
        await this.perms.require('take_screenshot', { tabId });
        const base64 = await this.bridge.takeScreenshot(tabId, !!a.fullPage);
        if (a.path) await this.bridge.saveFile('image/png', base64, a.path);
        return { ok:true, data:{ base64 } };
      default:
        return { ok:false, code:'UNKNOWN_ACTION' };
    }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject({ code: 'TIMEOUT', message: `timeout ${ms}ms` }), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
