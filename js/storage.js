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
            '대문': {
                title: '대문',
                content: `# 개인 위키에 오신 것을 환영합니다

이곳은 당신의 개인 위키 홈페이지입니다. 위의 네비게이션을 사용하여 이 페이지를 편집하거나 새 페이지를 만들 수 있습니다.

## 시작하기

- **편집** 버튼을 클릭하여 이 페이지를 수정하세요
- **새로 만들기** 버튼을 사용하여 추가 페이지를 만드세요
- 검색 창을 사용하여 페이지를 빠르게 찾으세요
- 다음 형식으로 다른 페이지에 링크하세요: [페이지 이름](PageName)

## 서식

간단한 마크다운과 같은 서식을 사용할 수 있습니다:

### 헤더
헤더에 # 사용 (# ## ###)

### 텍스트 서식
- **굵은 텍스트**는 두 개의 별표로
- *기울임 텍스트*는 한 개의 별표로  
- \`인라인 코드\`는 백틱으로

### 목록
- 대시로 불릿 포인트
- 번호 목록도 가능

### 링크
다른 페이지로 링크: [소개](소개)
외부 링크: [구글](https://google.com)

---

즐겁게 작성하세요!`,
                created: Date.now(),
                modified: Date.now(),
                version: 1
            },
            '소개': {
                title: '소개',
                content: `# 이 위키에 대해

이 위키는 순수한 HTML, CSS, JavaScript로 구축된 개인 지식 관리 시스템입니다.

## 기능

- **로컬 저장소**: 모든 데이터가 브라우저에 로컬로 저장됩니다
- **마크다운 유사 문법**: 간단한 마크업으로 쉽게 서식 지정
- **실시간 미리보기**: 입력하면서 변경 사항을 실시간으로 확인
- **페이지 링크**: 페이지 간 원활한 연결
- **검색**: 모든 페이지에서 콘텐츠 검색
- **반응형 디자인**: 데스크톱과 모바일 장치에서 모두 작동

## 개인정보 보호

모든 데이터가 기기에 저장됩니다. 외부 서버로 전송되지 않습니다.`,
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
            // Save history of current version if page exists
            if (pages[title]) {
                this.savePageHistory(title, pages[title]);
            }
            
            // Handle page renaming
            if (oldTitle && oldTitle !== title && pages[oldTitle]) {
                // Save history of old page before deleting
                this.savePageHistory(oldTitle, pages[oldTitle]);
                // Delete old page
                delete pages[oldTitle];
                // Remove from recent list
                this.removeFromRecent(oldTitle);
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
            let totalSize = 0;
            for (let key in localStorage) {
                if (key.startsWith('wiki-')) {
                    const item = localStorage.getItem(key);
                    totalSize += key.length + (item ? item.length : 0);
                }
            }
            return totalSize;
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
            localStorage.removeItem('wiki-draft'); // Clear drafts too
            this.initializeStorage();
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }
    
    /**
     * Remove a page from recent list
     * @param {string} title - Page title to remove
     */
    removeFromRecent(title) {
        try {
            const recent = this.getRecent();
            const filtered = recent.filter(t => t !== title);
            localStorage.setItem(this.recentKey, JSON.stringify(filtered));
        } catch (error) {
            console.error('Error removing from recent:', error);
        }
    }
    
    /**
     * Check if storage is available and working
     * @returns {boolean} Whether storage is working
     */
    isStorageAvailable() {
        try {
            const test = 'storage-test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get storage quota information
     * @returns {Object} Storage quota info
     */
    async getStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    available: estimate.quota - estimate.usage,
                    percentage: Math.round((estimate.usage / estimate.quota) * 100)
                };
            } catch (error) {
                console.warn('Storage quota estimation failed:', error);
            }
        }
        return null;
    }
}

// Export for use in other modules
window.WikiStorage = WikiStorage;
