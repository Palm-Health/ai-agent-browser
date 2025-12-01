import { getMemoryStore, recommendActions } from '../memory/memoryEngine';
import { Recommendation } from '../memory/memoryTypes';

export interface ToolbarLayout {
    pinnedPlugins: string[];
    prioritizedPanels: string[];
    shortcuts: string[];
}

export interface WorkflowSuggestion {
    title: string;
    steps: string[];
    reason: string;
}

export interface PersonalizationPlan {
    toolbar: ToolbarLayout;
    pluginSuggestions: string[];
    highlightedFlows: WorkflowSuggestion[];
    preloadSkillPacks: string[];
    offlineVaults: string[];
    continueWorkflow?: WorkflowSuggestion;
    orchestratorHints: Recommendation;
}

const getTopItems = (items: { name: string; count: number }[], limit = 3): string[] =>
    items
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((item) => item.name);

export const rearrangeToolbar = (): ToolbarLayout => {
    const memory = getMemoryStore();
    return {
        pinnedPlugins: getTopItems(memory.browser.pluginsLiked, 5),
        prioritizedPanels: getTopItems(memory.browser.panelsUsed, 4),
        shortcuts: memory.browser.customShortcuts.sort((a, b) => b.frequency - a.frequency).map((item) => item.shortcut),
    };
};

export const suggestPlugins = (): string[] => {
    const memory = getMemoryStore();
    const infrequent = memory.browser.pluginsLiked.filter((plugin) => plugin.count < 2).map((plugin) => plugin.name);
    const trending = getTopItems(memory.browser.pluginsLiked, 3);
    return [...new Set([...trending, ...infrequent])];
};

export const highlightFlows = (): WorkflowSuggestion[] => {
    const memory = getMemoryStore();
    return memory.userBehavior.workflows
        .filter((wf) => wf.successRate > 0.6)
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 3)
        .map((wf) => ({
            title: wf.name,
            steps: ['Launch orchestrator', 'Auto-fill last arguments', 'Confirm'],
            reason: `High success rate (${Math.round(wf.successRate * 100)}%)`,
        }));
};

export const preloadSkillPacks = (): string[] => {
    const memory = getMemoryStore();
    const frequentDomains = getTopItems(memory.userBehavior.domains, 2);
    return memory.userBehavior.skillPacks
        .filter((skill) => skill.count > 1)
        .map((skill) => skill.name)
        .concat(frequentDomains.map((domain) => `domain:${domain}`));
};

export const preloadVaultPages = (): string[] => {
    const memory = getMemoryStore();
    return memory.context.frequentTags.filter((tag) => tag.count > 1).map((tag) => tag.name);
};

export const continueWorkflow = (): WorkflowSuggestion | undefined => {
    const memory = getMemoryStore();
    const recent = memory.userBehavior.workflows.sort((a, b) => (b.lastRun || '').localeCompare(a.lastRun || ''))[0];
    if (!recent) return undefined;
    return {
        title: recent.name,
        steps: ['Resume last page', 'Reload context', 'Offer previous plan'],
        reason: 'Continue where you left off',
    };
};

export const buildPersonalizationPlan = (context: string): PersonalizationPlan => ({
    toolbar: rearrangeToolbar(),
    pluginSuggestions: suggestPlugins(),
    highlightedFlows: highlightFlows(),
    preloadSkillPacks: preloadSkillPacks(),
    offlineVaults: preloadVaultPages(),
    continueWorkflow: continueWorkflow(),
    orchestratorHints: recommendActions(context),
});
