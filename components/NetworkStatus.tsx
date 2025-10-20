import React, { useState, useEffect } from 'react';
import { networkTest } from '../services/networkTest';
import { providerInitializer } from '../services/providerInitializer';

interface NetworkStatusProps {
  className?: string;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<{
    connected: boolean;
    latency: number;
    error?: string;
    deepseekAvailable?: boolean;
    ollamaAvailable?: boolean;
    providers?: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      setIsLoading(true);
      try {
        const diagnostics = await networkTest.runFullDiagnostics();
        const providers = providerInitializer.getInitializedProviders();
        
        setStatus({
          connected: diagnostics.basicConnectivity.connected,
          latency: diagnostics.basicConnectivity.latency,
          error: diagnostics.basicConnectivity.error,
          deepseekAvailable: diagnostics.summary.deepseekAvailable,
          ollamaAvailable: diagnostics.summary.ollamaAvailable,
          providers: providers,
        });
      } catch (error) {
        setStatus({
          connected: false,
          latency: 0,
          error: error instanceof Error ? error.message : 'Test failed',
          deepseekAvailable: false,
          ollamaAvailable: false,
          providers: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    testConnection();
    
    // Test every 30 seconds
    const interval = setInterval(testConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <span className="text-gray-400">Testing connection...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-gray-400">Status unknown</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (status.connected && (status.deepseekAvailable || status.ollamaAvailable)) {
      return 'bg-green-400';
    } else if (status.connected && status.ollamaAvailable) {
      return 'bg-yellow-400';
    } else if (status.connected) {
      return 'bg-orange-400';
    } else {
      return 'bg-red-400';
    }
  };

  const getStatusText = () => {
    if (status.connected && status.deepseekAvailable) {
      return `Connected (${status.latency}ms) - DeepSeek Ready`;
    } else if (status.connected && status.ollamaAvailable) {
      return `Connected (${status.latency}ms) - Ollama Only`;
    } else if (status.connected) {
      return `Connected (${status.latency}ms) - No AI Providers`;
    } else {
      return `Disconnected - ${status.error}`;
    }
  };

  const getStatusMessage = () => {
    if (status.connected && status.deepseekAvailable) {
      return 'All systems operational';
    } else if (status.connected && status.ollamaAvailable) {
      return 'Using local AI only - add DeepSeek API key for better performance';
    } else if (status.connected) {
      return 'No AI providers available - check API keys in .env file';
    } else {
      return 'Check your internet connection';
    }
  };

  return (
    <div className={`flex flex-col space-y-1 text-sm ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-gray-300">{getStatusText()}</span>
      </div>
      <div className="text-xs text-gray-400 ml-4">
        {getStatusMessage()}
      </div>
      {status.providers && status.providers.length > 0 && (
        <div className="text-xs text-gray-500 ml-4">
          Providers: {status.providers.join(', ')}
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;