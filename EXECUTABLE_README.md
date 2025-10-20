# AI Agent Browser - Executable Version

## Quick Start

You now have several ways to run the AI Agent Browser:

### Option 1: Standalone Executable (Recommended)
- **File**: `ai-agent-browser.exe` (37MB)
- **Requirements**: None (includes Node.js runtime)
- **Usage**: Double-click `ai-agent-browser.exe` or run from command line
- **Features**: 
  - Automatically installs dependencies if needed
  - Builds the application automatically
  - Starts the AI Agent Browser
  - Self-contained (no need to install Node.js separately)

### Option 2: Batch File (Windows)
- **File**: `run-ai-agent-browser.bat`
- **Requirements**: Node.js and npm installed
- **Usage**: Double-click the batch file

### Option 3: PowerShell Script
- **File**: `run-ai-agent-browser.ps1`
- **Requirements**: Node.js and npm installed
- **Usage**: Right-click → "Run with PowerShell"

### Option 4: Manual Command Line
```bash
npm install
npm run build:electron
npm run dev:electron
```

## What the Executable Does

The `ai-agent-browser.exe` file is a standalone launcher that:

1. **Checks Prerequisites**: Verifies Node.js and npm are available
2. **Installs Dependencies**: Runs `npm install` if needed
3. **Builds Application**: Compiles TypeScript and builds Electron app
4. **Starts Application**: Launches the AI Agent Browser

## System Requirements

- **Windows 10/11** (64-bit)
- **No additional software required** (Node.js is bundled in the executable)

## Features

- 🤖 **Model Agnostic**: Support for Gemini, OpenAI, Anthropic, Ollama, DeepSeek
- 🔧 **MCP Integration**: Extensible tool system via Model Context Protocol
- 🌐 **Deep Browser Integration**: Native Electron-based browser engine
- 🧠 **Intelligent Automation**: Plan-based task execution with user approval
- 🔐 **Local AI Mode**: Run models entirely on your machine with Ollama

## Troubleshooting

If the executable doesn't work:

1. **Try the batch file**: `run-ai-agent-browser.bat`
2. **Check Windows Defender**: May block unsigned executables
3. **Run as Administrator**: Right-click → "Run as administrator"
4. **Manual installation**: Use Option 4 above

## File Sizes

- `ai-agent-browser.exe`: ~37MB (standalone executable)
- Project folder: ~50MB (after cleanup)
- Total: ~87MB for complete setup

---

**Created**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Version**: 1.0.0  
**Platform**: Windows x64
