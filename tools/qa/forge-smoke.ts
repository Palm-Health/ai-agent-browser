import { mineForgeCandidates } from '../../src/browser/forge/forgeMiner';
import { proposeSkillChanges } from '../../src/browser/forge/forgeSynthesizer';
import { applyForgeProposal } from '../../src/browser/forge/forgeApplier';

async function run() {
  console.log('Running Browser Forge smoke test...');
  const candidates = await mineForgeCandidates();
  if (!candidates.length) {
    throw new Error('No forge candidates returned');
  }
  console.log(`Found ${candidates.length} candidate(s)`);

  const candidate = candidates[0];
  const proposal = await proposeSkillChanges(candidate);
  console.log('Proposal summary:', proposal.summary);

  const preview = await applyForgeProposal(proposal, 'preview');
  console.log('Preview diff sample:', preview.previewDiff?.split('\n').slice(0, 5).join('\n'));

  const applied = await applyForgeProposal(proposal, 'apply');
  console.log('Applied skill path:', applied.newSkillFilePath);
}

run().catch(error => {
  console.error('Forge smoke test failed:', error);
  process.exit(1);
});
