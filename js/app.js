/**
 * Main Wiki Application
 */
class WikiApp {
    constructor() {
        this.storage = new WikiStorage();
        this.renderer = new WikiRenderer();
        this.search = null;
        
        this.currentPage = '대문';
        this.isEditMode = false;
        this.hasUnsavedChanges = false;
        
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
            deletePageBtn: document.getElementById('delete-page-btn'),
            pageHistoryBtn: document.getElementById('page-history-btn'),
            exportDataBtn: document.getElementById('export-data-btn'),
            importDataBtn: document.getElementById('import-data-btn'),
            importFile: document.getElementById('import-file'),
            wikiStatsBtn: document.getElementById('wiki-stats-btn'),
            clearAllBtn: document.getElementById('clear-all-btn'),
            
            // History modal
            pageHistoryModal: document.getElementById('page-history-modal'),
            historyTitle: document.getElementById('history-title'),
            historyContent: document.getElementById('history-content'),
            closeHistory: document.getElementById('close-history'),
            
            // Stats modal
            wikiStatsModal: document.getElementById('wiki-stats-modal'),
            statsContent: document.getElementById('stats-content'),
            closeStats: document.getElementById('close-stats'),
            
            // Loading
            loading: document.getElementById('loading')
        };
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
            
            // Load page after everything is set up
            setTimeout(() => {
                this.loadPage(this.currentPage);
                this.updateNavigation();
            }, 100);
        } catch (error) {
            console.error('Application initialization error:', error);
            this.hideLoading();
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
        this.elements.pageEditor.addEventListener('input', () => {
            this.updatePreview();
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
        // Make app available to search for navigation
        window.app = this;
    }

    /**
     * Setup URL routing
     */
    setupUrlRouting() {
        // Handle initial URL
        const hash = window.location.hash.substring(1);
        if (hash) {
            const decodedHash = decodeURIComponent(hash);
            if (decodedHash !== this.currentPage) {
                this.navigateToPage(decodedHash);
            }
        }

        // Handle back/forward buttons
        window.addEventListener('popstate', (e) => {
            const pageName = e.state?.page || '대문';
            this.loadPage(pageName, false); // Don't push state again
        });

        // Push initial state
        history.replaceState({ page: this.currentPage }, '', `#${encodeURIComponent(this.currentPage)}`);
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
    loadPage(pageName, pushState = true) {
        this.showLoading();
        
        try {
            // Check for unsaved changes
            if (this.hasUnsavedChanges && !this.confirmLeavePage()) {
                this.hideLoading();
                return;
            }

            const page = this.storage.getPage(pageName);
            
            if (!page) {
                // Page doesn't exist, create it
                this.createPageAndEdit(pageName);
                this.hideLoading();
                return;
            }

            this.currentPage = pageName;
            
            // Update view
            this.elements.pageTitle.textContent = page.title;
            
            // Check if this is a category page and render accordingly
            if (this.storage.isCategoryPage(page.title)) {
                this.elements.pageContent.innerHTML = this.renderCategoryPage(page);
            } else {
                this.elements.pageContent.innerHTML = this.renderer.render(page.content);
            }
            
            this.updateLastModified(page.modified);
            
            // Update edit form
            this.elements.pageTitleInput.value = page.title;
            this.elements.pageEditor.value = page.content;
            this.updatePreview();
            
            // Update navigation
            this.updateNavigation();
            
            // Update URL
            if (pushState) {
                history.pushState({ page: pageName }, '', `#${encodeURIComponent(pageName)}`);
            }
            
            // Update recent pages
            this.storage.addToRecent(pageName);
            this.updateRecentList();
            
            // Exit edit mode
            if (this.isEditMode) {
                this.setEditMode(false);
            }
            
            this.hasUnsavedChanges = false;
            this.updateSaveButton();
        } catch (error) {
            console.error('Error loading page:', error);
            // Show fallback content
            this.elements.pageTitle.textContent = pageName;
            this.elements.pageContent.innerHTML = '<p>페이지를 로드하는 중 오류가 발생했습니다. 새로고침해 주세요.</p>';
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
    createPageAndEdit(pageName) {
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
            this.updateNavigation();
            
            // Update URL
            history.pushState({ page: pageName }, '', `#${encodeURIComponent(pageName)}`);
            
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
    updatePreview() {
        const content = this.elements.pageEditor.value;
        const title = this.elements.pageTitleInput.value.trim();
        
        // Check if this is a category page for preview
        if (this.storage.isCategoryPage(title)) {
            const mockPage = { title, content };
            this.elements.previewContent.innerHTML = this.renderCategoryPage(mockPage);
        } else {
            this.elements.previewContent.innerHTML = this.renderer.render(content);
        }
    }

    /**
     * Save the current page
     */
    savePage() {
        const title = this.elements.pageTitleInput.value.trim();
        const content = this.elements.pageEditor.value;
        
        if (!title) {
            alert('페이지 제목을 입력해주세요.');
            this.elements.pageTitleInput.focus();
            return;
        }

        // Check if title changed
        const oldTitle = this.currentPage !== title ? this.currentPage : null;
        
        if (this.storage.savePage(title, content, oldTitle)) {
            this.currentPage = title;
            
            // Update view
            this.elements.pageTitle.textContent = title;
            
            // Check if this is a category page and render accordingly
            if (this.storage.isCategoryPage(title)) {
                const page = this.storage.getPage(title);
                this.elements.pageContent.innerHTML = this.renderCategoryPage(page);
            } else {
                this.elements.pageContent.innerHTML = this.renderer.render(content);
            }
            
            const page = this.storage.getPage(title);
            this.updateLastModified(page.modified);
            
            // Update navigation and URL
            this.updateNavigation();
            history.replaceState({ page: title }, '', `#${encodeURIComponent(title)}`);
            
            // Exit edit mode
            this.setEditMode(false);
            
            this.hasUnsavedChanges = false;
            this.updateSaveButton();
            
            this.showNotification('페이지가 저장되었습니다!', 'success');
        } else {
            this.showNotification('페이지 저장에 실패했습니다. 다시 시도해 주세요.', 'error');
        }
    }

    /**
     * Cancel editing
     */
    cancelEdit() {
        if (this.hasUnsavedChanges && !confirm('저장되지 않은 변경사항이 있습니다. 정말 취소하시겠습니까?')) {
            return;
        }
        
        // Restore original values
        const page = this.storage.getPage(this.currentPage);
        if (page) {
            this.elements.pageTitleInput.value = page.title;
            this.elements.pageEditor.value = page.content;
            this.updatePreview();
        }
        
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
        if (this.storage.getPage(title)) {
            if (confirm(`페이지 "${title}"이 이미 존재합니다. 편집하시겠습니까?`)) {
                this.hideNewPageModal();
                this.navigateToPage(title);
                this.setEditMode(true);
            }
            return;
        }
        
        this.hideNewPageModal();
        this.createPageAndEdit(title);
    }

    /**
     * Update navigation list
     */
    updateNavigation() {
        const titles = this.storage.getPageTitles();
        
        this.elements.pageList.innerHTML = titles.map(title => {
            const isActive = title === this.currentPage;
            return `
                <li>
                    <a href="#" 
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
        
        this.elements.recentList.innerHTML = recent.slice(0, 5).map(title => `
            <li>
                <a href="#" 
                   data-page="${title}" 
                   class="recent-link">
                    ${this.escapeHtml(title)}
                </a>
            </li>
        `).join('');
        
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
        
        // Delete page
        this.elements.deletePageBtn.addEventListener('click', () => {
            this.deletePage();
        });
        
        // Page history
        this.elements.pageHistoryBtn.addEventListener('click', () => {
            this.showPageHistory();
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
        
        // Wiki stats
        this.elements.wikiStatsBtn.addEventListener('click', () => {
            this.showWikiStats();
        });
        
        // Clear all data
        this.elements.clearAllBtn.addEventListener('click', () => {
            this.clearAllData();
        });
        
        // Modal close events
        this.elements.closeHistory.addEventListener('click', () => {
            this.elements.pageHistoryModal.style.display = 'none';
        });
        
        this.elements.closeStats.addEventListener('click', () => {
            this.elements.wikiStatsModal.style.display = 'none';
        });
        
        // Close modals on background click
        [this.elements.pageHistoryModal, this.elements.wikiStatsModal].forEach(modal => {
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
     * Delete current page
     */
    deletePage() {
        if (this.currentPage === '대문') {
            this.showNotification('대문 페이지는 삭제할 수 없습니다.', 'warning');
            return;
        }
        
        if (!confirm(`정말로 "${this.currentPage}" 페이지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }
        
        if (this.storage.deletePage(this.currentPage)) {
            this.showNotification('페이지가 삭제되었습니다.', 'success');
            this.navigateToPage('대문');
        } else {
            this.showNotification('페이지 삭제에 실패했습니다.', 'error');
        }
        
        this.closeSettingsMenu();
    }
    
    /**
     * Show page history
     */
    showPageHistory() {
        const history = this.storage.getPageHistory(this.currentPage);
        this.elements.historyTitle.textContent = `"${this.currentPage}" 페이지 히스토리`;
        
        if (history.length === 0) {
            this.elements.historyContent.innerHTML = '<p><em>이 페이지에 대한 히스토리가 없습니다.</em></p>';
        } else {
            const historyHtml = history.map((item, index) => {
                const date = new Date(item.archivedAt);
                return `
                    <div class="history-item">
                        <div class="history-meta">
                            <span>버전 ${item.version} (${date.toLocaleString()})</span>
                            <span>${item.content.length}자</span>
                        </div>
                        <div class="history-content">${this.escapeHtml(item.content.substring(0, 200))}${item.content.length > 200 ? '...' : ''}</div>
                    </div>
                `;
            }).join('');
            
            this.elements.historyContent.innerHTML = historyHtml;
        }
        
        this.elements.pageHistoryModal.style.display = 'flex';
        this.closeSettingsMenu();
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
        const stats = this.storage.getStats();
        const categories = this.storage.getAllCategories();
        
        const statsHtml = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.pageCount}</div>
                    <div class="stat-label">총 페이지 수</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Math.round(stats.totalChars / 1024)}KB</div>
                    <div class="stat-label">총 콘텐츠 크기</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${categories.length}</div>
                    <div class="stat-label">카테고리 수</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Math.round(stats.storageUsed / 1024)}KB</div>
                    <div class="stat-label">저장소 사용량</div>
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
        
        this.elements.statsContent.innerHTML = statsHtml;
        this.elements.wikiStatsModal.style.display = 'flex';
        this.closeSettingsMenu();
    }
    
    /**
     * Clear all data
     */
    clearAllData() {
        if (!confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }
        
        if (!confirm('마지막 확인입니다. 모든 페이지, 히스토리, 설정이 삭제됩니다. 계속하시겠습니까?')) {
            return;
        }
        
        if (this.storage.clearAll()) {
            this.showNotification('모든 데이터가 삭제되었습니다.', 'success');
            this.loadPage('대문');
            this.updateNavigation();
            this.updateRecentList();
        } else {
            this.showNotification('데이터 삭제에 실패했습니다.', 'error');
        }
        
        this.closeSettingsMenu();
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WikiApp();
});
