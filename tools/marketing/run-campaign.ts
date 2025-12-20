import fs from 'node:fs/promises';
import { runContentCampaign } from '../../services/marketing/automation/contentMachine';
import type { ContentCampaignBrief } from '../../services/marketing/automation/contentBlueprint';

async function readBrief(): Promise<ContentCampaignBrief> {
  const rawArg = process.argv[2];
  if (!rawArg) {
    throw new Error('Provide a JSON brief string or path to a JSON file.');
  }

  if (rawArg.endsWith('.json')) {
    const content = await fs.readFile(rawArg, 'utf-8');
    return JSON.parse(content) as ContentCampaignBrief;
  }

  return JSON.parse(rawArg) as ContentCampaignBrief;
}

async function main() {
  try {
    const brief = await readBrief();
    const result = await runContentCampaign(brief);
    console.log(JSON.stringify({ summary: {
      episodes: result.episodes.length,
      renderJobs: Object.values(result.episodeRenderPlans).reduce((acc, plan) => acc + plan.renderJobIds.length, 0),
    }, result }, null, 2));
  } catch (error) {
    console.error('Failed to run campaign', error);
    process.exit(1);
  }
}

main();
