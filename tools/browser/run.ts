import { gotoUrl, withPage } from '../../services/browser/chromiumClient';
import { analyzePage } from '../../services/agent/browser/pageUnderstanding';
import { planBrowserTask } from '../../services/agent/browser/actionPlanner';
import { executePlan } from '../../services/agent/browser/executePlan';

async function main() {
  const args = process.argv.slice(2);
  const goalFlagIndex = args.indexOf('--goal');
  const goal = goalFlagIndex >= 0 ? args[goalFlagIndex + 1] : undefined;
  const url = args.find(arg => arg.startsWith('http'));

  if (!goal || !url) {
    console.error('Usage: pnpm browser:run --goal "<goal>" <url>');
    process.exit(1);
  }

  const result = await withPage(page => (async () => {
    await gotoUrl(page, url);
    const structure = await analyzePage(page);
    const plan = await planBrowserTask(goal, { ...structure, url });
    const execution = await executePlan(page, plan);
    return { structure, plan, execution };
  })());

  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
