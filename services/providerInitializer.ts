import { aiProviderRegistry } from './aiProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { DeepSeekProvider } from './providers/deepseekProvider';
import { MockAIProvider } from './providers/mockProvider';
import { configService } from './config';
import { modelRouter } from './modelRouter';
import { PERFORMANCE_CONFIG } from './performanceConfig';

export class ProviderInitializer {
  private initializedProviders: Set<string> = new Set();

  async initializeProviders(): Promise<void> {
    const config = configService.getConfig();
    console.log('🚀 Initializing AI providers...');

    // Priority 1: Initialize DeepSeek (primary cloud provider)
    if (config.aiProviders.deepseek?.apiKey) {
      try {
        console.log('🔍 Initializing DeepSeek provider...');
        const deepseekProvider = new DeepSeekProvider({
          apiKey: config.aiProviders.deepseek.apiKey,
          model: 'deepseek-chat',
        });
        
        // Skip health check for faster startup if configured
        if (PERFORMANCE_CONFIG.SKIP_HEALTH_CHECKS) {
          aiProviderRegistry.registerProvider(deepseekProvider);
          this.initializedProviders.add('deepseek');
          console.log('✅ DeepSeek provider initialized successfully (health check skipped)');
        } else {
          // Check if DeepSeek is healthy before registering
          const isHealthy = await deepseekProvider.isHealthy();
          if (isHealthy) {
            aiProviderRegistry.registerProvider(deepseekProvider);
            this.initializedProviders.add('deepseek');
            console.log('✅ DeepSeek provider initialized successfully');
          } else {
            console.warn('⚠️ DeepSeek API is not healthy, skipping initialization');
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize DeepSeek provider:', error);
      }
    } else {
      console.log('ℹ️ DeepSeek API key not found, skipping DeepSeek initialization');
    }

    // Priority 2: Initialize Ollama (local fallback)
    if (config.aiProviders.ollama?.endpoint) {
      try {
        console.log('🏠 Initializing Ollama provider...');
        const ollamaProvider = new OllamaProvider({
          endpoint: config.aiProviders.ollama.endpoint,
          model: 'llama3.2:3b',
        });
        
        // Skip health check if performance config says so
        if (PERFORMANCE_CONFIG.SKIP_HEALTH_CHECKS) {
          aiProviderRegistry.registerProvider(ollamaProvider);
          this.initializedProviders.add('ollama');
          console.log('✅ Ollama provider initialized successfully (health check skipped)');
        } else {
          // Check if Ollama is healthy before registering
          const isHealthy = await ollamaProvider.isHealthy();
          if (isHealthy) {
            aiProviderRegistry.registerProvider(ollamaProvider);
            this.initializedProviders.add('ollama');
            console.log('✅ Ollama provider initialized successfully');
          } else {
            console.warn('⚠️ Ollama endpoint is not healthy, skipping initialization');
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize Ollama provider:', error);
      }
    } else {
      console.log('ℹ️ Ollama endpoint not configured, skipping Ollama initialization');
    }

    // Priority 3: Initialize other cloud providers (optional)
    if (config.aiProviders.gemini?.apiKey) {
      try {
        console.log('🔮 Initializing Gemini provider...');
        const geminiProvider = new GeminiProvider({
          apiKey: config.aiProviders.gemini.apiKey,
          model: 'gemini-2.5-pro',
        });
        aiProviderRegistry.registerProvider(geminiProvider);
        this.initializedProviders.add('gemini');
        console.log('✅ Gemini provider initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini provider:', error);
      }
    }

    if (config.aiProviders.openai?.apiKey) {
      try {
        console.log('🤖 Initializing OpenAI provider...');
        const openaiProvider = new OpenAIProvider({
          apiKey: config.aiProviders.openai.apiKey,
          model: 'gpt-4o',
        });
        aiProviderRegistry.registerProvider(openaiProvider);
        this.initializedProviders.add('openai');
        console.log('✅ OpenAI provider initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI provider:', error);
      }
    }

    if (config.aiProviders.anthropic?.apiKey) {
      try {
        console.log('🧠 Initializing Anthropic provider...');
        const anthropicProvider = new AnthropicProvider({
          apiKey: config.aiProviders.anthropic.apiKey,
          model: 'claude-3-5-sonnet-20241022',
        });
        aiProviderRegistry.registerProvider(anthropicProvider);
        this.initializedProviders.add('anthropic');
        console.log('✅ Anthropic provider initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Anthropic provider:', error);
      }
    }

    // If no providers were initialized, use mock provider for testing
    if (this.initializedProviders.size === 0) {
      try {
        console.log('⚠️ No AI providers initialized, falling back to Mock provider');
        const mockProvider = new MockAIProvider({});
        aiProviderRegistry.registerProvider(mockProvider);
        this.initializedProviders.add('mock');
        console.log('✅ Mock AI provider initialized for testing');
      } catch (error) {
        console.error('❌ Failed to initialize Mock provider:', error);
        throw new Error('Failed to initialize any AI providers');
      }
    }

    console.log(`✅ Initialized ${this.initializedProviders.size} AI providers:`, Array.from(this.initializedProviders));
    
    // Notify model router that providers have been initialized
    if (this.initializedProviders.size > 0) {
      // Force model router to reinitialize with new providers
      modelRouter.reinitializeMetrics();
      console.log('🔄 Model router metrics reinitialized');
    }
  }

  getInitializedProviders(): string[] {
    return Array.from(this.initializedProviders);
  }

  isProviderInitialized(providerName: string): boolean {
    return this.initializedProviders.has(providerName);
  }

  async reinitializeProvider(providerName: string): Promise<boolean> {
    const config = configService.getConfig();
    
    try {
      switch (providerName) {
        case 'gemini':
          if (config.aiProviders.gemini?.apiKey) {
            const geminiProvider = new GeminiProvider({
              apiKey: config.aiProviders.gemini.apiKey,
              model: 'gemini-2.5-pro',
            });
            aiProviderRegistry.registerProvider(geminiProvider);
            this.initializedProviders.add('gemini');
            return true;
          }
          break;
          
        case 'openai':
          if (config.aiProviders.openai?.apiKey) {
            const openaiProvider = new OpenAIProvider({
              apiKey: config.aiProviders.openai.apiKey,
              model: 'gpt-4o',
            });
            aiProviderRegistry.registerProvider(openaiProvider);
            this.initializedProviders.add('openai');
            return true;
          }
          break;
          
        case 'anthropic':
          if (config.aiProviders.anthropic?.apiKey) {
            const anthropicProvider = new AnthropicProvider({
              apiKey: config.aiProviders.anthropic.apiKey,
              model: 'claude-3-5-sonnet-20241022',
            });
            aiProviderRegistry.registerProvider(anthropicProvider);
            this.initializedProviders.add('anthropic');
            return true;
          }
          break;
          
        case 'ollama':
          if (config.aiProviders.ollama?.endpoint) {
            const ollamaProvider = new OllamaProvider({
              endpoint: config.aiProviders.ollama.endpoint,
              model: 'llama3.2:3b',
            });
            
            const isHealthy = await ollamaProvider.isHealthy();
            if (isHealthy) {
              aiProviderRegistry.registerProvider(ollamaProvider);
              this.initializedProviders.add('ollama');
              return true;
            }
          }
          break;
          
        case 'deepseek':
          if (config.aiProviders.deepseek?.apiKey) {
            const deepseekProvider = new DeepSeekProvider({
              apiKey: config.aiProviders.deepseek.apiKey,
              model: 'deepseek-chat',
            });
            
            const isHealthy = await deepseekProvider.isHealthy();
            if (isHealthy) {
              aiProviderRegistry.registerProvider(deepseekProvider);
              this.initializedProviders.add('deepseek');
              return true;
            }
          }
          break;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to reinitialize ${providerName} provider:`, error);
      return false;
    }
  }

  // Get provider status
  getProviderStatus(): Record<string, { initialized: boolean; available: boolean }> {
    const config = configService.getConfig();
    
    return {
      gemini: {
        initialized: this.initializedProviders.has('gemini'),
        available: !!config.aiProviders.gemini?.apiKey,
      },
      openai: {
        initialized: this.initializedProviders.has('openai'),
        available: !!config.aiProviders.openai?.apiKey,
      },
      anthropic: {
        initialized: this.initializedProviders.has('anthropic'),
        available: !!config.aiProviders.anthropic?.apiKey,
      },
      ollama: {
        initialized: this.initializedProviders.has('ollama'),
        available: !!config.aiProviders.ollama?.endpoint,
      },
      deepseek: {
        initialized: this.initializedProviders.has('deepseek'),
        available: !!config.aiProviders.deepseek?.apiKey,
      },
    };
  }
}

export const providerInitializer = new ProviderInitializer();
