import type { Page } from 'puppeteer-core';
import { autoScroll, extractText, gotoUrl, withPage } from '../browser/chromiumClient';

export type PageIntel = {
  url: string;
  title?: string;
  summary?: string;
  targetAudience?: string;
  problemsAddressed?: string[];
  keyBenefits?: string[];
  ctaIdeas?: string[];
  suggestedHooks?: string[];
  keywords?: string[];
};

export type VideoPageIntel = {
  url: string;
  title?: string;
  description?: string;
  channel?: string;
  suggestedHooks?: string[];
  topics?: string[];
  personaFit?: string[];
};

function synthesizeSummary(textBlocks: string[]): string | undefined {
  const content = textBlocks.join(' ').replace(/\s+/g, ' ').trim();
  if (!content) return undefined;
  return content.slice(0, 320) + (content.length > 320 ? '…' : '');
}

function extractKeywords(textBlocks: string[]): string[] {
  const text = textBlocks.join(' ').toLowerCase();
  const words = text.match(/[a-zA-Z]{5,}/g) || [];
  const counts: Record<string, number> = {};
  words.forEach(word => {
    counts[word] = (counts[word] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

async function collectLandingCopy(page: Page): Promise<string[]> {
  const selectors = ['h1', 'h2', 'header', '.hero', '.cta', 'p', 'li'];
  const texts: string[] = [];
  for (const selector of selectors) {
    const elements = await page.$$(selector);
    for (const element of elements) {
      const content = (await element.evaluate((el: Element) => el.textContent || ''))?.trim();
      if (content) texts.push(content);
    }
  }
  return texts.filter(Boolean);
}

export async function analyzeMarketingPage(url: string): Promise<PageIntel> {
  return withPage(async page => {
    await gotoUrl(page, url);
    await autoScroll(page, { maxScrolls: 15 });

    const title = await page.title();
    const headings = await collectLandingCopy(page);
    const summary = synthesizeSummary(headings);
    const keywords = extractKeywords(headings);

    const hero = await extractText(page, 'h1');
    const benefits = headings.filter(text => /\b(benefit|save|faster|improve|reduce)\b/i.test(text)).slice(0, 5);
    const callsToAction = headings.filter(text => /(get started|try|book|schedule|signup|contact)/i.test(text)).slice(0, 5);

    return {
      url,
      title,
      summary,
      targetAudience: hero || headings.find(text => /(for|ideal|designed)/i.test(text)),
      problemsAddressed: headings.filter(text => /(problem|pain|challenge|issue)/i.test(text)).slice(0, 5),
      keyBenefits: benefits,
      ctaIdeas: callsToAction,
      suggestedHooks: headings.filter(text => text.length < 140).slice(0, 8),
      keywords,
    } as PageIntel;
  });
}

export async function analyzeVideoPage(url: string): Promise<VideoPageIntel> {
  return withPage(async page => {
    await gotoUrl(page, url);
    await autoScroll(page, { maxScrolls: 8 });

    const title = await page.title();
    const description =
      (await extractText(page, '#description')) ||
      (await extractText(page, 'meta[name="description"]')) ||
      (await extractText(page, 'meta[name="og:description"]'));
    const channel =
      (await extractText(page, '#channel-name a')) ||
      (await extractText(page, '.ytd-channel-name a')) ||
      (await extractText(page, 'meta[itemprop="channelId"]'));
    const textBlocks = await collectLandingCopy(page);

    return {
      url,
      title,
      description,
      channel,
      suggestedHooks: textBlocks.filter(t => t.length < 120).slice(0, 8),
      topics: extractKeywords(textBlocks).slice(0, 6),
      personaFit: textBlocks.filter(t => /(patient|clinician|marketer|founder|engineer)/i.test(t)).slice(0, 5),
    } as VideoPageIntel;
  });
}
