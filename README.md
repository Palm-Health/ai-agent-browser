# AI Agent Browser - Model-Agnostic with MCP Integration

A powerful, model-agnostic AI browser that integrates deeply with the Model Context Protocol (MCP) for extensible automation and tool use.

## Features

### 🤖 Model Agnostic with Intelligent Routing
- Support for multiple AI providers: Gemini, OpenAI, Anthropic, Ollama, DeepSeek
- **NEW: Intelligent routing system** - automatically selects optimal model based on context
- **Smart hybrid approach** - local for simple tasks, API for complex ones
- **Privacy-aware routing** - automatically uses local models for sensitive data
- Intelligent fallback chains for reliability
- Cost-aware model routing with budget management
- Machine learning from user preferences

### 🔧 MCP Integration (Killer Feature)
- Extensible tool system via Model Context Protocol
- Built-in MCP servers for browser automation, web scraping, file operations, and more
- **NEW: Intelligent MCP server routing** - automatically selects best server for each task
- Performance tracking and automatic failover
- Dynamic tool discovery and registration
- Community MCP server support

### 🌐 Deep Browser Integration
- Native Electron-based browser engine
- Direct DOM manipulation and JavaScript execution
- Real-time page analysis and interaction
- Screenshot capture and visual analysis

### 🧠 Intelligent Automation
- Plan-based task execution with user approval
- Context-aware tool recommendations
- Learning from successful workflows
- Parallel tool execution for efficiency

### 🔐 Local AI Mode
- **Run models entirely on your machine with Ollama**
- Privacy-first: No data leaves your computer
- Zero cost: Completely free to use
- Available models: DeepSeek R1, Llama 3.3/3.1, Meditron
- 128K context windows
- Perfect for sensitive/medical/proprietary data
- Works offline, no internet needed

### 🧠 Intelligent Routing System (NEW!)
- **Smart hybrid model selection** - automatically chooses local or API based on task
- **Three privacy modes:**
  - 🔒 Strict: Local only (100% private)
  - ⚖️ Balanced: Smart routing (recommended)
  - ⚡ Performance: Best model regardless of cost
- **Automatic privacy detection** - recognizes sensitive content and uses local models
- **Context-aware decisions** - considers battery, network, system resources
- **Cost management** - tracks spending and switches to local when budget exceeded
- **Machine learning** - learns from your preferences over time
- **Performance monitoring** - real-time dashboard with metrics
- See `INTELLIGENT_ROUTING_GUIDE.md` for full documentation

## Architecture

### Core Components

1. **AI Provider Layer** (`services/providers/`)
   - Universal provider interface
   - Provider-specific adapters (Gemini, OpenAI, Anthropic, Ollama)
   - Automatic model selection and routing

2. **MCP Integration** (`services/mcp/`)
   - MCP Manager for server lifecycle
   - Tool Registry for dynamic tool discovery
   - Resource Manager for data access
   - Prompt Manager for context-aware prompts

3. **Browser Bridge** (`services/aiBridge.ts`)
   - Native browser control via Electron
   - Real-time page state synchronization
   - Tool execution pipeline

4. **Enhanced Tool System** (`services/enhancedToolService.ts`)
   - Native browser tools
   - MCP tool execution
   - Parallel execution support
   - Performance analytics

### MCP Servers

Built-in MCP servers provide specialized capabilities:

1. **Browser Automation Server** (`mcp-servers/browser-automation-server/`)
   - Advanced Puppeteer/Playwright control
   - Element interaction and navigation
   - Screenshot capture

2. **Web Scraping Server** (`mcp-servers/web-scraping-server/`)
   - Intelligent data extraction
   - Anti-bot bypass techniques
   - Structured data parsing

3. **File System Server** (`mcp-servers/file-system-server/`)
   - Local file operations
   - Workspace management
   - Download handling

4. **Vision Server** (`mcp-servers/vision-server/`)
   - Image analysis and OCR
   - Visual element detection
   - Chart/graph data extraction

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- API keys for desired AI providers

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Configuration

The application supports multiple AI providers. Configure them in your environment:

```env
# Required: At least one AI provider
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
OLLAMA_ENDPOINT=http://localhost:11434
```

## Usage

### Basic Usage

1. **Start a conversation**: Type your task in the chat interface
2. **Review the plan**: The AI will create a step-by-step plan for complex tasks
3. **Approve execution**: Review and approve the plan before execution
4. **Monitor progress**: Watch as the AI executes each step with real-time feedback

### Advanced Features

#### Custom MCP Servers

Add your own MCP servers for domain-specific tasks:

```javascript
// Example: Custom API integration server
const customServer = {
  id: 'my-api-server',
  name: 'My API Server',
  type: 'local',
  command: 'node',
  args: ['./my-mcp-server/index.js'],
  autoStart: true,
};
```

#### Tool Permissions

Configure tool permissions for security:

```javascript
const toolPermissions = {
  'execute_javascript': { requiresConfirmation: true },
  'write_file': { requiresConfirmation: true },
  'navigate_to_url': { requiresConfirmation: false },
};
```

## Development

### Project Structure

```
├── electron/                 # Electron main process
├── services/                 # Core services
│   ├── providers/            # AI provider adapters
│   ├── mcp/                  # MCP integration
│   └── *.ts                  # Core services
├── mcp-servers/              # Built-in MCP servers
├── components/               # React components
└── types.ts                  # TypeScript definitions
```

### Adding New AI Providers

1. Create a new provider class extending `BaseAIProvider`
2. Implement required methods: `chat`, `generateContent`, `streamResponse`, `embeddings`
3. Register the provider in `ProviderInitializer`

### Adding New MCP Servers

1. Create a new MCP server following the MCP protocol
2. Implement tools and resources
3. Add server configuration to `configService`

## Quick Reference

### Intelligent Routing
```bash
# Test the routing system
npx tsx test-intelligent-routing.ts

# View routing guide
cat INTELLIGENT_ROUTING_GUIDE.md

# Quick reference
cat QUICK_REFERENCE_ROUTING.md
```

### Privacy Modes
- **Strict** 🔒: Local only, 100% private
- **Balanced** ⚖️: Smart routing (default)
- **Performance** ⚡: Best model, any cost

### Documentation
- `INTELLIGENT_ROUTING_GUIDE.md` - Complete routing guide
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `QUICK_REFERENCE_ROUTING.md` - Quick reference
- `LOCAL_AI_GUIDE.md` - Local AI setup
- `QUICK_START_LOCAL_AI.md` - Local AI quick start

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Roadmap

- [ ] Advanced vision capabilities
- [ ] Workflow recording and replay
- [ ] Community MCP server marketplace
- [ ] Multi-session support
- [ ] Cloud synchronization
- [ ] Enterprise features

## Support

For questions and support:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation wiki