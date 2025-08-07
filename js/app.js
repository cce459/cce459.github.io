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
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
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
            this.elements.pageContent.innerHTML = this.renderer.render(page.content);
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
        this.elements.previewContent.innerHTML = this.renderer.render(content);
    }

    /**
     * Save the current page
     */
    savePage() {
        const title = this.elements.pageTitleInput.value.trim();
        const content = this.elements.pageEditor.value;
        
        if (!title) {
            alert('Please enter a page title.');
            this.elements.pageTitleInput.focus();
            return;
        }

        // Check if title changed
        const oldTitle = this.currentPage !== title ? this.currentPage : null;
        
        if (this.storage.savePage(title, content, oldTitle)) {
            this.currentPage = title;
            
            // Update view
            this.elements.pageTitle.textContent = title;
            this.elements.pageContent.innerHTML = this.renderer.render(content);
            
            const page = this.storage.getPage(title);
            this.updateLastModified(page.modified);
            
            // Update navigation and URL
            this.updateNavigation();
            history.replaceState({ page: title }, '', `#${encodeURIComponent(title)}`);
            
            // Exit edit mode
            this.setEditMode(false);
            
            this.hasUnsavedChanges = false;
            this.updateSaveButton();
            
            this.showNotification('Page saved successfully!', 'success');
        } else {
            this.showNotification('Failed to save page. Please try again.', 'error');
        }
    }

    /**
     * Cancel editing
     */
    cancelEdit() {
        if (this.hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
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
            alert('Please enter a page title.');
            return;
        }
        
        // Check if page already exists
        if (this.storage.getPage(title)) {
            if (confirm(`Page "${title}" already exists. Do you want to edit it?`)) {
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
            button.innerHTML = '<i data-feather="save"></i> Save *';
        } else {
            button.classList.remove('btn-warning');
            button.classList.add('btn-success');
            button.innerHTML = '<i data-feather="save"></i> Save';
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
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--${type === 'success' ? 'success-color' : type === 'error' ? 'danger-color' : 'primary-color'});
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            z-index: 2000;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
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
