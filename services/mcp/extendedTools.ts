import { MCPToolRegistry } from './toolRegistry';
import { buildActionPlan, executeBrowserPlan, recoverSelector, suggestSelectors } from '../../src/server/browser';
import { planMission, executeMissionPlan } from '../../src/server/orchestrator';
import { runContentCampaign } from '../../src/server/marketing/contentMachine';
import { runSelfHealingSupervisor, attemptAutoFix } from '../../src/server/health';
import { startShadowSession, endShadowSession, listShadowSessions, learnFlowsFromSession } from '../../src/server/shadow';
import { handleVoiceCommand } from '../../src/server/voice/voiceOrchestrator';
import { collectAgentStats } from '../../src/server/observability';
import { SIMULATION_MODE } from '../../src/server/config/safety';

export function registerExtendedTools(registry: MCPToolRegistry) {
  const safeWrapper = <T>(fn: (...args: any[]) => T) => (...args: any[]) => fn(...args);

  const tools = [
    { name: 'browser.plan', description: 'Plan browser actions', impl: buildActionPlan },
    { name: 'browser.run', description: 'Execute browser plan', impl: executeBrowserPlan },
    { name: 'browser.recover_selector', description: 'Recover selector hints', impl: recoverSelector },
    { name: 'browser.suggest_selectors', description: 'Suggest selectors', impl: suggestSelectors },
    { name: 'orchestrator.plan', description: 'Plan mission', impl: planMission },
    { name: 'orchestrator.run', description: 'Run mission plan', impl: executeMissionPlan },
    { name: 'marketing.plan_campaign', description: 'Plan content campaign', impl: runContentCampaign },
    { name: 'healing.run_supervisor', description: 'Run self healing supervisor', impl: runSelfHealingSupervisor },
    { name: 'healing.auto_fix', description: 'Attempt auto fix', impl: attemptAutoFix },
    { name: 'shadow.start_session', description: 'Start shadow session', impl: startShadowSession },
    { name: 'shadow.end_session', description: 'End shadow session', impl: endShadowSession },
    { name: 'shadow.list_flows', description: 'List shadow sessions', impl: listShadowSessions },
    { name: 'shadow.compile_flow', description: 'Compile flow', impl: learnFlowsFromSession },
    { name: 'voice.handle_command', description: 'Handle voice command', impl: handleVoiceCommand },
    { name: 'observability.agent_stats', description: 'Collect agent stats', impl: collectAgentStats },
  ];

  for (const tool of tools) {
    registry.registerTool({
      name: tool.name,
      description: `${tool.description} (simulated=${SIMULATION_MODE})`,
      inputSchema: {},
      source: 'native',
    } as any);
    (registry as any)[tool.name] = safeWrapper(tool.impl);
  }
}
