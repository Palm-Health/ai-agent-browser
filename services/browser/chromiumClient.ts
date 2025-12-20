import type { Browser, LaunchOptions, Page, PuppeteerLaunchOptions, Request, Response } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export interface BrowserSessionConfig {
  headless?: boolean;
  userDataDir?: string;
  defaultTimeoutMs?: number;
  executablePath?: string;
}

export type NetworkLogEntry = {
  url: string;
  method: string;
  status?: number;
  type?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
};

const DEFAULT_TIMEOUT = Number(process.env.BROWSER_DEFAULT_TIMEOUT_MS || 30000);
const PLAYWRIGHT_INSTALL_VERSION = process.env.PLAYWRIGHT_INSTALL_VERSION || '1.40.0';
const AUTO_INSTALL_PLAYWRIGHT = process.env.AUTO_INSTALL_PLAYWRIGHT !== 'false';

let cachedExecutablePath: string | undefined;

function validateExecutable(candidate?: string): string | undefined {
  if (!candidate) return undefined;
  if (fs.existsSync(candidate)) return candidate;
  console.warn(`Configured browser executable not found at ${candidate}`);
  return undefined;
}

function resolvePuppeteerExecutable(): string | undefined {
  try {
    // puppeteer-core exposes executablePath when a bundled browser is present (e.g., when chromium is installed separately)
    const candidate = (puppeteer as unknown as { executablePath?: () => string | undefined }).executablePath?.();
    return validateExecutable(candidate);
  } catch (error) {
    console.warn(
      'Unable to resolve Puppeteer executable via executablePath(); set BROWSER_EXECUTABLE_PATH or rely on Playwright install.',
    );
  }
  return undefined;
}

function resolvePlaywrightExecutable(): string | undefined {
  try {
    const candidate = chromium.executablePath();
    return validateExecutable(candidate);
  } catch (error) {
    console.warn('Unable to resolve Playwright Chromium executable via chromium.executablePath()', error);
  }
  return undefined;
}

function resolveExecutablePath(): string | undefined {
  if (cachedExecutablePath && fs.existsSync(cachedExecutablePath)) return cachedExecutablePath;

  const envExecutable =
    validateExecutable(process.env.BROWSER_EXECUTABLE_PATH) ||
    validateExecutable(process.env.CHROMIUM_EXECUTABLE) ||
    validateExecutable(process.env.CHROME_PATH);

  cachedExecutablePath = envExecutable || resolvePuppeteerExecutable() || resolvePlaywrightExecutable();
  return cachedExecutablePath;
}

function resolveUserDataDir(): string | undefined {
  const profileDir = process.env.BROWSER_PROFILE_DIR || process.env.PUPPETEER_USER_DATA_DIR;
  if (!profileDir) return undefined;
  const absolute = path.isAbsolute(profileDir) ? profileDir : path.join(process.cwd(), profileDir);
  fs.mkdirSync(absolute, { recursive: true });
  return absolute;
}

export async function launchBrowser(config: BrowserSessionConfig = {}): Promise<Browser> {
  const headless = config.headless ?? (process.env.BROWSER_HEADLESS !== 'false');
  const userDataDir = config.userDataDir ?? resolveUserDataDir();
  const executablePath = config.executablePath ?? (await ensureExecutablePath());

  const launchConfig: PuppeteerLaunchOptions & { userDataDir?: string } = {
    headless,
    executablePath,
    defaultViewport: {
      width: 1280,
      height: 720,
    },
    args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
  };

  if (userDataDir) launchConfig.userDataDir = userDataDir;

  const browser = await puppeteer.launch(launchConfig as LaunchOptions);
  return browser;
}

function installPlaywrightChromium(): void {
  const command = 'npx';
  const args = [`playwright@${PLAYWRIGHT_INSTALL_VERSION}`, 'install', 'chromium'];
  console.warn('Attempting to install Playwright Chromium for browser automation...');

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_registry: process.env.npm_config_registry || 'https://registry.npmjs.org',
    },
  });
  if (result.status !== 0) {
    throw new Error('Failed to install Playwright Chromium. Please install manually with `npm run playwright:install`.');
  }
}

async function ensureExecutablePath(): Promise<string> {
  const existing = resolveExecutablePath();
  if (existing) return existing;

  if (!AUTO_INSTALL_PLAYWRIGHT) {
    throw new Error(
      'No Chromium/Chrome executable configured. Set BROWSER_EXECUTABLE_PATH or enable AUTO_INSTALL_PLAYWRIGHT to fetch Playwright Chromium.',
    );
  }

  installPlaywrightChromium();
  const afterInstall = resolveExecutablePath();

  if (!afterInstall) {
    throw new Error(
      'Chromium executable could not be resolved even after Playwright install. Configure BROWSER_EXECUTABLE_PATH to continue.',
    );
  }

  return afterInstall;
}

export async function withPage<T>(fn: (page: Page) => Promise<T>, config?: BrowserSessionConfig): Promise<T> {
  const browser = await launchBrowser(config);
  const page = await browser.newPage();
  page.setDefaultTimeout(config?.defaultTimeoutMs ?? DEFAULT_TIMEOUT);

  try {
    return await fn(page);
  } finally {
    await page.close().catch((error) => console.warn('Failed to close page', error));
    await browser.close().catch((error) => console.warn('Failed to close browser', error));
  }
}

export async function gotoUrl(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: DEFAULT_TIMEOUT });
}

export async function clickSelector(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT });
  await page.click(selector);
}

export async function typeInto(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT });
  await page.type(selector, text);
}

export async function evaluateSelector<T>(page: Page, selector: string, fn: (el: Element) => T): Promise<T | null> {
  await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT });
  return page.$eval(selector, fn).catch(() => null);
}

export async function extractText(page: Page, selector: string): Promise<string | null> {
  const result = await evaluateSelector(page, selector, el => el.textContent || '');
  return result?.trim() || null;
}

export async function autoScroll(
  page: Page,
  options: { stepPx?: number; delayMs?: number; maxScrolls?: number } = {},
): Promise<void> {
  const { stepPx = 500, delayMs = 250, maxScrolls = 50 } = options;
  let previousHeight = await page.evaluate(() => document.body.scrollHeight);

  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(({ stepPx }) => window.scrollBy(0, stepPx), { stepPx });
    await page.waitForTimeout(delayMs);
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight <= previousHeight) break;
    previousHeight = newHeight;
  }
}

export async function capturePageScreenshot(page: Page, options: { fullPage?: boolean; type?: 'png' | 'jpeg' } = {}) {
  const buffer = await page.screenshot({ fullPage: options.fullPage ?? true, type: options.type ?? 'png' });
  return buffer as Buffer;
}

export async function captureElementScreenshot(page: Page, selector: string, options: { type?: 'png' | 'jpeg' } = {}) {
  const element = await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT });
  if (!element) throw new Error(`Element not found for selector: ${selector}`);
  const buffer = await element.screenshot({ type: options.type ?? 'png' });
  return buffer as Buffer;
}

export async function recordNetworkTraffic(page: Page, fn: () => Promise<void>): Promise<NetworkLogEntry[]> {
  const entries: NetworkLogEntry[] = [];

  const onRequest = (request: Request) => {
    entries.push({
      url: request.url(),
      method: request.method(),
      requestHeaders: request.headers(),
      type: request.resourceType(),
    });
  };

  const onResponse = (response: Response) => {
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
