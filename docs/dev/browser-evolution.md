# Browser Agent Evolution Guide

This guide outlines the self-optimizing browser agent pieces added on top of the base Chromium automation layer. Everything here is designed to run on Windows 11 as well as macOS/Linux (paths are `path.join` based and scripts rely on `tsx`).

## Modules

- `services/agent/browser/pageUnderstanding.ts` — Builds a `PageStructure` with clickable and input selectors, table snapshots, and a semantic summary.
- `services/agent/browser/actionPlanner.ts` — Produces a `BrowserTaskPlan` from a goal and page structure with explicit click/type actions.
- `services/agent/browser/executePlan.ts` — Runs plans step-by-step with before/after screenshots saved to the OS temp folder.
- `services/agent/browser/flows.ts` — Saves and loads reusable flows to `data/flows.json`, and can replay them in a session.

## MCP tools

The MCP server now exposes:

- `browser.plan` — Input: `{ goal, url? }` → returns a planned set of browser steps.
- `browser.run` — Input: `{ url, goal }` → analyzes the page, plans, and executes steps with logs.
- `browser.learn_flow` — Input: `{ name, url, goal }` → runs the plan and stores the flow for reuse.

Existing marketing tools remain available for quick landing-page/video analysis.

## CLI / Dev scripts

Run with pnpm (uses `tsx`):

- `pnpm browser:analyze https://example.com` — emits the `PageStructure` JSON for the URL.
- `pnpm browser:plan "Upload a new video" --url https://example.com` — prints a planned set of steps.
- `pnpm browser:run --goal "Capture analytics" https://example.com` — analyzes, plans, executes, and returns execution logs.

## Windows readiness

- Playwright/Puppeteer paths are configured via `BROWSER_EXECUTABLE_PATH`; no POSIX-only paths are used.
- Flows and screenshots write to `data/` and the OS temp directory so `C:\Users\\<you>\\` paths work without changes.
- If you need Chromium binaries installed locally, run `pnpm playwright:install` once after cloning.

## Example workflow

1. `pnpm browser:analyze https://studio.youtube.com` to get a UI map.
2. `pnpm browser:plan "Open analytics for Shorts" --url https://studio.youtube.com` to draft steps.
3. `pnpm browser:run --goal "Open analytics" https://studio.youtube.com` to execute the plan and log screenshots.
4. `pnpm browser:run --goal "Navigate to Creator Dashboard and screenshot analytics" https://www.tiktok.com/creator` to capture another flow.
5. Save a curated flow for reuse: `browser.learn_flow` via MCP with `{ name: "yt-analytics", goal: "Open analytics", url: "https://studio.youtube.com" }`.
