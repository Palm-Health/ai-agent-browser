
import React from 'react';
import type { FunctionCall } from '@google/genai';

interface FunctionCallViewProps {
    functionCall: FunctionCall;
}

const FunctionCallView: React.FC<FunctionCallViewProps> = ({ functionCall }) => {
    return (
        <div className="glass p-4 rounded-lg border border-white/10 transition-all duration-300 animate-fade-in hover:border-white/20">
            <p className="text-sm text-gray-400 mb-3 font-medium">Calling tool:</p>
            <div className="font-mono text-sm font-semibold text-gray-300">
                <span className="text-cyan-400 font-bold">{functionCall.name}</span>
                <span className="text-gray-500">(</span>
            </div>
            <div className="font-mono text-sm text-gray-200 pl-4 space-y-1">
                {Object.entries(functionCall.args).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                        <span className="text-purple-400 font-medium">{key}</span>
                        <span className="text-gray-500">:</span>
                        <span className="text-emerald-400 break-all">{JSON.stringify(value)}</span>
                        <span className="text-gray-500">,</span>
                    </div>
                ))}
            </div>
            <div className="font-mono text-sm font-semibold text-gray-300">
                <span className="text-gray-500">)</span>
            </div>
        </div>
    );
};

export default FunctionCallView;