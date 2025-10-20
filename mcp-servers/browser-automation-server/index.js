#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Browser automation MCP server
class BrowserAutomationServer {
  constructor() {
    this.server = new Server(
      {
        name: 'browser-automation-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'navigate_to_url',
            description: 'Navigate the browser to a specific URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL to navigate to',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'click_element',
            description: 'Click on an element in the current page',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for the element to click',
                },
                elementId: {
                  type: 'string',
                  description: 'ID of the element to click (alternative to selector)',
                },
              },
            },
          },
          {
            name: 'fill_form_field',
            description: 'Fill a form field with text',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for the form field',
                },
                elementId: {
                  type: 'string',
                  description: 'ID of the form field (alternative to selector)',
                },
                value: {
                  type: 'string',
                  description: 'Text to fill in the field',
                },
              },
              required: ['value'],
            },
          },
          {
            name: 'extract_page_content',
            description: 'Extract text content from the current page',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector to limit extraction to specific elements',
                },
                includeLinks: {
                  type: 'boolean',
                  description: 'Whether to include link URLs in the extraction',
                  default: false,
                },
              },
            },
          },
          {
            name: 'take_screenshot',
            description: 'Take a screenshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {
                fullPage: {
                  type: 'boolean',
                  description: 'Whether to capture the full page or just the viewport',
                  default: false,
                },
                format: {
                  type: 'string',
                  enum: ['png', 'jpeg'],
                  description: 'Image format for the screenshot',
                  default: 'png',
                },
              },
            },
          },
          {
            name: 'wait_for_element',
            description: 'Wait for an element to appear on the page',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for the element to wait for',
                },
                timeout: {
                  type: 'number',
                  description: 'Maximum time to wait in milliseconds',
                  default: 10000,
                },
              },
              required: ['selector'],
            },
          },
          {
            name: 'execute_javascript',
            description: 'Execute JavaScript code in the page context',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'JavaScript code to execute',
                },
                returnResult: {
                  type: 'boolean',
                  description: 'Whether to return the result of the execution',
                  default: true,
                },
              },
              required: ['code'],
            },
          },
          {
            name: 'scroll_page',
            description: 'Scroll the page in a specific direction',
            inputSchema: {
              type: 'object',
              properties: {
                direction: {
                  type: 'string',
                  enum: ['up', 'down', 'left', 'right'],
                  description: 'Direction to scroll',
                },
                amount: {
                  type: 'number',
                  description: 'Number of pixels to scroll',
                  default: 500,
                },
              },
              required: ['direction'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'navigate_to_url':
            return await this.navigateToUrl(args.url);
          
          case 'click_element':
            return await this.clickElement(args.selector || args.elementId);
          
          case 'fill_form_field':
            return await this.fillFormField(args.selector || args.elementId, args.value);
          
          case 'extract_page_content':
            return await this.extractPageContent(args.selector, args.includeLinks);
          
          case 'take_screenshot':
            return await this.takeScreenshot(args.fullPage, args.format);
          
          case 'wait_for_element':
            return await this.waitForElement(args.selector, args.timeout);
          
          case 'execute_javascript':
            return await this.executeJavaScript(args.code, args.returnResult);
          
          case 'scroll_page':
            return await this.scrollPage(args.direction, args.amount);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async navigateToUrl(url) {
    // This would integrate with the actual browser automation
    // For now, we'll simulate the operation
    console.log(`Navigating to: ${url}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully navigated to ${url}`,
        },
      ],
    };
  }

  async clickElement(selector) {
    console.log(`Clicking element: ${selector}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully clicked element: ${selector}`,
        },
      ],
    };
  }

  async fillFormField(selector, value) {
    console.log(`Filling field ${selector} with: ${value}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully filled field ${selector} with: ${value}`,
        },
      ],
    };
  }

  async extractPageContent(selector, includeLinks) {
    console.log(`Extracting page content${selector ? ` with selector: ${selector}` : ''}`);
    
    // Simulate content extraction
    const content = {
      title: 'Sample Page Title',
      url: 'https://example.com',
      text: 'This is sample page content that would be extracted.',
      links: includeLinks ? ['https://example.com/link1', 'https://example.com/link2'] : undefined,
    };
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  }

  async takeScreenshot(fullPage, format) {
    console.log(`Taking screenshot (fullPage: ${fullPage}, format: ${format})`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Screenshot taken successfully (${format || 'png'}, ${fullPage ? 'full page' : 'viewport'})`,
        },
      ],
    };
  }

  async waitForElement(selector, timeout) {
    console.log(`Waiting for element: ${selector} (timeout: ${timeout || 10000}ms)`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Element ${selector} found after waiting`,
        },
      ],
    };
  }

  async executeJavaScript(code, returnResult) {
    console.log(`Executing JavaScript: ${code.substring(0, 100)}...`);
    
    return {
      content: [
        {
          type: 'text',
          text: returnResult ? `JavaScript executed successfully. Result: ${JSON.stringify({ success: true })}` : 'JavaScript executed successfully',
        },
      ],
    };
  }

  async scrollPage(direction, amount) {
    console.log(`Scrolling ${direction} by ${amount || 500} pixels`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully scrolled ${direction} by ${amount || 500} pixels`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Browser automation MCP server running on stdio');
  }
}

// Start the server
const server = new BrowserAutomationServer();
server.run().catch(console.error);
