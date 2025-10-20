#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';

// File system MCP server
class FileSystemServer {
  constructor() {
    this.server = new Server(
      {
        name: 'file-system-server',
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
            name: 'read_file',
            description: 'Read contents of a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to read',
                },
                encoding: {
                  type: 'string',
                  description: 'File encoding (default: utf8)',
                  default: 'utf8',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'write_file',
            description: 'Write content to a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to write',
                },
                content: {
                  type: 'string',
                  description: 'Content to write to the file',
                },
                encoding: {
                  type: 'string',
                  description: 'File encoding (default: utf8)',
                  default: 'utf8',
                },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'list_directory',
            description: 'List contents of a directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the directory to list',
                },
                recursive: {
                  type: 'boolean',
                  description: 'Whether to list recursively',
                  default: false,
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'create_directory',
            description: 'Create a new directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path for the new directory',
                },
                recursive: {
                  type: 'boolean',
                  description: 'Whether to create parent directories',
                  default: false,
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'delete_file',
            description: 'Delete a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to delete',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'file_exists',
            description: 'Check if a file or directory exists',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to check',
                },
              },
              required: ['path'],
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
          case 'read_file':
            return await this.readFile(args.path, args.encoding);
          
          case 'write_file':
            return await this.writeFile(args.path, args.content, args.encoding);
          
          case 'list_directory':
            return await this.listDirectory(args.path, args.recursive);
          
          case 'create_directory':
            return await this.createDirectory(args.path, args.recursive);
          
          case 'delete_file':
            return await this.deleteFile(args.path);
          
          case 'file_exists':
            return await this.fileExists(args.path);
          
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

  async readFile(path, encoding) {
    console.log(`Reading file: ${path} (encoding: ${encoding || 'utf8'})`);
    
    // Simulate file reading
    const content = `Sample file content for ${path}`;
    
    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  }

  async writeFile(path, content, encoding) {
    console.log(`Writing file: ${path} (encoding: ${encoding || 'utf8'})`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully wrote ${content.length} characters to ${path}`,
        },
      ],
    };
  }

  async listDirectory(path, recursive) {
    console.log(`Listing directory: ${path} (recursive: ${recursive || false})`);
    
    // Simulate directory listing
    const items = [
      { name: 'file1.txt', type: 'file', size: 1024 },
      { name: 'file2.js', type: 'file', size: 2048 },
      { name: 'subdirectory', type: 'directory' },
    ];
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(items, null, 2),
        },
      ],
    };
  }

  async createDirectory(path, recursive) {
    console.log(`Creating directory: ${path} (recursive: ${recursive || false})`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully created directory: ${path}`,
        },
      ],
    };
  }

  async deleteFile(path) {
    console.log(`Deleting file: ${path}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted file: ${path}`,
        },
      ],
    };
  }

  async fileExists(path) {
    console.log(`Checking if file exists: ${path}`);
    
    // Simulate file existence check
    const exists = Math.random() > 0.5; // Random for demo
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ path, exists }),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('File system MCP server running on stdio');
  }
}

// Start the server
const server = new FileSystemServer();
server.run().catch(console.error);
