
import type { Bookmark } from '../types';

const STORAGE_KEY = 'ai-agent-browser-bookmarks';
const FOLDERS_KEY = 'ai-agent-browser-bookmark-folders';

export interface BookmarkFolder {
  id: string;
  name: string;
  parentId?: string;
  children: (Bookmark | BookmarkFolder)[];
  createdAt: Date;
}

class BookmarkService {
    
    getBookmarks(): Bookmark[] {
        try {
            const bookmarksJSON = localStorage.getItem(STORAGE_KEY);
            return bookmarksJSON ? JSON.parse(bookmarksJSON) : [];
        } catch (error) {
            console.error("Failed to retrieve bookmarks from localStorage:", error);
            return [];
        }
    }

    addBookmark(url: string, title: string, folderId?: string): Bookmark {
        try {
            const bookmarks = this.getBookmarks();
            const newBookmark: Bookmark = { 
                id: Date.now().toString(), 
                url, 
                title: title || url,
                tags: [],
                createdAt: new Date()
            };
            const updatedBookmarks = [newBookmark, ...bookmarks];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
            
            // If folder specified, add to folder
            if (folderId) {
                this.addBookmarkToFolder(newBookmark.id, folderId);
            }
            
            return newBookmark;
        } catch (error) {
             console.error("Failed to save bookmark to localStorage:", error);
             throw error;
        }
    }
    
    removeBookmark(id: string): void {
        try {
            const bookmarks = this.getBookmarks();
            const updatedBookmarks = bookmarks.filter(b => b.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
        } catch (error) {
             console.error("Failed to remove bookmark from localStorage:", error);
             throw error;
        }
    }

    clearBookmarks() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear bookmarks from localStorage:", error);
        }
    }

    // Folder management
    getFolders(): BookmarkFolder[] {
        try {
            const foldersJSON = localStorage.getItem(FOLDERS_KEY);
            return foldersJSON ? JSON.parse(foldersJSON) : [];
        } catch (error) {
            console.error("Failed to retrieve folders from localStorage:", error);
            return [];
        }
    }

    createFolder(name: string, parentId?: string): BookmarkFolder {
        try {
            const folders = this.getFolders();
            const newFolder: BookmarkFolder = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name,
                parentId,
                children: [],
                createdAt: new Date(),
            };
            const updatedFolders = [...folders, newFolder];
            localStorage.setItem(FOLDERS_KEY, JSON.stringify(updatedFolders));
            return newFolder;
        } catch (error) {
            console.error("Failed to create folder:", error);
            throw error;
        }
    }

    deleteFolder(folderId: string): void {
        try {
            const folders = this.getFolders();
            const updatedFolders = folders.filter(f => f.id !== folderId && f.parentId !== folderId);
            localStorage.setItem(FOLDERS_KEY, JSON.stringify(updatedFolders));
        } catch (error) {
            console.error("Failed to delete folder:", error);
            throw error;
        }
    }

    moveBookmark(bookmarkId: string, folderId: string): void {
        // Implementation would track bookmark-folder relationships
        // For now, just a placeholder
        console.log(`Moving bookmark ${bookmarkId} to folder ${folderId}`);
    }

    addBookmarkToFolder(bookmarkId: string, folderId: string): void {
        try {
            const folders = this.getFolders();
            const folder = folders.find(f => f.id === folderId);
            if (folder) {
                const bookmark = this.getBookmarks().find(b => b.id === bookmarkId);
                if (bookmark && !folder.children.some((c: any) => c.id === bookmarkId)) {
                    folder.children.push(bookmark);
                    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
                }
            }
        } catch (error) {
            console.error("Failed to add bookmark to folder:", error);
        }
    }

    // Import/Export
    exportBookmarksToHTML(): string {
        const bookmarks = this.getBookmarks();
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

    async importBookmarksFromHTML(html: string): Promise<Bookmark[]> {
        const bookmarks = this.parseBookmarksHTML(html);
        
        // Add imported bookmarks
        const existing = this.getBookmarks();
        const updatedBookmarks = [...existing, ...bookmarks];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
        
        return bookmarks;
    }

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

    private escapeHTML(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Search bookmarks
    searchBookmarks(query: string): Bookmark[] {
        const bookmarks = this.getBookmarks();
        const lowerQuery = query.toLowerCase();
        
        return bookmarks.filter(bookmark => 
            bookmark.title.toLowerCase().includes(lowerQuery) ||
            bookmark.url.toLowerCase().includes(lowerQuery) ||
            bookmark.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    // Get bookmarks by tag
    getBookmarksByTag(tag: string): Bookmark[] {
        const bookmarks = this.getBookmarks();
        return bookmarks.filter(bookmark => bookmark.tags.includes(tag));
    }

    // Update bookmark
    updateBookmark(id: string, updates: Partial<Bookmark>): void {
        try {
            const bookmarks = this.getBookmarks();
            const index = bookmarks.findIndex(b => b.id === id);
            if (index !== -1) {
                bookmarks[index] = { ...bookmarks[index], ...updates };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
            }
        } catch (error) {
            console.error("Failed to update bookmark:", error);
            throw error;
        }
    }
}

export const bookmarkService = new BookmarkService();
