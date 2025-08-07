/**
 * Storage utility for managing wiki pages in localStorage
 */
class WikiStorage {
    constructor() {
        this.storageKey = 'wiki-pages';
        this.settingsKey = 'wiki-settings';
        this.recentKey = 'wiki-recent';
        this.historyKey = 'wiki-history';
        this.initializeStorage();
    }

    /**
     * Initialize storage with default pages if empty
     */
    initializeStorage() {
        const pages = this.getAllPages();
        if (Object.keys(pages).length === 0) {
            this.createDefaultPages();
        }
    }

    /**
     * Create default pages for new wikis
     */
    createDefaultPages() {
        const defaultPages = {
            'Home': {
                title: 'Home',
                content: `# Welcome to Your Personal Wiki

This is your personal wiki homepage. You can edit this page or create new ones using the navigation above.

## Getting Started

- Click the **Edit** button to modify this page
- Use the **New** button to create additional pages  
- Use the search bar to find pages quickly
- Link to other pages using the format: [Page Name](PageName)

## Formatting

You can use simple markdown-like formatting:

### Headers
Use # for headers (# ## ###)

### Text Formatting
- **Bold text** with double asterisks
- *Italic text* with single asterisks  
- \`Inline code\` with backticks

### Lists
- Bullet points with dashes
- Numbered lists work too

### Links
Link to other pages: [About](About)
External links: [Google](https://google.com)

---

Happy writing!`,
                created: Date.now(),
                modified: Date.now(),
                version: 1
            },
            'About': {
                title: 'About',
                content: `# About This Wiki

This is a personal knowledge management system built with vanilla HTML, CSS, and JavaScript.

## Features

- **Local Storage**: All your data is stored locally in your browser
- **Markdown-like Syntax**: Easy formatting with simple markup
- **Real-time Preview**: See your changes as you type
- **Page Linking**: Link between pages seamlessly
- **Search**: Find content across all your pages
- **Responsive Design**: Works on desktop and mobile devices

## Privacy

All your data stays on your device. Nothing is sent to external servers.`,
                created: Date.now(),
                modified: Date.now(),
                version: 1
            }
        };

        localStorage.setItem(this.storageKey, JSON.stringify(defaultPages));
    }

