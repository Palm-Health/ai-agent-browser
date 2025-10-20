import type { Memory } from '../types';

const STORAGE_KEY = 'ai-agent-browser-memories';
const MAX_MEMORIES = 5;

class MemoryService {
    
    getMemories(): Memory[] {
        try {
            const memoriesJSON = localStorage.getItem(STORAGE_KEY);
            return memoriesJSON ? JSON.parse(memoriesJSON) : [];
        } catch (error) {
            console.error("Failed to retrieve memories from localStorage:", error);
            return [];
        }
    }

    saveMemory(memory: Memory) {
        try {
            const memories = this.getMemories();
            // Add the new memory to the beginning of the array
            const updatedMemories = [memory, ...memories];
            // Keep only the most recent memories
            const prunedMemories = updatedMemories.slice(0, MAX_MEMORIES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prunedMemories));
        } catch (error) {
             console.error("Failed to save memory to localStorage:", error);
        }
    }

    clearMemories() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear memories from localStorage:", error);
        }
    }
}

export const memoryService = new MemoryService();
