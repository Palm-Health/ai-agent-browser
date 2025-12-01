'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { executeMissionPlan, planMission } from '../../../../src/server/orchestrator';
import {
  MissionPlan,
  MissionRequest,
  MissionResult,
  MissionType,
} from '../../../../src/server/orchestrator/orchestratorTypes';
import { listMissionTemplates } from '../../../../src/server/orchestrator/missionRegistry';
import { VoiceSessionState } from '../../../../src/server/voice/voiceTypes';

const defaultRequest: MissionRequest = {
  id: 'mission-preview',
  userId: 'user-dev',
  type: 'marketing.campaign',
  goal: 'Preview orchestrator mission planning',
};

export default function OrchestratorPage() {
  const [missionRequest, setMissionRequest] = useState<MissionRequest>(defaultRequest);
  const [plan, setPlan] = useState<MissionPlan | null>(null);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceSessionState>('idle');
  const [transcript, setTranscript] = useState('');
  const [voiceSummary, setVoiceSummary] = useState('');
  const [voiceMode, setVoiceMode] = useState<'plan' | 'run'>('plan');
  const [ttsUrl, setTtsUrl] = useState<string | undefined>();
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const templates = useMemo(() => listMissionTemplates(), []);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handlePlan = async () => {
    const generatedPlan = await planMission({ ...missionRequest, id: crypto.randomUUID() });
    setPlan(generatedPlan);
  };

  const handleRun = async () => {
    setIsRunning(true);
    const generatedPlan =
      plan || (await planMission({ ...missionRequest, id: crypto.randomUUID() }));
    setPlan(generatedPlan);
    const missionResult = await executeMissionPlan(generatedPlan);
    setResult(missionResult);
    setIsRunning(false);
  };

  const sendVoiceCommand = async (audioBlob: Blob) => {
    setVoiceState('processing');
    setVoiceError(null);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-command.webm');
    formData.append('mode', voiceMode);
    formData.append('simulate', 'false');

    const response = await fetch('/api/voice/command', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      setVoiceError('Unable to process voice command.');
      setVoiceState('idle');
      return;
    }

    const payload = await response.json();
    setTranscript(payload.transcript);
    setVoiceSummary(payload.transcriptSummary);
    setTtsUrl(payload.ttsUrl);
    if (payload.missionId) {
      setMissionRequest((prev) => ({ ...prev, id: payload.missionId }));
    }
    setVoiceState('responding');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    setVoiceError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      await sendVoiceCommand(blob);
    };

    recorder.start();
    setVoiceState('listening');
  };

  const handleVoiceToggle = async () => {
    if (voiceState === 'idle') {
      await startRecording();
      return;
    }

    if (voiceState === 'listening') {
      setVoiceState('processing');
      stopRecording();
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Orchestrator Control Center</h1>
      <section className="space-y-2 p-4 border rounded">
        <h2 className="font-semibold">Voice Command</h2>
        <div className="flex items-center gap-2">
          <button
            className={`px-4 py-2 rounded text-white ${
              voiceState === 'listening' ? 'bg-red-600' : 'bg-indigo-600'
            }`}
            onClick={handleVoiceToggle}
          >
            {voiceState === 'listening' ? 'Stop Listening' : 'Start Voice'}
          </button>
          <select
            className="border rounded p-2"
            value={voiceMode}
            onChange={(e) => setVoiceMode(e.target.value as 'plan' | 'run')}
          >
            <option value="plan">Plan Only</option>
            <option value="run">Plan + Run</option>
          </select>
          <div className="text-sm text-gray-600">Status: {voiceState}</div>
        </div>
        {voiceError ? <div className="text-sm text-red-600">{voiceError}</div> : null}
        {transcript ? (
          <div className="text-sm">
            <div className="font-semibold">Transcript</div>
            <div className="text-gray-700">{transcript}</div>
          </div>
        ) : null}
        {voiceSummary ? (
          <div className="text-sm">
            <div className="font-semibold">Summary</div>
            <div className="text-gray-700">{voiceSummary}</div>
          </div>
        ) : null}
        {ttsUrl ? (
          <audio controls className="w-full" src={ttsUrl} />
        ) : null}
      </section>
      <section className="space-y-2 p-4 border rounded">
        <h2 className="font-semibold">Mission Request</h2>
        <label className="block text-sm text-gray-600">Mission Type</label>
        <select
          className="border rounded p-2 w-full"
          value={missionRequest.type}
          onChange={(e) =>
            setMissionRequest((prev) => ({ ...prev, type: e.target.value as MissionType }))
          }
        >
          {templates.map((template) => (
            <option key={template.type} value={template.type}>
              {template.name}
            </option>
          ))}
        </select>
        <label className="block text-sm text-gray-600">Goal</label>
        <textarea
          className="border rounded p-2 w-full"
          value={missionRequest.goal}
          onChange={(e) => setMissionRequest((prev) => ({ ...prev, goal: e.target.value }))}
        />
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handlePlan}>
            Build Plan
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={handleRun}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run Mission'}
          </button>
        </div>
      </section>

      {plan && (
        <section className="space-y-2 p-4 border rounded">
          <h2 className="font-semibold">Mission Plan</h2>
          <p className="text-sm text-gray-700">{plan.summary}</p>
          <div className="space-y-1">
            {plan.subtasks.map((subtask) => (
              <div key={subtask.id} className="border rounded p-2">
                <div className="font-semibold">{subtask.description}</div>
                <div className="text-xs text-gray-600">Agent: {subtask.agent}</div>
                {subtask.dependsOn?.length ? (
                  <div className="text-xs text-gray-500">Depends on: {subtask.dependsOn.join(', ')}</div>
                ) : null}
              </div>
            ))}
          </div>
          {plan.orchestrationGraph?.edges?.length ? (
            <pre className="bg-gray-50 p-2 text-xs overflow-auto">
              {JSON.stringify(plan.orchestrationGraph, null, 2)}
            </pre>
          ) : null}
        </section>
      )}

      {result && (
        <section className="space-y-2 p-4 border rounded">
          <h2 className="font-semibold">Execution Result</h2>
          <div className="text-sm">Status: {result.success ? 'Success' : 'Issues detected'}</div>
          {result.issues?.length ? (
            <ul className="list-disc list-inside text-sm text-red-700">
              {result.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          <pre className="bg-gray-50 p-2 text-xs overflow-auto">
            {JSON.stringify(result.results, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
