import fs from 'node:fs/promises';
import path from 'node:path';
import { BrowserTaskPlan, BrowserTaskPlanStep } from './actionPlanner';

export interface RecordedFlow {
  name: string;
  steps: BrowserTaskPlan['steps'];
  requiresAuth?: boolean;
  createdAt: string;
}

const FLOW_STORE_DIR = path.join(process.cwd(), 'data');
const FLOW_STORE_PATH = path.join(FLOW_STORE_DIR, 'flows.json');

async function loadStore(): Promise<RecordedFlow[]> {
  try {
    const raw = await fs.readFile(FLOW_STORE_PATH, 'utf-8');
    return JSON.parse(raw) as RecordedFlow[];
  } catch (error) {
    return [];
  }
}

async function persistStore(flows: RecordedFlow[]) {
  await fs.mkdir(FLOW_STORE_DIR, { recursive: true });
  await fs.writeFile(FLOW_STORE_PATH, JSON.stringify(flows, null, 2), 'utf-8');
}

export async function saveFlow(flow: RecordedFlow): Promise<void> {
  const flows = await loadStore();
  const existingIndex = flows.findIndex(item => item.name === flow.name);
  if (existingIndex >= 0) flows[existingIndex] = flow; else flows.push(flow);
  await persistStore(flows);
}

export async function loadFlow(name: string): Promise<RecordedFlow | null> {
  const flows = await loadStore();
  return flows.find(flow => flow.name === name) || null;
}

async function performStep(page: any, step: BrowserTaskPlanStep) {
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
      if (step.selector) {
        await page.$eval(step.selector, el => (el as HTMLElement).textContent);
      }
      break;
    default:
      break;
  }
}

export async function replayFlow(page: any, flow: RecordedFlow): Promise<void> {
  for (const step of flow.steps) {
    await performStep(page, step);
  }
}
