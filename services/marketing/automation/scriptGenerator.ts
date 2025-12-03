import { aiProviderRegistry } from '../../aiProvider';
import { AICapability, ChatMessage } from '../../../types';
import { modelRouter } from '../../modelRouter';
import type { ContentCampaignBrief, ContentEpisodePlan } from './contentBlueprint';
import type { EpisodeMediaSelection } from './mediaMatcher';

export interface EpisodeScript {
  episodeId: string;
  script: string;
  captions: string;
  cta: string;
  thumbnailPrompt: string;
  hashtags: string[];
}

async function generateWithLLM(prompt: string): Promise<string | null> {
  const providers = aiProviderRegistry.getAllProviders();
  if (!providers.length) return null;

  const messages: ChatMessage[] = [{ id: 0, type: 'user', text: prompt }];
  try {
    const model = await modelRouter.selectModel(messages, [], undefined, [AICapability.TEXT_GENERATION]);
    const provider = providers.find(p => p.name === model.provider);
    if (!provider) return null;
    return provider.generateContent(prompt, { model: model.id });
  } catch (error) {
    console.warn('LLM generation failed, using fallback script', error);
    return null;
  }
}

function fallbackScript(episode: ContentEpisodePlan, brief: ContentCampaignBrief, media: EpisodeMediaSelection): EpisodeScript {
  const hookLine = episode.hookIdea || `Hook for ${episode.angle}`;
  const keyPoints = episode.keyPoints.join('\n- ');
  const script = `${hookLine}\n- ${keyPoints}\nClose with CTA.`;

  const cta = brief.persona === 'clinician'
    ? 'Clinicians: try these steps and tap the link for the full playbook.'
    : 'Save this and share with a friend who needs it!';

  const hashtags = [brief.theme, brief.persona, ...episode.platforms].map(tag => `#${tag.replace(/\s+/g, '')}`);

  return {
    episodeId: episode.id,
    script,
    captions: `${episode.angle} | ${brief.tone || 'fast take'} | ${brief.theme}`,
    cta,
    thumbnailPrompt: `Vertical thumbnail for ${brief.theme}, angle ${episode.angle}, bold text overlay`,
    hashtags,
  };
}

export async function generateEpisodeScript(
  episode: ContentEpisodePlan,
  media: EpisodeMediaSelection,
  brief: ContentCampaignBrief,
): Promise<EpisodeScript> {
  const prompt = `You are generating a short-form script. Theme: ${brief.theme}. Persona: ${brief.persona}. ` +
    `Angle: ${episode.angle}. Hook: ${episode.hookIdea}. Key points: ${episode.keyPoints.join(', ')}. ` +
    `Media: hook=${media.hookAssetId}, broll=${media.brollAssetIds.join(',')}. ` +
    `Tone: ${brief.tone || 'energetic and clear'}. Return script (<=120 words), CTA, hashtags (5), and thumbnail idea.`;

  const llm = await generateWithLLM(prompt);
  if (!llm) return fallbackScript(episode, brief, media);

  const hashtags = Array.from(new Set((llm.match(/#\w+/g) || []).slice(0, 6)));

  return {
    episodeId: episode.id,
    script: llm,
    captions: `Highlights: ${episode.angle}`,
    cta: llm.includes('CTA:') ? llm.split('CTA:')[1].trim().split('\n')[0] : 'Tap for more details.',
    thumbnailPrompt: `Thumbnail for ${episode.angle} (${brief.persona})`,
    hashtags: hashtags.length ? hashtags : ['#shorts', '#marketing'],
  };
}
