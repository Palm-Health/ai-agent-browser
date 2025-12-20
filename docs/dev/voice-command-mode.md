# Voice Command Mode

Voice Command Mode lets you speak missions directly to the orchestrator. Audio is captured in the dashboard, transcribed, mapped to a `MissionRequest`, planned or executed, and summarized back via optional TTS.

## Flow
1. **Capture** microphone audio with the dashboard mic control.
2. **Transcribe** audio through `transcribeAudio` (pluggable STT provider).
3. **Interpret** transcript into a mission using `interpretVoiceCommand`.
4. **Plan/Run** via `handleVoiceCommand` (delegates to orchestrator planner/executor).
5. **Respond** with a text summary and optional TTS playback served from `/api/voice/audio/[id]`.

## Key Files
- `src/server/voice/voiceTypes.ts` — shared types for voice commands and responses.
- `src/server/voice/sttClient.ts` — STT abstraction (wire to Whisper, Google STT, etc.).
- `src/server/voice/ttsClient.ts` — TTS abstraction (wire to ElevenLabs, Google TTS, etc.).
- `src/server/voice/voiceInterpreter.ts` — maps transcripts to `MissionRequest` objects.
- `src/server/voice/voiceOrchestrator.ts` — end-to-end handler to plan/run missions from voice.
- `dashboard/app/api/voice/command/route.ts` — API endpoint to ingest audio and trigger voice handling.
- `dashboard/app/api/voice/audio/[id]/route.ts` — serves synthesized audio from memory.
- `dashboard/app/dev/orchestrator/page.tsx` — UI with mic control, status, transcript, and playback.

## Configuration
- Swap the placeholder STT/TTS implementations by updating `transcribeAudio` and `synthesizeSpeech` to call your provider SDKs.
- Enforce SAFE_MODE or SIMULATION_MODE by passing `simulate=true` or gating publish actions in the orchestrator.
- Provide user/brand/practice context to `/api/voice/command` form data so missions inherit tenant boundaries.

## Example Commands
- "Plan a 7-day TikTok campaign about GLP-1 and metabolic resets for clinicians, using my existing b-roll."
- "Pull yesterday's YouTube Shorts analytics and summarize performance."
- "Run a quick system health check."
- "Onboard a new direct primary care practice in Kentucky."

## Safety
- Voice-triggered publishing should route to review queues unless explicitly permitted.
- Clinical/PHI-sensitive data should never be sent to marketing agents; the orchestrator continues to enforce permissions.
- Provide clear UI states (listening → processing → responding) to avoid accidental captures.
