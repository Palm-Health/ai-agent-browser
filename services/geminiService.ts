import { GoogleGenAI, Chat, FunctionCall } from "@google/genai";
import { tools, Memory } from "../types";

class GeminiService {
    private ai: GoogleGenAI;
    public chat: Chat;

    constructor() {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set.");
        }
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        this.chat = this.ai.chats.create({
            model: 'gemini-2.5-pro',
            config: {
                tools: [{ functionDeclarations: tools }],
                systemInstruction: `You are an autonomous web browsing agent. Your goal is to assist the user by interacting with web pages to accomplish their tasks.

- **PLANNING**: For any multi-step task, you MUST start by using the 'create_plan' tool. This plan will be shown to the user for approval before you begin execution. For very simple, single-step tasks (like a single navigation), you may call the tool directly.
- **EXECUTION**: After the user approves the plan, I will execute it step by step. I will give you the result of each tool call. You must analyze the result and then tell me the next function call to execute from the plan.
- **SEARCH**: Use 'google_search' to find information. After searching, you MUST use 'read_page_content' to analyze the search results.
- **COMPLETION**: Once the entire objective is complete, you MUST call the 'task_completed' function with a final summary.
- **LEARNING**: I will provide you with examples of past successful tasks. Learn from these examples to create better plans for the current objective.`
            }
        });
    }

    async sendMessage(message: string, memories: Memory[]): Promise<{ text?: string, functionCalls?: FunctionCall[] }> {
        const history: any[] = []; // Simplified for now
        if (memories.length > 0) {
            const memoryPrompt = `Here are examples of recently completed tasks:\n${memories.map(m => `- Objective: "${m.objective}"\n  Successful Plan: ${JSON.stringify(m.steps)}\n`).join('')}`;
            history.unshift({ role: 'user', parts: [{ text: memoryPrompt }] });
            history.unshift({ role: 'model', parts: [{ text: "Understood. I will use these examples to improve my planning." }] });
        }
        
        const response = await this.chat.sendMessage({ message });
        const functionCalls = response.candidates?.[0]?.content?.parts
            .filter(part => part.functionCall)
            .map(part => part.functionCall);
        
        return { text: response.text, functionCalls };
    }

    async summarizeText(text: string): Promise<string> {
        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please provide a concise summary of the following text:\n\n${text}`,
        });
        return response.text;
    }
}

export const geminiService = new GeminiService();
