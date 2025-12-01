import { BrowserHealthEvent } from './sentinel';

export async function runPreHeals(pageContext: any, suggestions: string[], recentEvents: BrowserHealthEvent[] = []) {
  const actions: string[] = [];

  const tryClosePopup = async () => {
    if (!pageContext?.evaluate) return false;
    const closed = await pageContext.evaluate(() => {
      const selectors = [
        '[aria-label="Close" i]',
        '[data-testid="close" i]',
        '.modal [data-action="close" i]',
        '.popup [data-dismiss]' 
      ];
      let handled = false;
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          (el as HTMLElement).click();
          handled = true;
        });
      });
      return handled;
    });
    if (closed) actions.push('Closed popup overlay');
    return closed;
  };

  const retryMissingSelectors = async () => {
    const missing = recentEvents
      .filter((event) => event.type === 'missing-selector')
      .flatMap((event) => (event.meta?.selectors as string[]) || []);
    if (!missing.length || !pageContext?.waitForSelector) return false;

    for (const selector of missing) {
      try {
        await pageContext.waitForSelector(selector, { timeout: 1500 });
        actions.push(`Recovered selector ${selector}`);
        return true;
      } catch {
        // keep trying
      }
    }
    return false;
  };

  const reloadSkillPack = async () => {
    if (!pageContext?.reloadSkillPack) return false;
    await pageContext.reloadSkillPack();
    actions.push('Reloaded skill pack metadata');
    return true;
  };

  const delayForStability = async () => {
    if (!pageContext?.waitForTimeout) return false;
    await pageContext.waitForTimeout(500);
    actions.push('Delayed workflow for layout stabilization');
    return true;
  };

  for (const suggestion of suggestions) {
    if (/close overlay|close popup/i.test(suggestion)) {
      await tryClosePopup();
    }
    if (/selector recovery|selectors before continuing/i.test(suggestion)) {
      await retryMissingSelectors();
    }
    if (/reload skill pack/i.test(suggestion)) {
      await reloadSkillPack();
    }
    if (/delay action until layout stabilizes/i.test(suggestion)) {
      await delayForStability();
    }
  }

  // Snapshot handling: if no live network, encourage static analysis
  const snapshotMode = recentEvents.some((event) => event.meta?.snapshotMode === true);
  if (snapshotMode && pageContext?.analyzeStaticDom) {
    await pageContext.analyzeStaticDom();
    actions.push('Analyzed static DOM for vault snapshot');
  }

  return actions;
}
