import { randomUUID } from 'node:crypto';
import { aiProviderRegistry } from '../../aiProvider';
import { AICapability, ChatMessage } from '../../../types';
import { modelRouter } from '../../modelRouter';

export type Platform = 'tiktok' | 'reels' | 'ytshorts';

export interface ContentCampaignBrief {
  theme: string;
  persona: 'patient' | 'clinician' | 'investor';
  durationDays: number;
  platforms: Platform[];
  frequencyPerDay: number;
  tone?: string;
}

export interface ContentEpisodePlan {
  id: string;
  dayIndex: number;
  sequenceIndex: number;
  theme: string;
  angle: string;
  hookIdea: string;
  keyPoints: string[];
  platforms: Platform[];
  recommendedDurationSeconds: number;
}

async function generateWithLLM(prompt: string): Promise<string | null> {
  const providers = aiProviderRegistry.getAllProviders();
  if (!providers.length) return null;

  const messages: ChatMessage[] = [
    { id: 0, type: 'user', text: prompt },
  ];

  try {
    const model = await modelRouter.selectModel(messages, [], undefined, [AICapability.TEXT_GENERATION]);
    const provider = providers.find(p => p.name === model.provider);
    if (!provider) return null;
    const result = await provider.generateContent(prompt, { model: model.id });
    return result;
  } catch (error) {
    console.warn('LLM generation failed, falling back to heuristics', error);
    return null;
  }
}

function buildFallbackAngles(brief: ContentCampaignBrief, totalEpisodes: number): string[] {
  const seeds = [
    `Why ${brief.theme} matters for ${brief.persona}s`,
    `${brief.theme} myths and truths`,
    `Daily habit to improve ${brief.theme}`,
    `Cost savings with ${brief.theme}`,
    `${brief.theme} toolkit for busy ${brief.persona}s`,
    `Avoid these mistakes with ${brief.theme}`,
    `Speed run: ${brief.theme} in 60 seconds`,
  ];

  const angles: string[] = [];
  for (let i = 0; i < totalEpisodes; i++) {
    angles.push(seeds[i % seeds.length] + (i >= seeds.length ? ` #${i + 1}` : ''));
  }
  return angles;
}

export async function generateCampaignPlan(brief: ContentCampaignBrief): Promise<ContentEpisodePlan[]> {
  const totalEpisodes = Math.max(1, Math.floor(brief.durationDays * brief.frequencyPerDay));

  const llmAnglesRaw = await generateWithLLM(
    `Create ${totalEpisodes} concise video angles for a campaign about "${brief.theme}" targeting ${brief.persona}s. ` +
      `Keep each angle under 80 characters and make them distinct. Return one angle per line.`,
  );
  const llmAngles = llmAnglesRaw?.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const angles = llmAngles && llmAngles.length >= totalEpisodes
    ? llmAngles.slice(0, totalEpisodes)
    : buildFallbackAngles(brief, totalEpisodes);

  const episodes: ContentEpisodePlan[] = [];
  for (let day = 0; day < brief.durationDays; day++) {
    for (let seq = 0; seq < brief.frequencyPerDay; seq++) {
      const index = day * brief.frequencyPerDay + seq;
      const angle = angles[index] || angles[angles.length - 1];
      const hookIdea = `Hook: ${angle}`;
      const keyPoints = [
        `${brief.theme} overview`,
        `Pain point for ${brief.persona}s`,
        `Fast win related to ${angle}`,
      ];
      episodes.push({
        id: randomUUID(),
        dayIndex: day,
        sequenceIndex: seq,
        theme: brief.theme,
        angle,
        hookIdea,
        keyPoints,
        platforms: brief.platforms,
        recommendedDurationSeconds: 45,
      });
    }
  }

  return episodes;
}
