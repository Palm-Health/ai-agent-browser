import React, { useState, useEffect } from 'react';
import { bookmarkService } from '../services/bookmarkService';
import { Bookmark } from '../types';
import BookmarkIcon from './icons/BookmarkIcon';

interface BookmarkViewProps {
    onNavigate: (url: string) => void;
}

const BookmarkView: React.FC<BookmarkViewProps> = ({ onNavigate }) => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

    const forceUpdate = () => {
         setBookmarks(bookmarkService.getBookmarks());
    };

    // This is a bit of a hack to force re-render when bookmarks change in another component.
    // A more robust solution would use a state management library or context.
    useEffect(() => {
        const interval = setInterval(forceUpdate, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = (id: string) => {
        bookmarkService.removeBookmark(id);
        forceUpdate();
    };

    if (bookmarks.length === 0) {
        return (
             <div className="p-6 h-full text-center flex flex-col justify-center items-center animate-fade-in">
                <div className="animate-float">
                    <BookmarkIcon className="w-20 h-20 mx-auto text-gray-600/60" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mt-6 mb-2">No Bookmarks Yet</h3>
                <p className="text-gray-400 text-sm">Click the star in the address bar to save a page.</p>
            </div>
        )
    }

    return (
        <div className="p-4 h-full">
            <ul className="space-y-3">
                {bookmarks.map(bookmark => (
                    <li key={bookmark.id} className="flex items-center justify-between p-4 card-glass hover:border-cyan-500/30 transition-all duration-300 animate-fade-in">
                        <div className="flex-grow min-w-0">
                            <p 
                                className="text-sm font-semibold text-cyan-400 truncate cursor-pointer hover:text-cyan-300 transition-colors duration-200"
                                onClick={() => onNavigate(bookmark.url)}
                                title={bookmark.title}
                            >
                                {bookmark.title}
                            </p>
                            <p 
                                className="text-xs text-gray-400 truncate cursor-pointer hover:text-gray-300 transition-colors duration-200 mt-1"
                                onClick={() => onNavigate(bookmark.url)}
                                title={bookmark.url}
                            >
                                {bookmark.url}
                            </p>
                        </div>
                        <button 
                            onClick={() => handleDelete(bookmark.id)}
                            className="ml-4 flex-shrink-0 text-gray-500 hover:text-red-400 transition-all duration-200 hover:scale-110 hover:glow-cyan p-1 rounded"
                            title="Delete bookmark"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BookmarkView;
