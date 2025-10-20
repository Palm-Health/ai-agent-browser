import React, { useState, ReactNode } from 'react';

interface Tab {
    label: string;
    content: ReactNode;
}

interface TabViewProps {
    tabs: Tab[];
}

const TabView: React.FC<TabViewProps> = ({ tabs }) => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="w-full h-full flex flex-col">
            <header className="flex items-center gap-4 p-6 flex-shrink-0 glass-subtle border-b border-white/20">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-full p-2 shadow-lg glow-cyan">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                        <path d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-200">AI Hub</h2>
            </header>
            <div className="border-b border-white/20 px-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.label}
                            onClick={() => setActiveTab(index)}
                            className={`${
                                index === activeTab
                                    ? 'border-cyan-400 text-cyan-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-300 focus:outline-none relative group`}
                        >
                            {tab.label}
                            {index === activeTab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 animate-gradient-shift"></div>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow overflow-y-auto h-full">
                {tabs[activeTab].content}
            </div>
        </div>
    );
};

export default TabView;
