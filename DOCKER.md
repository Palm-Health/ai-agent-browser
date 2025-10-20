# Docker Setup for AI Agent Browser

This guide explains how to run the AI Agent Browser using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (included with Docker Desktop)
- API keys for your preferred AI providers

## Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and add your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
```bash
GEMINI_API_KEY=your_actual_gemini_key
OPENAI_API_KEY=your_actual_openai_key
ANTHROPIC_API_KEY=your_actual_anthropic_key
DEEPSEEK_API_KEY=your_actual_deepseek_key
```

### 2. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 3. Access the Application

Once running, access the application at:
- **Main Interface**: http://localhost:5173

The application will automatically:
- Install all npm dependencies
- Build the project
- Start the Vite development server
- Connect to the internet for AI API calls

## Alternative: Using Docker Directly

If you prefer not to use Docker Compose:

```bash
# Build the image
docker build -t ai-agent-browser .

# Run the container
docker run -p 5173:5173 \
  -e GEMINI_API_KEY=your_key \
  -e OPENAI_API_KEY=your_key \
  -e ANTHROPIC_API_KEY=your_key \
  --name ai-browser \
  ai-agent-browser

# Stop the container
docker stop ai-browser

# Remove the container
docker rm ai-browser
```

## Port Configuration

The application uses the following ports:

- **5173**: Primary Vite dev server port (default)
- **5174-5177**: Alternative ports (if 5173 is busy)

The Electron main process will automatically try these ports in sequence.

## Internet Connectivity

The Docker container is configured with:
- Bridge network driver for external connectivity
- Google DNS servers (8.8.8.8, 8.8.4.4) for reliable resolution
- Full internet access for AI API calls

All major AI providers (OpenAI, Anthropic, Google, DeepSeek) should be accessible.

## Development with Hot Reload

The docker-compose.yml mounts your source code as a volume, enabling hot reload:

1. Make changes to your code locally
2. Vite will automatically detect changes and rebuild
3. Refresh your browser to see updates

## Troubleshooting

### Container Won't Start

Check logs for errors:
```bash
docker-compose logs ai-agent-browser
```

### Port Already in Use

If port 5173 is busy, either:
1. Stop the process using that port
2. Change the port mapping in docker-compose.yml:
   ```yaml
   ports:
     - "8080:5173"  # Use 8080 locally instead
   ```

### Internet Connection Issues

Verify the container can reach the internet:
```bash
# Test basic connectivity
docker exec ai-agent-browser ping -c 4 google.com

# Test DNS resolution
docker exec ai-agent-browser nslookup google.com

# Test HTTPS connectivity to AI providers
docker exec ai-agent-browser curl -I https://api.openai.com
docker exec ai-agent-browser curl -I https://api.anthropic.com
```

If connectivity fails:
1. Check your host machine's internet connection
2. Verify Docker's network settings
3. Check firewall rules that might block container traffic
4. Try using a different DNS server in docker-compose.yml

### NPM Install Fails

If dependencies fail to install:
1. Clear node_modules: `rm -rf node_modules`
2. Rebuild the image: `docker-compose build --no-cache`
3. Start again: `docker-compose up`

### API Keys Not Working

Ensure your .env.local file is in the same directory as docker-compose.yml and contains valid keys.

## Resource Usage

Default resource limits in docker-compose.yml:
- **Memory**: 2-4 GB
- **CPUs**: 1-2 cores

Adjust these in docker-compose.yml if needed:
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
```

## Production Deployment

For production:

1. Use environment variables or secrets management instead of .env files
2. Set `NODE_ENV=production`
3. Consider using a reverse proxy (nginx) for HTTPS
4. Implement proper logging and monitoring
5. Use Docker Swarm or Kubernetes for orchestration

## Security Notes

⚠️ **Important Security Considerations:**

- Never commit .env or .env.local files with real API keys
- The .dockerignore file prevents sensitive files from being included in images
- In production, use Docker secrets or external secret management
- Regularly update base images for security patches

## Useful Commands

### Viewing Logs
```bash
# Follow logs in real-time
docker compose logs -f

# View logs from a specific time
docker compose logs --since 5m

# View last 100 lines
docker compose logs --tail 100
```

### Inspecting the Container
```bash
# Get a shell inside the container
docker exec -it ai-agent-browser /bin/bash

# Check running processes
docker exec ai-agent-browser ps aux

# Check network connectivity
docker exec ai-agent-browser ip addr
docker exec ai-agent-browser netstat -tlnp
```

### Managing the Container
```bash
# Restart the container
docker compose restart

# Rebuild without cache
docker compose build --no-cache

# Remove and recreate
docker compose down
docker compose up --build
```

### Cleaning Up
```bash
# Remove stopped containers
docker compose down

# Remove containers and volumes
docker compose down -v

# Remove all images
docker compose down --rmi all
```

## Support

For issues or questions:
- Check the main README.md
- Review Docker logs with `docker compose logs`
- Run the test script: `./test-docker-setup.sh`
- Check DOCKER.md troubleshooting section
- Open an issue on GitHub
