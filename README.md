# AI Agent Browser - Model-Agnostic with MCP Integration

A powerful, model-agnostic AI browser that integrates deeply with the Model Context Protocol (MCP) for extensible automation and tool use.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- API keys for desired AI providers
- (Optional) Docker and Docker Compose for containerized deployment

### Installation & Setup

#### Option 1: Local Installation (Recommended for Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-agent-browser.git
   cd ai-agent-browser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file with your API keys
   GEMINI_API_KEY=your_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   OLLAMA_ENDPOINT=http://localhost:11434
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

#### Option 2: Docker Installation (Recommended for Production)

For a containerized environment with all dependencies pre-configured:

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-agent-browser.git
   cd ai-agent-browser
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your API keys
   ```

3. **Start with Docker Compose**
   ```bash
   docker compose up --build
   ```

4. **Access the application**
   - Open http://localhost:5173 in your browser

For detailed Docker instructions, see [DOCKER.md](./DOCKER.md)

## 📦 Building Executables

### Windows Executable
```bash
# Build installer (.exe)
npm run build:exe

# Build portable executable
npm run build:portable
```

### Other Platforms
```bash
# macOS
npx electron-builder --mac

# Linux
npx electron-builder --linux
```

## 🎯 Features

### 🤖 Model Agnostic with Intelligent Routing
- Support for multiple AI providers: Gemini, OpenAI, Anthropic, Ollama, DeepSeek
- **Intelligent routing system** - automatically selects optimal model based on context
- **Smart hybrid approach** - local for simple tasks, API for complex ones
- **Privacy-aware routing** - automatically uses local models for sensitive data

### 🔧 MCP Integration (Killer Feature)
- Extensible tool system via Model Context Protocol
- Built-in MCP servers for browser automation, web scraping, file operations, and more
- **Intelligent MCP server routing** - automatically selects best server for each task
- Performance tracking and automatic failover

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

## 📁 Project Structure

```
├── components/          # React components
├── electron/            # Electron main process
├── mcp-servers/         # MCP server configurations
├── services/            # Core services
│   ├── providers/       # AI provider adapters
│   ├── mcp/            # MCP integration
│   └── *.ts            # Core services
├── App.tsx             # Main application
├── types.ts            # TypeScript definitions
└── package.json        # Dependencies and scripts
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:exe` - Build Windows executable
- `npm run build:portable` - Build portable executable
- `npm run preview` - Preview production build

### Adding New AI Providers

1. Create a new provider class extending `BaseAIProvider`
2. Implement required methods: `chat`, `generateContent`, `streamResponse`, `embeddings`
3. Register the provider in `ProviderInitializer`

### Adding New MCP Servers

1. Create a new MCP server following the MCP protocol
2. Implement tools and resources
3. Add server configuration to `configService`

## 📊 Repository Size Optimization

This repository is optimized for GitHub with:
- **No node_modules** (installed via `npm install`)
- **No build artifacts** (generated via `npm run build`)
- **No executables** (built via `npm run build:exe`)
- **Clean structure** (~50MB total)

## 🚀 Deployment

### GitHub Actions (Coming Soon)
```yaml
# .github/workflows/build.yml
name: Build Executables
on: [push, release]
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build:exe
      - uses: actions/upload-artifact@v3
```

## 📖 Documentation

- `README.md` - This file
- `INTELLIGENT_ROUTING_GUIDE.md` - Complete routing system guide
- `MCP_INTEGRATION_COMPLETE.md` - MCP setup and configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Create an issue on GitHub
- Check the documentation wiki
- Review troubleshooting guides

---

**Repository Size**: ~50MB (optimized for GitHub)  
**Build Size**: ~1GB (includes all dependencies)  
**Executable Size**: ~37MB (standalone)