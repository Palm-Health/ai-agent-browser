#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Web scraping MCP server
class WebScrapingServer {
  constructor() {
    this.server = new Server(
      {
        name: 'web-scraping-server',
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
            name: 'scrape_webpage',
            description: 'Scrape content from a webpage',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL to scrape',
                },
                selector: {
                  type: 'string',
                  description: 'CSS selector to extract specific content',
                },
                includeLinks: {
                  type: 'boolean',
                  description: 'Whether to include links in the scraped content',
                  default: false,
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'extract_text',
            description: 'Extract text content from HTML',
            inputSchema: {
              type: 'object',
              properties: {
                html: {
                  type: 'string',
                  description: 'HTML content to extract text from',
                },
                selector: {
                  type: 'string',
                  description: 'CSS selector to limit extraction',
                },
              },
              required: ['html'],
            },
          },
          {
            name: 'find_links',
            description: 'Find all links in HTML content',
            inputSchema: {
              type: 'object',
              properties: {
                html: {
                  type: 'string',
                  description: 'HTML content to find links in',
                },
                filter: {
                  type: 'string',
                  description: 'Filter links by pattern or domain',
                },
              },
              required: ['html'],
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
          case 'scrape_webpage':
            return await this.scrapeWebpage(args.url, args.selector, args.includeLinks);
          
          case 'extract_text':
            return await this.extractText(args.html, args.selector);
          
          case 'find_links':
            return await this.findLinks(args.html, args.filter);
          
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

  async scrapeWebpage(url, selector, includeLinks) {
    console.log(`Scraping webpage: ${url}${selector ? ` with selector: ${selector}` : ''}`);
    
    // Simulate web scraping
    const content = {
      url: url,
      title: 'Sample Webpage Title',
      text: 'This is sample content that would be scraped from the webpage.',
      links: includeLinks ? ['https://example.com/link1', 'https://example.com/link2'] : undefined,
      timestamp: new Date().toISOString(),
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

  async extractText(html, selector) {
    console.log(`Extracting text from HTML${selector ? ` with selector: ${selector}` : ''}`);
    
    // Simulate text extraction
    const extractedText = 'This is the extracted text content from the HTML.';
    
    return {
      content: [
        {
          type: 'text',
          text: extractedText,
        },
      ],
    };
  }

  async findLinks(html, filter) {
    console.log(`Finding links in HTML${filter ? ` with filter: ${filter}` : ''}`);
    
    // Simulate link finding
    const links = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://external.com/link',
    ];
    
    const filteredLinks = filter ? links.filter(link => link.includes(filter)) : links;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(filteredLinks, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Web scraping MCP server running on stdio');
  }
}

// Start the server
const server = new WebScrapingServer();
server.run().catch(console.error);
