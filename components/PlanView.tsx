import React, { useState, useEffect } from 'react';
import type { Plan, PlanStep } from '../types';
import FunctionCallView from './FunctionCallView';

interface PlanViewProps {
    plan: Plan | undefined;
    onPlanResponse: (plan: Plan, response: 'approve' | 'cancel' | 'retry' | 'update') => void;
}

const PlanView: React.FC<PlanViewProps> = ({ plan, onPlanResponse }) => {
    const [editablePlan, setEditablePlan] = useState<Plan | undefined>(undefined);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        setEditablePlan(plan);
        setEditMode(plan?.status === 'failed');
    }, [plan]);

    if (!plan || !editablePlan) {
        return <div className="p-4 text-center text-gray-500">No active plan.</div>;
    }

    const handleArgChange = (stepIndex: number, newArgs: string) => {
        try {
            const parsedArgs = JSON.parse(newArgs);
            const newSteps = [...editablePlan.steps];
            newSteps[stepIndex].functionCall.args = parsedArgs;
            setEditablePlan({ ...editablePlan, steps: newSteps });
        } catch (e) {
            console.error("Invalid JSON for arguments");
        }
    };
    
    const renderStatusIcon = (status: PlanStep['status']) => {
        switch (status) {
            case 'pending': return <div className="status-pending" title="Pending"></div>;
            case 'executing': return <div className="status-executing" title="Executing"></div>;
            case 'completed': return <div className="status-completed"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>;
            case 'failed': return <div className="status-failed"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg></div>;
            default: return null;
        }
    };

    const statusTextMap = {
        awaiting_approval: "Awaiting your approval",
        executing: "Executing plan...",
        completed: "Plan completed successfully!",
        failed: "Plan failed. Please review.",
        cancelled: "Plan cancelled.",
    };

    return (
        <div className="card-glass p-6 border-yellow-500/30 shadow-lg animate-bounce-in">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 animate-pulse"></div>
                <h3 className="font-bold text-yellow-400 text-lg">{statusTextMap[plan.status]}</h3>
            </div>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed"><b className="text-gray-200">Objective:</b> {plan.objective}</p>
            <div className="space-y-4">
                {editablePlan.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4 p-3 glass-subtle rounded-lg border border-white/10 transition-all duration-300 hover:border-white/20">
                        <div className="mt-2">{renderStatusIcon(step.status)}</div>
                        <div className="flex-grow">
                             <FunctionCallView functionCall={step.functionCall} />
                             {editMode && plan.status === 'failed' && (
                                <textarea
                                    className="w-full glass-subtle border border-white/10 rounded-md p-3 text-xs font-mono mt-3 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
                                    defaultValue={JSON.stringify(step.functionCall.args, null, 2)}
                                    onChange={(e) => handleArgChange(index, e.target.value)}
                                    rows={3}
                                />
                             )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-4 mt-6">
                {plan.status === 'awaiting_approval' && (
                    <>
                        <button onClick={() => onPlanResponse(plan, 'approve')} className="btn-gradient-success px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105">Approve</button>
                        <button onClick={() => onPlanResponse(plan, 'cancel')} className="px-6 py-2 rounded-lg font-semibold text-sm glass-subtle border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-all duration-300">Cancel</button>
                    </>
                )}
                {plan.status === 'failed' && (
                     <>
                        <button onClick={() => onPlanResponse(editablePlan, 'retry')} className="btn-gradient-primary px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105">Retry</button>
                        {editMode ? 
                             <button onClick={() => { onPlanResponse(editablePlan, 'update'); setEditMode(false); }} className="btn-gradient-warning px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105">Save & Retry</button> :
                             <button onClick={() => setEditMode(true)} className="px-6 py-2 rounded-lg font-semibold text-sm glass-subtle border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-all duration-300">Edit Plan</button>
                        }
                     </>
                )}
            </div>
        </div>
    );
};

export default PlanView;
