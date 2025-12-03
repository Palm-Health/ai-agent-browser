#!/usr/bin/env node

import 'tsx/esm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer-core';
import { analyzePage } from '../../services/agent/browser/pageUnderstanding.ts';
import { planBrowserTask } from '../../services/agent/browser/actionPlanner.ts';
import { executePlan } from '../../services/agent/browser/executePlan.ts';
import { saveFlow } from '../../services/agent/browser/flows.ts';
import { generateCampaignPlan } from '../../services/marketing/automation/contentBlueprint.ts';
import { planEpisode as planMarketingEpisode, runContentCampaign } from '../../services/marketing/automation/contentMachine.ts';

const DEFAULT_TIMEOUT = Number(process.env.BROWSER_DEFAULT_TIMEOUT_MS || 30000);
const MEDIA_ROOT_PATH = process.env.MEDIA_ROOT_PATH || path.join(process.cwd(), 'media');

function resolveExecutablePath() {
  return process.env.BROWSER_EXECUTABLE_PATH || process.env.CHROMIUM_EXECUTABLE || process.env.CHROME_PATH;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function launchBrowser() {
  const executablePath = resolveExecutablePath();
  const userDataDir = process.env.BROWSER_PROFILE_DIR || process.env.PUPPETEER_USER_DATA_DIR;
  if (!executablePath) {
    throw new Error(
      'No Chromium/Chrome executable configured. Set BROWSER_EXECUTABLE_PATH, CHROMIUM_EXECUTABLE, or CHROME_PATH.',
    );
  }
  if (userDataDir) await ensureDir(userDataDir);
  const launchConfig = {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    executablePath,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
  };
  if (userDataDir) launchConfig.userDataDir = userDataDir;
  return puppeteer.launch(launchConfig);
}

async function withPage(fn) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT);
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function gotoUrl(page, url) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: DEFAULT_TIMEOUT });
}

async function autoScroll(page, { stepPx = 500, delayMs = 250, maxScrolls = 40 } = {}) {
  let previousHeight = await page.evaluate('document.body.scrollHeight');
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(`window.scrollBy(0, ${stepPx});`);
    await page.waitForTimeout(delayMs);
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight <= previousHeight) break;
    previousHeight = newHeight;
  }
}

async function recordNetworkTraffic(page, fn) {
  const entries = [];
  const onRequest = (request) => {
    entries.push({
      url: request.url(),
      method: request.method(),
      requestHeaders: request.headers(),
      type: request.resourceType(),
    });
  };
  const onResponse = (response) => {
    const entry = entries.find(e => e.url === response.url());
    if (entry) {
      entry.status = response.status();
      entry.responseHeaders = response.headers();
      entry.type = entry.type || response.request().resourceType();
    } else {
      entries.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        responseHeaders: response.headers(),
        type: response.request().resourceType(),
      });
    }
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  try {
    await fn();
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
  }
  return entries;
}

async function analyzePageIntel(url) {
  return withPage(async (page) => {
    await gotoUrl(page, url);
    await autoScroll(page);
    const title = await page.title();
    const textBlocks = await page.$$eval('h1, h2, h3, p, li', elements =>
      elements
        .map(el => (el.textContent || '').trim())
        .filter(Boolean)
    );
    const summary = textBlocks.join(' ').slice(0, 320);
    return { url, title, summary, suggestedHooks: textBlocks.filter(t => t.length < 140).slice(0, 8) };
  });
}

async function analyzeVideoIntel(url) {
  return withPage(async (page) => {
    await gotoUrl(page, url);
    const title = await page.title();
    const description = await page.$eval('#description', el => el.textContent || '').catch(() => undefined);
    const channel = await page.$eval('#channel-name a', el => el.textContent || '').catch(() => undefined);
    return { url, title, description, channel };
  });
}

async function captureScreenshots(url, { fullPage = true } = {}, existingPage) {
  const worker = async (page) => {
    await gotoUrl(page, url);
    if (fullPage) await autoScroll(page);
    await ensureDir(MEDIA_ROOT_PATH);
    const timestamp = Date.now();
    const filePath = path.join(MEDIA_ROOT_PATH, `screenshot-${timestamp}.png`);
    await page.screenshot({ path: filePath, fullPage });
    return { path: filePath };
  };

  if (existingPage) return worker(existingPage);
  return withPage(worker);
}

function deriveOrientation(width, height) {
  if (!width || !height) return 'other';
  const ratio = width / height;
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  return ratio > 1 ? '16:9' : '9:16';
}

