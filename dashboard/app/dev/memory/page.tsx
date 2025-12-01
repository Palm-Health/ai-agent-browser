'use client';

import React, { useEffect, useState } from 'react';
import { getBehaviorPatterns, getMemoryStore, recommendActions } from '../../../src/memory/memoryEngine';
import { LearningInsights, Recommendation } from '../../../src/memory/memoryTypes';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-900/60 rounded-xl border border-white/10 p-4 shadow-lg">
        <h2 className="text-lg font-semibold mb-3 text-cyan-300">{title}</h2>
        {children}
    </div>
);

const MemoryPage: React.FC = () => {
    const [insights, setInsights] = useState<LearningInsights>();
    const [recommendation, setRecommendation] = useState<Recommendation>();

    useEffect(() => {
        setInsights(getBehaviorPatterns());
        setRecommendation(recommendActions('dashboard/dev/memory'));
    }, []);

    const memory = getMemoryStore();

    const renderList = (items: string[]) => (
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-200">
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    );

    return (
        <div className="p-6 space-y-6 text-white">
            <h1 className="text-2xl font-bold text-cyan-200">Adaptive Memory Debugger</h1>
            <p className="text-sm text-gray-300">Inspect behavior, selectors, and mission history to tune personalization.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="Top Domains">{renderList(memory.userBehavior.domains.map((d) => `${d.domain} (${d.visits})`))}</Section>
                <Section title="Top Workflows">{renderList(memory.userBehavior.workflows.map((w) => `${w.name} — ${Math.round(w.successRate * 100)}%`))}</Section>
                <Section title="Most Successful Selectors">{renderList(memory.agent.successfulSelectors.map((s) => `${s.selector} (${Math.round(s.confidence * 100)}%)`))}</Section>
                <Section title="Worst Failing Selectors">{renderList(memory.agent.failedSelectors.map((s) => `${s.selector} (${Math.round(s.confidence * 100)}%)`))}</Section>
                <Section title="Recommended Improvements">{renderList(insights?.emergingHabits || [])}</Section>
                <Section title="Memory Graph Snapshot">{renderList(insights?.preferredPanels || [])}</Section>
                <Section title="Top Mission Sequences">{renderList(memory.missions.shortcuts.map((s) => `${s.name}: ${s.sequence.join(' → ')}`))}</Section>
                <Section title="Action Recommendations">{renderList(recommendation?.actions || [])}</Section>
            </div>
        </div>
    );
};

export default MemoryPage;
