# ...existing code...
RUN apt-get update && apt-get install -y --no-install-recommends \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libgtk-3-0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libxkbcommon0 libasound2t64 libatspi2.0-0 \
  libgdk-pixbuf2.0-0 libnss3 ca-certificates xdg-utils \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
# ...existing code.....existing code...