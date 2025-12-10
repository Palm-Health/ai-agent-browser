import { gotoUrl, withPage } from '../../services/browser/chromiumClient';
import { analyzePage } from '../../services/agent/browser/pageUnderstanding';
import { planBrowserTask } from '../../services/agent/browser/actionPlanner';

async function main() {
  const goal = process.argv.slice(2).join(' ');
  if (!goal) {
    console.error('Usage: pnpm browser:plan "<goal>" [--url <url>]');
    process.exit(1);
  }

  const urlFlagIndex = process.argv.indexOf('--url');
  const url = urlFlagIndex >= 0 ? process.argv[urlFlagIndex + 1] : undefined;

  const structure = url
    ? await withPage(page => (async () => {
        await gotoUrl(page, url);
        return analyzePage(page);
      })())
    : { url: '', clickableElements: [], inputElements: [] };

  const plan = await planBrowserTask(goal, structure as any);
  console.log(JSON.stringify(plan, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
