# Windows 11 Setup Guide (AI Agent Browser)

Follow these steps on a fresh Windows 11 machine (tested with RTX 4080 workstation) to get the browser agent and media tooling running.

## 1) Install prerequisites
- **Git**: https://git-scm.com/downloads
- **Node.js 20+**: install via [nvm-windows](https://github.com/coreybutler/nvm-windows) or the official installer.
- **pnpm**: `npm install -g pnpm` (npm works too if you prefer).
- **ffmpeg/ffprobe**: install from https://www.gyan.dev/ffmpeg/builds/ and add the `bin` folder to your PATH.
- **Chrome/Chromium**: install Chrome or use a local Chromium build; note the executable path.

## 2) Clone and configure the project
```powershell
# Clone
git clone <repo-url>
cd ai-agent-browser

# Copy env template
Copy-Item .env.example .env.local
```

Edit `.env.local` and set:
- `BROWSER_EXECUTABLE_PATH` to your Chrome path (e.g., `C:\Program Files\Google\Chrome\Application\chrome.exe`).
- `MEDIA_ROOT_PATH` to a writable folder (e.g., `C:\Users\<you>\Videos\MarketingMedia`). Create the folder if it does not exist.
- Optional: `GOOGLE_DRIVE_ACCESS_TOKEN`, API keys, and other entries as needed.

## 3) Install dependencies and browser binaries
```powershell
pnpm install
pnpm playwright:install   # downloads Playwright Chromium for tooling that expects it
```

If you prefer npm, the same commands work with `npm` replacing `pnpm`.

## 4) Validate local tools
```powershell
pnpm ffmpeg:check   # confirms ffmpeg/ffprobe are on PATH
pnpm agent:check    # launches Chromium, visits https://example.com, and exits
```

If `agent:check` fails, verify the Chrome path and headless mode (`BROWSER_HEADLESS` in `.env.local`).

## 5) Run the app
```powershell
pnpm dev   # starts Vite + Electron concurrently
```

You can also build Windows artifacts when ready:
```powershell
pnpm build:exe       # electron-builder Windows executable
pnpm build:portable  # portable build
```

## 6) Troubleshooting tips
- Use Windows-style absolute paths in env vars (escape backslashes if editing in a POSIX shell).
- If scripts complain about permissions, run PowerShell as Administrator or adjust Execution Policy for local scripts.
- For GPU acceleration toggles, the Electron dev script already disables GPU flags by default; remove them if you want to test RTX acceleration.
- If Playwright is unused, you can skip `playwright:install`—the Puppeteer-based Chromium client only needs a valid `BROWSER_EXECUTABLE_PATH`.
