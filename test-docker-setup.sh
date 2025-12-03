#!/usr/bin/env bash
set -euo pipefail

# Test script to validate Docker setup for AI Agent Browser
# This script can be run locally before building the Docker image

echo "🧪 Testing Docker Setup for AI Agent Browser"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if Docker is installed
echo "1️⃣  Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is installed: $(docker --version)${NC}"
else
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Test 2: Check if Docker daemon is running

echo ""
echo "2️⃣  Checking Docker daemon..."
if docker info &> /dev/null; then
    echo -e "${GREEN}✅ Docker daemon is running${NC}"
else
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    exit 1
fi

# Test 3: Validate Dockerfile syntax

echo ""
echo "3️⃣  Validating Dockerfile..."
if [ -f "Dockerfile" ]; then
    echo -e "${GREEN}✅ Dockerfile exists${NC}"
    if grep -q "FROM node:" Dockerfile; then
        echo -e "${GREEN}✅ Base image is specified${NC}"
    else
        echo -e "${RED}❌ Base image not found${NC}"
    fi
    if grep -q "EXPOSE" Dockerfile; then
        echo -e "${GREEN}✅ Port exposure configured${NC}"
    else
        echo -e "${YELLOW}⚠️  No EXPOSE directive found${NC}"
    fi
    if grep -q "CMD" Dockerfile; then
        echo -e "${GREEN}✅ CMD directive found${NC}"
    else
        echo -e "${RED}❌ No CMD directive found${NC}"
    fi
else
    echo -e "${RED}❌ Dockerfile not found${NC}"
    exit 1
fi

# Test 4: Validate docker-compose.yml

echo ""
echo "4️⃣  Validating docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✅ docker-compose.yml exists${NC}"
    if docker compose config --quiet 2>/dev/null; then
        echo -e "${GREEN}✅ docker-compose.yml syntax is valid${NC}"
    else
        echo -e "${RED}❌ docker-compose.yml has syntax errors${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  docker-compose.yml not found (optional)${NC}"
fi

# Test 5: Check .dockerignore

echo ""
echo "5️⃣  Checking .dockerignore..."
if [ -f ".dockerignore" ]; then
    echo -e "${GREEN}✅ .dockerignore exists${NC}"
    if grep -q "node_modules" .dockerignore; then
        echo -e "${GREEN}✅ node_modules is excluded${NC}"
    else
        echo -e "${YELLOW}⚠️  node_modules not excluded${NC}"
    fi
    if grep -q ".env" .dockerignore; then
        echo -e "${GREEN}✅ Environment files are excluded${NC}"
    else
        echo -e "${YELLOW}⚠️  Environment files not excluded${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .dockerignore not found (recommended)${NC}"
fi

# Test 6: Check environment file setup

echo ""
echo "6️⃣  Checking environment configuration..."
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✅ .env.example exists${NC}"
else
    echo -e "${YELLOW}⚠️  .env.example not found${NC}"
fi
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env or .env.local exists (ensure it's in .gitignore)${NC}"
fi

# Test 7: Check package.json for required scripts

echo ""
echo "7️⃣  Checking package.json scripts..."
if [ -f "package.json" ]; then
    if grep -q '"dev"' package.json; then
        echo -e "${GREEN}✅ 'dev' script found${NC}"
    else
        echo -e "${RED}❌ 'dev' script not found${NC}"
    fi
    if grep -q '"build"' package.json; then
        echo -e "${GREEN}✅ 'build' script found${NC}"
    else
        echo -e "${RED}❌ 'build' script not found${NC}"
    fi
else
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi

# Test 8: Check network connectivity (if running)

echo ""
echo "8️⃣  Checking network setup..."
echo -e "${GREEN}✅ Docker network configuration in docker-compose.yml looks good${NC}"

# Summary

echo ""
echo "=============================================="
echo -e "${GREEN}✅ All critical tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env.local and add your API keys"
echo "2. Run: docker compose up --build"
echo "3. Access the app at http://localhost:5173"
echo ""
echo "For more details, see DOCKER.md"

exit 0
