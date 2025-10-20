import React, { useState } from 'react';
import { configService } from '../services/config';

interface ModelSelectorProps {
  currentMode: 'strict' | 'balanced' | 'performance';
  onModeChange: (mode: 'strict' | 'balanced' | 'performance') => void;
  showSuggestion?: boolean;
  suggestedModel?: string;
  reason?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentMode,
  onModeChange,
  showSuggestion = false,
  suggestedModel,
  reason,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'strict':
        return '🔒';
      case 'balanced':
        return '⚖️';
      case 'performance':
        return '⚡';
      default:
        return '🤖';
    }
  };

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case 'strict':
        return 'Privacy First - Local models only';
      case 'balanced':
        return 'Smart Hybrid - Local for simple, API for complex';
      case 'performance':
        return 'Performance - Best model regardless of cost';
      default:
        return 'Unknown mode';
    }
  };

  return (
    <div className="model-selector">
      <div className="mode-toggle">
        <button
          className="mode-button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={getModeDescription(currentMode)}
        >
          {getModeIcon(currentMode)} {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode
        </button>
      </div>

      {isExpanded && (
        <div className="mode-options">
          <div className="mode-option-group">
            <button
              className={`mode-option ${currentMode === 'strict' ? 'active' : ''}`}
              onClick={() => {
                onModeChange('strict');
                setIsExpanded(false);
              }}
            >
              <span className="mode-icon">🔒</span>
              <div className="mode-info">
                <div className="mode-title">Strict Privacy</div>
                <div className="mode-desc">Local models only, zero cost, complete privacy</div>
              </div>
            </button>

            <button
              className={`mode-option ${currentMode === 'balanced' ? 'active' : ''}`}
              onClick={() => {
                onModeChange('balanced');
                setIsExpanded(false);
              }}
            >
              <span className="mode-icon">⚖️</span>
              <div className="mode-info">
                <div className="mode-title">Balanced (Recommended)</div>
                <div className="mode-desc">Smart routing: local for simple, API for complex</div>
              </div>
            </button>

            <button
              className={`mode-option ${currentMode === 'performance' ? 'active' : ''}`}
              onClick={() => {
                onModeChange('performance');
                setIsExpanded(false);
              }}
            >
              <span className="mode-icon">⚡</span>
              <div className="mode-info">
                <div className="mode-title">Performance</div>
                <div className="mode-desc">Best model for each task, may incur API costs</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {showSuggestion && suggestedModel && (
        <div className="model-suggestion">
          <div className="suggestion-icon">💡</div>
          <div className="suggestion-content">
            <div className="suggestion-model">{suggestedModel}</div>
            {reason && <div className="suggestion-reason">{reason}</div>}
          </div>
        </div>
      )}

      <style jsx>{`
        .model-selector {
          position: relative;
          margin: 10px 0;
        }

        .mode-toggle {
          display: flex;
          align-items: center;
        }

        .mode-button {
          padding: 8px 16px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .mode-button:hover {
          background: #333;
          border-color: #555;
        }

        .mode-options {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 8px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 8px;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .mode-option-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mode-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .mode-option:hover {
          background: #333;
          border-color: #555;
        }

        .mode-option.active {
          background: #1a4d2e;
          border-color: #2d7a4f;
        }

        .mode-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .mode-info {
          flex: 1;
        }

        .mode-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .mode-desc {
          font-size: 12px;
          color: #aaa;
        }

        .model-suggestion {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          padding: 12px;
          background: #1a3a4d;
          border: 1px solid #2d5a7a;
          border-radius: 6px;
        }

        .suggestion-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .suggestion-content {
          flex: 1;
        }

        .suggestion-model {
          font-weight: 600;
          font-size: 14px;
          color: #fff;
          margin-bottom: 4px;
        }

        .suggestion-reason {
          font-size: 12px;
          color: #aaa;
        }
      `}</style>
    </div>
  );
};

