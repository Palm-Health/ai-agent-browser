import { vaultService } from '../../services/vaultService';
import { vaultProtocol } from '../../services/vaultProtocol';
import { skillManager } from '../../services/skillManager';
import { skillWorkflowExecutor } from '../../services/skillWorkflowExecutor';

async function main() {
  const sampleHtml = `
    <html>
      <head><title>YouTube Studio Snapshot</title></head>
      <body>
        <div id="analytics-button">Analytics</div>
        <section id="analytics-overview">Views in the last 7 days: 1,234</section>
      </body>
    </html>
  `;

  const meta = await vaultService.saveSnapshot({
    url: 'https://studio.youtube.com/channel/demo/analytics',
    html: sampleHtml,
    markdown: '# YouTube Analytics Snapshot\nSaved for offline skill testing.',
    title: 'YouTube Studio Analytics Snapshot',
  });

  const snapshotUrl = vaultService.openSnapshot(meta.id);
  const resolved = await vaultProtocol.resolve(snapshotUrl);
  const pageContext = { ...resolved.pageContext, skillHint: meta.skillHint };

  console.log('Snapshot saved at', snapshotUrl);
  console.log('Virtual domain detected:', pageContext.virtualDomain);

  if (pageContext.virtualDomain !== 'studio.youtube.com') {
    console.error('Virtual domain mismatch, expected studio.youtube.com');
    process.exit(1);
  }

  const skill = await skillManager.getActiveSkillForPage(pageContext);
  if (!skill) {
    console.error('No skill pack loaded for the virtual domain.');
    process.exit(1);
  }

  console.log('Loaded skill:', skill.id);

  const result = await skillWorkflowExecutor.runWorkflow(skill, 'openAnalytics', {
    html: resolved.html,
    pageContext,
  });

  console.log('Workflow logs:');
  for (const log of result.logs) {
    console.log(' -', log);
  }

  if (result.extractedText?.length) {
    console.log('Extracted:', result.extractedText.join(' | '));
  }

  if (result.success) {
    console.log('Vault skill smoke test passed.');
  } else {
    console.error('Vault skill smoke test failed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Vault skills smoke test crashed:', err);
  process.exit(1);
});
