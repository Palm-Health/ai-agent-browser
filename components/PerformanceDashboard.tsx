import React, { useState, useEffect } from 'react';
import { intelligentRouter } from '../services/intelligentRouter';
import { mcpServerRouter } from '../services/mcp/mcpServerRouter';
import { userPreferenceService } from '../services/userPreferenceService';

export const PerformanceDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = () => {
    const sessionStats = intelligentRouter.getSessionStats();
    const serverReport = mcpServerRouter.getServerPerformanceReport();
    const preferenceStats = userPreferenceService.getPreferenceStats();

    setStats({
      session: sessionStats,
      servers: serverReport,
      preferences: preferenceStats,
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  if (!isOpen) {
    return (
      <button
        className="dashboard-toggle"
        onClick={() => setIsOpen(true)}
        title="View Performance Dashboard"
      >
        📊 Performance
      </button>
    );
  }

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h3>Performance Dashboard</h3>
        <button className="close-button" onClick={() => setIsOpen(false)}>
          ✕
        </button>
      </div>

      {stats && (
        <div className="dashboard-content">
          {/* Session Stats */}
          <div className="stats-section">
            <h4>Session Statistics</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Session Duration</div>
                <div className="stat-value">{formatDuration(stats.session.duration)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Cost</div>
                <div className="stat-value">{formatCost(stats.session.totalCost)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Cost/Min</div>
                <div className="stat-value">{formatCost(stats.session.avgCostPerMinute)}</div>
              </div>
            </div>
          </div>

          {/* MCP Server Performance */}
          <div className="stats-section">
            <h4>MCP Server Performance</h4>
            <div className="server-list">
              {stats.servers.map((server: any) => (
                <div key={server.serverId} className="server-card">
                  <div className="server-name">{server.serverId}</div>
                  <div className="server-metrics">
                    <span className="metric">
                      Success: {(server.successRate * 100).toFixed(1)}%
                    </span>
                    <span className="metric">
                      Latency: {server.avgLatency.toFixed(0)}ms
                    </span>
                    <span className="metric">
                      Uptime: {server.uptime.toFixed(0)}%
                    </span>
                    <span className="metric">
                      Requests: {server.totalRequests}
                    </span>
                  </div>
                  {server.topCategories.length > 0 && (
                    <div className="server-categories">
                      Top: {server.topCategories.map((c: any) => c.category).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* User Preferences */}
          <div className="stats-section">
            <h4>Learning Statistics</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">User Overrides</div>
                <div className="stat-value">{stats.preferences.totalOverrides}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Learned Patterns</div>
                <div className="stat-value">{stats.preferences.learnedPatterns}</div>
              </div>
            </div>
            {stats.preferences.topPreferences.length > 0 && (
              <div className="preferences-list">
                <div className="preferences-title">Top Learned Preferences:</div>
                {stats.preferences.topPreferences.map((pref: any, idx: number) => (
                  <div key={idx} className="preference-item">
                    <span className="pref-pattern">{pref.pattern}</span>
                    <span className="pref-arrow">→</span>
                    <span className="pref-model">{pref.model}</span>
                    <span className="pref-confidence">
                      {(pref.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard-toggle {
          padding: 8px 16px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .dashboard-toggle:hover {
          background: #333;
          border-color: #555;
        }

        .performance-dashboard {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          background: #1a1a1a;
          border: 1px solid #444;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          z-index: 2000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #333;
          background: #222;
        }

        .dashboard-header h3 {
          margin: 0;
          font-size: 18px;
          color: #fff;
        }

        .close-button {
          background: transparent;
          border: none;
          color: #aaa;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #333;
          color: #fff;
        }

        .dashboard-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .stats-section {
          margin-bottom: 24px;
        }

        .stats-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #fff;
          font-weight: 600;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .stat-card {
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 16px;
        }

        .stat-label {
          font-size: 12px;
          color: #aaa;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
        }

        .server-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .server-card {
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 16px;
        }

        .server-name {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
        }

        .server-metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 8px;
        }

        .metric {
          font-size: 12px;
          color: #aaa;
          background: #1a1a1a;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .server-categories {
          font-size: 12px;
          color: #888;
          font-style: italic;
        }

        .preferences-list {
          margin-top: 12px;
        }

        .preferences-title {
          font-size: 13px;
          color: #aaa;
          margin-bottom: 8px;
        }

        .preference-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #2a2a2a;
          border-radius: 6px;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .pref-pattern {
          color: #aaa;
          flex: 1;
        }

        .pref-arrow {
          color: #666;
        }

        .pref-model {
          color: #fff;
          font-weight: 500;
        }

        .pref-confidence {
          color: #4a9;
          font-size: 12px;
          background: #1a3a2a;
          padding: 2px 6px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

