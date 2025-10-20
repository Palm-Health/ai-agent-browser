import { GoogleGenAI, ChatSession, FunctionCall } from "@google/genai";
import { BaseAIProvider, ProviderConfig } from '../aiProvider';
import { AIModel, AICapability, AIResponse, ChatMessage, Tool } from '../../types';

export class GeminiProvider extends BaseAIProvider {
  name = 'gemini';
  private ai: GoogleGenAI;
  private chatSession: ChatSession;

  models: AIModel[] = [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'gemini',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.STREAMING],
      contextWindow: 1000000,
      costPerToken: 0.000000075, // DEPRECATED
      maxTokens: 8192,
      supportsVision: false,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['fast', 'remote'],
      pricing: { inputPer1k: 0.000075, outputPer1k: 0.000075 }, // $0.075 per 1M tokens
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'gemini',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.VISION, AICapability.REASONING, AICapability.STREAMING],
      contextWindow: 2000000,
      costPerToken: 0.00000125, // DEPRECATED
      maxTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['reasoning', 'remote', 'advanced'],
      pricing: { inputPer1k: 0.00125, outputPer1k: 0.00125 }, // $1.25 per 1M tokens
    },
  ];

  capabilities: AICapability[] = [
    AICapability.TEXT_GENERATION,
    AICapability.FUNCTION_CALLING,
    AICapability.VISION,
    AICapability.REASONING,
    AICapability.STREAMING,
  ];

  constructor(config: ProviderConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error("Gemini API key is required");
    }

    try {
      this.ai = new GoogleGenAI({ apiKey: config.apiKey });
      console.log('Gemini provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini provider:', error);
      throw error;
    }
  }

  async chat(messages: ChatMessage[], tools?: Tool[]): Promise<AIResponse> {
    try {
      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Convert tools to Gemini format if provided
      const geminiTools = tools ? this.convertToolsToProviderFormat(tools) : [];
      
      // Create model with tools if available
      const model = this.ai.getGenerativeModel({ 
        model: this.config.model || 'gemini-2.5-pro',
        tools: geminiTools.length > 0 ? [{ functionDeclarations: geminiTools }] : undefined,
        systemInstruction: `You are an autonomous web browsing agent. Your goal is to assist the user by interacting with web pages to accomplish their tasks.

- **PLANNING**: For any multi-step task, you MUST start by using the 'create_plan' tool. This plan will be shown to the user for approval before you begin execution. For very simple, single-step tasks (like a single navigation), you may call the tool directly.
- **EXECUTION**: After the user approves the plan, I will execute it step by step. I will give you the result of each tool call. You must analyze the result and then tell me the next function call to execute from the plan.
- **SEARCH**: Use 'google_search' to find information. After searching, you MUST use 'read_page_content' to analyze the search results.
- **COMPLETION**: Once the entire objective is complete, you MUST call the 'task_completed' function with a final summary.
- **LEARNING**: I will provide you with examples of past successful tasks. Learn from these examples to create better plans for the current objective.`
      });

      // Send message
      const result = await model.generateContent(lastMessage.text);
      const response = await result.response;
      
      // Extract function calls if any
      const functionCalls = response.functionCalls?.map(fc => ({
        name: fc.name,
        args: fc.args,
      }));

      return {
        text: response.text(),
        functionCalls,
        model: this.config.model || 'gemini-2.5-pro',
        finishReason: response.finishReason,
      };
    } catch (error) {
      console.error('Gemini chat error:', error);
      throw error;
    }
  }

  async generateContent(prompt: string, options?: any): Promise<string> {
    try {
      const model = this.ai.getGenerativeModel({ 
        model: options?.model || this.config.model || 'gemini-2.5-pro'
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Gemini generateContent error:', error);
      throw error;
    }
  }

  async *streamResponse(messages: ChatMessage[], tools?: Tool[]): AsyncIterable<AIResponse> {
    try {
      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Convert tools to Gemini format if provided
      const geminiTools = tools ? this.convertToolsToProviderFormat(tools) : [];
      
      // Create model with tools if available
      const model = this.ai.getGenerativeModel({ 
        model: this.config.model || 'gemini-2.5-pro',
        tools: geminiTools.length > 0 ? [{ functionDeclarations: geminiTools }] : undefined,
      });

      // Stream response
      const result = await model.generateContentStream(lastMessage.text);
      
      for await (const chunk of result.stream) {
        const chunkResponse = await chunk.response;
        yield {
          text: chunkResponse.text(),
          model: this.config.model || 'gemini-2.5-pro',
        };
      }
    } catch (error) {
      console.error('Gemini streamResponse error:', error);
      throw error;
    }
  }

  async embeddings(text: string): Promise<number[]> {
    try {
      const model = this.ai.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Gemini embeddings error:', error);
      throw error;
    }
  }

  // Helper methods for Gemini-specific conversions
  protected convertToolsToProviderFormat(tools: Tool[]): any[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }

  protected convertMessagesToProviderFormat(messages: ChatMessage[]): any[] {
    return messages.map(msg => {
      switch (msg.type) {
        case 'user':
          return { role: 'user', parts: [{ text: msg.text }] };
        case 'agent':
          return { role: 'model', parts: [{ text: msg.text }] };
        case 'function_call':
          return { 
            role: 'model', 
            parts: [{ functionCall: msg.functionCall }] 
          };
        case 'tool_result':
          return { 
            role: 'user', 
            parts: [{ text: `Tool result: ${JSON.stringify(msg.toolResult)}` }] 
          };
        default:
          return { role: 'user', parts: [{ text: 'Unknown message type' }] };
      }
    });
  }
}
