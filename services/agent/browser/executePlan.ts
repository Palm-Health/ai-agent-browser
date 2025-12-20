import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Page } from 'puppeteer-core';
import { capturePageScreenshot } from '../../browser/chromiumClient';
import type { BrowserTaskPlan, BrowserTaskPlanStep } from './actionPlanner';

export interface ExecutionStepResult {
  step: BrowserTaskPlanStep;
  success: boolean;
  error?: string;
  beforeScreenshot?: string;
  afterScreenshot?: string;
}

export interface ExecutionLog {
  plan: BrowserTaskPlan;
  steps: ExecutionStepResult[];
}

async function saveTempScreenshot(buffer: Buffer, label: string): Promise<string> {
  const dir = path.join(os.tmpdir(), 'browser-agent');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${label}.png`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function executeStep(page: Page, step: BrowserTaskPlanStep): Promise<void> {
  switch (step.action) {
    case 'navigate':
      if (step.value) await page.goto(step.value, { waitUntil: 'networkidle0' });
      break;
    case 'click':
      if (step.selector) {
        await page.waitForSelector(step.selector);
        await page.click(step.selector);
      }
      break;
    case 'type':
      if (step.selector && typeof step.value === 'string') {
        await page.waitForSelector(step.selector);
        await page.click(step.selector);
        await page.type(step.selector, step.value);
      }
      break;
    case 'extract':
      if (step.selector) await page.$eval(step.selector, el => (el as HTMLElement).textContent);
      break;
    case 'screenshot':
      await capturePageScreenshot(page);
      break;
    default:
      break;
  }
}

export async function executePlan(page: Page, plan: BrowserTaskPlan): Promise<ExecutionLog> {
  const steps: ExecutionStepResult[] = [];

  for (const step of plan.steps) {
    const beforeScreenshot = await saveTempScreenshot(await capturePageScreenshot(page), 'before');
    try {
      await executeStep(page, step);
      const afterScreenshot = await saveTempScreenshot(await capturePageScreenshot(page), 'after');
      steps.push({ step, success: true, beforeScreenshot, afterScreenshot });
    } catch (error) {
      steps.push({ step, success: false, error: (error as Error).message, beforeScreenshot });
    }
  }

  return { plan, steps } satisfies ExecutionLog;
}
