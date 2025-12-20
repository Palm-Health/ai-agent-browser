import { getMissionHistory, getMemoryStore } from '../memory/memoryEngine';
import { MissionRecord, MissionShortcut } from '../memory/memoryTypes';

export interface PlannerRecommendation {
    shortcuts: MissionShortcut[];
    defaultAgents: string[];
    followUps: string[];
}

const deriveDefaultAgents = (missions: MissionRecord[]): string[] => {
    const agentCounts: Record<string, number> = {};
    missions.forEach((mission) => {
        (mission.tags || []).forEach((tag) => {
            agentCounts[tag] = (agentCounts[tag] || 0) + 1;
        });
    });
    return Object.entries(agentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
};

const deriveFollowUps = (missions: MissionRecord[]): string[] => {
    const suggestions = new Set<string>();
    missions.forEach((mission) => {
        if (mission.name.toLowerCase().includes('analytics')) {
            suggestions.add('Offer video edit after analytics export');
        }
        if (mission.name.toLowerCase().includes('download')) {
            suggestions.add('Suggest checksum verification');
        }
    });
    return Array.from(suggestions);
};

export const buildMemoryAwarePlan = (): PlannerRecommendation => {
    const missionMemory = getMissionHistory();
    const defaults = deriveDefaultAgents(missionMemory.pastMissions);
    return {
        shortcuts: missionMemory.shortcuts,
        defaultAgents: defaults,
        followUps: deriveFollowUps(missionMemory.pastMissions),
    };
};

export const suggestMissionSequence = (missionName: string): MissionShortcut | undefined => {
    const missionMemory = getMemoryStore().missions;
    return missionMemory.shortcuts.find((shortcut) => missionName.toLowerCase().includes(shortcut.name.toLowerCase()));
};
