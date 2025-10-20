// Global polyfill for browser environment
if (typeof global === 'undefined') {
  (window as any).global = window;
  (globalThis as any).global = globalThis;
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, Tab, Plan, ToolResult, InteractiveElement, Memory } from './types';
import { aiBrowserBridge } from './services/aiBridge';
import { enhancedToolService } from './services/enhancedToolService';
import { modelRouter } from './services/modelRouter';
import { providerInitializer } from './services/providerInitializer';
import { mcpManager } from './services/mcp/mcpManager';
import { mcpToolRegistry } from './services/mcp/toolRegistry';
import { networkTest } from './services/networkTest';
import { PERFORMANCE_CONFIG } from './services/performanceConfig';
import { memoryService } from './services/memoryService';
import { bookmarkService } from './services/bookmarkService';

import BrowserView from './components/BrowserView';
import ChatInterface from './components/ChatInterface';
import PlanView from './components/PlanView';
import BookmarkView from './components/BookmarkView';
import TabView from './components/TabView';
import ChevronIcon from './components/icons/ChevronIcon';
import NetworkStatus from './components/NetworkStatus';

const App: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>('');
    const [isHubOpen, setIsHubOpen] = useState(true);
    const [activeAiTab, setActiveAiTab] = useState('Chat');
    const [initializationStatus, setInitializationStatus] = useState<string>('Initializing...');
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    const browserViewRef = useRef<{
        clickElement: (tabId: number, elementId: string) => void;
        fillFormElement: (tabId: number, elementId: string, value: string) => void;
        navigate: (tabId: number, url: string) => void;
    }>(null);

    // Initialize the application only once
    useEffect(() => {
        if (!isInitialized) {
            initializeApp();
            setIsInitialized(true);
        }
    }, [isInitialized]);

    const initializeApp = async () => {
        try {
            console.log('🚀 Starting app initialization...');
            
            // Run network diagnostics if enabled
            if (PERFORMANCE_CONFIG.ENABLE_NETWORK_DIAGNOSTICS) {
                setInitializationStatus('Running network diagnostics...');
                try {
                    const diagnostics = await networkTest.runFullDiagnostics();
                    console.log('📊 Network diagnostics:', diagnostics.summary);
                    
                    if (!diagnostics.summary.internetConnected) {
                        console.warn('⚠️ No internet connection detected');
                    }
                    if (!diagnostics.summary.deepseekAvailable && !diagnostics.summary.ollamaAvailable) {
                        console.warn('⚠️ No AI providers available');
                    }
                } catch (error) {
                    console.warn('⚠️ Network diagnostics failed (non-critical):', error);
                }
            }

            setInitializationStatus('Initializing AI providers...');
            try {
                await providerInitializer.initializeProviders();
                console.log('✅ AI providers initialized');
            } catch (error) {
                console.warn('⚠️  AI providers initialization failed (non-critical):', error);
            }

            setInitializationStatus('Starting MCP servers...');
            console.log('✅ MCP servers will start on demand');

            setInitializationStatus('Creating initial tab...');
            // Create a simple dummy tab for now to avoid browser view issues
            setTabs([{
                browserViewId: 'tab-1',
                url: 'https://www.google.com',
                title: 'New Tab',
                favicon: '',
                isLoading: false,
            }]);
            setActiveTabId('tab-1');
            console.log('✅ Initial tab created');

            setInitializationStatus('Ready');
            setIsInitialized(true);
            console.log('✅ App initialization complete');
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            setInitializationStatus(`Initialization failed: ${error.message}`);
            setIsInitialized(true); // Set to true even on failure to prevent retries
        }
    };

    const activeTab = tabs.find(tab => tab.browserViewId === activeTabId);

    const addMessage = (message: Omit<ChatMessage, 'id'>) => {
        setMessages(prev => [...prev, { ...message, id: Date.now() + Math.random() } as ChatMessage]);
    };
    
    const updatePlanInMessages = (plan: Plan) => {
        setMessages(prevMessages => {
            const newMessages = [...prevMessages];
            const planIndex = newMessages.findIndex(msg => msg.type === 'plan' && msg.plan.id === plan.id);
            if (planIndex !== -1) {
                newMessages[planIndex] = { ...newMessages[planIndex], type: 'plan', plan: plan };
            }
            return newMessages;
        });
    };

    const processToolCall = async (plan: Plan, stepIndex: number): Promise<{ result: ToolResult, isTaskComplete: boolean }> => {
        const step = plan.steps[stepIndex];
        if (!step) return { result: { success: false, message: 'Invalid plan step.' }, isTaskComplete: false };
        
        addMessage({ type: 'function_call', functionCall: step.functionCall } as ChatMessage);

        if (step.functionCall.name === 'task_completed') {
            const summary = (step.functionCall as any).args?.summary as string;
            return { result: { success: true, message: `Task Completed: ${summary}` }, isTaskComplete: true };
        }

        try {
            const context = aiBrowserBridge.createExecutionContext(activeTabId);
            const result = await enhancedToolService.executeTool(step.functionCall, context);
            addMessage({ type: 'tool_result', toolResult: result } as ChatMessage);
            return { result, isTaskComplete: false };
        } catch (error) {
            const errorResult = { success: false, error: (error as Error).message };
            addMessage({ type: 'tool_result', toolResult: errorResult } as ChatMessage);
            return { result: errorResult, isTaskComplete: false };
        }
    };

    const executePlanStep = async (plan: Plan, stepIndex: number) => {
        if (stepIndex >= plan.steps.length) return;

        let currentPlan = { ...plan };
        currentPlan.steps[stepIndex].status = 'executing';
        updatePlanInMessages(currentPlan);

        const { result, isTaskComplete } = await processToolCall(currentPlan, stepIndex);

        if (isTaskComplete) {
            currentPlan.status = 'completed';
            currentPlan.steps[stepIndex].status = 'completed';
            updatePlanInMessages(currentPlan);
            
            // Save successful plan to memory
            const userObjective = (messages.find(m => m.type === 'user') as Extract<ChatMessage, { type: 'user' }> | undefined)?.text || '';
            if (userObjective) {
                memoryService.saveMemory({
                    objective: userObjective,
                    steps: currentPlan.steps.map(s => s.functionCall),
                    successRate: 1.0,
                    lastUsed: new Date(),
                    tags: ['successful']
                });
            }
            setIsLoading(false);
            return;
        }

        if (result.success) {
            currentPlan.steps[stepIndex].status = 'completed';
            updatePlanInMessages(currentPlan);

            // Continue with next step or get AI response
            if (stepIndex + 1 < currentPlan.steps.length) {
                executePlanStep(currentPlan, stepIndex + 1);
            } else {
                // Plan completed
                currentPlan.status = 'completed';
                updatePlanInMessages(currentPlan);
                setIsLoading(false);
            }
        } else {
            currentPlan.status = 'failed';
            currentPlan.steps[stepIndex].status = 'failed';
            updatePlanInMessages(currentPlan);
            setIsLoading(false);
        }
    };

    const handleApprovePlan = (plan: Plan) => {
        const newPlan = { ...plan, status: 'executing' as const };
        updatePlanInMessages(newPlan);
        setIsLoading(true);
        executePlanStep(newPlan, 0);
    };

    const handleCancelPlan = (plan: Plan) => {
        const newPlan = { ...plan, status: 'cancelled' as const };
        updatePlanInMessages(newPlan);
        setIsLoading(false);
    };

    const handleRetryStep = (plan: Plan) => {
        const failedStepIndex = plan.steps.findIndex(s => s.status === 'failed');
        if (failedStepIndex !== -1) {
            const newPlan = { ...plan, status: 'executing' as const };
            newPlan.steps = newPlan.steps.map((step, index) => ({
                ...step,
                status: index >= failedStepIndex ? 'pending' : step.status,
            }));
            updatePlanInMessages(newPlan);
            setIsLoading(true);
            executePlanStep(newPlan, failedStepIndex);
        }
    };
    
    const handleUpdateAndRetryPlan = (plan: Plan) => {
        handleRetryStep(plan);
    };

    const handleSendMessage = async (message: string) => {
        if (isLoading) return;
        setIsLoading(true);
        addMessage({ type: 'user', text: message } as ChatMessage);

        try {
            // Get available tools (native + MCP)
            const allTools = mcpToolRegistry.getAllTools();
            
            // Get memories for context
            const memories = memoryService.getMemories();
            
            // Add timeout wrapper for better error handling
            const response = await Promise.race([
                modelRouter.executeWithFallback(
                    [...messages, { type: 'user', text: message, id: Date.now() }],
                    allTools
                ),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
                )
            ]) as { model: any; result: any };

            console.log(`Using model: ${response.model.name} for task`);

            if (response.result.functionCalls && response.result.functionCalls[0]?.name === 'create_plan') {
                const planArgs = response.result.functionCalls[0].args as { steps: { functionCall: any }[] };
                const newPlan: Plan = {
                    id: Date.now(),
                    objective: message,
                    steps: planArgs.steps.map(step => ({ functionCall: step.functionCall, status: 'pending' })),
                    status: 'awaiting_approval',
                    modelUsed: response.model.name,
                };
                addMessage({ type: 'plan', plan: newPlan } as ChatMessage);
                setIsLoading(false);
            } else if (response.result.functionCalls) {
                // Handle single-step function calls directly
                const context = aiBrowserBridge.createExecutionContext(activeTabId);
                const toolResult = await enhancedToolService.executeTool(response.result.functionCalls[0], context);
                addMessage({ type: 'tool_result', toolResult } as ChatMessage);
                
                if (toolResult.success) {
                    addMessage({ type: 'agent', text: `Task completed successfully using ${response.model.name}` } as ChatMessage);
                } else {
                    addMessage({ type: 'agent', text: `Task failed: ${toolResult.error}` } as ChatMessage);
                }
                setIsLoading(false);
            } else {
                if (response.result.text) addMessage({ type: 'agent', text: response.result.text } as ChatMessage);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addMessage({ 
                type: 'agent', 
                text: `Sorry, I encountered an error: ${errorMessage}. Please check your API keys in the .env file and try again.` 
            } as ChatMessage);
            setIsLoading(false);
        }
    };

    const handlePageUpdate = (tabId: number, url: string, title: string, content: InteractiveElement[], faviconUrl: string) => {
        setTabs(prevTabs =>
            prevTabs.map(tab =>
                tab.id === tabId ? { ...tab, url, title, pageContent: content, faviconUrl } : tab
            )
        );
    };

    const handleAddTab = async () => {
        const newTabId = `tab-${Date.now()}`;
        const newTab = await aiBrowserBridge.createTab(newTabId, 'https://www.google.com');
        setTabs([...tabs, newTab]);
        setActiveTabId(newTabId);
    };

    const handleCloseTab = async (tabId: number) => {
        const tabIndex = tabs.findIndex(tab => tab.id === tabId);
        const newTabs = tabs.filter(tab => tab.id !== tabId);
        
        if (newTabs.length === 0) {
            const newTabId = `tab-${Date.now()}`;
            const newTab = await aiBrowserBridge.createTab(newTabId, 'https://www.google.com');
            setTabs([newTab]);
            setActiveTabId(newTabId);
            return;
        }

        if (activeTabId === tabId.toString()) {
            const newActiveIndex = Math.max(0, tabIndex - 1);
            setActiveTabId(newTabs[newActiveIndex].browserViewId || '');
        }
        
        await aiBrowserBridge.closeTab(tabId.toString());
        setTabs(newTabs);
    };
    
    const handleBookmark = (url: string, title: string) => {
        const bookmarks = bookmarkService.getBookmarks();
        const existing = bookmarks.find(b => b.url === url);
        if (existing) {
            bookmarkService.removeBookmark(existing.id);
        } else {
            bookmarkService.addBookmark(url, title);
        }
        setTabs([...tabs]); 
    };
    
    const handleNavigate = (url: string) => {
        browserViewRef.current?.navigate(parseInt(activeTabId.replace('tab-', '')), url);
    };

    const handlePlanResponse = (plan: Plan, response: 'approve' | 'cancel' | 'retry' | 'update') => {
        if (response === 'approve') handleApprovePlan(plan);
        else if (response === 'cancel') handleCancelPlan(plan);
        else if (response === 'retry') handleRetryStep(plan);
        else if (response === 'update') handleUpdateAndRetryPlan(plan);
    };

    const aiHubTabs = [
        { label: 'Chat', content: <ChatInterface messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} /> },
        { label: 'Plan', content: <div className="p-4"><PlanView plan={(messages.find(m => m.type === 'plan') as Extract<ChatMessage, { type: 'plan' }> | undefined)?.plan} onPlanResponse={handlePlanResponse} /></div> },
        { label: 'Bookmarks', content: <BookmarkView onNavigate={handleNavigate} /> }
    ];

    if (initializationStatus !== 'Ready') {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center">
                    <div className="loading-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-white text-lg">{initializationStatus}</p>
                    <div className="mt-4">
                        <NetworkStatus />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex font-sans overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-indigo-500/10"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_50%)]"></div>
            </div>
            
            {/* Collapsible AI Hub */}
            <div className={`transition-all duration-300 ease-in-out flex-shrink-0 relative z-10 ${isHubOpen ? 'w-1/3' : 'w-0'}`}>
                <div className={`h-full w-full glass-intense border-r border-white/20 transition-all duration-300 ${isHubOpen ? 'opacity-100' : 'opacity-0'}`}>
                   {isHubOpen && <TabView tabs={aiHubTabs} />}
                </div>
            </div>

             {/* Toggle Button */}
            <div className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300 ease-in-out" style={{ left: isHubOpen ? 'calc(33.33% - 16px)' : '0px' }}>
                <button 
                    onClick={() => setIsHubOpen(!isHubOpen)} 
                    className="w-8 h-16 glass border-y border-r border-white/20 rounded-r-full flex items-center justify-center text-white hover:bg-cyan-500/20 transition-all duration-300 glow-hover group"
                >
                    <ChevronIcon className={`w-5 h-5 transition-all duration-300 group-hover:text-cyan-400 ${isHubOpen ? 'rotate-0' : 'rotate-180'}`} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col min-w-0 relative z-10">
                <BrowserView
                    ref={browserViewRef}
                    tabs={tabs}
                    activeTabId={parseInt(activeTabId.replace('tab-', ''))}
                    onTabChange={(tabId) => setActiveTabId(`tab-${tabId}`)}
                    onAddTab={handleAddTab}
                    onCloseTab={handleCloseTab}
                    onPageUpdate={handlePageUpdate}
                    onBookmark={handleBookmark}
                />
            </div>
        </div>
    );
};

export default App;