/**
 * Main Wiki Application
 */
class WikiApp {
    constructor() {
        this.storage = new WikiStorage();
        this.renderer = new WikiRenderer();
        this.search = null;
        
        // Make app instance globally available for renderer
        window.app = this;
        
        this.currentPage = '대문';
        this.isEditMode = false;
        this.hasUnsavedChanges = false;
        
        // WebSocket connection for real-time updates
        this.websocket = null;
        this.initWebSocket();
        
        this.elements = {};
        this.bindElements();
        this.init();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.elements = {
            // Navigation
            pageList: document.getElementById('page-list'),
            recentList: document.getElementById('recent-list'),
            
            // View mode
            pageView: document.getElementById('page-view'),
            pageTitle: document.getElementById('page-title'),
            pageContent: document.getElementById('page-content'),
            lastModified: document.getElementById('last-modified'),
            
            // Edit mode
            pageEdit: document.getElementById('page-edit'),
            pageTitleInput: document.getElementById('page-title-input'),
            pageEditor: document.getElementById('page-editor'),
            previewContent: document.getElementById('preview-content'),
            
            // Buttons
            editToggle: document.getElementById('edit-toggle'),
            newPageBtn: document.getElementById('new-page'),
            savePage: document.getElementById('save-page'),
            cancelEdit: document.getElementById('cancel-edit'),
            
            // New page modal
            newPageModal: document.getElementById('new-page-modal'),
            newPageTitle: document.getElementById('new-page-title'),
            createPage: document.getElementById('create-page'),
            cancelNewPage: document.getElementById('cancel-new-page'),
            
            // Settings
            settingsBtn: document.getElementById('settings-btn'),
            settingsMenu: document.getElementById('settings-menu'),
            darkModeToggle: document.getElementById('dark-mode-toggle'),

            exportDataBtn: document.getElementById('export-data-btn'),
            importDataBtn: document.getElementById('import-data-btn'),
            importFile: document.getElementById('import-file'),
            wikiStatsBtn: document.getElementById('wiki-stats-btn'),
            
            // Image management
            uploadImageBtn: document.getElementById('upload-image-btn'),
            manageImagesBtn: document.getElementById('manage-images-btn'),
            imageFile: document.getElementById('image-file'),
            imageManagementModal: document.getElementById('image-management-modal'),
            imageGrid: document.getElementById('image-grid'),
            closeImages: document.getElementById('close-images'),
            

            
            // Stats modal
            wikiStatsModal: document.getElementById('wiki-stats-modal'),
            statsContent: document.getElementById('stats-content'),
            closeStats: document.getElementById('close-stats'),
            
            // Update History modal
            updateHistoryBtn: document.getElementById('update-history-btn'),
            updateHistoryModal: document.getElementById('update-history-modal'),
            updateHistoryContent: document.getElementById('update-history-content'),
            refreshHistoryBtn: document.getElementById('refresh-history'),
            closeHistoryModal: document.getElementById('close-history-modal'),
            
            // Tagged pages modal
            taggedPagesModal: document.getElementById('tagged-pages-modal'),
            taggedPagesTitle: document.getElementById('tagged-pages-title'),
            taggedPagesContent: document.getElementById('tagged-pages-content'),
            closeTaggedPages: document.getElementById('close-tagged-pages'),
            
            // Backlinks modal
            backlinksModal: document.getElementById('backlinks-modal'),
            backlinksTitle: document.getElementById('backlinks-title'),
            backlinksContent: document.getElementById('backlinks-content'),
            closeBacklinks: document.getElementById('close-backlinks'),
            
            // Page footer elements
            pageTags: document.getElementById('page-tags'),
            backlinksSection: document.getElementById('backlinks-section'),
            outgoingLinksSection: document.getElementById('outgoing-links-section'),
            popularTags: document.getElementById('popular-tags'),
            
            // Search
            searchInput: document.getElementById('search-input'),
            searchResults: document.getElementById('search-results'),
            
            // Favorites
            favoriteBtn: document.getElementById('favorite-btn'),
            favoritesList: document.getElementById('favorites-list'),
            
            // Templates
            pageTemplate: document.getElementById('page-template'),
            
            // Comments
            commentsSection: document.getElementById('comments-section'),
            commentsList: document.getElementById('comments-list'),
            commentInput: document.getElementById('comment-input'),
            commentAuthor: document.getElementById('comment-author'),
            addCommentBtn: document.getElementById('add-comment-btn'),
            
            // Loading
            loading: document.getElementById('loading')
        };
    }

    /**
     * Initialize WebSocket connection for real-time updates
     */
    initWebSocket() {
        try {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log('WebSocket 연결됨');
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleRealtimeUpdate(data);
                } catch (error) {
                    console.error('WebSocket 메시지 처리 오류:', error);
                }
            };
            
