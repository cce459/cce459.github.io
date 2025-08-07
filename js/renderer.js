/**
 * Markdown-like renderer for wiki content
 */
class WikiRenderer {
    constructor() {
        this.linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        this.internalLinkPattern = /\[([^\]]+)\]\(([^):/]+)\)(?!\w)/g;
    }

    /**
     * Render wiki content to HTML
     * @param {string} content - Raw wiki content
     * @returns {string} Rendered HTML
     */
    render(content) {
        if (!content) return '<p><em>This page is empty. Click Edit to add content.</em></p>';

        let html = content;
        
        // Process in order to avoid conflicts
        html = this.renderHeaders(html);
        html = this.renderHorizontalRules(html);
        html = this.renderCodeBlocks(html);
        html = this.renderInlineCode(html);
        html = this.renderBold(html);
        html = this.renderItalic(html);
        html = this.renderLinks(html);
        html = this.renderLists(html);
        html = this.renderParagraphs(html);
        
        return html;
    }

    /**
     * Render headers (# ## ###)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderHeaders(content) {
        return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
            const level = hashes.length;
            const id = this.generateId(text);
            return `<h${level} id="${id}">${text.trim()}</h${level}>`;
        });
    }

    /**
     * Render horizontal rules (---)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderHorizontalRules(content) {
        return content.replace(/^---+$/gm, '<hr>');
    }

    /**
     * Render code blocks (```)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderCodeBlocks(content) {
        return content.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
        });
    }

    /**
     * Render inline code (`)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderInlineCode(content) {
        return content.replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    /**
     * Render bold text (**)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderBold(content) {
        return content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    }

    /**
     * Render italic text (*)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderItalic(content) {
        return content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }

    /**
     * Render links [text](url)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderLinks(content) {
        return content.replace(this.linkPattern, (match, text, url) => {
            // Check if it's an internal link (no protocol)
            const isInternal = !url.includes('://') && !url.startsWith('#');
            
            if (isInternal) {
                return `<a href="#" class="internal-link" data-page="${url}">${text}</a>`;
            } else {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            }
        });
    }

    /**
     * Render lists (- or 1.)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderLists(content) {
        const lines = content.split('\n');
        const result = [];
        let inUnorderedList = false;
        let inOrderedList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const unorderedMatch = line.match(/^(\s*)-\s+(.+)$/);
            const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);

            if (unorderedMatch) {
                if (!inUnorderedList) {
                    result.push('<ul>');
                    inUnorderedList = true;
                }
                if (inOrderedList) {
                    result.push('</ol>');
                    inOrderedList = false;
                }
                result.push(`<li>${unorderedMatch[2]}</li>`);
            } else if (orderedMatch) {
                if (!inOrderedList) {
                    result.push('<ol>');
                    inOrderedList = true;
                }
                if (inUnorderedList) {
                    result.push('</ul>');
                    inUnorderedList = false;
                }
                result.push(`<li>${orderedMatch[2]}</li>`);
            } else {
                if (inUnorderedList) {
                    result.push('</ul>');
                    inUnorderedList = false;
                }
                if (inOrderedList) {
                    result.push('</ol>');
                    inOrderedList = false;
                }
                result.push(line);
            }
        }

        if (inUnorderedList) result.push('</ul>');
        if (inOrderedList) result.push('</ol>');

        return result.join('\n');
    }

    /**
     * Render paragraphs
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderParagraphs(content) {
        const lines = content.split('\n');
        const result = [];
        let currentParagraph = '';

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip if line is already HTML or empty
            if (!trimmed || 
                trimmed.startsWith('<') || 
                trimmed.startsWith('#') ||
                trimmed === '<hr>') {
                
                if (currentParagraph) {
                    result.push(`<p>${currentParagraph.trim()}</p>`);
                    currentParagraph = '';
                }
                
                if (trimmed) {
                    result.push(line);
                }
            } else {
                if (currentParagraph) {
                    currentParagraph += ' ';
                }
                currentParagraph += trimmed;
            }
        }

        if (currentParagraph) {
            result.push(`<p>${currentParagraph.trim()}</p>`);
        }

        return result.join('\n');
    }

    /**
     * Generate ID for headers
     * @param {string} text - Header text
     * @returns {string} Generated ID
     */
    generateId(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
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
     * Extract plain text from rendered HTML (for search)
     * @param {string} html - HTML content
     * @returns {string} Plain text
     */
    extractText(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * Get page links from content
     * @param {string} content - Wiki content
     * @returns {Array} Array of linked page names
     */
    getLinkedPages(content) {
        const links = [];
        let match;
        
        // Reset the regex lastIndex
        this.internalLinkPattern.lastIndex = 0;
        
        while ((match = this.internalLinkPattern.exec(content)) !== null) {
            const url = match[2];
            // Only internal links (no protocol)
            if (!url.includes('://') && !url.startsWith('#')) {
                links.push(url);
            }
        }
        
        return [...new Set(links)]; // Remove duplicates
    }

    /**
     * Highlight search terms in content
     * @param {string} content - Content to highlight
     * @param {string} searchTerm - Term to highlight
     * @returns {string} Content with highlighted terms
     */
    highlightSearchTerm(content, searchTerm) {
        if (!searchTerm) return content;
        
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return content.replace(regex, '<mark>$1</mark>');
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
     * Convert content to table of contents
     * @param {string} content - Wiki content
     * @returns {Array} Array of TOC entries
     */
    generateTOC(content) {
        const toc = [];
        const headerRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;

        while ((match = headerRegex.exec(content)) !== null) {
            const level = match[1].length;
            const text = match[2].trim();
            const id = this.generateId(text);
            
            toc.push({
                level,
                text,
                id
            });
        }

        return toc;
    }
}

// Export for use in other modules
window.WikiRenderer = WikiRenderer;
