import React, { useState } from 'react';
import { configService } from '../services/config';
import { authService } from '../services/authService';
import { extensionManager } from '../services/extensionManager';
import { passwordManagerService } from '../services/passwordManager';
import { storageService } from '../services/storageService';
import { ImportWizard } from './ImportWizard';

interface SettingsPanelProps {
  onClose: () => void;
}

type Section = 'general' | 'privacy' | 'appearance' | 'extensions' | 'passwords' | 'import' | 'account' | 'ai';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<Section>('general');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [config, setConfig] = useState(configService.getConfig());
  const user = authService.getCurrentUser();

  const handleSave = () => {
    configService.saveConfig();
    onClose();
  };

  const renderGeneral = () => (
    <div className="settings-section">
      <h2>General Settings</h2>
      
      <div className="setting-group">
        <label>Homepage</label>
        <input 
          type="url" 
          placeholder="https://www.google.com"
          defaultValue="https://www.google.com"
        />
      </div>

      <div className="setting-group">
        <label>Search Engine</label>
        <select defaultValue="google">
          <option value="google">Google</option>
          <option value="bing">Bing</option>
          <option value="duckduckgo">DuckDuckGo</option>
        </select>
      </div>

      <div className="setting-group">
        <label>
          <input type="checkbox" defaultChecked />
          Restore last session on startup
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input type="checkbox" defaultChecked />
          Show bookmarks bar
        </label>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="settings-section">
      <h2>Privacy & Security</h2>
      
      <div className="setting-group">
        <h3>Clear Browsing Data</h3>
        <button className="danger">Clear History</button>
        <button className="danger">Clear Cookies</button>
        <button className="danger">Clear Cache</button>
      </div>

      <div className="setting-group">
        <label>
          <input type="checkbox" defaultChecked />
          Do Not Track
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input type="checkbox" />
          Block third-party cookies
        </label>
      </div>

      <div className="setting-group">
        <h3>Permissions</h3>
        <p>Manage site permissions for camera, microphone, location, etc.</p>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="settings-section">
      <h2>Appearance</h2>
      
      <div className="setting-group">
        <label>Theme</label>
        <select defaultValue="dark">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Font Size</label>
        <select defaultValue="medium">
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="xlarge">Extra Large</option>
        </select>
      </div>

      <div className="setting-group">
        <label>
          <input type="checkbox" defaultChecked />
          Show tab previews on hover
        </label>
      </div>
    </div>
  );

  const renderExtensions = () => {
    const extensions = extensionManager.getInstalledExtensions();
    const whitelisted = extensionManager.getWhitelistedExtensions();

    return (
      <div className="settings-section">
        <h2>Extensions</h2>
        
        <div className="info-box">
          <p>For security, only whitelisted extensions are allowed.</p>
          <p>Whitelisted: {whitelisted.join(', ')}</p>
        </div>

        {extensions.length === 0 ? (
          <p className="empty-state">No extensions installed</p>
        ) : (
          <div className="extensions-list">
            {extensions.map(ext => (
              <div key={ext.id} className="extension-item">
                <div className="extension-info">
                  <h3>{ext.name}</h3>
                  <p>v{ext.version}</p>
                </div>
                <div className="extension-actions">
                  <label className="toggle">
                    <input 
                      type="checkbox" 
                      checked={ext.enabled}
                      onChange={() => extensionManager.toggleExtension(ext.id, !ext.enabled)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <button onClick={() => extensionManager.removeExtension(ext.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="primary">Add Extension</button>
      </div>
    );
  };

  const renderPasswords = () => {
    const activeManager = passwordManagerService.getActiveManager();

    return (
      <div className="settings-section">
        <h2>Password Manager</h2>
        
        <div className="setting-group">
          <label>Active Password Manager</label>
          <select 
            value={activeManager?.name || 'Built-in'}
            onChange={(e) => passwordManagerService.setActiveManager(e.target.value)}
          >
            <option value="Built-in">Built-in Password Manager</option>
            <option value="Bitwarden">Bitwarden</option>
            <option value="1Password">1Password</option>
            <option value="LastPass">LastPass</option>
          </select>
        </div>

        <div className="setting-group">
          <label>
            <input type="checkbox" defaultChecked />
            Offer to save passwords
          </label>
        </div>

        <div className="setting-group">
          <label>
            <input type="checkbox" defaultChecked />
            Auto-fill passwords
          </label>
        </div>

        <div className="setting-group">
          <h3>Password Generator</h3>
          <p>Generate strong passwords automatically</p>
          <button>Test Generator</button>
        </div>
      </div>
    );
  };

  const renderImport = () => (
    <div className="settings-section">
      <h2>Import Data</h2>
      
      <div className="import-options">
        <div className="import-card">
          <h3>Import from Chrome/Edge</h3>
          <p>Import bookmarks, passwords, and settings</p>
          <button className="primary" onClick={() => setShowImportWizard(true)}>
            Start Import Wizard
          </button>
        </div>

        <div className="import-card">
          <h3>Export Data</h3>
          <p>Export all your data as a backup</p>
          <button onClick={async () => {
            const blob = await storageService.exportAllData();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-agent-browser-backup-${Date.now()}.json`;
            a.click();
          }}>
            Export All Data
          </button>
        </div>

        <div className="import-card">
          <h3>Import Backup</h3>
          <p>Restore from a previous backup</p>
          <input 
            type="file" 
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await storageService.importAllData(file);
                alert('Data imported successfully!');
              }
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="settings-section">
      <h2>Account</h2>
      
      {user ? (
        <div className="account-info">
          {user.picture && <img src={user.picture} alt={user.name} className="profile-pic" />}
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <button onClick={() => authService.signOut()}>Sign Out</button>
        </div>
      ) : (
        <div className="account-signin">
          <p>Sign in to sync your data across devices</p>
          <button className="primary" onClick={async () => {
            try {
              await authService.signInWithGoogle();
            } catch (error) {
              // For development, use mock sign-in
              await authService.signInWithMockUser('user@example.com', 'Test User');
              alert('Signed in with mock account (Google OAuth not configured)');
            }
          }}>
            Sign In with Google
          </button>
        </div>
      )}
    </div>
  );

  const renderAI = () => (
    <div className="settings-section">
      <h2>AI Settings</h2>
      
      <div className="setting-group">
        <label>Privacy Mode</label>
        <select 
          value={config.routingPreferences.privacyMode}
          onChange={(e) => {
            config.routingPreferences.privacyMode = e.target.value as any;
            setConfig({...config});
          }}
        >
          <option value="strict">Strict (Local Only)</option>
          <option value="balanced">Balanced (Recommended)</option>
          <option value="performance">Performance</option>
        </select>
        <p className="help-text">
          {config.routingPreferences.privacyMode === 'strict' && 'All requests use local models only'}
          {config.routingPreferences.privacyMode === 'balanced' && 'Smart routing between local and API models'}
          {config.routingPreferences.privacyMode === 'performance' && 'Best model for each task'}
        </p>
      </div>

      <div className="setting-group">
        <label>Cost Budget (per request)</label>
        <input 
          type="number" 
          step="0.01"
          value={config.routingPreferences.defaultCostBudget}
          onChange={(e) => {
            config.routingPreferences.defaultCostBudget = parseFloat(e.target.value);
            setConfig({...config});
          }}
        />
      </div>

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={config.routingPreferences.learningEnabled}
            onChange={(e) => {
              config.routingPreferences.learningEnabled = e.target.checked;
              setConfig({...config});
            }}
          />
          Enable learning from preferences
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input 
            type="checkbox" 
            checked={config.routingPreferences.autoFallback}
            onChange={(e) => {
              config.routingPreferences.autoFallback = e.target.checked;
              setConfig({...config});
            }}
          />
          Auto-fallback to alternative models
        </label>
      </div>
    </div>
  );

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-header">
          <h1>Settings</h1>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <nav className="settings-nav">
            <button 
              className={activeSection === 'general' ? 'active' : ''}
              onClick={() => setActiveSection('general')}
            >
              General
            </button>
            <button 
              className={activeSection === 'privacy' ? 'active' : ''}
              onClick={() => setActiveSection('privacy')}
            >
              Privacy & Security
            </button>
            <button 
              className={activeSection === 'appearance' ? 'active' : ''}
              onClick={() => setActiveSection('appearance')}
            >
              Appearance
            </button>
            <button 
              className={activeSection === 'extensions' ? 'active' : ''}
              onClick={() => setActiveSection('extensions')}
            >
              Extensions
            </button>
            <button 
              className={activeSection === 'passwords' ? 'active' : ''}
              onClick={() => setActiveSection('passwords')}
            >
              Passwords
            </button>
            <button 
              className={activeSection === 'import' ? 'active' : ''}
              onClick={() => setActiveSection('import')}
            >
              Import Data
            </button>
            <button 
              className={activeSection === 'account' ? 'active' : ''}
              onClick={() => setActiveSection('account')}
            >
              Account
            </button>
            <button 
              className={activeSection === 'ai' ? 'active' : ''}
              onClick={() => setActiveSection('ai')}
            >
              AI Settings
            </button>
          </nav>

          <div className="settings-main">
            {activeSection === 'general' && renderGeneral()}
            {activeSection === 'privacy' && renderPrivacy()}
            {activeSection === 'appearance' && renderAppearance()}
            {activeSection === 'extensions' && renderExtensions()}
            {activeSection === 'passwords' && renderPasswords()}
            {activeSection === 'import' && renderImport()}
            {activeSection === 'account' && renderAccount()}
            {activeSection === 'ai' && renderAI()}
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>

      {showImportWizard && (
        <ImportWizard
          onComplete={() => setShowImportWizard(false)}
          onCancel={() => setShowImportWizard(false)}
        />
      )}

      <style jsx>{`
        .settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 9998;
        }

        .settings-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 900px;
          height: 80vh;
          background: #1a1a1a;
          border-radius: 12px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #333;
        }

        .settings-header h1 {
          margin: 0;
          color: #fff;
          font-size: 24px;
        }

        .close-btn {
          background: none;
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

        .close-btn:hover {
          background: #333;
          color: #fff;
        }

        .settings-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .settings-nav {
          width: 200px;
          border-right: 1px solid #333;
          padding: 16px 0;
          overflow-y: auto;
        }

        .settings-nav button {
          width: 100%;
          padding: 12px 24px;
          background: none;
          border: none;
          color: #aaa;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .settings-nav button:hover {
          background: #2a2a2a;
          color: #fff;
        }

        .settings-nav button.active {
          background: #2a2a2a;
          color: #4a9;
          border-left: 3px solid #4a9;
        }

        .settings-main {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        .settings-section h2 {
          margin: 0 0 24px 0;
          color: #fff;
        }

        .setting-group {
          margin-bottom: 24px;
        }

        .setting-group h3 {
          margin: 0 0 12px 0;
          color: #fff;
          font-size: 16px;
        }

        .setting-group label {
          display: block;
          color: #fff;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .setting-group input[type="text"],
        .setting-group input[type="url"],
        .setting-group input[type="number"],
        .setting-group select {
          width: 100%;
          padding: 8px 12px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
        }

        .setting-group input[type="checkbox"] {
          margin-right: 8px;
        }

        .help-text {
          color: #888;
          font-size: 12px;
          margin-top: 4px;
        }

        .info-box {
          background: #2a2a2a;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .info-box p {
          margin: 8px 0;
          color: #aaa;
          font-size: 14px;
        }

        .import-options {
          display: grid;
          gap: 16px;
        }

        .import-card {
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
        }

        .import-card h3 {
          margin: 0 0 8px 0;
          color: #fff;
        }

        .import-card p {
          margin: 0 0 16px 0;
          color: #aaa;
          font-size: 14px;
        }

        .account-info {
          text-align: center;
          padding: 24px;
        }

        .profile-pic {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin-bottom: 16px;
        }

        .account-info h3 {
          margin: 0 0 8px 0;
          color: #fff;
        }

        .account-info p {
          margin: 0 0 16px 0;
          color: #aaa;
        }

        .account-signin {
          text-align: center;
          padding: 48px 24px;
        }

        .account-signin p {
          margin: 0 0 24px 0;
          color: #aaa;
        }

        button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          background: #2a2a2a;
          color: #fff;
        }

        button:hover {
          background: #333;
        }

        button.primary {
          background: #4a9;
          color: #fff;
        }

        button.primary:hover {
          background: #5ba;
        }

        button.danger {
          background: #d44;
          color: #fff;
          margin-right: 8px;
        }

        button.danger:hover {
          background: #e55;
        }

        .settings-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #333;
        }

        .empty-state {
          color: #888;
          text-align: center;
          padding: 48px 24px;
        }
      `}</style>
    </>
  );
};

