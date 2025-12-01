import fs from 'fs';
import path from 'path';
import {
    AgentMemory,
    BrowserMemory,
    ContextualMemory,
    LearningInsights,
    MemoryEvent,
    MemoryStore,
    MissionMemory,
    Recommendation,
    SelectorStat,
    UserBehaviorMemory,
    WorkflowPattern,
} from './memoryTypes';
import { privacyManager } from './privacy';

const MEMORY_DIR = path.join(process.cwd(), 'data', 'memory');
const MEMORY_FILE = path.join(MEMORY_DIR, 'memory.enc');

const defaultUserBehavior = (): UserBehaviorMemory => ({
    domains: [],
    skillPacks: [],
    clickPatterns: [],
    workflows: [],
    timeOfDay: [],
});

const defaultAgentMemory = (): AgentMemory => ({
    successfulSelectors: [],
    failedSelectors: [],
    healedSelectors: [],
    preferredRecoveryPaths: [],
});

const defaultBrowserMemory = (): BrowserMemory => ({
    pluginsLiked: [],
    panelsUsed: [],
    sidebarsPinned: [],
    customShortcuts: [],
});

const defaultContextualMemory = (): ContextualMemory => ({
    keywords: [],
    frequentTags: [],
    contentTopics: [],
});

const defaultMissionMemory = (): MissionMemory => ({
    pastMissions: [],
    bestPatterns: [],
    shortcuts: [],
});

const defaultMemory = (): MemoryStore => ({
    userBehavior: defaultUserBehavior(),
    agent: defaultAgentMemory(),
    browser: defaultBrowserMemory(),
    context: defaultContextualMemory(),
    missions: defaultMissionMemory(),
    updatedAt: new Date().toISOString(),
});

let memoryStore: MemoryStore = defaultMemory();
const eventBuffer: MemoryEvent[] = [];

const ensureMemoryDirectory = (): void => {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
};

const readMemoryFromDisk = (): MemoryStore => {
    ensureMemoryDirectory();
    if (!fs.existsSync(MEMORY_FILE)) {
        return defaultMemory();
    }
    try {
        const encrypted = fs.readFileSync(MEMORY_FILE, 'utf8');
        const decrypted = privacyManager.decrypt(encrypted);
        const parsed: MemoryStore = JSON.parse(decrypted);
        return parsed;
    } catch (error) {
        console.warn('Failed to load memory, falling back to defaults', error);
        return defaultMemory();
    }
};

const writeMemoryToDisk = (memory: MemoryStore): void => {
    ensureMemoryDirectory();
    const payload = JSON.stringify(memory, null, 2);
    const encrypted = privacyManager.encrypt(payload);
    fs.writeFileSync(MEMORY_FILE, encrypted, 'utf8');
};

const updateUsage = (list: { name: string; count: number; lastUsed?: string }[], name: string): void => {
    const existing = list.find((item) => item.name === name);
    const now = new Date().toISOString();
    if (existing) {
        existing.count += 1;
        existing.lastUsed = now;
    } else {
        list.push({ name, count: 1, lastUsed: now });
    }
};

const updateDomainStat = (domains: { domain: string; visits: number; lastVisited?: string; preferredSkillPacks?: string[] }[], domain: string, skillPack?: string): void => {
    const existing = domains.find((item) => item.domain === domain);
    const now = new Date().toISOString();
    if (existing) {
        existing.visits += 1;
        existing.lastVisited = now;
        if (skillPack) {
            const packs = new Set(existing.preferredSkillPacks || []);
            packs.add(skillPack);
            existing.preferredSkillPacks = Array.from(packs);
        }
    } else {
        domains.push({ domain, visits: 1, lastVisited: now, preferredSkillPacks: skillPack ? [skillPack] : [] });
    }
};

const updateWorkflowStat = (workflows: WorkflowPattern[], workflowName: string, success?: boolean): void => {
    const existing = workflows.find((item) => item.name === workflowName);
    const now = new Date().toISOString();
    if (existing) {
        existing.runs += 1;
        if (typeof success === 'boolean') {
            const previousSuccesses = Math.round(existing.successRate * (existing.runs - 1));
            existing.successRate = (previousSuccesses + (success ? 1 : 0)) / existing.runs;
        }
        existing.lastRun = now;
    } else {
        workflows.push({ name: workflowName, runs: 1, successRate: typeof success === 'boolean' ? (success ? 1 : 0) : 0.5, lastRun: now });
    }
};

export const loadMemory = (): MemoryStore => {
    memoryStore = readMemoryFromDisk();
    return memoryStore;
};

