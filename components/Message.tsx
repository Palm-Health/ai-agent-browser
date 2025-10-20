import React from 'react';
import { ChatMessage, Plan } from '../types';
import UserIcon from './icons/UserIcon';
import AgentIcon from './icons/AgentIcon';
import FunctionCallView from './FunctionCallView';
import PlanView from './PlanView';

interface MessageProps {
    message: ChatMessage;
    onPlanResponse: (plan: Plan, response: 'approve' | 'cancel' | 'retry' | 'update') => void;
}

const Message: React.FC<MessageProps> = ({ message, onPlanResponse }) => {
    const renderContent = () => {
        switch (message.type) {
            case 'user':
            case 'agent':
                return <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{message.text}</p>;
            case 'plan':
                return <PlanView plan={message.plan} onPlanResponse={onPlanResponse} />;
            case 'function_call':
                return <FunctionCallView functionCall={message.functionCall} />;
            case 'tool_result':
                const { toolResult } = message;
                return (
                    <div className={`p-4 rounded-lg border transition-all duration-300 animate-bounce-in ${
                        toolResult.success 
                            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                            : 'bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/10'
                    }`}>
                        <div className="flex items-center gap-3">
                            {toolResult.success ? 
                                <div className="status-completed">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div> :
                                <div className="status-failed">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            }
                            <p className={`font-semibold text-lg ${toolResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                {toolResult.success ? 'Tool Succeeded' : 'Tool Failed'}
                            </p>
                        </div>
                        {toolResult.message && <p className="text-sm text-gray-300 mt-3 leading-relaxed">{toolResult.message}</p>}
                        {toolResult.summary && <p className="text-sm text-gray-300 mt-2"><b className="text-gray-200">Summary:</b> {toolResult.summary}</p>}
                        {toolResult.content && (
                            <div className="mt-3 text-xs font-mono glass rounded-lg p-3 border border-white/10">
                                <p className="font-semibold text-gray-300 mb-2">Page Content:</p>
                                <pre className="max-h-40 overflow-auto text-gray-400 leading-relaxed">{JSON.stringify(toolResult.content, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    const isSystemMessage = message.type !== 'user' && message.type !== 'agent';

    if (isSystemMessage) {
        return <div className="my-3 animate-fade-in">{renderContent()}</div>;
    }

    const icon = message.type === 'user'
        ? <UserIcon className="w-8 h-8 text-white bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-1 shadow-lg" />
        : <AgentIcon className="w-8 h-8 text-white bg-gradient-to-br from-cyan-500 to-teal-600 rounded-full p-1 shadow-lg" />;
    
    const roleName = message.type.charAt(0).toUpperCase() + message.type.slice(1);

    return (
        <div className={`flex items-start gap-4 my-4 animate-fade-in`}>
            <div className="flex-shrink-0 mt-1">{icon}</div>
            <div className={`flex-grow p-4 rounded-lg shadow-lg border transition-all duration-300 hover:shadow-xl ${
                message.type === 'user' 
                    ? 'glass-intense border-indigo-500/30' 
                    : 'glass border-cyan-500/30'
            }`}>
                 <p className="font-bold text-gray-300 mb-3 text-lg">{roleName}</p>
                {renderContent()}
            </div>
        </div>
    );
};

export default Message;
