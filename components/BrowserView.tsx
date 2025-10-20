
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Tab, InteractiveElement } from '../types';
import GlobeIcon from './icons/GlobeIcon';
import BookmarkIcon from './icons/BookmarkIcon';
import { bookmarkService } from '../services/bookmarkService';

interface BrowserViewProps {
    tabs: Tab[];
    activeTabId: number;
    onTabChange: (tabId: number) => void;
    onAddTab: () => void;
    onCloseTab: (tabId: number) => void;
    onPageUpdate: (tabId: number, url: string, title: string, content: InteractiveElement[], faviconUrl: string) => void;
    onBookmark: (url: string, title: string) => void;
}

const BrowserView = forwardRef((props: BrowserViewProps, ref) => {
    const { tabs, activeTabId, onTabChange, onAddTab, onCloseTab, onPageUpdate, onBookmark } = props;
    const iframeRefs = useRef<{ [key: number]: HTMLIFrameElement | null }>({});
    const [urlInputValue, setUrlInputValue] = useState('');

    const activeTab = tabs.find(t => t.id === activeTabId);

    useEffect(() => {
        if (activeTab) {
            setUrlInputValue(activeTab.url);
        }
    }, [activeTab]);

    const getFaviconUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?sz=32&domain=${urlObj.hostname}`;
        } catch (e) {
            return '';
        }
    };

    const injectAndLoadContent = useCallback(async (tabId: number, url: string) => {
        const iframe = iframeRefs.current[tabId];
        if (!iframe) return;

        try {
            const response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${url}`);
            if (!response.ok) throw new Error(`Failed to fetch page. Status: ${response.status}`);
            const html = await response.text();
            
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const base = doc.createElement('base');
            base.href = url;
            doc.head.prepend(base);

            const script = doc.createElement('script');
            script.textContent = `
                window.addEventListener('DOMContentLoaded', () => {
                    // Intercept clicks
                    document.body.addEventListener('click', (e) => {
                        let target = e.target.closest('a');
                        if (target && target.href) {
                            e.preventDefault();
                            window.parent.postMessage({ type: 'NAVIGATE_FROM_IFRAME', url: target.href, tabId: ${tabId} }, '*');
                        }
                    }, true);
                });
            `;
            doc.body.appendChild(script);

            iframe.srcdoc = new XMLSerializer().serializeToString(doc);

        } catch (error) {
            console.error("Error loading page via proxy:", error);
            iframe.srcdoc = `<html><body><h2>Failed to load page</h2><p>${(error as Error).message}</p></body></html>`;
        }
    }, []);
    
    const parseIframeContent = (tabId: number) => {
        const iframe = iframeRefs.current[tabId];
        const elements: InteractiveElement[] = [];
        if (iframe && iframe.contentDocument) {
            const body = iframe.contentDocument.body;
            let idCounter = 0;
            body.querySelectorAll('a, button, input, textarea, select').forEach((el) => {
                const uniqueId = `agent-el-${idCounter++}`;
                (el as HTMLElement).dataset.agentId = uniqueId;
                elements.push({
                    id: uniqueId,
                    tag: el.tagName.toLowerCase(),
                    attributes: {
                        href: el.getAttribute('href') || '',
                        'aria-label': el.getAttribute('aria-label') || '',
                        placeholder: el.getAttribute('placeholder') || '',
                    },
                    text: el.textContent?.trim() || ''
                });
            });
        }
        return elements;
    };
    
    const handleIframeLoad = (tabId: number) => {
        const iframe = iframeRefs.current[tabId];
        if (iframe && iframe.srcdoc) { // Only update if loaded via srcdoc
             setTimeout(() => { // Allow script to execute and DOM to settle
                const title = iframe.contentDocument?.title || 'Untitled';
                const content = parseIframeContent(tabId);
                const faviconUrl = getFaviconUrl(activeTab?.url || '');
                onPageUpdate(tabId, activeTab?.url || '', title, content, faviconUrl);
            }, 100);
        }
    };
    
    // Fix: Define imperative methods as standalone functions to be callable from within the component and exposed via ref.
    const navigate = useCallback((tabId: number, newUrl: string) => {
        const faviconUrl = getFaviconUrl(newUrl);
        onPageUpdate(tabId, newUrl, 'Loading...', [], faviconUrl);
        injectAndLoadContent(tabId, newUrl);
    }, [onPageUpdate, injectAndLoadContent]);

    const clickElement = (tabId: number, elementId: string) => {
        const iframe = iframeRefs.current[tabId];
        if (iframe && iframe.contentDocument) {
            const el = iframe.contentDocument.body.querySelector(`[data-agent-id="${elementId}"]`) as HTMLElement;
            if (el) {
                el.style.outline = '2px solid #22d3ee';
                el.style.transition = 'outline 0.1s ease-in-out';
                setTimeout(() => { el.style.outline = ''; }, 300);
                el.click();
            }
        }
    };

    const fillFormElement = (tabId: number, elementId: string, value: string) => {
        const iframe = iframeRefs.current[tabId];
        if (iframe && iframe.contentDocument) {
            const el = iframe.contentDocument.body.querySelector(`[data-agent-id="${elementId}"]`) as HTMLInputElement;
            if (el) {
                el.value = value;
                const badge = iframe.contentDocument.createElement('div');
                badge.textContent = '✓ Filled';
                badge.style.cssText = 'position: absolute; background: #10b981; color: white; padding: 2px 6px; font-size: 10px; border-radius: 4px; z-index: 1000; transition: opacity 0.5s;';
                const rect = el.getBoundingClientRect();
                badge.style.left = `${rect.left + window.scrollX}px`;
                badge.style.top = `${rect.top + window.scrollY - 20}px`;
                iframe.contentDocument.body.appendChild(badge);
                setTimeout(() => {
                    badge.style.opacity = '0';
                    setTimeout(() => badge.remove(), 500);
                }, 1500);
            }
        }
    };

    useImperativeHandle(ref, () => ({
        navigate,
        clickElement,
        fillFormElement,
    }));

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'NAVIGATE_FROM_IFRAME') {
                const { tabId, url } = event.data;
                navigate(tabId, url);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [navigate]);

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab) {
            let newUrl = urlInputValue;
            if (!/^https?:\/\//i.test(newUrl)) {
                newUrl = 'https://' + newUrl;
            }
            navigate(activeTab.id, newUrl);
        }
    };
    
     const handleCloseTabClick = (tabId: number) => {
        if (window.confirm('Are you sure you want to close this tab?')) {
            onCloseTab(tabId);
        }
    };

    return (
        <div className="flex flex-col h-full glass rounded-lg border border-white/20 shadow-deep">
            {/* Tab Bar */}
             <div className="flex items-center glass-subtle flex-shrink-0 border-b border-white/20">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center px-4 py-2 cursor-pointer border-r border-white/20 relative group transition-all duration-300 ${
                            activeTabId === tab.id ? 'tab-active bg-cyan-500/10' : 'hover:bg-white/5'
                        }`}
                    >
                        {tab.faviconUrl ? <img src={tab.faviconUrl} alt="" className="w-4 h-4 mr-2" /> : <GlobeIcon className="w-4 h-4 mr-2 text-gray-400" />}
                        <span className="text-sm text-gray-200 truncate max-w-40">{tab.title}</span>
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleCloseTabClick(tab.id); }}
                            className="ml-3 text-gray-500 hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100 transform scale-75 hover:scale-100 hover:glow-cyan"
                         >
                           &#x2715;
                        </button>
                    </div>
                ))}
                <button onClick={onAddTab} className="px-4 py-2 text-gray-400 hover:text-cyan-400 text-xl transition-all duration-200 hover:scale-110 hover:glow-cyan">+</button>
            </div>
            {/* URL Bar */}
            <div className="flex items-center p-2 glass-subtle flex-shrink-0 border-b border-white/20">
                 <div className="flex-grow flex items-center input-glass rounded-lg focus-within:ring-2 focus-within:ring-cyan-500 mr-2 transition-all duration-300">
                    <GlobeIcon className="w-5 h-5 mx-2 text-gray-500" />
                    <form onSubmit={handleUrlSubmit} className="w-full">
                        <input
                            type="text"
                            value={urlInputValue}
                            onChange={(e) => setUrlInputValue(e.target.value)}
                            className="w-full bg-transparent p-2 text-gray-200 focus:outline-none text-sm focus-ring"
                        />
                    </form>
                </div>
                 <button 
                    onClick={() => activeTab && onBookmark(activeTab.url, activeTab.title)} 
                    className={`p-2 transition-all duration-300 hover:scale-110 ${
                        bookmarkService.getBookmarks().some(b => b.url === activeTab?.url) 
                            ? 'text-cyan-400 glow-cyan' 
                            : 'text-gray-400 hover:text-cyan-400 hover:glow-cyan'
                    }`} 
                    title="Bookmark this page"
                >
                    <BookmarkIcon className="w-6 h-6" />
                 </button>
            </div>
            {/* Iframe container */}
            <div className="flex-grow relative">
                {tabs.map(tab => (
                    <iframe
                        key={tab.id}
                        // Fix: Ensure callback ref returns void by wrapping the assignment in braces.
                        ref={el => { iframeRefs.current[tab.id] = el; }}
                        className={`w-full h-full border-0 absolute inset-0 transition-opacity duration-300 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        title={`Browser Tab ${tab.id}`}
                        sandbox="allow-forms allow-scripts allow-popups allow-same-origin"
                        onLoad={() => handleIframeLoad(tab.id)}
                    />
                ))}
            </div>
        </div>
    );
});

export default BrowserView;