    /**
     * Get all pages from storage
     * @returns {Object} Object containing all pages
     */
    getAllPages() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading pages from storage:', error);
            return {};
        }
    }

    /**
     * Get a specific page by title
     * @param {string} title - Page title
     * @returns {Object|null} Page object or null if not found
     */
    getPage(title) {
        const pages = this.getAllPages();
        return pages[title] || null;
    }

    /**
     * Save or update a page
     * @param {string} title - Page title
     * @param {string} content - Page content
     * @param {string} oldTitle - Previous title (for renaming)
     * @returns {boolean} Success status
     */
    savePage(title, content, oldTitle = null) {
        try {
            const pages = this.getAllPages();
            const now = Date.now();
            
            // Handle page renaming
            if (oldTitle && oldTitle !== title && pages[oldTitle]) {
                // Save history of old page
                this.savePageHistory(oldTitle, pages[oldTitle]);
                // Delete old page
                delete pages[oldTitle];
            }
            
            // Save history of current version if page exists
            if (pages[title]) {
                this.savePageHistory(title, pages[title]);
            }
            
            // Create or update page
            const existingPage = pages[title];
            pages[title] = {
                title,
                content,
                created: existingPage ? existingPage.created : now,
                modified: now,
                version: existingPage ? existingPage.version + 1 : 1
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(pages));
            this.addToRecent(title);
            return true;
        } catch (error) {
            console.error('Error saving page:', error);
            return false;
        }
    }

    /**
     * Delete a page
     * @param {string} title - Page title
     * @returns {boolean} Success status
     */
    deletePage(title) {
        try {
            const pages = this.getAllPages();
            if (pages[title]) {
                // Save to history before deleting
                this.savePageHistory(title, pages[title]);
                delete pages[title];
                localStorage.setItem(this.storageKey, JSON.stringify(pages));
                this.removeFromRecent(title);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting page:', error);
            return false;
        }
    }

    /**
     * Get page titles for navigation
     * @returns {Array} Array of page titles
     */
    getPageTitles() {
        const pages = this.getAllPages();
        return Object.keys(pages).sort();
    }

    /**
     * Search pages by title and content
     * @param {string} query - Search query
     * @returns {Array} Array of search results
     */
    searchPages(query) {
        if (!query.trim()) return [];
        
        const pages = this.getAllPages();
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const [title, page] of Object.entries(pages)) {
            const titleMatch = title.toLowerCase().includes(queryLower);
            const contentMatch = page.content.toLowerCase().includes(queryLower);
            
            if (titleMatch || contentMatch) {
                // Find snippet around the match
                let snippet = '';
                if (contentMatch) {
                    const contentLower = page.content.toLowerCase();
                    const matchIndex = contentLower.indexOf(queryLower);
                    const start = Math.max(0, matchIndex - 50);
                    const end = Math.min(page.content.length, matchIndex + query.length + 50);
                    snippet = page.content.substring(start, end);
                    if (start > 0) snippet = '...' + snippet;
                    if (end < page.content.length) snippet += '...';
                } else {
                    // Get first line if title match
                    const firstLine = page.content.split('\n')[0];
                    snippet = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
                }
                
                results.push({
                    title,
                    snippet: snippet.trim(),
                    relevance: titleMatch ? 2 : 1 // Title matches have higher relevance
                });
            }
        }
        
        // Sort by relevance, then alphabetically
        return results.sort((a, b) => {
            if (a.relevance !== b.relevance) {
                return b.relevance - a.relevance;
            }
            return a.title.localeCompare(b.title);
        });
    }

    /**
     * Add page to recent list
     * @param {string} title - Page title
     */
    addToRecent(title) {
        try {
            const recent = this.getRecent();
            const filtered = recent.filter(item => item !== title);
            filtered.unshift(title);
            const limited = filtered.slice(0, 10); // Keep only last 10
            localStorage.setItem(this.recentKey, JSON.stringify(limited));
        } catch (error) {
            console.error('Error updating recent pages:', error);
        }
    }

    /**
     * Get recent pages
     * @returns {Array} Array of recent page titles
     */
    getRecent() {
        try {
            const data = localStorage.getItem(this.recentKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading recent pages:', error);
            return [];
        }
    }

    /**
     * Remove page from recent list
     * @param {string} title - Page title
     */
    removeFromRecent(title) {
        try {
            const recent = this.getRecent();
            const filtered = recent.filter(item => item !== title);
            localStorage.setItem(this.recentKey, JSON.stringify(filtered));
        } catch (error) {
            console.error('Error removing from recent pages:', error);
        }
    }

    /**
     * Save page version to history
     * @param {string} title - Page title
     * @param {Object} pageData - Page data
     */
    savePageHistory(title, pageData) {
        try {
            const history = this.getPageHistory(title);
            history.unshift({
                ...pageData,
                archivedAt: Date.now()
            });
            // Keep only last 20 versions
            const limited = history.slice(0, 20);
            
            const allHistory = this.getAllHistory();
            allHistory[title] = limited;
            localStorage.setItem(this.historyKey, JSON.stringify(allHistory));
        } catch (error) {
            console.error('Error saving page history:', error);
        }
    }

    /**
     * Get history for a specific page
     * @param {string} title - Page title
     * @returns {Array} Array of page versions
     */
    getPageHistory(title) {
        try {
            const allHistory = this.getAllHistory();
            return allHistory[title] || [];
        } catch (error) {
            console.error('Error loading page history:', error);
            return [];
        }
    }

    /**
     * Get all page history
     * @returns {Object} Object containing all page histories
     */
    getAllHistory() {
        try {
            const data = localStorage.getItem(this.historyKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading history:', error);
            return {};
        }
    }

    /**
     * Get storage statistics
     * @returns {Object} Storage statistics
     */
    getStats() {
        const pages = this.getAllPages();
        const pageCount = Object.keys(pages).length;
        let totalChars = 0;
        let lastModified = 0;
        
        for (const page of Object.values(pages)) {
            totalChars += page.content.length;
            if (page.modified > lastModified) {
                lastModified = page.modified;
            }
        }
        
        return {
            pageCount,
            totalChars,
            lastModified,
            storageUsed: this.getStorageSize()
        };
    }

    /**
     * Get approximate storage size used
     * @returns {number} Size in bytes (approximate)
     */
    getStorageSize() {
        try {
            const pages = localStorage.getItem(this.storageKey) || '';
            const recent = localStorage.getItem(this.recentKey) || '';
            const history = localStorage.getItem(this.historyKey) || '';
            const settings = localStorage.getItem(this.settingsKey) || '';
            
            return pages.length + recent.length + history.length + settings.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Export all data
     * @returns {Object} All wiki data
     */
    exportData() {
        return {
            pages: this.getAllPages(),
            recent: this.getRecent(),
            history: this.getAllHistory(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Import data (overwrites existing)
     * @param {Object} data - Data to import
     * @returns {boolean} Success status
     */
    importData(data) {
        try {
            if (data.pages) {
                localStorage.setItem(this.storageKey, JSON.stringify(data.pages));
            }
            if (data.recent) {
                localStorage.setItem(this.recentKey, JSON.stringify(data.recent));
            }
            if (data.history) {
                localStorage.setItem(this.historyKey, JSON.stringify(data.history));
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    /**
     * Clear all data
     * @returns {boolean} Success status
     */
    clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.recentKey);
            localStorage.removeItem(this.historyKey);
            localStorage.removeItem(this.settingsKey);
            this.initializeStorage();
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.WikiStorage = WikiStorage;
