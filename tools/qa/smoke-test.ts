import { buildActionPlan, executeBrowserPlan } from '../../src/server/browser';
import { planMission, executeMissionPlan } from '../../src/server/orchestrator';
import { runContentCampaign } from '../../src/server/marketing';
import { startShadowSession, recordShadowEvent, learnFlowsFromSession } from '../../src/server/shadow';
import { runSelfHealingSupervisor } from '../../src/server/health';
import { handleVoiceCommand } from '../../src/server/voice';
import { SAFE_MODE, SIMULATION_MODE } from '../../src/server/config/safety';

async function main() {
  const results: Record<string, boolean> = {};
  console.log(`SMOKE TEST (safe=${SAFE_MODE} simulation=${SIMULATION_MODE})`);

  try {
    const mission = planMission({ id: 'mission-qa', goal: 'marketing campaign', agentHint: 'marketing' });
    const executed = await executeMissionPlan(mission);
    results.orchestrator = executed.success && mission.tasks.length > 0;
    console.log('Orchestrator OK', executed.summary);
  } catch (err) {
    console.error('Orchestrator failed', err);
    results.orchestrator = false;
  }

  try {
    const campaign = runContentCampaign({ episodeCount: 1, platform: 'tiktok', persona: 'clinician', durationDays: 1 });
    results.marketing = campaign.episodes.length > 0;
    console.log('Marketing OK', campaign.episodes[0]?.script);
  } catch (err) {
    console.error('Marketing failed', err);
    results.marketing = false;
  }

  try {
    const plan = buildActionPlan({ url: 'https://example.com', instruction: 'read title' });
    const run = await executeBrowserPlan(plan);
    results.browser = !!run.title;
    console.log('Browser OK', run.title);
  } catch (err) {
    console.error('Browser failed', err);
    results.browser = false;
  }

  try {
    const session = startShadowSession();
    recordShadowEvent(session.id, { type: 'click', payload: { target: '#btn' } });
    const flows = learnFlowsFromSession(session);
    results.shadow = flows.length > 0;
    console.log('Shadow OK', flows[0]?.description);
  } catch (err) {
    console.error('Shadow failed', err);
    results.shadow = false;
  }

  try {
    const report = await runSelfHealingSupervisor([
      { id: 'issue-1', category: 'selector', severity: 'medium', details: 'Missing selector' },
    ]);
    results.healing = report.ok;
    console.log('Self-healing OK', report.ok);
  } catch (err) {
    console.error('Self-healing failed', err);
    results.healing = false;
  }

  try {
    const voice = await handleVoiceCommand({ text: 'marketing reminder', userId: 'qa-user' });
    results.voice = voice.success;
    console.log('Voice OK', voice.summary);
  } catch (err) {
    console.error('Voice failed', err);
    results.voice = false;
  }

  const summary = Object.entries(results)
    .map(([key, ok]) => `${ok ? '✅' : '❌'} ${key}`)
    .join('\n');
  console.log('Summary:\n' + summary);
}

main();
