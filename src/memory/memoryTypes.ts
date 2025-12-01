export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'late-night';

export interface DomainStat {
    domain: string;
    visits: number;
    lastVisited?: string;
    preferredSkillPacks?: string[];
}

export interface SkillUsage {
    name: string;
    count: number;
    lastUsed?: string;
}

export interface ClickPattern {
    element: string;
    count: number;
    contexts?: string[];
}

export interface WorkflowPattern {
    name: string;
    successRate: number;
    runs: number;
    lastRun?: string;
}

export interface TimeBehavior {
    window: TimeOfDay;
    dominantDomains: string[];
    activeSkills: string[];
}

export interface SelectorStat {
    selector: string;
    confidence: number;
    lastOutcome: 'success' | 'failure' | 'healed';
    lastUsed?: string;
}

export interface RecoveryPattern {
    selector: string;
    recoveryPath: string;
    successRate: number;
}

export interface UsageStat {
    name: string;
    count: number;
    lastUsed?: string;
}

export interface ShortcutPreference {
    action: string;
    shortcut: string;
    frequency: number;
}

export interface KeywordAssociation {
    keyword: string;
    occurrences: number;
    relatedDomains?: string[];
}

export interface TopicStat {
    topic: string;
    frequency: number;
    recencyScore: number;
}

export interface MissionRecord {
    id: string;
    name: string;
    startedAt: string;
    finishedAt?: string;
    success: boolean;
    tags?: string[];
}

export interface MissionPattern {
    pattern: string[];
    successRate: number;
    averageDurationMs?: number;
}

export interface MissionShortcut {
    name: string;
    sequence: string[];
    triggerCount: number;
}

export interface UserBehaviorMemory {
    domains: DomainStat[];
    skillPacks: SkillUsage[];
    clickPatterns: ClickPattern[];
    workflows: WorkflowPattern[];
    timeOfDay: TimeBehavior[];
}

export interface AgentMemory {
    successfulSelectors: SelectorStat[];
    failedSelectors: SelectorStat[];
    healedSelectors: SelectorStat[];
    preferredRecoveryPaths: RecoveryPattern[];
}

export interface BrowserMemory {
    pluginsLiked: UsageStat[];
    panelsUsed: UsageStat[];
    sidebarsPinned: string[];
    customShortcuts: ShortcutPreference[];
}

export interface ContextualMemory {
    keywords: KeywordAssociation[];
    frequentTags: UsageStat[];
    contentTopics: TopicStat[];
}

export interface MissionMemory {
    pastMissions: MissionRecord[];
    bestPatterns: MissionPattern[];
    shortcuts: MissionShortcut[];
}

export interface MemoryStore {
    userBehavior: UserBehaviorMemory;
    agent: AgentMemory;
    browser: BrowserMemory;
    context: ContextualMemory;
    missions: MissionMemory;
    updatedAt: string;
}

export type MemoryEventType =
    | 'command_executed'
    | 'skill_pack_invoked'
    | 'plugin_opened'
    | 'popup_closed'
    | 'sentinel_warning'
    | 'shadow_mode_event'
    | 'orchestrator_mission_start'
    | 'orchestrator_mission_finish'
    | 'vault_snapshot_viewed'
    | 'vault_snapshot_saved';

export interface MemoryEvent {
    type: MemoryEventType;
    timestamp: string;
    payload: Record<string, any>;
    context?: string;
}

export interface Recommendation {
    actions: string[];
    confidence: number;
    reason: string;
}

export interface LearningInsights {
    emergingHabits: string[];
    weakSelectors: SelectorStat[];
    strongSelectors: SelectorStat[];
    deadWorkflows: WorkflowPattern[];
    preferredPanels: string[];
    bestPluginCombos: string[][];
}
