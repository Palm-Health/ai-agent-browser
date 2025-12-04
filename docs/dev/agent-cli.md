# Browser Agent CLI

The browser agent can now be invoked from the terminal for quick experiments or automation. It proxies requests to the internal development API route and uses the existing Gemini-powered browser agent to plan and execute tasks.

## Prerequisites
- Development server running at `http://localhost:3000`
- Required API credentials exported in your environment (for the Gemini agent)

## Usage
```bash
pnpm agent browse "Outline how our FHIR MedicationRequest route should talk to IPrescribe"
pnpm agent spec "Generate a spec for integrating YouTube channel sync into the MCP Marketing Studio"
pnpm agent patch "Refactor Morning Briefing service to include operations/compliance alerts"
```

Each command forwards the task to `/api/dev/agent/browser` and streams back the agent summary. Generated artifacts are written to the repository path used when invoking the command.
