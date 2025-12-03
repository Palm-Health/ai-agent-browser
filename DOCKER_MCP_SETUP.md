# Docker MCP Client Setup for Cursor

## Prerequisites

The Docker MCP Toolkit requires **Docker Desktop** to be installed first.

## Installation Steps

### Step 1: Install Docker Desktop

1. **Download Docker Desktop for Windows:**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download the installer for Windows

2. **Install Docker Desktop:**
   - Run the installer
   - Follow the installation wizard
   - Restart your computer if prompted

3. **Verify Installation:**
   ```powershell
   docker --version
   ```

### Step 2: Connect Docker MCP Client to Cursor

Once Docker Desktop is installed and running, execute:

```bash
docker mcp client connect cursor -g
```

Or with the full flag:

```bash
docker mcp client connect cursor --global
```

### Step 3: Verify Connection

Check the connection status:

```bash
docker mcp client list
```

You should see output like:
```
=== System-wide MCP Configurations ===
 ● cursor: connected
    MCP_DOCKER: Docker MCP Catalog (gateway server) (stdio)
```

### Step 4: Restart Cursor

After connecting, restart Cursor for the changes to take effect.

## Troubleshooting

### Docker command not found
- Ensure Docker Desktop is installed and running
- Check that Docker Desktop is in your system PATH
- Restart your terminal after installing Docker Desktop

### Connection fails
- Make sure Docker Desktop is running
- Check Docker Desktop settings > Resources > Enable MCP Toolkit
- Verify Cursor is installed and accessible

### Verify MCP Toolkit is enabled
1. Open Docker Desktop
2. Go to Settings (gear icon)
3. Navigate to Resources or Extensions
4. Ensure "MCP Toolkit" is enabled

## Alternative: Manual Configuration

If the CLI command doesn't work, you can manually configure Cursor's MCP settings:

1. Open Cursor settings
2. Navigate to MCP / Extensions settings
3. Add Docker MCP server configuration:
   ```json
   {
     "mcpServers": {
       "docker": {
         "command": "docker",
         "args": ["mcp", "server"]
       }
     }
   }
   ```

## References

- Docker MCP Documentation: https://docs.docker.com/reference/cli/docker/mcp/
- Cursor MCP Integration: Check Cursor's documentation for MCP server configuration

