import React, { useState } from 'react';
import { importService, ImportData } from '../services/importService';
import { bookmarkService } from '../services/bookmarkService';
import { passwordManagerService } from '../services/passwordManager';

interface ImportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'welcome' | 'select' | 'files' | 'progress' | 'complete';

export const ImportWizard: React.FC<ImportWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [selectedItems, setSelectedItems] = useState({
    bookmarks: true,
    passwords: false,
    history: false,
    settings: false,
  });
  const [files, setFiles] = useState<{
    bookmarks?: File;
    passwords?: File;
  }>({});
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    bookmarks: number;
    passwords: number;
    errors: string[];
  }>({
    bookmarks: 0,
    passwords: 0,
    errors: [],
  });
  const [detectedBrowsers, setDetectedBrowsers] = useState<string[]>([]);

  React.useEffect(() => {
    if (currentStep === 'welcome') {
      const paths = importService.detectBrowserPaths();
      const browsers = [];
      if (paths.chrome) browsers.push('Chrome');
      if (paths.edge) browsers.push('Edge');
      if (paths.chromium) browsers.push('Chromium');
      setDetectedBrowsers(browsers);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === 'welcome') setCurrentStep('select');
    else if (currentStep === 'select') setCurrentStep('files');
    else if (currentStep === 'files') handleImport();
  };

  const handleImport = async () => {
    setCurrentStep('progress');
    setProgress(0);
    const results = { bookmarks: 0, passwords: 0, errors: [] as string[] };

    try {
      // Import bookmarks
      if (selectedItems.bookmarks && files.bookmarks) {
        setProgress(25);
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const html = e.target?.result as string;
            const bookmarks = await importService.importBookmarksFromHTML('temp');
            // Actually parse the HTML
            await bookmarkService.importBookmarksFromHTML(html);
            results.bookmarks = bookmarks.length;
          } catch (error) {
            results.errors.push(`Bookmarks: ${(error as Error).message}`);
          }
          setProgress(50);
        };
        reader.readAsText(files.bookmarks);
      }

      // Import passwords
      if (selectedItems.passwords && files.passwords) {
        setProgress(75);
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const csv = e.target?.result as string;
            const passwords = await importService.importPasswordsFromCSV('temp');
            // Save to password manager
            for (const pwd of passwords) {
              await passwordManagerService.saveCredential(pwd);
            }
            results.passwords = passwords.length;
          } catch (error) {
            results.errors.push(`Passwords: ${(error as Error).message}`);
          }
          setProgress(100);
          setImportResults(results);
          setTimeout(() => setCurrentStep('complete'), 500);
        };
        reader.readAsText(files.passwords);
      } else {
        setProgress(100);
        setImportResults(results);
        setTimeout(() => setCurrentStep('complete'), 500);
      }
    } catch (error) {
      results.errors.push(`General: ${(error as Error).message}`);
      setImportResults(results);
      setCurrentStep('complete');
    }
  };

  const renderWelcome = () => (
    <div className="wizard-step">
      <h2>Import from Chrome/Edge</h2>
      <p>Welcome! This wizard will help you import your data from Chrome or Edge.</p>
      
      {detectedBrowsers.length > 0 && (
        <div className="detected-browsers">
          <h3>Detected Browsers:</h3>
          <ul>
            {detectedBrowsers.map(browser => (
              <li key={browser}>✓ {browser}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="instructions">
        <h3>Before you begin:</h3>
        <ol>
          <li>Export your bookmarks from Chrome/Edge (Bookmarks → Bookmark Manager → Export)</li>
          <li>Export your passwords from Chrome/Edge (Settings → Passwords → Export)</li>
          <li>Have the exported files ready</li>
        </ol>
      </div>

      <div className="wizard-actions">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={handleNext} className="primary">Get Started</button>
      </div>
    </div>
  );

  const renderSelect = () => (
    <div className="wizard-step">
      <h2>What would you like to import?</h2>
      
      <div className="import-options">
        <label>
          <input
            type="checkbox"
            checked={selectedItems.bookmarks}
            onChange={(e) => setSelectedItems({...selectedItems, bookmarks: e.target.checked})}
          />
          <span>Bookmarks</span>
        </label>

        <label>
          <input
            type="checkbox"
            checked={selectedItems.passwords}
            onChange={(e) => setSelectedItems({...selectedItems, passwords: e.target.checked})}
          />
          <span>Passwords</span>
        </label>

        <label className="disabled">
          <input type="checkbox" disabled />
          <span>Browsing History (Coming Soon)</span>
        </label>

        <label className="disabled">
          <input type="checkbox" disabled />
          <span>Settings (Coming Soon)</span>
        </label>
      </div>

      <div className="wizard-actions">
        <button onClick={() => setCurrentStep('welcome')}>Back</button>
        <button 
          onClick={handleNext} 
          className="primary"
          disabled={!selectedItems.bookmarks && !selectedItems.passwords}
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderFiles = () => (
    <div className="wizard-step">
      <h2>Select Files to Import</h2>

      {selectedItems.bookmarks && (
        <div className="file-input-group">
          <label>Bookmarks HTML File:</label>
          <input
            type="file"
            accept=".html"
            onChange={(e) => setFiles({...files, bookmarks: e.target.files?.[0]})}
          />
          {files.bookmarks && <span className="file-name">✓ {files.bookmarks.name}</span>}
        </div>
      )}

      {selectedItems.passwords && (
        <div className="file-input-group">
          <label>Passwords CSV File:</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFiles({...files, passwords: e.target.files?.[0]})}
          />
          {files.passwords && <span className="file-name">✓ {files.passwords.name}</span>}
        </div>
      )}

      <div className="wizard-actions">
        <button onClick={() => setCurrentStep('select')}>Back</button>
        <button 
          onClick={handleNext} 
          className="primary"
          disabled={
            (selectedItems.bookmarks && !files.bookmarks) ||
            (selectedItems.passwords && !files.passwords)
          }
        >
          Import
        </button>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="wizard-step">
      <h2>Importing...</h2>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p>{progress}% complete</p>
    </div>
  );

  const renderComplete = () => (
    <div className="wizard-step">
      <h2>Import Complete!</h2>
      
      <div className="import-summary">
        <p>✓ Imported {importResults.bookmarks} bookmarks</p>
        <p>✓ Imported {importResults.passwords} passwords</p>
        
        {importResults.errors.length > 0 && (
          <div className="errors">
            <h3>Errors:</h3>
            {importResults.errors.map((error, i) => (
              <p key={i} className="error">{error}</p>
            ))}
          </div>
        )}
      </div>

      <div className="wizard-actions">
        <button onClick={onComplete} className="primary">Done</button>
      </div>
    </div>
  );

  return (
    <div className="import-wizard-overlay">
      <div className="import-wizard">
        {currentStep === 'welcome' && renderWelcome()}
        {currentStep === 'select' && renderSelect()}
        {currentStep === 'files' && renderFiles()}
        {currentStep === 'progress' && renderProgress()}
        {currentStep === 'complete' && renderComplete()}
      </div>

      <style jsx>{`
        .import-wizard-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .import-wizard {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 32px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .wizard-step h2 {
          margin: 0 0 24px 0;
          color: #fff;
        }

        .wizard-step p {
          color: #aaa;
          margin: 0 0 16px 0;
        }

        .detected-browsers {
          background: #2a2a2a;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
        }

        .detected-browsers h3 {
          margin: 0 0 12px 0;
          color: #fff;
          font-size: 14px;
        }

        .detected-browsers ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .detected-browsers li {
          color: #4a9;
          padding: 4px 0;
        }

        .instructions {
          background: #2a2a2a;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
        }

        .instructions h3 {
          margin: 0 0 12px 0;
          color: #fff;
          font-size: 14px;
        }

        .instructions ol {
          margin: 0;
          padding-left: 20px;
          color: #aaa;
        }

        .instructions li {
          margin: 8px 0;
        }

        .import-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 24px 0;
        }

        .import-options label {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #2a2a2a;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .import-options label:hover:not(.disabled) {
          background: #333;
        }

        .import-options label.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .import-options input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }

        .import-options span {
          color: #fff;
          font-size: 16px;
        }

        .file-input-group {
          margin: 16px 0;
        }

        .file-input-group label {
          display: block;
          color: #fff;
          margin-bottom: 8px;
        }

        .file-input-group input[type="file"] {
          width: 100%;
          padding: 8px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          color: #fff;
        }

        .file-name {
          display: block;
          margin-top: 8px;
          color: #4a9;
          font-size: 14px;
        }

        .progress-bar {
          width: 100%;
          height: 24px;
          background: #2a2a2a;
          border-radius: 12px;
          overflow: hidden;
          margin: 24px 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a9, #6c6);
          transition: width 0.3s;
        }

        .import-summary {
          background: #2a2a2a;
          padding: 16px;
          border-radius: 8px;
          margin: 24px 0;
        }

        .import-summary p {
          color: #4a9;
          margin: 8px 0;
        }

        .errors {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #444;
        }

        .errors h3 {
          color: #f44;
          margin: 0 0 8px 0;
          font-size: 14px;
        }

        .error {
          color: #f66 !important;
          font-size: 14px;
        }

        .wizard-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .wizard-actions button {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wizard-actions button:not(.primary) {
          background: #2a2a2a;
          color: #fff;
        }

        .wizard-actions button:not(.primary):hover {
          background: #333;
        }

        .wizard-actions button.primary {
          background: #4a9;
          color: #fff;
        }

        .wizard-actions button.primary:hover {
          background: #5ba;
        }

        .wizard-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

