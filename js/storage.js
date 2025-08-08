/**
 * Storage utility for managing wiki pages in localStorage
 */
class WikiStorage {
    constructor() {
        this.storageKey = 'wiki-pages';
        this.settingsKey = 'wiki-settings';
        this.recentKey = 'wiki-recent';
        this.historyKey = 'wiki-history';
        this.imagesKey = 'wiki-images';
        this.tagsKey = 'wiki-tags';
        this.favoritesKey = 'wiki-favorites';
        this.templatesKey = 'wiki-templates';
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
            
            // Extract tags from content
            const tags = this.extractTags(content);
            
            // Create or update page
            const existingPage = pages[title];
            pages[title] = {
                title,
                content,
                tags,
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
            localStorage.removeItem(this.imagesKey);
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
    
    /**
     * Get all categories used in pages
     * @returns {Array} Array of category names
     */
    getAllCategories() {
        const pages = this.getAllPages();
        const categories = new Set();
        const categoryRegex = /\[\[분류:([^\]]+)\]\]/g;
        
        for (const page of Object.values(pages)) {
            let match;
            while ((match = categoryRegex.exec(page.content)) !== null) {
                categories.add(match[1].trim());
            }
        }
        
        return Array.from(categories).sort();
    }
    
    /**
     * Get pages that belong to a specific category
     * @param {string} categoryName - Category name
     * @returns {Array} Array of page titles
     */
    getPagesInCategory(categoryName) {
        const pages = this.getAllPages();
        const pagesInCategory = [];
        const categoryRegex = new RegExp(`\\[\\[분류:${this.escapeRegex(categoryName)}\\]\\]`, 'gi');
        
        for (const [title, page] of Object.entries(pages)) {
            if (categoryRegex.test(page.content)) {
                pagesInCategory.push(title);
            }
        }
        
        return pagesInCategory.sort();
    }
    
    /**
     * Get categories that a page belongs to
     * @param {string} pageTitle - Page title
     * @returns {Array} Array of category names
     */
    getPageCategories(pageTitle) {
        const page = this.getPage(pageTitle);
        if (!page) return [];
        
        const categories = [];
        const categoryRegex = /\[\[분류:([^\]]+)\]\]/g;
        let match;
        
        while ((match = categoryRegex.exec(page.content)) !== null) {
            categories.push(match[1].trim());
        }
        
        return [...new Set(categories)]; // Remove duplicates
    }
    
    /**
     * Check if a page is a category page
     * @param {string} pageTitle - Page title
     * @returns {boolean} Whether the page is a category page
     */
    isCategoryPage(pageTitle) {
        return pageTitle.startsWith('분류:');
    }
    
    /**
     * Get category name from category page title
     * @param {string} pageTitle - Category page title
     * @returns {string|null} Category name or null if not a category page
     */
    getCategoryNameFromTitle(pageTitle) {
        if (this.isCategoryPage(pageTitle)) {
            return pageTitle.substring(3); // Remove '분류:' prefix
        }
        return null;
    }
    
    /**
     * Escape regex special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Save an image to storage
     * @param {string} name - Image name
     * @param {string} dataUrl - Base64 data URL
     * @param {number} size - File size in bytes
     * @returns {boolean} Success status
     */
    saveImage(name, dataUrl, size) {
        try {
            const images = this.getAllImages();
            
            // Check storage quota (rough estimate)
            const dataSize = dataUrl.length;
            if (dataSize > 1024 * 1024) { // 1MB limit per image
                return { success: false, error: '이미지가 너무 큽니다. 1MB 이하의 이미지를 업로드해주세요.' };
            }
            
            images[name] = {
                name,
                data: dataUrl,
                size,
                uploaded: Date.now()
            };
            
            localStorage.setItem(this.imagesKey, JSON.stringify(images));
            return { success: true };
        } catch (error) {
            console.error('Error saving image:', error);
            if (error.name === 'QuotaExceededError') {
                return { success: false, error: '저장소 용량이 부족합니다. 일부 이미지를 삭제해주세요.' };
            }
            return { success: false, error: '이미지 저장에 실패했습니다.' };
        }
    }
    
