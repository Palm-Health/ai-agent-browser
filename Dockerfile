# Use Node.js LTS version as base
FROM node:20-slim

# Install required system dependencies for Electron and Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
  # X11 and graphics libraries
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libgtk-3-0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libxkbcommon0 \
  libasound2t64 \
  libatspi2.0-0 \
  libgdk-pixbuf2.0-0 \
  libnss3 \
  libxss1 \
  libxtst6 \
  # Additional dependencies
  ca-certificates \
  xdg-utils \
  wget \
  gnupg \
  # Clean up to reduce image size
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose Vite dev server port
EXPOSE 5173

# Expose potential alternative ports
EXPOSE 5174 5175 5176 5177

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Create a startup script
RUN echo '#!/bin/bash\n\
echo "🚀 Starting AI Agent Browser..."\n\
echo "📦 Installing dependencies..."\n\
npm install --silent\n\
echo "✅ Dependencies installed"\n\
echo "🔨 Building application..."\n\
npm run build\n\
echo "✅ Build completed"\n\
echo "🌐 Starting development server on port 5173..."\n\
exec npm run dev\n\
' > /app/start.sh && chmod +x /app/start.sh

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173 || exit 1

# Start the application
CMD ["/app/start.sh"]
