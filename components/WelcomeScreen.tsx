import React, { useState } from 'react';
import { ImportWizard } from './ImportWizard';
import { authService } from '../services/authService';
import { configService } from '../services/config';

interface WelcomeScreenProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'import-choice' | 'signin' | 'privacy' | 'extensions' | 'tutorial' | 'complete';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<'strict' | 'balanced' | 'performance'>('balanced');

  const handleComplete = () => {
    // Save that first-run is complete
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('ai-agent-browser-first-run', 'completed');
    }
    
    // Save privacy preference
    const config = configService.getConfig();
    config.routingPreferences.privacyMode = privacyMode;
    configService.saveConfig();
    
    onComplete();
  };

  const renderWelcome = () => (
    <div className="welcome-step">
      <div className="welcome-logo">🤖</div>
      <h1>Welcome to AI Agent Browser!</h1>
      <p className="subtitle">The intelligent browser that works for you</p>
      
      <div className="features">
        <div className="feature">
          <span className="feature-icon">🧠</span>
          <h3>AI-Powered</h3>
          <p>Smart routing between local and cloud AI models</p>
        </div>
        <div className="feature">
          <span className="feature-icon">🔒</span>
          <h3>Privacy First</h3>
          <p>Run models locally for complete privacy</p>
        </div>
        <div className="feature">
          <span className="feature-icon">⚡</span>
          <h3>Lightning Fast</h3>
          <p>Optimized for speed and performance</p>
        </div>
      </div>

      <button className="primary large" onClick={() => setCurrentStep('import-choice')}>
        Get Started
      </button>
    </div>
  );

  const renderImportChoice = () => (
    <div className="welcome-step">
      <h2>Do you want to import data from Chrome or Edge?</h2>
      <p>Bring your bookmarks, passwords, and settings with you</p>

      <div className="choice-buttons">
        <button className="choice-card" onClick={() => {
          setShowImportWizard(true);
        }}>
          <span className="choice-icon">📥</span>
          <h3>Import from Chrome/Edge</h3>
          <p>Migrate your existing browser data</p>
        </button>

        <button className="choice-card" onClick={() => setCurrentStep('signin')}>
          <span className="choice-icon">🆕</span>
          <h3>Start Fresh</h3>
          <p>Begin with a clean slate</p>
        </button>
      </div>

      <button className="text-button" onClick={() => setCurrentStep('signin')}>
        Skip for now
      </button>
    </div>
  );

  const renderSignIn = () => (
    <div className="welcome-step">
      <h2>Sign in to sync your data</h2>
      <p>Optional: Sign in with Google to sync across devices</p>

      <div className="signin-options">
        <button className="signin-button google" onClick={async () => {
          try {
            await authService.signInWithGoogle();
            setCurrentStep('privacy');
          } catch (error) {
            // For development, use mock
            await authService.signInWithMockUser('user@example.com', 'Test User');
            setCurrentStep('privacy');
          }
        }}>
          <span>G</span> Sign in with Google
        </button>
      </div>

      <button className="text-button" onClick={() => setCurrentStep('privacy')}>
        Skip for now
      </button>
    </div>
  );

  const renderPrivacy = () => (
    <div className="welcome-step">
      <h2>Choose your privacy mode</h2>
      <p>You can change this later in settings</p>

      <div className="privacy-options">
        <label className={`privacy-card ${privacyMode === 'strict' ? 'selected' : ''}`}>
          <input 
            type="radio" 
            name="privacy" 
            value="strict"
            checked={privacyMode === 'strict'}
            onChange={() => setPrivacyMode('strict')}
          />
          <span className="privacy-icon">🔒</span>
          <h3>Strict Privacy</h3>
          <p>Local models only, zero cost, complete privacy</p>
          <span className="badge">Most Private</span>
        </label>

        <label className={`privacy-card ${privacyMode === 'balanced' ? 'selected' : ''}`}>
          <input 
            type="radio" 
            name="privacy" 
            value="balanced"
            checked={privacyMode === 'balanced'}
            onChange={() => setPrivacyMode('balanced')}
          />
          <span className="privacy-icon">⚖️</span>
          <h3>Balanced</h3>
          <p>Smart routing: local for simple, API for complex</p>
          <span className="badge recommended">Recommended</span>
        </label>

        <label className={`privacy-card ${privacyMode === 'performance' ? 'selected' : ''}`}>
          <input 
            type="radio" 
            name="privacy" 
            value="performance"
            checked={privacyMode === 'performance'}
            onChange={() => setPrivacyMode('performance')}
          />
          <span className="privacy-icon">⚡</span>
          <h3>Performance</h3>
          <p>Best model for each task, may incur costs</p>
          <span className="badge">Fastest</span>
        </label>
      </div>

      <button className="primary large" onClick={() => setCurrentStep('tutorial')}>
        Continue
      </button>
    </div>
  );

  const renderTutorial = () => (
    <div className="welcome-step">
      <h2>Quick Tutorial</h2>
      
      <div className="tutorial-steps">
        <div className="tutorial-item">
          <span className="tutorial-number">1</span>
          <div>
            <h3>Chat with AI</h3>
            <p>Use the chat panel to ask questions and get help with browsing</p>
          </div>
        </div>

        <div className="tutorial-item">
          <span className="tutorial-number">2</span>
          <div>
            <h3>Smart Bookmarks</h3>
            <p>Organize bookmarks in folders and search them easily</p>
          </div>
        </div>

        <div className="tutorial-item">
          <span className="tutorial-number">3</span>
          <div>
            <h3>Tab Management</h3>
            <p>Pin, group, and organize tabs for better productivity</p>
          </div>
        </div>

        <div className="tutorial-item">
          <span className="tutorial-number">4</span>
          <div>
            <h3>Privacy Controls</h3>
            <p>Switch between privacy modes anytime in settings</p>
          </div>
        </div>
      </div>

      <button className="primary large" onClick={handleComplete}>
        Start Browsing
      </button>
    </div>
  );

  return (
    <>
      <div className="welcome-screen">
        <div className="welcome-container">
          {currentStep === 'welcome' && renderWelcome()}
          {currentStep === 'import-choice' && renderImportChoice()}
          {currentStep === 'signin' && renderSignIn()}
          {currentStep === 'privacy' && renderPrivacy()}
          {currentStep === 'tutorial' && renderTutorial()}
        </div>

        <div className="welcome-progress">
          <div className={`progress-dot ${currentStep === 'welcome' ? 'active' : 'completed'}`} />
          <div className={`progress-dot ${currentStep === 'import-choice' ? 'active' : currentStep !== 'welcome' ? 'completed' : ''}`} />
          <div className={`progress-dot ${currentStep === 'signin' ? 'active' : ['privacy', 'tutorial'].includes(currentStep) ? 'completed' : ''}`} />
          <div className={`progress-dot ${currentStep === 'privacy' ? 'active' : currentStep === 'tutorial' ? 'completed' : ''}`} />
          <div className={`progress-dot ${currentStep === 'tutorial' ? 'active' : ''}`} />
        </div>
      </div>

      {showImportWizard && (
        <ImportWizard
          onComplete={() => {
            setShowImportWizard(false);
            setCurrentStep('signin');
          }}
          onCancel={() => {
            setShowImportWizard(false);
            setCurrentStep('signin');
          }}
        />
      )}

      <style jsx>{`
        .welcome-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .welcome-container {
          max-width: 800px;
          width: 90%;
          padding: 48px;
          background: #1a1a1a;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .welcome-step {
          text-align: center;
        }

        .welcome-logo {
          font-size: 72px;
          margin-bottom: 24px;
        }

        .welcome-step h1 {
          margin: 0 0 12px 0;
          color: #fff;
          font-size: 36px;
        }

        .welcome-step h2 {
          margin: 0 0 16px 0;
          color: #fff;
          font-size: 28px;
        }

        .subtitle {
          color: #aaa;
          font-size: 18px;
          margin: 0 0 48px 0;
        }

        .welcome-step p {
          color: #aaa;
          margin: 0 0 32px 0;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin: 48px 0;
        }

        .feature {
          text-align: center;
        }

        .feature-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .feature h3 {
          margin: 0 0 8px 0;
          color: #fff;
          font-size: 18px;
        }

        .feature p {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .choice-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin: 32px 0;
        }

        .choice-card {
          background: #2a2a2a;
          border: 2px solid #444;
          border-radius: 12px;
          padding: 32px 24px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .choice-card:hover {
          border-color: #4a9;
          transform: translateY(-4px);
        }

        .choice-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .choice-card h3 {
          margin: 0 0 8px 0;
          color: #fff;
        }

        .choice-card p {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .signin-options {
          margin: 32px 0;
        }

        .signin-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 32px;
          background: #fff;
          color: #333;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .signin-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
        }

        .signin-button span {
          font-weight: bold;
          font-size: 20px;
        }

        .privacy-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin: 32px 0;
        }

        .privacy-card {
          background: #2a2a2a;
          border: 2px solid #444;
          border-radius: 12px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .privacy-card input {
          position: absolute;
          opacity: 0;
        }

        .privacy-card:hover {
          border-color: #666;
        }

        .privacy-card.selected {
          border-color: #4a9;
          background: #1a3a2a;
        }

        .privacy-icon {
          font-size: 36px;
          display: block;
          margin-bottom: 12px;
        }

        .privacy-card h3 {
          margin: 0 0 8px 0;
          color: #fff;
          font-size: 16px;
        }

        .privacy-card p {
          margin: 0 0 12px 0;
          color: #888;
          font-size: 13px;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          background: #444;
          color: #fff;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .badge.recommended {
          background: #4a9;
        }

        .tutorial-steps {
          text-align: left;
          margin: 32px 0;
        }

        .tutorial-item {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
        }

        .tutorial-number {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          background: #4a9;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .tutorial-item h3 {
          margin: 0 0 4px 0;
          color: #fff;
        }

        .tutorial-item p {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        button {
          padding: 12px 32px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
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

        button.large {
          padding: 16px 48px;
          font-size: 18px;
        }

        button.text-button {
          background: none;
          color: #888;
          text-decoration: underline;
          margin-top: 16px;
        }

        button.text-button:hover {
          color: #aaa;
          background: none;
        }

        .welcome-progress {
          display: flex;
          gap: 12px;
          margin-top: 32px;
        }

        .progress-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #444;
          transition: all 0.3s;
        }

        .progress-dot.active {
          background: #4a9;
          transform: scale(1.2);
        }

        .progress-dot.completed {
          background: #4a9;
        }
      `}</style>
    </>
  );
};

