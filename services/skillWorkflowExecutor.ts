import { CheerioAPI, load } from 'cheerio';
import { SkillPack, SkillWorkflowStep } from './skillManager';
import { PageContext } from './vaultProtocol';

export interface WorkflowExecutionResult {
  success: boolean;
  logs: string[];
  extractedText?: string[];
  skippedNavigations: number;
}

export class SkillWorkflowExecutor {
  async runWorkflow(
    skill: SkillPack,
    workflowName: string,
    options: {
      html?: string;
      pageContext: PageContext;
      navigate?: (url: string) => Promise<void>;
      click?: (selector: string) => Promise<void>;
      waitForSelector?: (selector: string) => Promise<void>;
    }
  ): Promise<WorkflowExecutionResult> {
    const steps = skill.workflows[workflowName];
    if (!steps) {
      return { success: false, logs: [`Workflow ${workflowName} not found`], skippedNavigations: 0 };
    }

    const logs: string[] = [];
    const extractedText: string[] = [];
    let skippedNavigations = 0;
    const $ = options.html ? load(options.html) : null;

    for (const step of steps) {
      const result = await this.executeStep(step, {
        ...options,
        $, // include parsed DOM for snapshot mode
        logs,
        extractedText,
      });

      skippedNavigations += result.skippedNavigations ?? 0;
      if (!result.success) {
        logs.push(`Step failed: ${step.action} ${step.selector ?? step.url ?? ''}`.trim());
        return { success: false, logs, extractedText, skippedNavigations };
      }
    }

    return { success: true, logs, extractedText, skippedNavigations };
  }

  private async executeStep(
    step: SkillWorkflowStep,
    context: {
      pageContext: PageContext;
      navigate?: (url: string) => Promise<void>;
      click?: (selector: string) => Promise<void>;
      waitForSelector?: (selector: string) => Promise<void>;
      $: CheerioAPI | null;
      logs: string[];
      extractedText: string[];
    }
  ): Promise<{ success: boolean; skippedNavigations?: number }> {
    const { logs, pageContext } = context;
    const isSnapshot = pageContext.isVaultSnapshot;

    switch (step.action) {
      case 'goto': {
        if (isSnapshot) {
          logs.push('Skipping navigation: snapshot mode.');
          return { success: true, skippedNavigations: 1 };
        }
        if (context.navigate && step.url) {
          await context.navigate(step.url);
          logs.push(`Navigated to ${step.url}`);
          return { success: true };
        }
        logs.push('Navigation step missing URL or navigate callback.');
        return { success: false };
      }
      case 'waitForSelector': {
        if (isSnapshot && context.$ && step.selector) {
          const exists = context.$(step.selector).length > 0;
          logs.push(exists ? `Found selector ${step.selector}` : `Selector ${step.selector} missing`);
          return { success: exists };
        }
        if (context.waitForSelector && step.selector) {
          await context.waitForSelector(step.selector);
          logs.push(`Waited for selector ${step.selector}`);
          return { success: true };
        }
        return { success: false };
      }
      case 'click': {
        if (isSnapshot && context.$ && step.selector) {
          const exists = context.$(step.selector).length > 0;
          logs.push(exists ? `Pretend click on ${step.selector} (snapshot).` : `Cannot click missing ${step.selector}`);
          return { success: exists };
        }
        if (context.click && step.selector) {
          await context.click(step.selector);
          logs.push(`Clicked ${step.selector}`);
          return { success: true };
        }
        return { success: false };
      }
      case 'extractText': {
        if (context.$ && step.selector) {
          const text = context.$(step.selector).text().trim();
          context.extractedText.push(text);
          logs.push(`Extracted text from ${step.selector}: ${text}`);
          return { success: true };
        }
        logs.push('Missing selector or DOM for extractText.');
        return { success: false };
      }
      default:
        logs.push(`Unknown action ${step.action}`);
        return { success: false };
    }
  }
}

export const skillWorkflowExecutor = new SkillWorkflowExecutor();