            this.websocket.onclose = () => {
                console.log('WebSocket 연결 해제됨');
                // 재연결 시도
                setTimeout(() => {
                    this.initWebSocket();
                }, 5000);
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
            };
        } catch (error) {
            console.error('WebSocket 초기화 오류:', error);
        }
    }

    /**
     * Handle real-time updates from WebSocket
     */
    handleRealtimeUpdate(data) {
        switch (data.type) {
            case 'pageUpdated':
                // 현재 보고 있는 페이지가 업데이트된 경우
                if (data.page.title === this.currentPage && !this.isEditMode) {
                    this.loadPage(this.currentPage, false); // 페이지 다시 로드
                }
                this.updateNavigation(); // 네비게이션 업데이트
                break;
                
            case 'commentAdded':
                // 현재 페이지에 댓글이 추가된 경우
                if (data.pageTitle === this.currentPage) {
                    this.updateComments();
                }
                break;
                
            case 'commentUpdated':
            case 'commentDeleted':
                // 댓글이 수정/삭제된 경우
                this.updateComments();
                break;
        }
    }

    /**
     * Initialize the application
     */
    init() {
        try {
            this.setupEventListeners();
            this.setupSettingsEvents();
            this.initializeDarkMode();
            this.initializeFeatherIcons();
            this.setupSearch();
            this.setupUrlRouting();
            this.setupAutoSave();
            this.setupTagsAndLinksEvents();
            this.setupFavoritesEvents();
            this.setupCommentsEvents();
            
            // Load page after everything is set up
            setTimeout(async () => {
                await this.loadPage(this.currentPage);
                await this.updateNavigation();
                this.updatePopularTags();
                this.updateFavoritesList();
                this.updateComments();
            }, 100);
        } catch (error) {
            console.error('Application initialization error:', error);
            this.hideLoading();
        }
    }

    /**
     * Convert Korean/Unicode page name to punycode for URL
     * @param {string} pageName - Original page name
     * @returns {string} Punycode encoded page name
     */
    pageNameToPunycode(pageName) {
        try {
            // Use TextEncoder to convert to UTF-8, then base64url encode
            const utf8Bytes = new TextEncoder().encode(pageName);
            const base64 = btoa(String.fromCharCode(...utf8Bytes));
            // Make URL safe by replacing characters
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        } catch (error) {
            console.error('Error encoding page name:', error);
            return encodeURIComponent(pageName);
        }
    }

    /**
     * Convert punycode URL back to original page name
     * @param {string} encoded - Punycode encoded string
     * @returns {string} Original page name
     */
    punycodeToPageName(encoded) {
        try {
            // Restore base64 format
            let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            // Add padding if needed
            while (base64.length % 4) {
                base64 += '=';
            }
            
            const binaryString = atob(base64);
            const utf8Bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                utf8Bytes[i] = binaryString.charCodeAt(i);
            }
            
            return new TextDecoder().decode(utf8Bytes);
        } catch (error) {
            console.error('Error decoding page name:', error);
            return decodeURIComponent(encoded);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Edit toggle
        this.elements.editToggle.addEventListener('click', () => {
            this.toggleEditMode();
        });

        // New page
        this.elements.newPageBtn.addEventListener('click', () => {
            this.showNewPageModal();
        });

        // Save page
        this.elements.savePage.addEventListener('click', () => {
            this.savePage();
        });

        // Cancel edit
        this.elements.cancelEdit.addEventListener('click', () => {
            this.cancelEdit();
        });

        // New page modal
        this.elements.createPage.addEventListener('click', () => {
            this.createNewPage();
        });

        this.elements.cancelNewPage.addEventListener('click', () => {
            this.hideNewPageModal();
        });

        // Enter key in new page input
        this.elements.newPageTitle.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createNewPage();
            }
        });

        // Live preview in edit mode
        this.elements.pageEditor.addEventListener('input', async () => {
            await this.updatePreview();
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
        });

        this.elements.pageTitleInput.addEventListener('input', () => {
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
        });

        // Click on modal background to close
        this.elements.newPageModal.addEventListener('click', (e) => {
            if (e.target === this.elements.newPageModal) {
                this.hideNewPageModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                const message = '저장되지 않은 변경사항이 있습니다. 정말 나가시겠습니까?';
                e.returnValue = message;
                return message;
            }
        });

        // Handle internal links
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('internal-link')) {
                e.preventDefault();
                const pageName = e.target.dataset.page;
                this.navigateToPage(pageName);
            }
        });
        
        // Handle category links
        document.addEventListener('click', (e) => {
            const categoryElement = e.target.closest('.category-link');
            if (categoryElement) {
                e.preventDefault();
                const categoryPage = categoryElement.dataset.category;
                this.navigateToPage(categoryPage);
            }
        });

        // Handle navigation events from search
        document.addEventListener('navigate-to-page', (e) => {
            this.navigateToPage(e.detail.pageName);
        });

        // Handle footnote references
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('footnote-ref')) {
                e.preventDefault();
                e.stopPropagation();
                const footnoteId = e.target.dataset.footnote;
                this.scrollToFootnote(footnoteId);
            }
        });

        // Handle footnote back references
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('footnote-backref')) {
                e.preventDefault();
                e.stopPropagation();
                const backrefId = e.target.dataset.backref;
                this.scrollToBackref(backrefId);
            }
        });
    }

    /**
     * Initialize Feather icons
     */
    initializeFeatherIcons() {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    /**
     * Setup search functionality
     */
    setupSearch() {
        this.search = new WikiSearch(this.storage, this.renderer);
        // Make app available globally
        window.app = this;
    }

    /**
     * Setup URL routing
     */
    setupUrlRouting() {
        // Handle initial URL - check for both path-based and hash-based routing
        const pathname = window.location.pathname;
        const hash = window.location.hash.substring(1);
        
        let targetPage = null;
        
        // Check if we have a path-based route (excluding root)
        if (pathname && pathname !== '/' && pathname !== '/index.html') {
            const encodedPageName = pathname.substring(1); // Remove leading /
            try {
                targetPage = this.punycodeToPageName(encodedPageName);
            } catch (error) {
                console.warn('Failed to decode path, falling back to hash:', error);
            }
        }
        
        // Fallback to hash-based routing if no path or decoding failed
        if (!targetPage && hash) {
            targetPage = decodeURIComponent(hash);
        }
        
        // Navigate to the target page if it differs from current
        if (targetPage && targetPage !== this.currentPage) {
            this.navigateToPage(targetPage);
        }

        // Handle back/forward buttons
        window.addEventListener('popstate', (e) => {
            const pageName = e.state?.page || '대문';
            this.loadPage(pageName, false); // Don't push state again
        });

        // Push initial state with punycode URL
        const encodedCurrentPage = this.pageNameToPunycode(this.currentPage);
        history.replaceState({ page: this.currentPage }, '', `/${encodedCurrentPage}`);
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        // Auto-save draft every 30 seconds
        setInterval(() => {
            if (this.isEditMode && this.hasUnsavedChanges) {
                this.saveDraft();
            }
        }, 30000);
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + E: Toggle edit mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !this.isModalOpen()) {
            e.preventDefault();
            this.toggleEditMode();
        }

        // Ctrl/Cmd + S: Save page (in edit mode)
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isEditMode) {
            e.preventDefault();
            this.savePage();
        }

        // Ctrl/Cmd + N: New page
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !this.isModalOpen()) {
            e.preventDefault();
            this.showNewPageModal();
        }

        // Escape: Cancel edit or close modal
        if (e.key === 'Escape') {
            if (this.isModalOpen()) {
                this.hideNewPageModal();
            } else if (this.isEditMode) {
                this.cancelEdit();
            }
        }
    }

    /**
     * Check if modal is open
     * @returns {boolean} Whether modal is open
     */
    isModalOpen() {
        return this.elements.newPageModal.style.display === 'block';
    }

    /**
     * Load a page
     * @param {string} pageName - Name of page to load
     * @param {boolean} pushState - Whether to push browser state
     */
    async loadPage(pageName, pushState = true) {
        this.showLoading();
        
        try {
            // Check for unsaved changes
            if (this.hasUnsavedChanges && !this.confirmLeavePage()) {
                this.hideLoading();
                return;
            }

            const page = await this.storage.getPage(pageName);
            
            if (!page) {
                console.log(`Page "${pageName}" not found, creating new page`);
                // Page doesn't exist, create it
                this.createPageAndEdit(pageName);
                this.hideLoading();
                return;
            }

            this.currentPage = pageName;
            
            // Show the page content
            this.elements.pageTitle.textContent = page.title;
            
            // Validate page data structure
            if (!page.content) {
                console.warn('Page content is missing, using empty content');
                page.content = '';
            }
            
            this.elements.pageContent.innerHTML = this.storage.isCategoryPage(page.title) 
                ? this.renderCategoryPage(page) 
                : await this.renderer.render(page.content);
            
            this.updateLastModified(page.lastModified);
            
            // Update edit form
            this.elements.pageTitleInput.value = page.title;
            this.elements.pageEditor.value = page.content;
            await this.updatePreview();
            
            // Update navigation
            this.updateNavigation();
            
            // Update page footer with tags and links
            this.updatePageFooter(page);
            
            // Update favorite button state
            this.updateFavoriteButton(pageName);
            
            // Update comments
            this.updateComments();
            
            // Update URL with punycode encoding
            if (pushState) {
                const encodedPageName = this.pageNameToPunycode(pageName);
                history.pushState({ page: pageName }, '', `/${encodedPageName}`);
            }
            
            // Update recent pages
            this.storage.addToRecent(pageName);
            this.updateRecentList();
            this.updatePopularTags();
            
            // Exit edit mode
            if (this.isEditMode) {
                this.setEditMode(false);
            }
            
            this.hasUnsavedChanges = false;
            this.updateSaveButton();
        } catch (error) {
            console.error('Error loading page:', error);
            console.error('Error type:', typeof error);
            console.error('Error name:', error.name);  
            console.error('Error message:', error.message);
            if (error.stack) console.error('Error stack:', error.stack);
            // Show fallback content
            this.elements.pageTitle.textContent = pageName;
            this.elements.pageContent.innerHTML = '<p>페이지를 로드하는 중 오류가 발생했습니다. 새로고침해 주세요.</p>';
            
            // Try to initialize the page if it doesn't exist
            if (pageName === '대문') {
                this.elements.pageContent.innerHTML = `
                    <p>위키 시스템이 초기화되고 있습니다...</p>
                    <p>잠시 후 페이지를 다시 로드해주세요.</p>
                `;
            }
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Navigate to a page
     * @param {string} pageName - Name of page to navigate to
     */
    navigateToPage(pageName) {
        this.loadPage(pageName);
    }

    /**
     * Create a new page and start editing
     * @param {string} pageName - Name of new page
     */
    async createPageAndEdit(pageName) {
        try {
            this.currentPage = pageName;
            
            // Initialize empty page
            this.elements.pageTitle.textContent = pageName;
            this.elements.pageContent.innerHTML = '<p><em>이 페이지는 비어있습니다. 편집 버튼을 클릭하여 내용을 추가하세요.</em></p>';
            this.updateLastModified(null);
            
            // Initialize edit form
            this.elements.pageTitleInput.value = pageName;
            this.elements.pageEditor.value = '';
            this.updatePreview();
            
            // Enter edit mode
            this.setEditMode(true);
            
            // Update navigation
            await this.updateNavigation();
            
            // Update URL
            const encodedPageName = this.pageNameToPunycode(pageName);
            history.pushState({ page: pageName }, '', `/${encodedPageName}`);
            
            this.hasUnsavedChanges = false;
            this.updateSaveButton();
            
            // Focus on editor
            setTimeout(() => {
                this.elements.pageEditor.focus();
            }, 100);
        } catch (error) {
            console.error('Error creating page:', error);
        }
    }

    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        if (this.isEditMode) {
            this.cancelEdit();
        } else {
            this.setEditMode(true);
        }
    }

    /**
     * Set edit mode
     * @param {boolean} editMode - Whether to enable edit mode
     */
    setEditMode(editMode) {
        this.isEditMode = editMode;
        
        if (editMode) {
            this.elements.pageView.style.display = 'none';
            this.elements.pageEdit.style.display = 'block';
            this.elements.editToggle.innerHTML = '<i data-feather="eye"></i> 돌아가기';
            this.elements.pageEditor.focus();
        } else {
            this.elements.pageView.style.display = 'block';
            this.elements.pageEdit.style.display = 'none';
            this.elements.editToggle.innerHTML = '<i data-feather="edit"></i> 편집';
        }
        
        this.initializeFeatherIcons();
    }

    /**
     * Update live preview
     */
    async updatePreview() {
        const content = this.elements.pageEditor.value;
        const title = this.elements.pageTitleInput.value.trim();
        
        // Check if this is a category page for preview
        if (this.storage.isCategoryPage(title)) {
            const mockPage = { title, content };
            this.elements.previewContent.innerHTML = this.renderCategoryPage(mockPage);
        } else {
            this.elements.previewContent.innerHTML = await this.renderer.render(content);
        }
    }

    /**
     * Save the current page
     */
    async savePage() {
        const title = this.elements.pageTitleInput.value.trim();
        const content = this.elements.pageEditor.value;
        
        if (!title) {
            alert('페이지 제목을 입력해주세요.');
            this.elements.pageTitleInput.focus();
            return;
        }

        try {
            // Extract metadata (tags, categories, etc.)
            const metadata = this.extractMetadata(content);
            
            const result = await this.storage.savePage(title, content, metadata);
            
            if (result && result.status === 'saved') {
                this.currentPage = title;
                
                // Update view
                this.elements.pageTitle.textContent = title;
                
                // Check if this is a category page and render accordingly
                if (this.storage.isCategoryPage(title)) {
                    const page = await this.storage.getPage(title);
                    this.elements.pageContent.innerHTML = this.renderCategoryPage(page);
                } else {
                    this.elements.pageContent.innerHTML = this.renderer.render(content);
                }
                
                const page = result.page;
                this.updateLastModified(new Date(page.lastModified).getTime());
                
                // Update navigation and URL
                await this.updateNavigation();
                const encodedTitle = this.pageNameToPunycode(title);
                history.replaceState({ page: title }, '', `/${encodedTitle}`);
                
                // Exit edit mode
                this.setEditMode(false);
                
                this.hasUnsavedChanges = false;
                this.updateSaveButton();
                
                this.showNotification('페이지가 저장되었습니다!', 'success');
            }
        } catch (error) {
            console.error('Error saving page:', error);
            let errorMessage = '페이지 저장에 실패했습니다. ';
            if (error.message) {
                errorMessage += `오류: ${error.message}`;
            } else {
                errorMessage += '다시 시도해 주세요.';
            }
            this.showNotification(errorMessage, 'error');
        }
    }

    /**
     * Extract metadata from page content
     */
    extractMetadata(content) {
        const metadata = {};
        
        // Extract tags
        const tagMatches = content.match(/#[\w가-힣]+/g);
        if (tagMatches) {
            metadata.tags = tagMatches.map(tag => tag.substring(1));
        }
        
        // Extract categories
        const categoryMatches = content.match(/\[\[분류:([^\]]+)\]\]/g);
        if (categoryMatches) {
            metadata.categories = categoryMatches.map(match => {
                const categoryMatch = match.match(/\[\[분류:([^\]]+)\]\]/);
                return categoryMatch ? categoryMatch[1] : '';
            }).filter(cat => cat);
        }
        
        return metadata;
    }

    /**
     * Cancel editing
     */
    cancelEdit() {
        if (this.hasUnsavedChanges && !confirm('저장되지 않은 변경사항이 있습니다. 정말 취소하시겠습니까?')) {
            return;
        }
        
        // Restore original values
        this.storage.getPage(this.currentPage).then(page => {
            if (page) {
                this.elements.pageTitleInput.value = page.title;
                this.elements.pageEditor.value = page.content;
                this.updatePreview();
            }
        }).catch(error => {
            console.error('Error loading page for cancel:', error);
        });
        
        this.setEditMode(false);
        this.hasUnsavedChanges = false;
        this.updateSaveButton();
    }

    /**
     * Show new page modal
     */
    showNewPageModal() {
        this.elements.newPageModal.style.display = 'flex';
        this.elements.newPageTitle.value = '';
        this.elements.newPageTitle.focus();
    }

    /**
     * Hide new page modal
     */
    hideNewPageModal() {
        this.elements.newPageModal.style.display = 'none';
    }

    /**
     * Create new page from modal
     */
    createNewPage() {
        const title = this.elements.newPageTitle.value.trim();
        
        if (!title) {
            alert('페이지 제목을 입력해주세요.');
            return;
        }
        
        // Check if page already exists
        this.storage.getPage(title).then(page => {
            if (page) {
                if (confirm(`페이지 "${title}"이 이미 존재합니다. 편집하시겠습니까?`)) {
                    this.hideNewPageModal();
                    this.navigateToPage(title);
                    this.setEditMode(true);
                }
                return;
            }
            
            this.hideNewPageModal();
            this.createPageAndEdit(title);
        }).catch(error => {
            console.error('Error checking page:', error);
            this.hideNewPageModal();
            this.createPageAndEdit(title);
        });
    }

    /**
     * Update navigation list
     */
    async updateNavigation() {
        try {
            const titles = await this.storage.getAllPageTitles();
            
            this.elements.pageList.innerHTML = titles.map(title => {
                const isActive = title === this.currentPage;
                const encodedTitle = this.pageNameToPunycode(title);
                return `
                    <li>
                        <a href="/${encodedTitle}" 
                           data-page="${title}" 
                           class="page-link ${isActive ? 'active' : ''}">
                            ${this.escapeHtml(title)}
                        </a>
                    </li>
                `;
            }).join('');
            
            // Bind page link events
            this.elements.pageList.addEventListener('click', (e) => {
                if (e.target.classList.contains('page-link')) {
                    e.preventDefault();
                    const pageName = e.target.dataset.page;
                    this.navigateToPage(pageName);
                }
            });
        } catch (error) {
            console.error('Error updating navigation:', error);
        }
    }

    /**
     * Update recent pages list
     */
    updateRecentList() {
        const recent = this.storage.getRecent().filter(title => title !== this.currentPage);
        
        if (recent.length === 0) {
            this.elements.recentList.innerHTML = '<li><em>No recent pages</em></li>';
            return;
        }
        
        this.elements.recentList.innerHTML = recent.slice(0, 5).map(title => {
            const encodedTitle = this.pageNameToPunycode(title);
            return `
                <li>
                    <a href="/${encodedTitle}" 
                       data-page="${title}" 
                       class="recent-link">
                        ${this.escapeHtml(title)}
                    </a>
                </li>
            `;
        }).join('');
        
        // Bind recent link events
        this.elements.recentList.addEventListener('click', (e) => {
            if (e.target.classList.contains('recent-link')) {
                e.preventDefault();
                const pageName = e.target.dataset.page;
                this.navigateToPage(pageName);
            }
        });
    }

    /**
     * Update last modified display
     * @param {number|null} timestamp - Modification timestamp
     */
    updateLastModified(timestamp) {
        if (timestamp) {
            const date = new Date(timestamp);
            this.elements.lastModified.textContent = `마지막 편집: ${date.toLocaleString()}`;
        } else {
            this.elements.lastModified.textContent = '편집된 적 없음';
        }
    }

    /**
     * Update save button state
     */
    updateSaveButton() {
        const button = this.elements.savePage;
        if (this.hasUnsavedChanges) {
            button.classList.add('btn-warning');
            button.classList.remove('btn-success');
            button.innerHTML = '<i data-feather="save"></i> 저장 *';
        } else {
            button.classList.remove('btn-warning');
            button.classList.add('btn-success');
            button.innerHTML = '<i data-feather="save"></i> 저장';
        }
        this.initializeFeatherIcons();
    }

    /**
     * Save draft to localStorage
     */
    saveDraft() {
        try {
            const draft = {
                page: this.currentPage,
                title: this.elements.pageTitleInput.value,
                content: this.elements.pageEditor.value,
                timestamp: Date.now()
            };
            localStorage.setItem('wiki-draft', JSON.stringify(draft));
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }

    /**
     * Load draft from localStorage
     */
    loadDraft() {
        try {
            const draft = localStorage.getItem('wiki-draft');
            if (draft) {
                const data = JSON.parse(draft);
                // Check if draft is recent (within 1 hour) and for current page
                if (data.page === this.currentPage && Date.now() - data.timestamp < 3600000) {
                    return data;
                }
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
        }
        return null;
    }

    /**
     * Clear saved draft
     */
    clearDraft() {
        localStorage.removeItem('wiki-draft');
    }

    /**
     * Confirm leaving page with unsaved changes
     * @returns {boolean} Whether user confirmed to leave
     */
    confirmLeavePage() {
        return confirm('You have unsaved changes. Are you sure you want to leave?');
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.elements.loading.style.display = 'flex';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.elements.loading.style.display = 'none';
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Set background color based on type
        let backgroundColor;
        switch (type) {
            case 'success':
                backgroundColor = '#4ade80';
                break;
            case 'error':
                backgroundColor = '#ef4444';
                break;
            case 'warning':
                backgroundColor = '#f59e0b';
                break;
            default:
                backgroundColor = '#3b82f6';
        }
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            z-index: 2000;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            font-weight: 500;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Render category page with list of pages in that category
     * @param {Object} page - Page object
     * @returns {string} Rendered HTML for category page
     */
    renderCategoryPage(page) {
        const categoryName = this.storage.getCategoryNameFromTitle(page.title);
        const pagesInCategory = this.storage.getPagesInCategory(categoryName);
        
        // Render the page content first
        let html = this.renderer.render(page.content);
        
        // Add category page list
        html += '<div class="category-page-list">';
        html += `<h3>"${this.escapeHtml(categoryName)}" 분류에 속한 페이지들</h3>`;
        
        if (pagesInCategory.length === 0) {
            html += '<p><em>이 분류에 속한 페이지가 없습니다.</em></p>';
        } else {
            html += '<ul class="category-pages">';
            for (const pageTitle of pagesInCategory) {
                html += `<li><a href="#" class="internal-link" data-page="${this.escapeHtml(pageTitle)}">${this.escapeHtml(pageTitle)}</a></li>`;
            }
            html += '</ul>';
            html += `<p class="category-count">총 ${pagesInCategory.length}개의 페이지</p>`;
        }
        
        html += '</div>';
        return html;
    }
    
    /**
     * Setup settings menu events
     */
    setupSettingsEvents() {
        // Settings menu toggle
        this.elements.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSettingsMenu();
        });
        
        // Dark mode toggle
        this.elements.darkModeToggle.addEventListener('change', () => {
            this.toggleDarkMode();
        });
        

        // Export data
        this.elements.exportDataBtn.addEventListener('click', () => {
            this.exportData();
        });
        
        // Import data
        this.elements.importDataBtn.addEventListener('click', () => {
            this.elements.importFile.click();
        });
        
        this.elements.importFile.addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });
        
        // Wiki stats - 모바일 터치 이벤트 개선
        if (this.elements.wikiStatsBtn) {
            this.elements.wikiStatsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showWikiStats();
            });
            
            // 터치 디바이스용 추가 이벤트
            this.elements.wikiStatsBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showWikiStats();
            });
        }

        // Update history
        this.elements.updateHistoryBtn.addEventListener('click', () => {
            this.showUpdateHistory();
        });
        
        // Image upload
        this.elements.uploadImageBtn.addEventListener('click', () => {
            console.log('Upload button clicked');
            this.elements.imageFile.click();
        });
        
        this.elements.imageFile.addEventListener('change', (e) => {
            console.log('File input changed, files:', e.target.files);
            if (e.target.files && e.target.files[0]) {
                this.uploadImage(e.target.files[0]);
            } else {
                console.log('No file selected');
            }
        });
        
        // Image management
        this.elements.manageImagesBtn.addEventListener('click', () => {
            this.showImageManagement();
        });
        
        // Close image management modal
        this.elements.closeImages.addEventListener('click', () => {
            this.elements.imageManagementModal.style.display = 'none';
        });
        
        // Modal close events

        
        this.elements.closeStats.addEventListener('click', () => {
            this.elements.wikiStatsModal.style.display = 'none';
        });

        // Close update history modal
        this.elements.closeHistoryModal.addEventListener('click', () => {
            this.elements.updateHistoryModal.style.display = 'none';
        });

        // Refresh update history
        this.elements.refreshHistoryBtn.addEventListener('click', () => {
            this.loadUpdateHistory();
        });
        
        // Close modals on background click
        [this.elements.wikiStatsModal, this.elements.imageManagementModal, this.elements.updateHistoryModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Click outside to close settings menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.settings-dropdown')) {
                this.closeSettingsMenu();
            }
        });
    }
    
    /**
     * Initialize dark mode from localStorage
     */
    initializeDarkMode() {
        const isDarkMode = localStorage.getItem('wiki-dark-mode') === 'true';
        this.elements.darkModeToggle.checked = isDarkMode;
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
    }
    
    /**
     * Toggle settings menu
     */
    toggleSettingsMenu() {
        const isVisible = this.elements.settingsMenu.style.display === 'block';
        this.elements.settingsMenu.style.display = isVisible ? 'none' : 'block';
    }
    
    /**
     * Close settings menu
     */
    closeSettingsMenu() {
        this.elements.settingsMenu.style.display = 'none';
    }
    
    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        const isDarkMode = this.elements.darkModeToggle.checked;
        document.body.classList.toggle('dark-mode', isDarkMode);
        localStorage.setItem('wiki-dark-mode', isDarkMode.toString());
        this.showNotification(
            isDarkMode ? '다크 모드가 활성화되었습니다.' : '라이트 모드가 활성화되었습니다.',
            'success'
        );
    }
    

    /**
     * Export data
     */
    exportData() {
        try {
            const data = this.storage.exportData();
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `wiki-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showNotification('데이터가 성공적으로 내보내졌습니다.', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('데이터 내보내기에 실패했습니다.', 'error');
        }
        
        this.closeSettingsMenu();
    }
    
    /**
     * Import data
     * @param {File} file - File to import
     */
    async importData(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!confirm('기존 데이터를 모두 덮어쓰시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                return;
            }
            
            if (this.storage.importData(data)) {
                this.showNotification('데이터가 성공적으로 가져와졌습니다.', 'success');
                this.loadPage('대문');
                this.updateNavigation();
                this.updateRecentList();
            } else {
                this.showNotification('데이터 가져오기에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('올바르지 않은 파일 형식입니다.', 'error');
        }
        
        // Reset file input
        this.elements.importFile.value = '';
        this.closeSettingsMenu();
    }
    
    /**
     * Show wiki statistics
     */
    showWikiStats() {
        try {
            console.log('위키 통계 표시 시작');
            
            const stats = this.storage.getStats();
            const categories = this.storage.getAllCategories();
            const images = this.storage.getAllImages();
            const imageCount = Object.keys(images).length;
            const imagesSize = this.storage.getImagesSize();
            
            console.log('통계 데이터:', { stats, categories, imageCount, imagesSize });
            
            const statsHtml = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.pageCount}</div>
                        <div class="stat-label">총 페이지 수</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round(stats.totalChars / 1024)}KB</div>
                        <div class="stat-label">콘텐츠 크기</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${categories.length}</div>
                        <div class="stat-label">카테고리 수</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${imageCount}</div>
                        <div class="stat-label">이미지 수</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round(imagesSize / 1024)}KB</div>
                        <div class="stat-label">이미지 크기</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round(stats.storageUsed / 1024)}KB</div>
                        <div class="stat-label">총 사용량</div>
                    </div>
                </div>
                
                ${categories.length > 0 ? `
                    <h4>카테고리 목록</h4>
                    <ul class="stats-list">
                        ${categories.map(cat => {
                            const count = this.storage.getPagesInCategory(cat).length;
                            return `<li><span>${cat}</span><span>${count}개 페이지</span></li>`;
                        }).join('')}
                    </ul>
                ` : ''}
                
                <h4>기타 정보</h4>
                <ul class="stats-list">
                    <li><span>마지막 수정</span><span>${stats.lastModified ? new Date(stats.lastModified).toLocaleString() : '없음'}</span></li>
                    <li><span>평균 페이지 크기</span><span>${Math.round(stats.totalChars / stats.pageCount)}자</span></li>
                </ul>
            `;
            
            if (this.elements.statsContent) {
                this.elements.statsContent.innerHTML = statsHtml;
            }
            
            if (this.elements.wikiStatsModal) {
                this.elements.wikiStatsModal.style.display = 'flex';
                console.log('위키 통계 모달 표시됨');
            }
            
            this.closeSettingsMenu();
        } catch (error) {
            console.error('위키 통계 표시 오류:', error);
            alert('위키 통계를 표시하는 중 오류가 발생했습니다.');
        }
    }

    /**
     * Show update history modal
     */
    showUpdateHistory() {
        this.loadUpdateHistory();
        this.elements.updateHistoryModal.style.display = 'flex';
        this.closeSettingsMenu();
    }

    /**
     * Load update history from replit.md
     */
    async loadUpdateHistory() {
        try {
            this.elements.updateHistoryContent.innerHTML = '<div class="loading-text">업데이트 기록을 불러오는 중...</div>';
            
            const response = await fetch('/api/update-history');
            const data = await response.json();
            
            if (response.ok && data.content) {
                // Render markdown content using the wiki renderer
                const renderedContent = this.renderer.render(data.content);
                this.elements.updateHistoryContent.innerHTML = renderedContent;
            } else {
                this.elements.updateHistoryContent.innerHTML = `
                    <div class="error-message">
                        <p>업데이트 기록을 불러올 수 없습니다.</p>
                        <p class="error-details">${data.error || '알 수 없는 오류가 발생했습니다.'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading update history:', error);
            this.elements.updateHistoryContent.innerHTML = `
                <div class="error-message">
                    <p>업데이트 기록을 불러오는 중 오류가 발생했습니다.</p>
                    <p class="error-details">서버와 연결할 수 없습니다.</p>
                </div>
            `;
        }
    }
    
    
    /**
     * Upload an image
     * @param {File} file - Image file to upload
     */
    async uploadImage(file) {
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('이미지 파일만 업로드할 수 있습니다.', 'error');
            return;
        }
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('이미지 크기가 5MB를 초과합니다.', 'error');
            return;
        }
        
        try {
            console.log('Starting upload for file:', file.name);
            this.showUploadProgress();
            
            // Generate unique filename
            let fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            fileName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_'); // Clean filename
            console.log('Generated filename:', fileName);
            
            // Check if filename already exists
            let finalName = fileName;
            let counter = 1;
            try {
                while (await this.storage.getImage(finalName)) {
                    finalName = `${fileName}_${counter}`;
                    counter++;
                }
            } catch (error) {
                console.warn('Could not check for existing images, using original filename:', error);
                // If we can't check for duplicates, just use the original filename
            }
            console.log('Final filename:', finalName);
            
            // Convert to base64
            const dataUrl = await this.fileToDataUrl(file);
            console.log('File converted to data URL, size:', dataUrl.length);
            
            // Save image - add more detailed logging
            console.log('Calling storage.uploadImage with params:', {
                name: finalName, 
                dataLength: dataUrl.length, 
                size: file.size, 
                mimeType: file.type
            });
            
            const result = await this.storage.uploadImage(finalName, dataUrl, file.size, file.type);
            console.log('Upload result received:', result);
            
            this.hideUploadProgress();
            
            if (result.status === "uploaded") {
                // Create file document for the uploaded image
                await this.createImageFilePage(finalName, file, dataUrl);
                
                this.showNotification(`이미지 "${finalName}"이 업로드되었습니다. 위키에서 ![${finalName}]로 사용할 수 있습니다.`, 'success');
            } else {
                console.error('Upload failed with result:', result);
                this.showNotification(result.error || '업로드에 실패했습니다.', 'error');
            }
        } catch (error) {
            this.hideUploadProgress();
            console.error('Upload error:', error);
            this.showNotification('이미지 업로드에 실패했습니다.', 'error');
        }
        
        // Reset file input
        this.elements.imageFile.value = '';
        this.closeSettingsMenu();
    }
    
    /**
     * Convert file to data URL
     * @param {File} file - File to convert
     * @returns {Promise<string>} Data URL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Create a file document page for uploaded image
     * @param {string} imageName - Name of the uploaded image
     * @param {File} originalFile - Original file object
     * @param {string} dataUrl - Base64 data URL of the image
     */
    async createImageFilePage(imageName, originalFile, dataUrl) {
        const pageTitle = `파일:${imageName}`;
        
        // Check if page already exists
        if (this.storage.getPage(pageTitle)) {
            return; // Don't overwrite existing file page
        }
        
        // Get image dimensions
        const dimensions = await this.getImageDimensions(dataUrl);
        
        // Format file size
        const formatSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        // Create file page content
        const filePageContent = `= ${imageName} =

이 페이지는 업로드된 이미지 파일에 대한 정보를 담고 있습니다.

== 파일 정보 ==
* **파일명:** ${imageName}
* **원본 파일명:** ${originalFile.name}
* **파일 크기:** ${formatSize(originalFile.size)}
* **이미지 크기:** ${dimensions.width} × ${dimensions.height} 픽셀
* **파일 형식:** ${originalFile.type}
* **업로드 날짜:** ${new Date().toLocaleString('ko-KR')}

== 이미지 미리보기 ==
![${imageName}]

== 사용법 ==
이 이미지를 다른 문서에서 사용하려면 다음 문법을 사용하세요:

* \`![${imageName}]\` - 기본 이미지
* \`![${imageName}|캡션 텍스트]\` - 캡션과 함께 표시

== 이 파일을 사용하는 페이지 ==
이 이미지가 사용된 페이지들이 여기에 표시됩니다.

== 분류 ==
[[분류:미분류]]
[[분류:업로드된 파일]]
[[분류:이미지]]

#파일 #이미지 #업로드`;

        // Save the file page - use savePage method directly
        await this.storage.savePage(pageTitle, { content: filePageContent });
        
        // Update navigation to reflect new page
        this.updateNavigation();
    }
    
    /**
     * Get image dimensions from data URL
     * @param {string} dataUrl - Base64 data URL
     * @returns {Promise<{width: number, height: number}>} Image dimensions
     */
    getImageDimensions(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = () => {
                resolve({ width: 0, height: 0 });
            };
            img.src = dataUrl;
        });
    }

    /**
     * Show upload progress
     */
    showUploadProgress() {
        const progress = document.createElement('div');
        progress.id = 'upload-progress';
        progress.className = 'upload-progress';
        progress.innerHTML = `
            <h4>이미지 업로드 중...</h4>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <p>잠시만 기다려주세요...</p>
        `;
        document.body.appendChild(progress);
        
        // Animate progress bar
        setTimeout(() => {
            progress.querySelector('.progress-fill').style.width = '100%';
        }, 100);
    }
    
    /**
     * Hide upload progress
     */
    hideUploadProgress() {
        const progress = document.getElementById('upload-progress');
        if (progress) {
            progress.remove();
        }
    }
    
    /**
     * Show image management modal
     */
    showImageManagement() {
        const images = this.storage.getAllImages();
        const imageNames = Object.keys(images);
        
        if (imageNames.length === 0) {
            this.elements.imageGrid.innerHTML = `
                <div class="empty-images">
                    <i data-feather="image"></i>
                    <p>업로드된 이미지가 없습니다.</p>
                    <p>"이미지 업로드" 버튼으로 이미지를 추가해보세요.</p>
                </div>
            `;
        } else {
            const imageCards = imageNames.map(name => {
                const image = images[name];
                const sizeKB = Math.round(image.size / 1024);
                return `
                    <div class="image-card">
                        <img src="${image.data}" alt="${name}" class="image-preview">
                        <div class="image-info">
                            <div class="image-name">${this.escapeHtml(name)}</div>
                            <div class="image-size">${sizeKB}KB</div>
                            <div class="image-actions">
                                <button class="image-action-btn" onclick="navigator.clipboard.writeText('![${name}]')">복사</button>
                                <button class="image-action-btn danger" onclick="app.deleteImage('${name}')">삭제</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            this.elements.imageGrid.innerHTML = imageCards;
        }
        
        this.elements.imageManagementModal.style.display = 'flex';
        this.closeSettingsMenu();
        this.initializeFeatherIcons();
    }
    
    /**
     * Delete an image
     * @param {string} name - Image name to delete
     */
    deleteImage(name) {
        if (!confirm(`정말로 이미지 "${name}"을 삭제하시겠습니까?`)) {
            return;
        }
        
        if (this.storage.deleteImage(name)) {
            this.showNotification('이미지가 삭제되었습니다.', 'success');
            this.showImageManagement(); // Refresh the modal
        } else {
            this.showNotification('이미지 삭제에 실패했습니다.', 'error');
        }
    }
    
    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Setup tags and links event listeners
     */
    setupTagsAndLinksEvents() {
        // Tagged pages modal events
        if (this.elements.closeTaggedPages) {
            this.elements.closeTaggedPages.addEventListener('click', () => {
                this.hideTaggedPagesModal();
            });
        }

        // Backlinks modal events
        if (this.elements.closeBacklinks) {
            this.elements.closeBacklinks.addEventListener('click', () => {
                this.hideBacklinksModal();
            });
        }

        // Modal backdrop clicks
        if (this.elements.taggedPagesModal) {
            this.elements.taggedPagesModal.addEventListener('click', (e) => {
                if (e.target === this.elements.taggedPagesModal) {
                    this.hideTaggedPagesModal();
                }
            });
        }

        if (this.elements.backlinksModal) {
            this.elements.backlinksModal.addEventListener('click', (e) => {
                if (e.target === this.elements.backlinksModal) {
                    this.hideBacklinksModal();
                }
            });
        }
    }

    /**
     * Update page footer with tags and links
     * @param {Object} page - Page object
     */
    updatePageFooter(page) {
        if (!page) return;
        
        // Update page tags
        this.updatePageTags(page);
        
        // Update backlinks
        this.updateBacklinks(page.title);
        
        // Update outgoing links
        this.updateOutgoingLinks(page.title);
    }

    /**
     * Update page tags display
     * @param {Object} page - Page object
     */
    updatePageTags(page) {
        if (!this.elements.pageTags) return;
        
        const tags = page.tags || [];
        
        if (tags.length === 0) {
            this.elements.pageTags.style.display = 'none';
            return;
        }
        
        this.elements.pageTags.style.display = 'block';
        this.elements.pageTags.innerHTML = `
            <h4>태그</h4>
            <div class="tags-list">
                ${tags.map(tag => 
                    `<span class="wiki-tag" data-tag="${tag}" onclick="app.showTaggedPages('${tag}')">#${tag}</span>`
                ).join('')}
            </div>
        `;
    }

    /**
     * Update backlinks display
     * @param {string} pageTitle - Current page title
     */
    updateBacklinks(pageTitle) {
        if (!this.elements.backlinksSection) return;
        
        const backlinks = this.storage.getBacklinks(pageTitle);
        
        // 백링크가 배열이 아닌 경우 빈 배열로 처리
        const backlinkList = Array.isArray(backlinks) ? backlinks : [];
        
        if (backlinkList.length === 0) {
            this.elements.backlinksSection.innerHTML = `
                <h4><i data-feather="arrow-left"></i> 백링크 <span class="link-count">(0)</span></h4>
                <p class="text-muted">이 페이지를 링크하는 페이지가 없습니다.</p>
            `;
        } else {
            const displayLinks = backlinkList.slice(0, 5);
            const remainingCount = backlinkList.length - 5;
            
            this.elements.backlinksSection.innerHTML = `
                <h4><i data-feather="arrow-left"></i> 백링크 <span class="link-count">(${backlinkList.length})</span></h4>
                <ul class="backlinks-list">
                    ${displayLinks.map(link => 
                        `<li><a href="#" onclick="app.navigateToPage('${link.title || link}')">${link.title || link}</a></li>`
                    ).join('')}
                </ul>
                ${remainingCount > 0 ? 
                    `<button class="show-more-links" onclick="app.showBacklinks('${pageTitle}')">
                        ${remainingCount}개 더 보기
                    </button>` : ''
                }
            `;
        }
        
        // Re-initialize feather icons for this section
        feather.replace();
    }

    /**
     * Update outgoing links display
     * @param {string} pageTitle - Current page title
     */
    updateOutgoingLinks(pageTitle) {
        if (!this.elements.outgoingLinksSection) return;
        
        const outgoingLinks = this.storage.getOutgoingLinks(pageTitle);
        
        if (outgoingLinks.length === 0) {
            this.elements.outgoingLinksSection.innerHTML = `
                <h4><i data-feather="arrow-right"></i> 나가는 링크 <span class="link-count">(0)</span></h4>
                <p class="text-muted">이 페이지에서 링크하는 페이지가 없습니다.</p>
            `;
        } else {
            const displayLinks = outgoingLinks.slice(0, 5);
            const remainingCount = outgoingLinks.length - 5;
            
            this.elements.outgoingLinksSection.innerHTML = `
                <h4><i data-feather="arrow-right"></i> 나가는 링크 <span class="link-count">(${outgoingLinks.length})</span></h4>
                <ul class="outgoing-links-list">
                    ${displayLinks.map(linkTitle => 
                        `<li><a href="#" onclick="app.navigateToPage('${linkTitle}')">${linkTitle}</a></li>`
                    ).join('')}
                </ul>
                ${remainingCount > 0 ? 
                    `<button class="show-more-links" onclick="app.showOutgoingLinks('${pageTitle}')">
                        ${remainingCount}개 더 보기
                    </button>` : ''
                }
            `;
        }
        
        // Re-initialize feather icons for this section
        feather.replace();
    }

    /**
     * Update popular tags in sidebar
     */
    async updatePopularTags() {
        if (!this.elements.popularTags) return;
        
        try {
            const allTags = await this.storage.getAllTags();
            // getAllTags가 배열이 아닌 경우 처리
            const tagArray = Array.isArray(allTags) ? allTags : [];
            const topTags = tagArray.slice(0, 10);
        
        if (topTags.length === 0) {
            this.elements.popularTags.innerHTML = '<p class="text-muted">태그가 없습니다.</p>';
            return;
        }
        
            this.elements.popularTags.innerHTML = topTags.map(({ tag, count }) => 
                `<span class="wiki-tag" data-count="${count}" onclick="app.showTaggedPages('${tag}')">#${tag}</span>`
            ).join('');
        } catch (error) {
            console.error('Error updating popular tags:', error);
            this.elements.popularTags.innerHTML = '<p class="text-muted">태그를 불러올 수 없습니다.</p>';
        }
    }

    /**
     * Show tagged pages modal
     * @param {string} tag - Tag to show pages for
     */
    showTaggedPages(tag) {
        if (!this.elements.taggedPagesModal) return;
        
        const taggedPages = this.storage.getPagesByTag(tag);
        
        this.elements.taggedPagesTitle.textContent = `#${tag} 태그된 페이지 (${taggedPages.length})`;
        
        if (taggedPages.length === 0) {
            this.elements.taggedPagesContent.innerHTML = '<p class="text-muted">이 태그를 사용하는 페이지가 없습니다.</p>';
        } else {
            this.elements.taggedPagesContent.innerHTML = taggedPages.map(({ title, page }) => {
                const excerpt = page.content.substring(0, 150) + (page.content.length > 150 ? '...' : '');
                const modifiedDate = new Date(page.modified).toLocaleDateString('ko-KR');
                
                return `
                    <div class="tagged-page-item">
                        <h4><a href="#" onclick="app.navigateToPage('${title}'); app.hideTaggedPagesModal();">${title}</a></h4>
                        <div class="page-excerpt">${excerpt}</div>
                        <div class="page-meta-info">
                            <span>수정: ${modifiedDate}</span>
                            <span>버전: ${page.version || 1}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        this.elements.taggedPagesModal.style.display = 'block';
    }

    /**
     * Hide tagged pages modal
     */
    hideTaggedPagesModal() {
        if (this.elements.taggedPagesModal) {
            this.elements.taggedPagesModal.style.display = 'none';
        }
    }

    /**
     * Show backlinks modal
     * @param {string} pageTitle - Page title to show backlinks for
     */
    showBacklinks(pageTitle) {
        if (!this.elements.backlinksModal) return;
        
        const backlinks = this.storage.getBacklinks(pageTitle);
        
        this.elements.backlinksTitle.textContent = `"${pageTitle}" 백링크 (${backlinks.length})`;
        
        if (backlinks.length === 0) {
            this.elements.backlinksContent.innerHTML = '<p class="text-muted">이 페이지를 링크하는 페이지가 없습니다.</p>';
        } else {
            this.elements.backlinksContent.innerHTML = backlinks.map(({ title, page }) => {
                const excerpt = page.content.substring(0, 150) + (page.content.length > 150 ? '...' : '');
                const modifiedDate = new Date(page.modified).toLocaleDateString('ko-KR');
                
                return `
                    <div class="backlink-item">
                        <h4><a href="#" onclick="app.navigateToPage('${title}'); app.hideBacklinksModal();">${title}</a></h4>
                        <div class="page-excerpt">${excerpt}</div>
                        <div class="page-meta-info">
                            <span>수정: ${modifiedDate}</span>
                            <span>버전: ${page.version || 1}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        this.elements.backlinksModal.style.display = 'block';
    }

    /**
     * Hide backlinks modal
     */
    hideBacklinksModal() {
        if (this.elements.backlinksModal) {
            this.elements.backlinksModal.style.display = 'none';
        }
    }

    /**
     * Setup favorites event listeners
     */
    setupFavoritesEvents() {
        if (this.elements.favoriteBtn) {
            this.elements.favoriteBtn.addEventListener('click', () => {
                this.toggleFavorite();
            });
        }
    }

    /**
     * Toggle favorite status of current page
     */
    toggleFavorite() {
        const currentPageTitle = this.currentPage;
        if (!currentPageTitle) return;

        if (this.storage.isFavorite(currentPageTitle)) {
            this.storage.removeFromFavorites(currentPageTitle);
            this.showNotification('개추한 문서에서 제거되었습니다.', 'success');
        } else {
            this.storage.addToFavorites(currentPageTitle);
            this.showNotification('개추한 문서에 추가되었습니다.', 'success');
        }

        this.updateFavoriteButton(currentPageTitle);
        this.updateFavoritesList();
    }

    /**
     * Update favorite button state
     * @param {string} pageTitle - Current page title
     */
    updateFavoriteButton(pageTitle) {
        if (!this.elements.favoriteBtn) return;

        const isFavorite = this.storage.isFavorite(pageTitle);
        const icon = this.elements.favoriteBtn.querySelector('i[data-feather]');
        
        if (isFavorite) {
            this.elements.favoriteBtn.classList.add('favorite-active');
            this.elements.favoriteBtn.title = '개추한 문서에서 제거';
            if (icon) {
                icon.setAttribute('data-feather', 'star');
                icon.style.fill = 'currentColor';
            }
        } else {
            this.elements.favoriteBtn.classList.remove('favorite-active');
            this.elements.favoriteBtn.title = '개추한 문서에 추가';
            if (icon) {
                icon.setAttribute('data-feather', 'star');
                icon.style.fill = 'none';
            }
        }
        
        feather.replace();
    }

    /**
     * Update favorites list in sidebar
     */
    updateFavoritesList() {
        if (!this.elements.favoritesList) return;

        const favorites = this.storage.getFavorites();
        
        if (favorites.length === 0) {
            this.elements.favoritesList.innerHTML = '<li class="no-favorites">개추한 문서가 없습니다</li>';
            return;
        }

        this.elements.favoritesList.innerHTML = favorites.map(title => {
            const isActive = title === this.currentPage;
            const encodedTitle = this.pageNameToPunycode(title);
            return `
                <li>
                    <a href="/${encodedTitle}" data-page="${title}" class="page-link ${isActive ? 'active' : ''}" onclick="app.navigateToPage('${title}')">
                        <i data-feather="star" style="width: 14px; height: 14px; fill: var(--accent-color);"></i>
                        ${title}
                    </a>
                </li>
            `;
        }).join('');
        
        feather.replace();
    }

    /**
     * Create page with specific content
     * @param {string} pageName - Name of new page
     * @param {string} content - Initial content
     */
    createPageWithContent(pageName, content) {
        try {
            this.currentPage = pageName;
            
            // Initialize page with template content
            this.elements.pageTitle.textContent = pageName;
            this.elements.pageContent.innerHTML = this.renderer.render(content);
            this.updateLastModified(null);
            
            // Initialize edit form with template content
            this.elements.pageTitleInput.value = pageName;
            this.elements.pageEditor.value = content;
            this.updatePreview();
            
            // Update navigation and enter edit mode
            this.updateNavigation();
            this.setEditMode(true);
            
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
        } catch (error) {
            console.error('Error creating page with content:', error);
            this.showNotification('페이지 생성 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * Create new page with template
     */
    createNewPage() {
        const pageTitle = this.elements.newPageTitle.value.trim();
        const selectedTemplate = this.elements.pageTemplate ? this.elements.pageTemplate.value : '';
        
        if (pageTitle) {
            this.hideNewPageModal();
            
            // Apply template if selected
            if (selectedTemplate) {
                const templateContent = this.storage.applyTemplate(selectedTemplate, pageTitle);
                this.createPageWithContent(pageTitle, templateContent);
            } else {
                this.createPageAndEdit(pageTitle);
            }
        }
    }

    /**
     * Setup comments event listeners
     */
    setupCommentsEvents() {
        if (this.elements.addCommentBtn) {
            this.elements.addCommentBtn.addEventListener('click', () => {
                this.addComment();
            });
        }

        if (this.elements.commentInput) {
            this.elements.commentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.addComment();
                }
            });
        }
    }

    /**
     * Add a new comment
     */
    addComment() {
        const content = this.elements.commentInput.value.trim();
        const author = this.elements.commentAuthor.value.trim() || '익명';
        
        if (!content) {
            this.showNotification('댓글 내용을 입력해주세요.', 'warning');
            return;
        }

        const comment = this.storage.addComment(this.currentPage, content, author);
        if (comment) {
            this.elements.commentInput.value = '';
            this.elements.commentAuthor.value = '';
            this.updateComments();
            this.showNotification('댓글이 추가되었습니다.', 'success');
        } else {
            this.showNotification('댓글 추가 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * Edit a comment
     * @param {string} commentId - Comment ID
     */
    editComment(commentId) {
        const comments = this.storage.getPageComments(this.currentPage);
        const comment = comments.find(c => c.id === commentId);
        
        if (!comment) return;

        const newContent = prompt('댓글을 수정하세요:', comment.content);
        if (newContent !== null && newContent.trim() !== comment.content) {
            if (this.storage.updateComment(this.currentPage, commentId, newContent.trim())) {
                this.updateComments();
                this.showNotification('댓글이 수정되었습니다.', 'success');
            } else {
                this.showNotification('댓글 수정 중 오류가 발생했습니다.', 'error');
            }
        }
    }

    /**
     * Delete a comment
     * @param {string} commentId - Comment ID
     */
    deleteComment(commentId) {
        if (confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
            if (this.storage.deleteComment(this.currentPage, commentId)) {
                this.updateComments();
                this.showNotification('댓글이 삭제되었습니다.', 'success');
            } else {
                this.showNotification('댓글 삭제 중 오류가 발생했습니다.', 'error');
            }
        }
    }

    /**
     * Update comments section
     */
    async updateComments() {
        if (!this.elements.commentsList) return;

        try {
            const comments = await this.storage.getPageComments(this.currentPage);
            
            // 댓글이 배열이 아닌 경우 빈 배열로 처리
            const commentsList = Array.isArray(comments) ? comments : [];
            
            if (commentsList.length === 0) {
                this.elements.commentsList.innerHTML = '<div class="no-comments">첫 번째 댓글을 작성해보세요!</div>';
                return;
            }

            const html = commentsList.map(comment => {
            const createdDate = new Date(comment.created).toLocaleString('ko-KR');
            const modifiedDate = comment.modified !== comment.created ? 
                `(수정됨: ${new Date(comment.modified).toLocaleString('ko-KR')})` : '';
            
            return `
                <div class="comment" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.author)}</span>
                        <span class="comment-date">${createdDate} ${modifiedDate}</span>
                        <div class="comment-actions">
                            <button class="comment-edit-btn" onclick="app.editComment('${comment.id}')" title="편집">
                                <i data-feather="edit-2"></i>
                            </button>
                            <button class="comment-delete-btn" onclick="app.deleteComment('${comment.id}')" title="삭제">
                                <i data-feather="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    <div class="comment-content">${this.escapeHtml(comment.content).replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }).join('');

            this.elements.commentsList.innerHTML = html;
            feather.replace();
        } catch (error) {
            console.error('Error updating comments:', error);
            this.elements.commentsList.innerHTML = '<div class="no-comments">댓글을 불러올 수 없습니다.</div>';
        }
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show footnote popup (Namuwiki style)
     * @param {string} footnoteId - ID of the footnote to show
     */
    scrollToFootnote(footnoteId) {
        const footnote = document.getElementById(footnoteId);
        if (footnote) {
            const content = footnote.querySelector('.footnote-content');
            if (content) {
                this.showFootnotePopup(content.textContent, footnoteId);
            }
        }
    }

    /**
     * Show footnote popup
     * @param {string} content - Footnote content
     * @param {string} footnoteId - ID of the footnote
     */
    showFootnotePopup(content, footnoteId) {
        // Remove existing popup
        const existingPopup = document.querySelector('.footnote-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create popup
        const popup = document.createElement('div');
        popup.className = 'footnote-popup';
        popup.innerHTML = `
            <div class="footnote-popup-content">
                <div class="footnote-popup-header">
                    <span class="footnote-popup-title">각주</span>
                    <button class="footnote-popup-close" onclick="this.closest('.footnote-popup').remove()">×</button>
                </div>
                <div class="footnote-popup-body">
                    ${this.escapeHtml(content)}
                </div>
                <div class="footnote-popup-footer">
                    <button class="footnote-popup-goto" onclick="app.scrollToFootnoteSection('${footnoteId}'); this.closest('.footnote-popup').remove();">각주로 이동</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Close on outside click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });

        // Auto-close after 8 seconds
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 8000);
    }

    /**
     * Scroll to footnote section
     * @param {string} footnoteId - ID of the footnote
     */
    scrollToFootnoteSection(footnoteId) {
        const footnote = document.getElementById(footnoteId);
        if (footnote) {
            footnote.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Highlight the footnote
            footnote.classList.add('highlighted');
            setTimeout(() => {
                footnote.classList.remove('highlighted');
            }, 3000);
        }
    }

    /**
     * Scroll to back reference
     * @param {string} backrefId - ID of the back reference to scroll to
     */
    scrollToBackref(backrefId) {
        const backref = document.getElementById(backrefId);
        if (backref) {
            backref.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Add a brief highlight effect to the backref
            const footnoteRef = backref;
            if (footnoteRef) {
                footnoteRef.style.background = '#fbbf24';
                footnoteRef.style.color = 'white';
                footnoteRef.style.borderRadius = '3px';
                footnoteRef.style.padding = '2px 4px';
                
                setTimeout(() => {
                    footnoteRef.style.background = '';
                    footnoteRef.style.color = '';
                    footnoteRef.style.borderRadius = '';
                    footnoteRef.style.padding = '';
                }, 2000);
            }
        }
    }
}

// Make app globally available
window.app = null;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing WikiApp...');
    try {
        window.app = new WikiApp();
        console.log('WikiApp initialized successfully');
    } catch (error) {
        console.error('Error initializing WikiApp:', error);
        console.error('Error type:', typeof error);
        console.error('Error name:', error.name);  
        console.error('Error message:', error.message);
        if (error.stack) console.error('Error stack:', error.stack);
    }
});

// Global footnote utility functions
function toggleFootnote(footnoteId) {
    const footnote = document.getElementById(footnoteId);
    if (footnote) {
        // Remove highlight from all footnotes
        document.querySelectorAll('.footnote.highlighted').forEach(fn => {
            fn.classList.remove('highlighted');
        });
        
        // Highlight and scroll to the footnote
        footnote.classList.add('highlighted');
        footnote.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
            footnote.classList.remove('highlighted');
        }, 3000);
    }
}

function scrollToBackref(backrefId) {
    const backref = document.getElementById(backrefId);
    if (backref) {
        backref.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Add a brief highlight effect to the backref
        const footnoteRef = backref.querySelector('.footnote-ref');
        if (footnoteRef) {
            footnoteRef.style.background = '#fbbf24';
            footnoteRef.style.color = 'white';
            footnoteRef.style.borderRadius = '3px';
            footnoteRef.style.padding = '2px 4px';
            
            setTimeout(() => {
                footnoteRef.style.background = '';
                footnoteRef.style.color = '';
                footnoteRef.style.borderRadius = '';
                footnoteRef.style.padding = '';
            }, 2000);
        }
    }
}
