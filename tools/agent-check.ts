import { withPage, gotoUrl } from '../services/browser/chromiumClient';

async function run() {
  const targetUrl = process.env.AGENT_CHECK_URL || 'https://example.com';
  console.log(`Launching Chromium to visit: ${targetUrl}`);

  try {
    const result = await withPage(async (page) => {
      await gotoUrl(page, targetUrl);
      const title = await page.title();
      const screenshot = await page.screenshot({ fullPage: true });
      return { title, screenshotBytes: screenshot.length };
    });

    console.log(`Navigation success. Title: ${result.title}. Screenshot bytes: ${result.screenshotBytes}`);
    process.exit(0);
  } catch (error) {
    console.error('Browser agent check failed:', error);
    process.exit(1);
  }
}

run();
