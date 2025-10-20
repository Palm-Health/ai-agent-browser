import { Bookmark } from '../types';

export interface PasswordEntry {
  url: string;
  username: string;
  password: string;
  name?: string;
}

export interface HistoryEntry {
  url: string;
  title: string;
  visitTime: Date;
  visitCount?: number;
}

export interface ImportData {
  bookmarks: Bookmark[];
  passwords: PasswordEntry[];
  history: HistoryEntry[];
  settings: any;
}

export class ImportService {
  /**
   * Detect Chrome and Edge installation paths
   * Note: This should be called from Electron main process, not renderer
   */
  detectBrowserPaths(): { chrome?: string; edge?: string; chromium?: string } {
    // This functionality requires Node.js APIs and should be implemented
    // in the Electron main process via IPC
    console.warn('detectBrowserPaths should be called from Electron main process');
    return {};
  }

  /**
   * Import bookmarks from Chrome HTML export format
   * Takes HTML content directly (file reading should be done by caller)
   */
  async importBookmarksFromHTML(htmlContent: string): Promise<Bookmark[]> {
    try {
      const bookmarks = this.parseBookmarksHTML(htmlContent);
      return bookmarks;
    } catch (error) {
      throw new Error(`Failed to parse bookmarks: ${(error as Error).message}`);
    }
  }

  /**
   * Parse Chrome bookmarks HTML format
   */
  private parseBookmarksHTML(html: string): Bookmark[] {
    const bookmarks: Bookmark[] = [];
    
    // Match bookmark entries: <A HREF="url" ADD_DATE="timestamp">title</A>
    const bookmarkRegex = /<A\s+HREF="([^"]+)"[^>]*ADD_DATE="(\d+)"[^>]*>([^<]+)<\/A>/gi;
    let match;

    while ((match = bookmarkRegex.exec(html)) !== null) {
      const [, url, timestamp, title] = match;
      
      bookmarks.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url: url.trim(),
        title: title.trim(),
        tags: [],
        createdAt: new Date(parseInt(timestamp) * 1000),
      });
    }

    return bookmarks;
  }

  /**
   * Import passwords from CSV (Chrome export format)
   * Format: name,url,username,password
   * Takes CSV content directly (file reading should be done by caller)
   */
  async importPasswordsFromCSV(csvContent: string): Promise<PasswordEntry[]> {
    try {
      const passwords = this.parsePasswordsCSV(csvContent);
      return passwords;
    } catch (error) {
      throw new Error(`Failed to parse passwords: ${(error as Error).message}`);
    }
  }

  /**
   * Parse Chrome passwords CSV format
   */
  private parsePasswordsCSV(csv: string): PasswordEntry[] {
    const lines = csv.split('\n');
    const passwords: PasswordEntry[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted fields)
      const fields = this.parseCSVLine(line);
      
      if (fields.length >= 4) {
        passwords.push({
          name: fields[0],
          url: fields[1],
          username: fields[2],
          password: fields[3],
        });
      }
    }

    return passwords;
  }

  /**
   * Parse a single CSV line (handles quoted fields)
   */
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    fields.push(current.trim());
    return fields;
  }

  /**
   * Import browsing history from Chrome
   * Note: This requires reading Chrome's History SQLite database
   */
  async importHistory(chromePath: string): Promise<HistoryEntry[]> {
    // For now, return empty array
    // Full implementation would require sqlite3 library to read Chrome's History database
    console.warn('History import not yet implemented - requires SQLite database access');
    return [];
  }

  /**
   * Import basic settings from Chrome/Edge
   */
  importBasicSettings(browserType: 'chrome' | 'edge'): Partial<any> {
    // Return default settings based on browser type
    const settings: any = {
      browserSettings: {
        userAgent: browserType === 'chrome' 
          ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      },
    };

    return settings;
  }

  /**
   * Export bookmarks to HTML format (Chrome compatible)
   */
  exportBookmarksToHTML(bookmarks: Bookmark[]): string {
    const timestamp = Math.floor(Date.now() / 1000);
    
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">AI Agent Browser Bookmarks</H3>
    <DL><p>
`;

    bookmarks.forEach(bookmark => {
      const addDate = Math.floor(new Date(bookmark.createdAt).getTime() / 1000);
      html += `        <DT><A HREF="${this.escapeHTML(bookmark.url)}" ADD_DATE="${addDate}">${this.escapeHTML(bookmark.title)}</A>\n`;
    });

    html += `    </DL><p>
</DL><p>
`;

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Validate imported data
   */
  validateImportData(data: Partial<ImportData>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.bookmarks) {
      if (!Array.isArray(data.bookmarks)) {
        errors.push('Bookmarks must be an array');
      } else {
        data.bookmarks.forEach((bookmark, index) => {
          if (!bookmark.url) errors.push(`Bookmark ${index}: missing URL`);
          if (!bookmark.title) errors.push(`Bookmark ${index}: missing title`);
        });
      }
    }

    if (data.passwords) {
      if (!Array.isArray(data.passwords)) {
        errors.push('Passwords must be an array');
      } else {
        data.passwords.forEach((password, index) => {
          if (!password.url) errors.push(`Password ${index}: missing URL`);
          if (!password.username) errors.push(`Password ${index}: missing username`);
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const importService = new ImportService();

