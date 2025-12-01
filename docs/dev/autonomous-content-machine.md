# Autonomous Content Machine

This guide explains how the content pipeline plans campaigns, matches media, scripts episodes, and stages render jobs using the marketing automation modules and MCP tools.

## Modules
- `services/marketing/automation/contentBlueprint.ts` – campaign/episode modeling and generator.
- `services/marketing/automation/mediaMatcher.ts` – hook & b-roll matching from the local media library.
- `services/marketing/automation/scriptGenerator.ts` – short-form scripts, captions, CTAs, and thumbnail prompts.
- `services/marketing/automation/renderJobPlanner.ts` – converts episodes to render job records (persisted to `data/render-jobs.json`).
- `services/marketing/automation/contentMachine.ts` – orchestrates campaign execution, storing outputs in `data/content-campaigns.json`.

## MCP tools
- `marketing.plan_campaign` – returns an array of `ContentEpisodePlan` objects.
- `marketing.build_campaign` – runs the full pipeline and returns media/script/render plans per episode.
- `marketing.plan_episode` – prepares a single episode (media + script + render plan).

## CLI commands
- Plan + build a campaign:
  ```bash
  pnpm marketing:campaign '{"theme":"AI weight loss for clinicians","persona":"clinician","durationDays":7,"platforms":["tiktok","ytshorts"],"frequencyPerDay":1,"tone":"educational but hype"}'
  ```
- Plan one episode:
  ```bash
  pnpm marketing:episode '{"theme":"AI burnout fixes","persona":"clinician","platforms":["tiktok","reels"],"angle":"Stop charting after hours"}'
  ```

## Data + media expectations
- Set `MEDIA_ROOT_PATH` to a writable folder; media discovery and matching read from this location.
- Generated records are stored under `data/` so Windows and POSIX environments can review persisted flows without extra services.

## Tips
- Configure any available LLM provider via `.env.local` for richer planning and script generation; the pipeline falls back to heuristics when no provider is configured.
- Render job payloads assume vertical (9:16) output; adjust templates as your renderer evolves.
