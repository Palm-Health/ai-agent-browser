'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { mineForgeCandidates } from '../../../../src/browser/forge/forgeMiner';
import { proposeSkillChanges } from '../../../../src/browser/forge/forgeSynthesizer';
import { ForgeCandidate, ForgeChangeProposal } from '../../../../src/browser/forge/forgeTypes';

interface ProposalState {
  [candidateId: string]: ForgeChangeProposal | undefined;
}

export default function ForgePage() {
  const [candidates, setCandidates] = useState<ForgeCandidate[]>([]);
  const [proposals, setProposals] = useState<ProposalState>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    mineForgeCandidates().then(setCandidates).catch(console.error);
  }, []);

  const totals = useMemo(() => ({
    selectors: candidates.reduce((sum, c) => sum + c.selectors.length, 0),
    workflows: candidates.reduce((sum, c) => sum + c.workflows.length, 0),
  }), [candidates]);

  const handleGenerateProposal = async (candidate: ForgeCandidate) => {
    setLoadingId(candidate.id);
    try {
      const proposal = await proposeSkillChanges(candidate);
      setProposals(prev => ({ ...prev, [candidate.id]: proposal }));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <h1>Browser Forge</h1>
      <p>Automatically mined skill candidates from shadow mode, sentinel, and orchestrator signals.</p>

      <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
        <strong>Aggregate</strong>
        <div>Total candidates: {candidates.length}</div>
        <div>Total selectors: {totals.selectors}</div>
        <div>Total workflows: {totals.workflows}</div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {candidates.map(candidate => (
          <div key={candidate.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{candidate.virtualDomain || candidate.id}</h3>
                <small>Status: {candidate.status} | Source: {candidate.source}</small>
                {candidate.notes ? <div style={{ marginTop: 4 }}>Notes: {candidate.notes}</div> : null}
              </div>
              <button onClick={() => handleGenerateProposal(candidate)} disabled={loadingId === candidate.id}>
                {loadingId === candidate.id ? 'Generating…' : 'Generate Proposal'}
              </button>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <strong>Selectors</strong>
              <ul>
                {candidate.selectors.map(selector => (
                  <li key={selector.selector}>
                    {selector.selector} (used {selector.usageCount}x, success {Math.round(selector.successRate * 100)}%)
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <strong>Workflows</strong>
              <ul>
                {candidate.workflows.map(workflow => (
                  <li key={workflow.name}>
                    {workflow.name} — {workflow.description} (success {Math.round(workflow.successRate * 100)}%)
                  </li>
                ))}
              </ul>
            </div>

            {proposals[candidate.id] ? (
              <div style={{ marginTop: '0.5rem', background: '#f6f8fb', padding: '0.75rem', borderRadius: 6 }}>
                <strong>Proposal</strong>
                <div>{proposals[candidate.id]?.summary}</div>
                <div>Selectors proposed: {proposals[candidate.id]?.selectorChanges.length}</div>
                <div>Workflows proposed: {proposals[candidate.id]?.workflowChanges.length}</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                  Apply via forge.apply_changes tool from the orchestrator console.
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