export const recordEvent = (event: MemoryEvent): void => {
    if (!privacyManager.isEventAllowed(event.type)) return;
    const sanitizedPayload = privacyManager.sanitizePayload(event.payload);
    const enrichedEvent = { ...event, payload: sanitizedPayload };
    eventBuffer.push(enrichedEvent);

    switch (event.type) {
        case 'command_executed':
            if (event.payload.domain) {
                updateDomainStat(memoryStore.userBehavior.domains, event.payload.domain, event.payload.skillPack);
            }
            updateWorkflowStat(memoryStore.userBehavior.workflows, event.payload.workflow || 'ad-hoc', event.payload.success);
            break;
        case 'skill_pack_invoked':
            if (event.payload.name) {
                updateUsage(memoryStore.userBehavior.skillPacks, event.payload.name);
            }
            if (event.payload.domain) {
                updateDomainStat(memoryStore.userBehavior.domains, event.payload.domain, event.payload.name);
            }
            break;
        case 'plugin_opened':
            if (event.payload.plugin) updateUsage(memoryStore.browser.pluginsLiked, event.payload.plugin);
            break;
        case 'popup_closed':
            updateUsage(memoryStore.browser.panelsUsed, event.payload.panel || 'popup');
            break;
        case 'sentinel_warning':
            if (event.payload.selector) {
                updateSkillConfidence(event.payload.selector, 'failure');
            }
            break;
        case 'shadow_mode_event':
            if (event.payload.selector && event.payload.recoveredWith) {
                memoryStore.agent.preferredRecoveryPaths.push({
                    selector: event.payload.selector,
                    recoveryPath: event.payload.recoveredWith,
                    successRate: 1,
                });
            }
            break;
        case 'orchestrator_mission_start':
            if (event.payload.missionId) {
                memoryStore.missions.pastMissions.push({
                    id: event.payload.missionId,
                    name: event.payload.name || 'mission',
                    startedAt: event.timestamp,
                    success: false,
                    tags: event.payload.tags || [],
                });
            }
            break;
        case 'orchestrator_mission_finish':
            if (event.payload.missionId) {
                const mission = memoryStore.missions.pastMissions.find((m) => m.id === event.payload.missionId);
                if (mission) {
                    mission.finishedAt = event.timestamp;
                    mission.success = Boolean(event.payload.success);
                }
            }
            break;
        case 'vault_snapshot_viewed':
        case 'vault_snapshot_saved':
            updateUsage(memoryStore.context.frequentTags, event.payload.tag || 'snapshot');
            break;
        default:
            break;
    }
    memoryStore.updatedAt = new Date().toISOString();
};

export const getUserPreferences = () => memoryStore.userBehavior;

export const getBehaviorPatterns = (): LearningInsights => ({
    emergingHabits: memoryStore.userBehavior.domains
        .filter((domain) => domain.visits > 2)
        .map((domain) => `${domain.domain} (${domain.visits})`),
    weakSelectors: memoryStore.agent.failedSelectors.filter((sel) => sel.confidence < 0.4),
    strongSelectors: memoryStore.agent.successfulSelectors.filter((sel) => sel.confidence > 0.8),
    deadWorkflows: memoryStore.userBehavior.workflows.filter((wf) => wf.runs > 3 && wf.successRate < 0.2),
    preferredPanels: memoryStore.browser.panelsUsed.filter((panel) => panel.count > 3).map((panel) => panel.name),
    bestPluginCombos: memoryStore.browser.pluginsLiked
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((plugin) => [plugin.name]),
});

export const updateSkillConfidence = (selector: string, outcome: 'success' | 'failure' | 'healed'): void => {
    const now = new Date().toISOString();
    const allSelectors: SelectorStat[] = [
        ...memoryStore.agent.successfulSelectors,
        ...memoryStore.agent.failedSelectors,
        ...memoryStore.agent.healedSelectors,
    ];
    let target = allSelectors.find((item) => item.selector === selector);
    if (!target) {
        target = { selector, confidence: 0.5, lastOutcome: outcome, lastUsed: now };
        memoryStore.agent.failedSelectors.push(target);
    }

    const delta = outcome === 'success' ? 0.1 : outcome === 'healed' ? 0.05 : -0.1;
    target.confidence = Math.min(1, Math.max(0, target.confidence + delta));
    target.lastOutcome = outcome;
    target.lastUsed = now;

    if (outcome === 'success') {
        if (!memoryStore.agent.successfulSelectors.includes(target)) {
            memoryStore.agent.successfulSelectors.push(target);
        }
    } else if (outcome === 'failure') {
        if (!memoryStore.agent.failedSelectors.includes(target)) {
            memoryStore.agent.failedSelectors.push(target);
        }
    } else if (outcome === 'healed') {
        if (!memoryStore.agent.healedSelectors.includes(target)) {
            memoryStore.agent.healedSelectors.push(target);
        }
    }
};

export const recommendActions = (context: string): Recommendation => {
    const favoriteDomains = memoryStore.userBehavior.domains.sort((a, b) => b.visits - a.visits);
    const frequentSkills = memoryStore.userBehavior.skillPacks.sort((a, b) => b.count - a.count);
    const actions: string[] = [];

    if (favoriteDomains.length) {
        actions.push(`Open ${favoriteDomains[0].domain}`);
    }
    if (frequentSkills.length) {
        actions.push(`Preload skill pack: ${frequentSkills[0].name}`);
    }
    if (context) {
        const topic = memoryStore.context.contentTopics.find((item) => context.includes(item.topic));
        if (topic) {
            actions.push(`Highlight ${topic.topic} tools`);
        }
    }

    return {
        actions,
        confidence: actions.length ? 0.8 : 0.3,
        reason: actions.length ? 'Derived from recent behavior' : 'Insufficient behavioral data',
    };
};

export const getMissionHistory = (): MissionMemory => memoryStore.missions;

export const saveMemory = (): void => {
    writeMemoryToDisk(memoryStore);
};

export const getMemoryStore = (): MemoryStore => memoryStore;

export const getEventBuffer = (): MemoryEvent[] => eventBuffer;

export const clearEventBuffer = (): void => {
    eventBuffer.length = 0;
};

// Initialize memory on module load
loadMemory();