async function classifyLocalClip(relativePath) {
  const { spawn } = await import('node:child_process');
  const resolvedRoot = path.resolve(MEDIA_ROOT_PATH) + path.sep;
  const filePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(MEDIA_ROOT_PATH, relativePath);
  const normalized = path.resolve(filePath);
  if (!normalized.startsWith(resolvedRoot)) {
    throw new Error('Requested file is outside of configured media root');
  }

  const args = [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,duration',
    '-of',
    'json',
    filePath,
  ];

  const metadata = await new Promise((resolve) => {
    try {
      const proc = spawn('ffprobe', args);
      let output = '';
      proc.stdout.on('data', (chunk) => (output += chunk.toString()));
      proc.on('close', () => {
        try {
          const parsed = JSON.parse(output || '{}');
          resolve(parsed.streams?.[0] || {});
        } catch (error) {
          console.warn('ffprobe parse failed', error);
          resolve({});
        }
      });
      proc.on('error', () => resolve({}));
    } catch (error) {
      console.warn('ffprobe unavailable', error);
      resolve({});
    }
  });

  const width = metadata.width ? Number(metadata.width) : undefined;
  const height = metadata.height ? Number(metadata.height) : undefined;
  const durationSeconds = metadata.duration ? Number(metadata.duration) : undefined;
  const orientation = deriveOrientation(width, height);

  const type = orientation === '9:16' ? 'hook' : (orientation === '16:9' && (durationSeconds || 0) > 90 ? 'talking_head' : 'broll');
  const platformFit = orientation === '9:16' ? ['tiktok', 'reels', 'ytshorts'] : ['youtube', 'web'];

  return {
    path: filePath,
    type,
    topics: [],
    persona: [],
    platformFit,
  };
}

