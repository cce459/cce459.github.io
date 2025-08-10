/**
 * Storage utility for managing wiki pages with real-time database backend
 */
class WikiStorage {
    constructor() {
        console.log('WikiStorage constructor started');
        this.apiBaseUrl = '/pages';
        this.imagesApiUrl = '/api/images';
        this.commentsApiUrl = '/pages';
        console.log('API URLs set:', {
            apiBaseUrl: this.apiBaseUrl,
            imagesApiUrl: this.imagesApiUrl,
            commentsApiUrl: this.commentsApiUrl
        });
        
        // Local cache for better performance
        this.pageCache = new Map();
        this.settingsKey = 'wiki-settings';
        this.recentKey = 'wiki-recent';
        this.favoritesKey = 'wiki-favorites';
        this.templatesKey = 'wiki-templates';
        
        console.log('Starting storage initialization...');
        this.initializeStorage();
    }

    /**
     * Initialize storage - create default page if needed
     */
    async initializeStorage() {
        try {
            console.log('Getting all page titles...');
            const pages = await this.getAllPageTitles();
            console.log('Page titles received:', pages);
            if (pages.length === 0) {
                console.log('No pages found, creating default pages...');
                await this.createDefaultPages();
            }
            console.log('Storage initialization completed');
        } catch (error) {
            console.error('Error initializing storage:', error);
            console.error('Error type:', typeof error);
            console.error('Error name:', error.name);  
            console.error('Error message:', error.message);
            if (error.stack) console.error('Error stack:', error.stack);
        }
    }

    /**
     * Create default pages for new wikis
     */
    async createDefaultPages() {
        const defaultContent = `= 개인 위키에 오신 것을 환영합니다 =

이곳은 당신의 개인 위키 홈페이지입니다. 위의 네비게이션을 사용하여 이 페이지를 편집하거나 새 페이지를 만들 수 있습니다.

== 시작하기 ==

* '''편집''' 버튼을 클릭하여 이 페이지를 수정하세요
* '''새로 만들기''' 버튼을 사용하여 추가 페이지를 만드세요
* 검색 창을 사용하여 페이지를 빠르게 찾으세요
* 다음 형식으로 다른 페이지에 링크하세요: [[소개]]

== 위키 문법 ==

이 위키는 나무위키 스타일의 문법을 사용합니다:

=== 헤더 ===
헤더에 = 사용 (= == ===)

=== 텍스트 서식 ===
* '''굵은 텍스트'''는 세 개의 따옴표로
* --취소선--은 두 개의 대시로
* 각주는 [* 각주 내용] 형태로

=== 링크 ===
위키 내부 링크: [[소개]]
외부 링크: [https://google.com 구글]
커스텀 링크: [[소개|소개 페이지]]

=== 분류 ===
[[분류:도움말]]

=== 기타 ===
YouTube 동영상: [[htp://yt.VIDEO_ID]]
이미지: ![파일명]

즐겁게 작성하세요!`;

        try {
            await this.savePage('대문', defaultContent, { tags: ['도움말'] });
            console.log('기본 페이지 생성 완료');
        } catch (error) {
            console.error('Error creating default pages:', error);
        }
    }

