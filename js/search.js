/**
 * Search functionality for the wiki
 */
class WikiSearch {
    constructor(storage, renderer) {
        this.storage = storage;
        this.renderer = renderer;
        this.searchInput = null;
        this.searchResults = null;
        this.isSearching = false;
        this.searchTimeout = null;
        this.currentQuery = '';
        
        this.init();
    }

    /**
     * Initialize search functionality
     */
    init() {
        this.searchInput = document.getElementById('search-input');
        this.searchResults = document.getElementById('search-results');
        
        if (this.searchInput) {
            this.setupEventListeners();
        }
    }

    /**
     * Setup event listeners for search
     */
    setupEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.handleSearchInput(query);
        });

        this.searchInput.addEventListener('focus', () => {
            if (this.currentQuery) {
                this.showResults();
            }
        });

        this.searchInput.addEventListener('blur', (e) => {
            // Use a more reliable method to handle blur
            this.blurTimeout = setTimeout(() => {
                if (!this.searchResults.contains(document.activeElement) &&
                    !this.searchResults.matches(':hover')) {
                    this.hideResults();
                }
            }, 200);
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideResults();
            }
        });
        
        // Cancel blur timeout when interacting with results
        this.searchResults.addEventListener('mousedown', () => {
            if (this.blurTimeout) {
                clearTimeout(this.blurTimeout);
                this.blurTimeout = null;
            }
        });
    }

    /**
     * Handle search input with debouncing
     * @param {string} query - Search query
     */
    handleSearchInput(query) {
        this.currentQuery = query;
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (!query) {
            this.hideResults();
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    /**
     * Perform the actual search
     * @param {string} query - Search query
     */
    async performSearch(query) {
        if (this.isSearching || !query) return;
        
        this.isSearching = true;
        this.showLoadingState();

        try {
            const results = await this.search(query);
            this.displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            this.showErrorState();
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * Search pages
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async search(query) {
        return new Promise((resolve) => {
            // Use setTimeout to make search non-blocking
            setTimeout(() => {
                const results = this.storage.searchPages(query);
                resolve(results);
            }, 0);
        });
    }

    /**
     * Display search results
     * @param {Array} results - Search results
     * @param {string} query - Original query
     */
    displayResults(results, query) {
        if (!results || results.length === 0) {
            this.showNoResults(query);
            return;
        }

        const html = results.map(result => {
            const highlightedTitle = this.highlightMatch(result.title, query);
            const highlightedSnippet = this.highlightMatch(result.snippet, query);
            
            return `
                <div class="search-result" data-page="${result.title}">
                    <div class="search-result-title">${highlightedTitle}</div>
                    ${highlightedSnippet ? `<div class="search-result-snippet">${highlightedSnippet}</div>` : ''}
                </div>
            `;
        }).join('');

        this.searchResults.innerHTML = html;
        this.showResults();
        this.bindResultEvents();
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        this.searchResults.innerHTML = `
            <div class="search-result">
                <div class="search-result-title">
                    <i data-feather="search"></i>
                    Searching...
                </div>
            </div>
        `;
        this.showResults();
        feather.replace();
    }

    /**
     * Show error state
     */
    showErrorState() {
        this.searchResults.innerHTML = `
            <div class="search-result">
                <div class="search-result-title" style="color: var(--text-muted);">
                    <i data-feather="alert-circle"></i>
                    Search error occurred
                </div>
            </div>
        `;
        this.showResults();
        feather.replace();
    }

    /**
     * Show no results state
     * @param {string} query - Search query
     */
    showNoResults(query) {
        this.searchResults.innerHTML = `
            <div class="search-result">
                <div class="search-result-title" style="color: var(--text-muted);">
                    No pages found for "${this.escapeHtml(query)}"
                </div>
                <div class="search-result-snippet">
                    Try a different search term or create a new page.
                </div>
            </div>
        `;
        this.showResults();
    }

    /**
     * Bind events to search results
     */
    bindResultEvents() {
        const resultElements = this.searchResults.querySelectorAll('.search-result[data-page]');
        
        resultElements.forEach(element => {
            element.addEventListener('click', () => {
                const pageName = element.dataset.page;
                this.selectResult(pageName);
            });

            element.addEventListener('mouseenter', () => {
                this.clearSelection();
                element.classList.add('selected');
            });
        });
    }

    /**
     * Handle keyboard navigation in search results
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyNavigation(e) {
        if (!this.isResultsVisible()) return;

        const results = this.searchResults.querySelectorAll('.search-result[data-page]');
        if (results.length === 0) return;

        let selectedIndex = -1;
        const selected = this.searchResults.querySelector('.search-result.selected');
        
        if (selected) {
            selectedIndex = Array.from(results).indexOf(selected);
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
                this.selectResultByIndex(results, selectedIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.selectResultByIndex(results, selectedIndex);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    const pageName = results[selectedIndex].dataset.page;
                    this.selectResult(pageName);
                } else if (results.length > 0) {
                    // Select first result if none selected
                    const pageName = results[0].dataset.page;
                    this.selectResult(pageName);
                }
                break;
                
            case 'Escape':
                this.hideResults();
                this.searchInput.blur();
                break;
        }
    }

    /**
     * Select result by index
     * @param {NodeList} results - Result elements
     * @param {number} index - Index to select
     */
    selectResultByIndex(results, index) {
        this.clearSelection();
        if (results[index]) {
            results[index].classList.add('selected');
            results[index].scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Clear current selection
     */
    clearSelection() {
        const selected = this.searchResults.querySelector('.search-result.selected');
        if (selected) {
            selected.classList.remove('selected');
        }
    }

    /**
     * Select a search result
     * @param {string} pageName - Page name to navigate to
     */
    selectResult(pageName) {
        this.hideResults();
        this.clearSearchInput();
        
        // Trigger navigation to selected page
        if (window.app && typeof window.app.navigateToPage === 'function') {
            window.app.navigateToPage(pageName);
        } else {
            // Fallback: dispatch custom event
            document.dispatchEvent(new CustomEvent('navigate-to-page', {
                detail: { pageName }
            }));
        }
    }

    /**
     * Show search results
     */
    showResults() {
        this.searchResults.style.display = 'block';
    }

    /**
     * Hide search results
     */
    hideResults() {
        this.searchResults.style.display = 'none';
        this.clearSelection();
    }

    /**
     * Check if results are visible
     * @returns {boolean} Whether results are visible
     */
    isResultsVisible() {
        return this.searchResults.style.display === 'block';
    }

    /**
     * Clear search input
     */
    clearSearchInput() {
        this.searchInput.value = '';
        this.currentQuery = '';
    }

    /**
     * Highlight search matches in text
     * @param {string} text - Text to highlight
     * @param {string} query - Search query
     * @returns {string} Text with highlighted matches
     */
    highlightMatch(text, query) {
        if (!text || !query) return this.escapeHtml(text);
        
        const escapedQuery = this.escapeRegex(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
     * Get search suggestions based on page titles
     * @param {string} query - Partial query
     * @returns {Array} Array of suggestions
     */
    getSuggestions(query) {
        if (!query) return [];
        
        const pages = this.storage.getPageTitles();
        const queryLower = query.toLowerCase();
        
        return pages
            .filter(title => title.toLowerCase().includes(queryLower))
            .slice(0, 5) // Limit to 5 suggestions
            .map(title => ({
                title,
                type: 'page'
            }));
    }

    /**
     * Advanced search with filters
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Filtered results
     */
    advancedSearch(query, options = {}) {
        const results = this.storage.searchPages(query);
        
        if (options.sortBy === 'modified') {
            return results.sort((a, b) => {
                const pageA = this.storage.getPage(a.title);
                const pageB = this.storage.getPage(b.title);
                return (pageB?.modified || 0) - (pageA?.modified || 0);
            });
        }
        
        if (options.sortBy === 'created') {
            return results.sort((a, b) => {
                const pageA = this.storage.getPage(a.title);
                const pageB = this.storage.getPage(b.title);
                return (pageB?.created || 0) - (pageA?.created || 0);
            });
        }
        
        return results;
    }
}

// Export for use in other modules
window.WikiSearch = WikiSearch;
