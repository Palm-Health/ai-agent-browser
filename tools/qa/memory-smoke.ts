import path from 'path';
import { recordEvent, saveMemory, loadMemory, getBehaviorPatterns, recommendActions, getMissionHistory } from '../../src/memory/memoryEngine';
import { privacyManager } from '../../src/memory/privacy';

const memoryPath = path.join(process.cwd(), 'data', 'memory', 'memory.enc');

async function run() {
    console.log('Recording events...');
    recordEvent({ type: 'command_executed', timestamp: new Date().toISOString(), payload: { domain: 'example.com', workflow: 'login', success: true } });
    recordEvent({ type: 'skill_pack_invoked', timestamp: new Date().toISOString(), payload: { name: 'form-filler', domain: 'example.com' } });
    recordEvent({ type: 'plugin_opened', timestamp: new Date().toISOString(), payload: { plugin: 'translator' } });
    recordEvent({ type: 'orchestrator_mission_start', timestamp: new Date().toISOString(), payload: { missionId: '123', name: 'analytics-download', tags: ['downloader', 'analytics'] } });
    recordEvent({ type: 'orchestrator_mission_finish', timestamp: new Date().toISOString(), payload: { missionId: '123', success: true } });

    saveMemory();

    console.log('Reloading memory...');
    loadMemory();

    const patterns = getBehaviorPatterns();
    console.log('Emerging habits:', patterns.emergingHabits);

    const recommendations = recommendActions('example context');
    console.log('Recommended actions:', recommendations.actions);

    const missions = getMissionHistory();
    console.log('Mission history length:', missions.pastMissions.length);

    console.log('Wiping memory...');
    privacyManager.wipeMemory(memoryPath);
}

run().catch((error) => {
    console.error('QA memory smoke failed', error);
    process.exit(1);
});