    /**
     * Get all images
     * @returns {Object} Object containing all images
     */
    getAllImages() {
        try {
            const data = localStorage.getItem(this.imagesKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading images:', error);
            return {};
        }
    }
    
    /**
     * Get a specific image by name
     * @param {string} name - Image name
     * @returns {Object|null} Image object or null if not found
     */
    getImage(name) {
        const images = this.getAllImages();
        return images[name] || null;
    }
    
    /**
     * Delete an image
     * @param {string} name - Image name
     * @returns {boolean} Success status
     */
    deleteImage(name) {
        try {
            const images = this.getAllImages();
            if (images[name]) {
                delete images[name];
                localStorage.setItem(this.imagesKey, JSON.stringify(images));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }
    
    /**
     * Get image names list
     * @returns {Array} Array of image names
     */
    getImageNames() {
        const images = this.getAllImages();
        return Object.keys(images).sort();
    }
    
    /**
     * Get total images storage size
     * @returns {number} Total size in bytes
     */
    getImagesSize() {
        const images = this.getAllImages();
        let totalSize = 0;
        for (const image of Object.values(images)) {
            totalSize += image.data.length;
        }
        return totalSize;
    }
    
    /**
     * Check if image name is valid
     * @param {string} name - Image name to check
     * @returns {boolean} Whether name is valid
     */
    isValidImageName(name) {
        return /^[a-zA-Z0-9가-힣._-]+$/.test(name) && name.length <= 50;
    }

    /**
     * Extract tags from page content
     * @param {string} content - Page content
     * @returns {Array} Array of tags
     */
    extractTags(content) {
        const tagPattern = /#([가-힣a-zA-Z0-9_]+)/g;
        const tags = [];
        let match;
        
        while ((match = tagPattern.exec(content)) !== null) {
            const tag = match[1];
            if (!tags.includes(tag)) {
                tags.push(tag);
            }
        }
        
        return tags;
    }

    /**
     * Get all unique tags from all pages
     * @returns {Array} Array of all tags with counts
     */
    getAllTags() {
        const pages = this.getAllPages();
        const tagCounts = {};
        
        for (const page of Object.values(pages)) {
            if (page.tags) {
                for (const tag of page.tags) {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
            }
        }
        
        return Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get pages by tag
     * @param {string} tag - Tag to search for
     * @returns {Array} Array of pages with the tag
     */
    getPagesByTag(tag) {
        const pages = this.getAllPages();
        const result = [];
        
        for (const [title, page] of Object.entries(pages)) {
            if (page.tags && page.tags.includes(tag)) {
                result.push({
                    title,
                    page,
                    modified: page.modified
                });
            }
        }
        
        return result.sort((a, b) => b.modified - a.modified);
    }

    /**
     * Get backlinks for a page (pages that link to this page)
     * @param {string} pageTitle - Title of the page to find backlinks for
     * @returns {Array} Array of pages that link to this page
     */
    getBacklinks(pageTitle) {
        const pages = this.getAllPages();
        const backlinks = [];
        
        for (const [title, page] of Object.entries(pages)) {
            if (title === pageTitle) continue; // Skip self
            
            // Check if page content contains link to target page
            const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${this.escapeRegex(pageTitle)}\\)`, 'gi');
            if (linkPattern.test(page.content)) {
                backlinks.push({
                    title,
                    page,
                    modified: page.modified
                });
            }
        }
        
        return backlinks.sort((a, b) => b.modified - a.modified);
    }

    /**
     * Get outgoing links from a page
     * @param {string} pageTitle - Title of the page
     * @returns {Array} Array of pages this page links to
     */
    getOutgoingLinks(pageTitle) {
        const page = this.getPage(pageTitle);
        if (!page) return [];
        
        const linkPattern = /\[([^\]]+)\]\(([^):/]+)\)/g;
        const links = [];
        let match;
        
        while ((match = linkPattern.exec(page.content)) !== null) {
            const linkedPage = match[2];
            if (linkedPage !== pageTitle && this.getPage(linkedPage)) {
                links.push(linkedPage);
            }
        }
        
        return [...new Set(links)]; // Remove duplicates
    }

    /**
     * Escape regex special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get page statistics with tags and links
     * @returns {Object} Statistics object
     */
    getWikiStats() {
        const pages = this.getAllPages();
        const stats = {
            totalPages: Object.keys(pages).length,
            totalWords: 0,
            totalCharacters: 0,
            tagsCount: 0,
            linksCount: 0,
            mostConnectedPages: [],
            popularTags: this.getAllTags().slice(0, 10)
        };

        const pageConnections = {};
        
        for (const [title, page] of Object.entries(pages)) {
            stats.totalWords += page.content.split(/\s+/).filter(word => word.length > 0).length;
            stats.totalCharacters += page.content.length;
            
            if (page.tags) {
                stats.tagsCount += page.tags.length;
            }
            
            const outgoingLinks = this.getOutgoingLinks(title);
            const backlinks = this.getBacklinks(title);
            const totalConnections = outgoingLinks.length + backlinks.length;
            
            stats.linksCount += outgoingLinks.length;
            
            pageConnections[title] = {
                title,
                connections: totalConnections,
                outgoing: outgoingLinks.length,
                incoming: backlinks.length
            };
        }
        
        stats.mostConnectedPages = Object.values(pageConnections)
            .sort((a, b) => b.connections - a.connections)
            .slice(0, 10);
            
        return stats;
    }

    /**
     * Favorites management
     */
    getFavorites() {
        const favorites = localStorage.getItem(this.favoritesKey);
        return favorites ? JSON.parse(favorites) : [];
    }

    addToFavorites(pageTitle) {
        const favorites = this.getFavorites();
        if (!favorites.includes(pageTitle)) {
            favorites.push(pageTitle);
            localStorage.setItem(this.favoritesKey, JSON.stringify(favorites));
            return true;
        }
        return false;
    }

    removeFromFavorites(pageTitle) {
        const favorites = this.getFavorites();
        const index = favorites.indexOf(pageTitle);
        if (index > -1) {
            favorites.splice(index, 1);
            localStorage.setItem(this.favoritesKey, JSON.stringify(favorites));
            return true;
        }
        return false;
    }

    isFavorite(pageTitle) {
        return this.getFavorites().includes(pageTitle);
    }

    /**
     * Template management
     */
    getTemplates() {
        const templates = localStorage.getItem(this.templatesKey);
        if (templates) {
            return JSON.parse(templates);
        }
        
        // Initialize default templates
        const defaultTemplates = {
            note: {
                name: "노트 템플릿",
                content: `# {{title}}

## 개요
<!-- 여기에 노트의 주요 내용 요약 -->

## 내용
<!-- 상세 내용 작성 -->

## 참고자료
- 
- 

## 태그
#노트 #{{date}}`
            },
            meeting: {
                name: "회의록 템플릿",
                content: `# {{title}}

**일시:** {{date}}
**참석자:** 
**장소:** 

## 안건
1. 
2. 
3. 

## 논의사항
### 안건 1
- 

### 안건 2
- 

## 결정사항
- 

## 후속조치
| 항목 | 담당자 | 마감일 |
|------|--------|--------|
|      |        |        |

#회의록 #{{date}}`
            },
            project: {
                name: "프로젝트 템플릿",
                content: `# {{title}}

## 프로젝트 개요
<!-- 프로젝트 목표와 배경 -->

## 일정
- **시작일:** 
- **종료일:** 
- **주요 마일스톤:**
  - 

## 팀원
- **프로젝트 매니저:** 
- **개발자:** 
- **디자이너:** 

## 요구사항
### 기능 요구사항
1. 
2. 

### 비기능 요구사항
1. 
2. 

## 진행상황
- [ ] 요구사항 분석
- [ ] 설계
- [ ] 개발
- [ ] 테스트
- [ ] 배포

## 이슈 및 리스크
| 이슈 | 심각도 | 상태 | 담당자 |
|------|--------|------|--------|
|      |        |      |        |

#프로젝트 #{{date}}`
            },
            diary: {
                name: "일기 템플릿",
                content: `# {{date}}

## 오늘 한 일
- 
- 

## 느낀 점
<!-- 오늘의 감정이나 생각 -->

## 배운 것
<!-- 새로 알게 된 것이나 깨달은 점 -->

## 내일 할 일
- [ ] 
- [ ] 

## 기분
😊 😐 😔 😤 😴

#일기 #{{date}}`
            },
            reference: {
                name: "참고자료 템플릿",
                content: `# {{title}}

## 기본 정보
- **출처:** 
- **저자:** 
- **날짜:** {{date}}
- **URL:** 

## 요약
<!-- 핵심 내용 요약 -->

## 주요 포인트
1. 
2. 
3. 

## 인용구
> 

## 관련 자료
- [관련 페이지](페이지명)
- 

## 내 생각
<!-- 개인적인 의견이나 분석 -->

#참고자료 #{{date}}`
            }
        };
        
        localStorage.setItem(this.templatesKey, JSON.stringify(defaultTemplates));
        return defaultTemplates;
    }

    getTemplate(templateId) {
        const templates = this.getTemplates();
        return templates[templateId] || null;
    }

    /**
     * Apply template to create page content
     */
    applyTemplate(templateId, pageTitle) {
        const template = this.getTemplate(templateId);
        if (!template) return '';
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dateKorean = today.toLocaleDateString('ko-KR');
        
        let content = template.content;
        content = content.replace(/\{\{title\}\}/g, pageTitle);
        content = content.replace(/\{\{date\}\}/g, dateKorean);
        content = content.replace(/\{\{date-iso\}\}/g, dateStr);
        
        return content;
    }

    /**
     * Enhanced search functionality
     */
    searchPages(query, options = {}) {
        const {
            includeContent = true,
            includeTitle = true,
            includeTags = true,
            limit = 50,
            excerpt = true
        } = options;
        
        if (!query.trim()) return [];
        
        const pages = this.getAllPages();
        const results = [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
        
        Object.entries(pages).forEach(([title, page]) => {
            let score = 0;
            let matches = [];
            let excerpts = [];
            
            // Title matching (highest priority)
            if (includeTitle) {
                const titleLower = title.toLowerCase();
                if (titleLower.includes(queryLower)) {
                    score += 100;
                    matches.push({ type: 'title', text: title });
                }
                
                // Word-based title matching
                queryWords.forEach(word => {
                    if (titleLower.includes(word)) {
                        score += 50;
                    }
                });
            }
            
            // Content matching
            if (includeContent && page.content) {
                const contentLower = page.content.toLowerCase();
                
                // Exact phrase matching
                if (contentLower.includes(queryLower)) {
                    score += 30;
                }
                
                // Word-based content matching
                queryWords.forEach(word => {
                    const wordCount = (contentLower.match(new RegExp(word, 'g')) || []).length;
                    score += wordCount * 5;
                    
                    if (wordCount > 0 && excerpt) {
                        // Find excerpts containing the word
                        const sentences = page.content.split(/[.!?]\s+/);
                        sentences.forEach(sentence => {
                            if (sentence.toLowerCase().includes(word)) {
                                excerpts.push(sentence.trim());
                            }
                        });
                    }
                });
            }
            
            // Tags matching
            if (includeTags && page.tags) {
                page.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(queryLower)) {
                        score += 20;
                        matches.push({ type: 'tag', text: `#${tag}` });
                    }
                });
            }
            
            if (score > 0) {
                results.push({
                    title,
                    page,
                    score,
                    matches,
                    excerpts: excerpts.slice(0, 3), // Limit to 3 excerpts
                    highlighted: this.highlightText(title, queryWords)
                });
            }
        });
        
        // Sort by score (descending) and return limited results
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Highlight search terms in text
     */
    highlightText(text, queryWords) {
        let highlighted = text;
        queryWords.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        return highlighted;
    }

    /**
     * Get search suggestions
     */
    getSearchSuggestions(query, limit = 10) {
        if (!query.trim()) return [];
        
        const pages = this.getAllPages();
        const suggestions = new Set();
        const queryLower = query.toLowerCase();
        
        // Title suggestions
        Object.keys(pages).forEach(title => {
            if (title.toLowerCase().includes(queryLower)) {
                suggestions.add(title);
            }
        });
        
        // Tag suggestions
        const allTags = this.getAllTags();
        allTags.forEach(({ tag }) => {
            if (tag.toLowerCase().includes(queryLower)) {
                suggestions.add(`#${tag}`);
            }
        });
        
        return Array.from(suggestions).slice(0, limit);
    }
}

// Export for use in other modules
window.WikiStorage = WikiStorage;