class BrowserAutomationServer {
  constructor() {
    this.server = new Server({ name: 'browser-automation-server', version: '2.0.0' }, { capabilities: { tools: {} } });
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'marketing.browser_visit',
            description: 'Visit a URL and return structured marketing or video intel',
            inputSchema: {
              type: 'object',
              properties: { url: { type: 'string' } },
              required: ['url'],
            },
          },
          {
            name: 'marketing.browser_capture_screenshots',
            description: 'Visit a URL and capture screenshot(s)',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                fullPage: { type: 'boolean', default: true },
              },
              required: ['url'],
            },
          },
          {
            name: 'marketing.classify_local_clip',
            description: 'Classify a local media clip relative to the configured media root',
            inputSchema: {
              type: 'object',
              properties: { relativePath: { type: 'string' } },
              required: ['relativePath'],
            },
          },
          {
            name: 'marketing.scrape_competitor_page',
            description: 'Analyze a competitor page for positioning and CTA patterns',
            inputSchema: {
              type: 'object',
              properties: { url: { type: 'string' } },
              required: ['url'],
            },
          },
          {
            name: 'marketing.plan_campaign',
            description: 'Create a content campaign plan from a brief',
            inputSchema: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                persona: { type: 'string', enum: ['patient', 'clinician', 'investor'] },
                durationDays: { type: 'number' },
                platforms: { type: 'array', items: { type: 'string' } },
                frequencyPerDay: { type: 'number' },
                tone: { type: 'string' },
              },
              required: ['theme', 'persona', 'durationDays', 'platforms', 'frequencyPerDay'],
            },
          },
          {
            name: 'marketing.build_campaign',
            description: 'Run the full content machine: plan episodes, match media, scripts, and render jobs',
            inputSchema: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                persona: { type: 'string', enum: ['patient', 'clinician', 'investor'] },
                durationDays: { type: 'number' },
                platforms: { type: 'array', items: { type: 'string' } },
                frequencyPerDay: { type: 'number' },
                tone: { type: 'string' },
              },
              required: ['theme', 'persona', 'durationDays', 'platforms', 'frequencyPerDay'],
            },
          },
          {
            name: 'marketing.plan_episode',
            description: 'Plan and stage media/script/render plans for a single short-form episode',
            inputSchema: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                persona: { type: 'string', enum: ['patient', 'clinician', 'investor'] },
                platforms: { type: 'array', items: { type: 'string' } },
                angle: { type: 'string' },
              },
              required: ['theme', 'persona', 'platforms'],
            },
          },
          {
            name: 'browser.plan',
            description: 'Generate a multi-step browser task plan from a goal',
            inputSchema: {
              type: 'object',
              properties: {
                goal: { type: 'string' },
                url: { type: 'string', description: 'Optional URL to inspect before planning' },
              },
              required: ['goal'],
            },
          },
          {
            name: 'browser.run',
            description: 'Visit a URL, analyze the page, plan actions, and execute them',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                goal: { type: 'string' },
              },
              required: ['url', 'goal'],
            },
          },
          {
            name: 'browser.learn_flow',
            description: 'Execute a goal on a URL, then persist the resulting flow for reuse',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                goal: { type: 'string' },
                url: { type: 'string' },
              },
              required: ['name', 'goal', 'url'],
            },
          },
          {
            name: 'navigate_to_url',
            description: 'Navigate the browser to a specific URL',
            inputSchema: {
              type: 'object',
              properties: { url: { type: 'string' } },
              required: ['url'],
            },
          },
          {
            name: 'take_screenshot',
            description: 'Take a screenshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'URL to open before screenshot' },
                fullPage: { type: 'boolean', default: false },
              },
              required: ['url'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case 'marketing.browser_visit': {
            const url = args.url;
            const intel = url.includes('youtube.com') || url.includes('youtu.be')
              ? await analyzeVideoIntel(url)
              : await analyzePageIntel(url);
            return { content: [{ type: 'text', text: JSON.stringify(intel, null, 2) }] };
          }
          case 'marketing.browser_capture_screenshots': {
            const { url, fullPage } = args;
            const captureWithLogs = await withPage(async (page) => {
              let captureResult;
              const network = await recordNetworkTraffic(page, async () => {
                captureResult = await captureScreenshots(url, { fullPage }, page);
              });
              const capture = captureResult || (await captureScreenshots(url, { fullPage }, page));
              return { capture, network };
            });
            return { content: [{ type: 'text', text: JSON.stringify(captureWithLogs, null, 2) }] };
          }
          case 'marketing.classify_local_clip': {
            const result = await classifyLocalClip(args.relativePath);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'marketing.scrape_competitor_page': {
            const intel = await analyzePageIntel(args.url);
            return { content: [{ type: 'text', text: JSON.stringify(intel, null, 2) }] };
          }
          case 'marketing.plan_campaign': {
            const brief = {
              theme: args.theme,
              persona: args.persona,
              durationDays: args.durationDays,
              platforms: args.platforms,
              frequencyPerDay: args.frequencyPerDay,
              tone: args.tone,
            };
            const plan = await generateCampaignPlan(brief);
            return { content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }] };
          }
          case 'marketing.build_campaign': {
            const brief = {
              theme: args.theme,
              persona: args.persona,
              durationDays: args.durationDays,
              platforms: args.platforms,
              frequencyPerDay: args.frequencyPerDay,
              tone: args.tone,
            };
            const result = await runContentCampaign(brief);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'marketing.plan_episode': {
            const result = await planMarketingEpisode({
              theme: args.theme,
              persona: args.persona,
              platforms: args.platforms,
              angle: args.angle,
            });
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'browser.plan': {
            const { goal, url } = args;
            const structure = url
              ? await withPage(async page => {
                  await gotoUrl(page, url);
                  return analyzePage(page);
                })
              : { url: '', clickableElements: [], inputElements: [] };
            const plan = await planBrowserTask(goal, structure);
            return { content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }] };
          }
          case 'browser.run': {
            const { url, goal } = args;
            const result = await withPage(async page => {
              await gotoUrl(page, url);
              const structure = await analyzePage(page);
              const plan = await planBrowserTask(goal, { ...structure, url });
              const execution = await executePlan(page, plan);
              return { structure, plan, execution };
            });
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'browser.learn_flow': {
            const { name, goal, url } = args;
            const result = await withPage(async page => {
              await gotoUrl(page, url);
              const structure = await analyzePage(page);
              const plan = await planBrowserTask(goal, { ...structure, url });
              const execution = await executePlan(page, plan);
              await saveFlow({ name, steps: plan.steps, createdAt: new Date().toISOString() });
              return { structure, plan, execution };
            });
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'navigate_to_url': {
            await withPage(async (page) => gotoUrl(page, args.url));
            return { content: [{ type: 'text', text: `Navigated to ${args.url}` }] };
          }
          case 'take_screenshot': {
            const capture = await captureScreenshots(args.url, { fullPage: args.fullPage });
            return { content: [{ type: 'text', text: `Captured ${capture.path}` }] };
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error executing tool ${name}: ${error.message}` }],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Browser automation MCP server running on stdio');
  }
}

const server = new BrowserAutomationServer();
server.run().catch(console.error);
