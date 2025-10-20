import { RoutingContext } from './intelligentRouter';

interface UserOverride {
  suggestedModel: string;
  chosenModel: string;
  context: {
    taskType: string;
    complexity: string;
    privacyMode: string;
    timestamp: Date;
  };
}

interface LearnedPreference {
  contextPattern: string;
  preferredModel: string;
  confidence: number;
  usageCount: number;
}

// Privacy-sensitive keywords that trigger local models
const PRIVACY_KEYWORDS = [
  'password', 'ssn', 'social security', 'credit card', 'medical record',
  'confidential', 'private', 'personal', 'hipaa', 'phi', 'pii',
  'bank account', 'routing number', 'pin', 'cvv', 'diagnosis',
  'prescription', 'patient', 'treatment', 'salary', 'income',
  'secret', 'sensitive', 'proprietary', 'classified'
];

export class UserPreferenceService {
  private overrideHistory: UserOverride[] = [];
  private learnedPreferences: Map<string, LearnedPreference> = new Map();
  private readonly MAX_HISTORY = 100;
  private readonly STORAGE_KEY = 'user-preferences-routing';
  
  constructor() {
    this.loadPreferences();
  }
  
  recordUserOverride(suggestedModel: string, chosenModel: string, context: any): void {
    const override: UserOverride = {
      suggestedModel,
      chosenModel,
      context: {
        taskType: context.taskType || 'unknown',
        complexity: context.complexity || 'unknown',
        privacyMode: context.privacyMode || 'balanced',
        timestamp: new Date(),
      },
    };
    
    this.overrideHistory.push(override);
    
    // Keep history size manageable
    if (this.overrideHistory.length > this.MAX_HISTORY) {
      this.overrideHistory.shift();
    }
    
    // Learn from this override
    this.updateLearnedPreferences(override);
    
    // Persist to storage
    this.savePreferences();
  }
  
  getPreferredModelForContext(context: RoutingContext): string | null {
    // Create a context pattern
    const pattern = this.createContextPattern(context);
    
    // Check learned preferences
    const learned = this.learnedPreferences.get(pattern);
    if (learned && learned.confidence > 0.7) {
      return learned.preferredModel;
    }
    
    // Check for similar patterns
    for (const [key, preference] of this.learnedPreferences.entries()) {
      if (this.isSimilarPattern(pattern, key) && preference.confidence > 0.8) {
        return preference.preferredModel;
      }
    }
    
    return null;
  }
  
  detectPrivacySensitiveContent(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return PRIVACY_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
  }
  
  getPrivacyKeywords(): string[] {
    return [...PRIVACY_KEYWORDS];
  }
  
  private updateLearnedPreferences(override: UserOverride): void {
    const pattern = `${override.context.taskType}_${override.context.complexity}_${override.context.privacyMode}`;
    
    const existing = this.learnedPreferences.get(pattern);
    
    if (existing) {
      // Update existing preference
      if (existing.preferredModel === override.chosenModel) {
        existing.usageCount++;
        existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      } else {
        // User changed preference
        existing.preferredModel = override.chosenModel;
        existing.usageCount = 1;
        existing.confidence = 0.5;
      }
    } else {
      // Create new learned preference
      this.learnedPreferences.set(pattern, {
        contextPattern: pattern,
        preferredModel: override.chosenModel,
        confidence: 0.6,
        usageCount: 1,
      });
    }
  }
  
  private createContextPattern(context: RoutingContext): string {
    const taskType = context.taskComplexity.level || 'unknown';
    const privacyMode = context.privacyMode || 'balanced';
    return `${taskType}_${privacyMode}`;
  }
  
  private isSimilarPattern(pattern1: string, pattern2: string): boolean {
    const parts1 = pattern1.split('_');
    const parts2 = pattern2.split('_');
    
    // Check if at least 2 out of 3 parts match
    let matches = 0;
    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      if (parts1[i] === parts2[i]) {
        matches++;
      }
    }
    
    return matches >= 2;
  }
  
  private savePreferences(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = {
          overrideHistory: this.overrideHistory.slice(-50), // Save last 50
          learnedPreferences: Array.from(this.learnedPreferences.entries()),
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }
  
  private loadPreferences(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          this.overrideHistory = parsed.overrideHistory || [];
          
          if (parsed.learnedPreferences) {
            this.learnedPreferences = new Map(parsed.learnedPreferences);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }
  
  // Get statistics
  getPreferenceStats(): {
    totalOverrides: number;
    learnedPatterns: number;
    topPreferences: Array<{ pattern: string; model: string; confidence: number }>;
  } {
    const topPreferences = Array.from(this.learnedPreferences.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(pref => ({
        pattern: pref.contextPattern,
        model: pref.preferredModel,
        confidence: pref.confidence,
      }));
    
    return {
      totalOverrides: this.overrideHistory.length,
      learnedPatterns: this.learnedPreferences.size,
      topPreferences,
    };
  }
  
  // Reset preferences
  resetPreferences(): void {
    this.overrideHistory = [];
    this.learnedPreferences.clear();
    this.savePreferences();
  }
}

export const userPreferenceService = new UserPreferenceService();

