import { planEpisode } from '../../services/marketing/automation/contentMachine';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: pnpm marketing:episode "{\\\"theme\\\":...}"');
    process.exit(1);
  }

  const input = JSON.parse(arg);
  const result = await planEpisode(input);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error('Failed to plan episode', error);
  process.exit(1);
});
