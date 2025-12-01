import { ForgeCandidate, ForgeChangeProposal } from './forgeTypes';

const candidateCache = new Map<string, ForgeCandidate>();
const proposalCache = new Map<string, ForgeChangeProposal>();

export function setForgeCandidates(candidates: ForgeCandidate[]): void {
  candidateCache.clear();
  candidates.forEach(candidate => candidateCache.set(candidate.id, candidate));
}

export function getForgeCandidates(): ForgeCandidate[] {
  return Array.from(candidateCache.values());
}

export function getForgeCandidate(id: string): ForgeCandidate | undefined {
  return candidateCache.get(id);
}

export function updateForgeCandidate(candidate: ForgeCandidate): void {
  candidateCache.set(candidate.id, candidate);
}

export function cacheProposal(candidateId: string, proposal: ForgeChangeProposal): void {
  proposalCache.set(candidateId, proposal);
}

export function getCachedProposal(candidateId: string): ForgeChangeProposal | undefined {
  return proposalCache.get(candidateId);
}
