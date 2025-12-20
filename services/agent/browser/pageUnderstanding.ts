import type { Page } from 'puppeteer-core';

export interface PageStructure {
  url: string;
  title?: string;
  headings?: string[];
  clickableElements: { selector: string; text?: string; type?: string }[];
  inputElements: { selector: string; placeholder?: string; label?: string }[];
  dataTables?: Array<{ selector: string; rows: string[][] }>;
  semanticSummary?: string;
}

function buildSelector(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${CSS.escape(element.id)}` : '';
  if (id) return `${tag}${id}`;
  const classList = Array.from(element.classList || []).slice(0, 3);
  if (classList.length) {
    const classSelector = classList.map(cls => `.${CSS.escape(cls)}`).join('');
    return `${tag}${classSelector}`;
  }
  return tag;
}

function collectTextContent(element: Element | null): string | undefined {
  if (!element) return undefined;
  const text = (element.textContent || '').trim();
  return text || undefined;
}

function summarizeText(blocks: string[]): string | undefined {
  const combined = blocks.join(' ').replace(/\s+/g, ' ').trim();
  if (!combined) return undefined;
  return combined.slice(0, 320) + (combined.length > 320 ? '…' : '');
}

export async function analyzePage(page: Page): Promise<PageStructure> {
  const url = page.url();
  const title = await page.title();

  const headings = await page.$$eval('h1, h2, h3, h4', nodes =>
    nodes
      .map(node => (node.textContent || '').trim())
      .filter(Boolean),
  );

  const clickableElements = await page.$$eval(
    'a, button, [role="button"], input[type="button"], input[type="submit"], .btn',
    nodes =>
      nodes
        .map(node => {
          const selector = buildSelector(node);
          const text = collectTextContent(node as Element)?.slice(0, 160);
          const type = (node as HTMLElement).getAttribute?.('type') || node.tagName.toLowerCase();
          return { selector, text, type };
        })
        .filter(item => item.selector),
  );

  const inputElements = await page.$$eval('input, textarea, select', nodes =>
    nodes.map(node => {
      const selector = buildSelector(node);
      const placeholder = (node as HTMLInputElement).placeholder || undefined;
      const label = collectTextContent(node.closest('label')) || undefined;
      return { selector, placeholder, label };
    }),
  );

  const dataTables = await page.$$eval('table', tables =>
    tables.map(table => {
      const selector = buildSelector(table);
      const rows = Array.from(table.querySelectorAll('tr')).map(row =>
        Array.from(row.querySelectorAll('th, td')).map(cell => (cell.textContent || '').trim()),
      );
      return { selector, rows };
    }),
  );

  const semanticSummary = summarizeText([
    ...headings,
    ...clickableElements.map(item => item.text || '').filter(Boolean),
  ]);

  return {
    url,
    title,
    headings,
    clickableElements,
    inputElements,
    dataTables,
    semanticSummary,
  } satisfies PageStructure;
}

export async function inferPageIntent(structure: PageStructure): Promise<string> {
  const text = [structure.title, ...(structure.headings || []), structure.semanticSummary]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/login|sign in|sign-in|authenticate/.test(text)) return 'Authentication or login screen';
  if (/upload|media|library/.test(text)) return 'Media management or upload workspace';
  if (/analytics|dashboard|metrics/.test(text)) return 'Analytics or dashboard view';
  if (/settings|preferences|configuration/.test(text)) return 'Settings or configuration page';
  if (/checkout|payment|billing/.test(text)) return 'Billing or checkout experience';

  return structure.semanticSummary || 'General content page';
}
