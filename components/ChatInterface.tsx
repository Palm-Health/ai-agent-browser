import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import Message from './Message';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex-grow overflow-y-auto pr-2 min-h-0">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col justify-center items-center text-center text-gray-500 animate-fade-in">
                         <div className="animate-float">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-cyan-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                         </div>
                        <p className="text-lg font-medium text-gray-300 mb-2">What would you like to accomplish?</p>
                        <p className="text-sm text-gray-400">e.g., "Find the top 3 AI research blogs and summarize their latest post."</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <Message 
                        key={msg.id} 
                        message={msg} 
                        onPlanResponse={() => {}} 
                    />
                ))}
                 {isLoading && (
                    <div className="flex justify-center items-center gap-3 text-gray-400 animate-fade-in">
                        <div className="loading-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent"></div>
                        <span className="text-sm font-medium">Agent is working...</span>
                    </div>
                 )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-4 flex-shrink-0">
                <form onSubmit={handleSend}>
                    <div className="flex items-center input-glass rounded-lg focus-within:ring-2 focus-within:ring-cyan-500 transition-all duration-300">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isLoading ? "Waiting for agent..." : "Define your task for the agent..."}
                            disabled={isLoading}
                            className="w-full bg-transparent p-3 text-gray-200 focus:outline-none disabled:opacity-50 focus-ring"
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()} 
                            className={`p-2 m-1 rounded-md text-white transition-all duration-300 focus-ring ${
                                isLoading || !input.trim() 
                                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                                    : 'btn-gradient-primary hover:scale-105'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
