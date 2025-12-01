# Browser Agent Upgrade Notes

## Discovery Summary
- A stubbed browser automation MCP server exists at `mcp-servers/browser-automation-server/index.js` with basic tool definitions but no real browser control. It currently runs under Node with the `@modelcontextprotocol/sdk` server helper.
- MCP wiring is handled through `services/mcp` (see `mcpManager.ts` and `toolRegistry.ts`) which discovers tools from locally running servers.
- No dedicated marketing or media server modules were present; new marketing analysis and media helpers live under `services/marketing` and `services/media` in this update.
- Browser configuration values and MCP server definitions are centralized in `services/config.ts`.

## Chromium Wrapper
- `services/browser/chromiumClient.ts` wraps `puppeteer-core` with helpers for lifecycle, navigation, DOM interaction, scrolling, screenshots, and network capture.
- The wrapper now enforces a valid Chromium/Chrome executable and uses hardened launch args (`--no-sandbox`, `--disable-setuid-sandbox`) for safer automation.
- Key helpers: `launchBrowser`, `withPage`, `gotoUrl`, `clickSelector`, `typeInto`, `autoScroll`, `capturePageScreenshot`, `captureElementScreenshot`, and `recordNetworkTraffic`.
- Env/config options: `BROWSER_HEADLESS`, `BROWSER_EXECUTABLE_PATH`/`CHROMIUM_EXECUTABLE`/`CHROME_PATH`, `BROWSER_PROFILE_DIR`/`PUPPETEER_USER_DATA_DIR`, and `BROWSER_DEFAULT_TIMEOUT_MS`.

## Local Media + Metadata
- `services/media/mediaFs.ts` exposes `resolveMediaPath`, `listMediaFiles`, `readFileBuffer`, and `getVideoMetadata` (ffprobe-based) with orientation inference. Configure base directory with `MEDIA_ROOT_PATH` (defaults to `<repo>/media`).
- Media paths are now normalized, created on demand, and validated to stay inside `MEDIA_ROOT_PATH` to avoid accidental path traversal.

## Google Drive Hooks
- `services/integrations/googleDriveClient.ts` contains `listDriveMediaFiles(folderId)` and `buildDriveWebLink(fileId)` using the Drive REST API. Requires `GOOGLE_DRIVE_ACCESS_TOKEN`.

## Marketing Intelligence
- `services/marketing/browserPageIntel.ts` provides `analyzeMarketingPage` and `analyzeVideoPage`, using the Chromium wrapper to scroll, extract headings, and synthesize lightweight summaries, hooks, and keywords. Video extraction now pulls from multiple metadata selectors for better coverage.
- `services/marketing/mediaClassifier.ts` classifies local clips as hook/b-roll/talking-head using metadata heuristics and filename cues via `classifyLocalClip`.

## MCP Tooling Hooks
- The browser MCP server remains at `mcp-servers/browser-automation-server`. Additions here should register MCP tools such as `marketing.browser_visit`, `marketing.browser_capture_screenshots`, and `marketing.classify_local_clip` that call into the helpers above.

## Usage Examples
- Analyze a landing page: `analyzeMarketingPage('https://example.com')`.
- Analyze a video page: `analyzeVideoPage('https://youtube.com/watch?v=...')`.
- Classify a local clip: `classifyLocalClip('hooks/my_clip.mp4')`.
- List Drive media: `listDriveMediaFiles('<folderId>')`.
- Validate the browser agent locally: `npm run agent:check` (honors `AGENT_CHECK_URL` if set).

## Windows quick start
- Install Node.js 20+ (nvm-windows recommended) and pnpm (`npm i -g pnpm`).
- Install Chrome/Chromium and set `BROWSER_EXECUTABLE_PATH` in `.env.local` (copy from `.env.example`). If you prefer auto-installa
tion, leave it unset and keep `AUTO_INSTALL_PLAYWRIGHT=true` to pull the Playwright Chromium build on demand.
- Set `MEDIA_ROOT_PATH` to a Windows path (e.g., `C:\Users\<you>\Videos\MarketingMedia`) and create the folder.
- Install dependencies: `pnpm install` (or `npm install`).
- (Optional) download Playwright Chromium: `pnpm playwright:install`.
- Validate media tooling: `pnpm ffmpeg:check` (requires ffmpeg on PATH).
- Run a smoke test: `pnpm agent:check` to launch Chromium and capture a screenshot.
- Start development: `pnpm dev` to launch Vite + Electron.

## Caveats
- `puppeteer-core` requires a Chromium/Chrome executable path via env vars.
- `ffprobe` must be available on PATH for video metadata extraction.
- Google Drive access requires a valid OAuth access token via `GOOGLE_DRIVE_ACCESS_TOKEN`.
