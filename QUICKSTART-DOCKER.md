# Docker Quick Start - AI Agent Browser

**Get up and running in 3 minutes! 🚀**

## Prerequisites
- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Your AI provider API keys

## Setup Steps

### 1. Clone & Configure (1 minute)
```bash
# Clone the repository
git clone https://github.com/Palm-Health/ai-agent-browser.git
cd ai-agent-browser

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your favorite editor and add your API keys
```

### 2. Start with Docker (2 minutes)
```bash
# Build and start (first time takes ~2 minutes)
docker compose up --build

# Or run in background
docker compose up -d --build
```

### 3. Access the App
Open your browser to: **http://localhost:5173**

That's it! 🎉

## Common Commands

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Restart
docker compose restart

# Rebuild
docker compose up --build
```

## What Happens Automatically?

When you run `docker compose up`:

1. ✅ **Builds Docker image** with all dependencies
2. ✅ **Runs `npm install`** automatically
3. ✅ **Builds the project** with `npm run build`
4. ✅ **Starts Vite dev server** on port 5173
5. ✅ **Configures internet access** for AI API calls
6. ✅ **Enables hot reload** for development

## Troubleshooting

**Port 5173 already in use?**
```bash
# Option 1: Stop other services on that port
# Option 2: Change port in docker-compose.yml to "8080:5173"
```

**Can't connect to AI services?**
```bash
# Test internet connectivity
docker exec ai-agent-browser curl -I https://api.openai.com
```

**Need to see what's happening?**
```bash
# Get a shell inside the container
docker exec -it ai-agent-browser /bin/bash
```

## Need More Help?

- 📖 Full docs: [DOCKER.md](./DOCKER.md)
- 🏠 Main guide: [README.md](./README.md)
- 🐛 Issues: [GitHub Issues](https://github.com/Palm-Health/ai-agent-browser/issues)

---

**Pro Tip**: The container automatically runs `npm install` on every start, so you don't need to manually install dependencies! 🎯
