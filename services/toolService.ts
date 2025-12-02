import type { FunctionCall } from "@google/genai";
// Fix: Using relative path to import types.
import { ExecutionContext, ToolResult } from "../types";
// Fix: Using relative path to import geminiService.
import { geminiService } from "./geminiService";

export class ToolService {
    async executeTool(functionCall: FunctionCall, context: ExecutionContext): Promise<ToolResult> {
        const { name, args } = functionCall;

        console.log(`Executing tool: ${name}`, args);

        switch (name) {
            case 'navigate_to_url':
                const url = args['url'] as string;
                context.navigate(url);
                return { success: true, message: `Navigating to ${url}. I will read the content next.` };
            
            case 'google_search':
                const query = args['query'] as string;
                if (!query) {
                    return { success: false, message: "Search failed: The 'query' parameter is required." };
                }
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                context.navigate(searchUrl);
                return { success: true, message: `Searching Google for '${query}'. I will now read the page content to analyze the results.` };
            
            case 'read_page_content':
                const pageContent = await context.getPageContent();
                if (!pageContent || pageContent.elements?.length === 0) {
                    return { success: false, message: 'No interactive content found on the page.' };
                }
                return { success: true, content: pageContent };

            case 'click_element':
                const clickElementId = args['elementId'] as string;
                context.clickElement(clickElementId);
                return { success: true, message: `Clicked element with ID '${clickElementId}'. I will read the page again to see the result.` };

            case 'fill_form_element':
                const fillElementId = args['elementId'] as string;
                const value = args['value'] as string;
                context.fillFormElement(fillElementId, value);
                return { success: true, message: `Filled element '${fillElementId}' with value '${value}'.` };

            case 'summarize_current_page':
                try {
                    // Using a CORS proxy to fetch page content from the frontend.
                    const response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${context.browserContext.url}`);
                    if (!response.ok) {
                        return { success: false, message: `Failed to fetch page content. The server responded with status: ${response.status} ${response.statusText}` };
                    }
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Simple text extraction - could be improved with more sophisticated libraries
                    const textContent = doc.body.textContent || "";
                    const cleanText = textContent.replace(/\s+/g, ' ').trim();

                    if (cleanText.length < 100) {
                         return { success: false, message: 'The page content is too short to provide a meaningful summary.' };
                    }

                    // Limit content size to avoid overly large API requests
                    const truncatedText = cleanText.substring(0, 15000);

                    const summary = await geminiService.summarizeText(truncatedText);
                    
                    return { success: true, summary: summary };

                } catch (error) {
                    console.error("Summarization error:", error);
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    const errorMessage = `An error occurred while trying to summarize the page. This could be due to a network issue or a problem with the CORS proxy. Error: ${errorMsg}`;
                    return { success: false, message: errorMessage };
                }
            
            case 'task_completed':
                const summary = args['summary'] as string;
                return { success: true, message: `Task Completed: ${summary}` };

            default:
                return { success: false, message: `Tool '${name}' not found.` };
        }
    }
}

export const toolService = new ToolService();