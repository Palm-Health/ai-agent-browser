import { clearEventBuffer, getBehaviorPatterns, getEventBuffer, getMemoryStore, saveMemory, updateSkillConfidence } from './memoryEngine';
import { LearningInsights, MemoryEvent } from './memoryTypes';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
let intervalId: NodeJS.Timeout | undefined;

const evaluateSelectors = (events: MemoryEvent[]): void => {
    events.forEach((event) => {
        if (event.type === 'sentinel_warning' && event.payload.selector) {
            updateSkillConfidence(event.payload.selector, 'failure');
        }
        if (event.type === 'shadow_mode_event' && event.payload.selector) {
            updateSkillConfidence(event.payload.selector, 'healed');
        }
    });
};

const detectHabits = (): LearningInsights => getBehaviorPatterns();

const feedForge = (insights: LearningInsights): void => {
    // Hook for Browser Forge generation. In production this would push to a queue or service.
    if (insights.emergingHabits.length) {
        console.info('Forge: updating patterns', insights.emergingHabits);
    }
};

const feedSentinel = (events: MemoryEvent[]): void => {
    const warnings = events.filter((event) => event.type === 'sentinel_warning');
    if (warnings.length) {
        console.warn('Sentinel: anomalies detected', warnings.length);
    }
};

const feedMissionPlanner = (insights: LearningInsights): void => {
    if (insights.bestPluginCombos.length) {
        console.info('Mission planner: trend update', insights.bestPluginCombos);
    }
};

const updateTrendGraphs = (insights: LearningInsights): void => {
    const store = getMemoryStore();
    store.context.contentTopics = store.context.contentTopics.map((topic) => ({
        ...topic,
        recencyScore: Math.min(1, topic.recencyScore + 0.05),
    }));
    store.browser.panelsUsed = store.browser.panelsUsed.map((panel) => ({
        ...panel,
        count: panel.count + (insights.preferredPanels.includes(panel.name) ? 0.5 : 0),
    }));
};

export const runLearningCycle = (): LearningInsights => {
    const bufferedEvents = [...getEventBuffer()];
    if (!bufferedEvents.length) return getBehaviorPatterns();

    evaluateSelectors(bufferedEvents);
    const insights = detectHabits();
    updateTrendGraphs(insights);

    feedForge(insights);
    feedSentinel(bufferedEvents);
    feedMissionPlanner(insights);

    saveMemory();
    clearEventBuffer();
    return insights;
};

export const startLearningLoop = (intervalMs: number = DEFAULT_INTERVAL_MS): void => {
    if (intervalId) return;
    intervalId = setInterval(() => {
        runLearningCycle();
    }, intervalMs);
};

export const stopLearningLoop = (): void => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = undefined;
};