    /**
     * Get all page titles from server
     */
    async getAllPageTitles() {
        try {
            console.log('Fetching page titles from:', this.apiBaseUrl);
            const response = await fetch(this.apiBaseUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Page titles data:', data);
            return data;
        } catch (error) {
            console.error('Error fetching page titles:', error);
            console.error('Failed URL:', this.apiBaseUrl);
            console.error('Error details:', error.message, error.stack);
            return [];
        }
    }

    /**
     * Get all pages (for backwards compatibility)
     */
    async getAllPages() {
        try {
            const titles = await this.getAllPageTitles();
            const pages = {};
            
            for (const title of titles) {
                const page = await this.getPage(title);
                if (page) {
                    pages[title] = {
                        title: page.title,
                        content: page.content,
                        created: new Date(page.createdAt).getTime(),
                        modified: new Date(page.lastModified).getTime(),
                        version: 1,
                        metadata: page.metadata || {}
                    };
                }
            }
            
            return pages;
        } catch (error) {
            console.error('Error fetching all pages:', error);
            return {};
        }
    }

    /**
     * Get a specific page from server
     */
    async getPage(title) {
        try {
            console.log('Getting page:', title);
            // Check cache first
            if (this.pageCache.has(title)) {
                const cached = this.pageCache.get(title);
                if (Date.now() - cached.timestamp < 30000) { // 30초 캐시
                    console.log('Using cached page for:', title);
                    return cached.data;
                }
            }
            
            const url = `${this.apiBaseUrl}/${encodeURIComponent(title)}`;
            console.log('Fetching page from URL:', url);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });
            console.log('Page response status:', response.status);
            if (response.status === 404) {
                console.log('Page not found:', title);
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const page = await response.json();
            console.log('Page data received:', page);
            
            // Cache the result
            this.pageCache.set(title, {
                data: page,
                timestamp: Date.now()
            });
            
            return page;
        } catch (error) {
            console.error('Error fetching page:', error);
            console.error('Failed URL:', `${this.apiBaseUrl}/${encodeURIComponent(title)}`);
            console.error('Error type:', typeof error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            if (error.stack) console.error('Error stack:', error.stack);
            return null;
        }
    }

    /**
     * Save a page to server
     */
    async savePage(title, content, metadata = {}) {
        try {
            const url = `${this.apiBaseUrl}/${encodeURIComponent(title)}`;
            const requestBody = { content, metadata };
            
            console.log('Saving page:', title);
            console.log('Save URL:', url);
            console.log('Request body:', requestBody);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(requestBody)
            });

            console.log('Save response status:', response.status);
            console.log('Save response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Save error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();
            console.log('Save result:', result);
            
            // Update cache
            this.pageCache.set(title, {
                data: result.page,
                timestamp: Date.now()
            });
            
            // Update recent pages
            this.addToRecent(title);
            
            return result;
        } catch (error) {
            console.error('Error saving page:', error);
            console.error('Failed URL:', `${this.apiBaseUrl}/${encodeURIComponent(title)}`);
            console.error('Request body:', JSON.stringify({ content, metadata }));
            console.error('Error type:', typeof error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            if (error.stack) console.error('Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Delete a page (implementation for future use)
     */
    async deletePage(title) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/${encodeURIComponent(title)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Remove from cache
            this.pageCache.delete(title);
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting page:', error);
            throw error;
        }
    }

    /**
     * Add comment to a page
     */
    async addComment(pageTitle, author, content) {
        try {
            const response = await fetch(`${this.commentsApiUrl}/${encodeURIComponent(pageTitle)}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    author,
                    content
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    /**
     * Update a comment
     */
    async updateComment(commentId, content) {
        try {
            const response = await fetch(`/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating comment:', error);
            throw error;
        }
    }

    /**
     * Delete a comment
     */
    async deleteComment(commentId) {
        try {
            const response = await fetch(`/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }

    /**
     * Upload image to server
     */
    async uploadImage(name, data, size, mimeType) {
        try {
            const response = await fetch(this.imagesApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    data,
                    size,
                    mimeType
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    /**
     * Get all images from server
     */
    async getAllImages() {
        try {
            const response = await fetch(this.imagesApiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching images:', error);
            return [];
        }
    }

    /**
     * Delete image from server
     */
    async deleteImage(name) {
        try {
            const response = await fetch(`${this.imagesApiUrl}/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    // Local storage methods (for settings, recent pages, favorites, etc.)
    
    /**
     * Get settings from localStorage
     */
    getSettings() {
        const settings = localStorage.getItem(this.settingsKey);
        return settings ? JSON.parse(settings) : {
            darkMode: false,
            autoSave: true,
            autoSaveInterval: 30000
        };
    }

    /**
     * Save settings to localStorage
     */
    saveSettings(settings) {
        localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    }

    /**
     * Get recent pages from localStorage
     */
    getRecentPages() {
        const recent = localStorage.getItem(this.recentKey);
        return recent ? JSON.parse(recent) : [];
    }

    /**
     * Add page to recent list
     */
    addToRecent(title) {
        let recent = this.getRecentPages();
        recent = recent.filter(page => page !== title);
        recent.unshift(title);
        recent = recent.slice(0, 10); // Keep only 10 recent pages
        localStorage.setItem(this.recentKey, JSON.stringify(recent));
    }

    /**
     * Get favorites from localStorage
     */
    getFavorites() {
        const favorites = localStorage.getItem(this.favoritesKey);
        return favorites ? JSON.parse(favorites) : [];
    }

    /**
     * Add/remove page from favorites
     */
    toggleFavorite(title) {
        let favorites = this.getFavorites();
        const index = favorites.indexOf(title);
        
        if (index === -1) {
            favorites.push(title);
        } else {
            favorites.splice(index, 1);
        }
        
        localStorage.setItem(this.favoritesKey, JSON.stringify(favorites));
        return favorites.includes(title);
    }

    /**
     * Get page templates from localStorage
     */
    getTemplates() {
        const templates = localStorage.getItem(this.templatesKey);
        return templates ? JSON.parse(templates) : {
            '노트': {
                name: '노트',
                content: `= {{title}} =

== 개요 ==


== 내용 ==


== 참고 ==

[[분류:노트]]`
            },
            '회의': {
                name: '회의',
                content: `= {{title}} =

'''날짜:''' {{date}}
'''참석자:''' 

== 안건 ==

1. 

== 논의 내용 ==


== 결정 사항 ==


== 액션 아이템 ==

* [ ] 

[[분류:회의]]`
            },
            '프로젝트': {
                name: '프로젝트',
                content: `= {{title}} =

== 프로젝트 개요 ==

'''목표:''' 
'''기간:''' 
'''담당자:''' 

== 진행 상황 ==

* [ ] 

== 참고 자료 ==


[[분류:프로젝트]]`
            },
            '일기': {
                name: '일기',
                content: `= {{date}} =

== 오늘의 일정 ==


== 있었던 일 ==


== 생각과 느낌 ==


== 내일 할 일 ==

* [ ] 

[[분류:일기]]`
            },
            '참고자료': {
                name: '참고자료',
                content: `= {{title}} =

== 요약 ==


== 주요 내용 ==


== 출처 ==


== 관련 링크 ==


[[분류:참고자료]]`
            }
        };
    }

    /**
     * Save templates to localStorage
     */
    saveTemplates(templates) {
        localStorage.setItem(this.templatesKey, JSON.stringify(templates));
    }

    /**
     * Clear page cache
     */
    clearCache() {
        this.pageCache.clear();
    }

    /**
     * Export all data for backup
     */
    async exportData() {
        try {
            const pages = await this.getAllPages();
            const settings = this.getSettings();
            const recent = this.getRecentPages();
            const favorites = this.getFavorites();
            const templates = this.getTemplates();
            const images = await this.getAllImages();

            return {
                pages,
                settings,
                recent,
                favorites,
                templates,
                images,
                exportDate: new Date().toISOString(),
                version: '2.0'
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Import data from backup (partial implementation)
     */
    async importData(data) {
        try {
            if (data.settings) {
                this.saveSettings(data.settings);
            }
            
            if (data.favorites) {
                localStorage.setItem(this.favoritesKey, JSON.stringify(data.favorites));
            }
            
            if (data.templates) {
                this.saveTemplates(data.templates);
            }

            // Note: Pages and images would need to be imported through the API
            // This would require additional server endpoints
            
            console.log('Data import completed (settings, favorites, templates)');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    /**
     * Check if a page is a category page
     */
    isCategoryPage(title) {
        return title && title.startsWith('분류:');
    }

    /**
     * Get page titles (backward compatibility)
     */
    async getPageTitles() {
        return await this.getAllPageTitles();
    }

    /**
     * Get backlinks for a page
     */
    async getBacklinks(pageTitle) {
        try {
            const allPages = await this.getAllPages();
            const backlinks = [];
            
            for (const [title, page] of Object.entries(allPages)) {
                if (title === pageTitle) continue;
                
                // Check for links in content
                const linkRegex = new RegExp(`\\[\\[${pageTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\|[^\\]]+)?\\]\\]`, 'g');
                if (linkRegex.test(page.content)) {
                    backlinks.push(title);
                }
            }
            
            return backlinks;
        } catch (error) {
            console.error('Error getting backlinks:', error);
            return [];
        }
    }

    /**
     * Get outgoing links from a page
     */
    getOutgoingLinks(content) {
        const links = [];
        const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
        let match;
        
        while ((match = linkRegex.exec(content)) !== null) {
            const link = match[1];
            if (!links.includes(link)) {
                links.push(link);
            }
        }
        
        return links;
    }

    /**
     * Get comments for a page
     */
    async getComments(pageTitle) {
        try {
            const page = await this.getPage(pageTitle);
            return page ? page.comments || [] : [];
        } catch (error) {
            console.error('Error getting comments:', error);
            return [];
        }
    }

    /**
     * Check if page exists
     */
    async pageExists(title) {
        try {
            const page = await this.getPage(title);
            return !!page;
        } catch (error) {
            return false;
        }
    }

    /**
     * Save draft to localStorage (for auto-save)
     */
    saveDraft(title, content) {
        const draft = {
            title,
            content,
            timestamp: Date.now()
        };
        localStorage.setItem('wiki-draft', JSON.stringify(draft));
    }

    /**
     * Get saved draft from localStorage
     */
    getDraft() {
        const draft = localStorage.getItem('wiki-draft');
        return draft ? JSON.parse(draft) : null;
    }

    /**
     * Clear saved draft
     */
    clearDraft() {
        localStorage.removeItem('wiki-draft');
    }

    /**
     * Get page statistics
     */
    async getStats() {
        try {
            const titles = await this.getAllPageTitles();
            const images = await this.getAllImages();
            const favorites = this.getFavorites();
            
            const totalPages = titles.length;
            const totalImages = images.length;
            const totalFavorites = favorites.length;
            
            // Calculate total content size
            let totalContentSize = 0;
            for (const title of titles) {
                const page = await this.getPage(title);
                if (page) {
                    totalContentSize += page.content.length;
                }
            }
            
            return {
                totalPages,
                totalImages,
                totalFavorites,
                totalContentSize
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                totalPages: 0,
                totalImages: 0,
                totalFavorites: 0,
                totalContentSize: 0
            };
        }
    }
}