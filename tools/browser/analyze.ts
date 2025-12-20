import { gotoUrl, withPage } from '../../services/browser/chromiumClient';
import { analyzePage } from '../../services/agent/browser/pageUnderstanding';

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: pnpm browser:analyze <url>');
    process.exit(1);
  }

  const structure = await withPage(page => (async () => {
    await gotoUrl(page, url);
    return analyzePage(page);
  })());

  console.log(JSON.stringify(structure, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
