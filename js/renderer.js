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
        if (!content) return '<p><em>이 페이지는 비어있습니다. 편집 버튼을 클릭하여 내용을 추가하세요.</em></p>';

        let html = content;
        
        // Process wiki-specific syntax first
        html = this.renderWikiHeaders(html);
        html = this.renderCategories(html);
        html = this.renderTags(html);
        html = this.renderTableOfContents(html);
        html = this.renderFootnotes(html);
        html = this.renderWikiBold(html);
        html = this.renderStrikethrough(html);
        
        // Then process standard markdown
        html = this.renderHeaders(html);
        html = this.renderHorizontalRules(html);
        html = this.renderCodeBlocks(html);
        html = this.renderInlineCode(html);
        html = this.renderImages(html);
        html = this.renderBold(html);
        html = this.renderItalic(html);
        html = this.renderBlockquotes(html);
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
                // Generate punycode URL for internal links
                const encodedUrl = window.app ? window.app.pageNameToPunycode(url) : encodeURIComponent(url);
                return `<a href="/${encodedUrl}" class="internal-link" data-page="${url}">${text}</a>`;
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
            
            // Check if line should break paragraph
            const isBlockElement = !trimmed || 
                trimmed.startsWith('<') || 
                trimmed.startsWith('#') ||
                trimmed === '<hr>' ||
                trimmed.startsWith('- ') ||
                trimmed.startsWith('* ') ||
                trimmed.match(/^\d+\. /) ||
                trimmed.startsWith('> ') ||
                trimmed.startsWith('```');
            
            if (isBlockElement) {
                // Finish current paragraph if exists
                if (currentParagraph) {
                    result.push(`<p>${currentParagraph.trim()}</p>`);
                    currentParagraph = '';
                }
                
                // Add the block element if not empty
                if (trimmed) {
                    result.push(line);
                }
            } else {
                // Add to current paragraph
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
     * Render tags (#tag) with clickable links
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderTags(content) {
        // Pattern for hashtags with spaces: #tag name or #태그명
        return content.replace(/#([가-힣a-zA-Z0-9_][가-힣a-zA-Z0-9_\s]*[가-힣a-zA-Z0-9_]|[가-힣a-zA-Z0-9_]+)/g, (match, tag) => {
            const normalizedTag = tag.trim().replace(/\s+/g, ' ');
            return `<span class="wiki-tag" data-tag="${this.escapeHtml(normalizedTag)}" onclick="app.showTaggedPages('${this.escapeHtml(normalizedTag)}')">#${normalizedTag}</span>`;
        });
    }

    /**
     * Render blockquotes (>)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderBlockquotes(content) {
        const lines = content.split('\n');
        const result = [];
        let inBlockquote = false;
        let blockquoteContent = '';

        for (const line of lines) {
            const blockquoteMatch = line.match(/^>\s+(.+)$/);
            
            if (blockquoteMatch) {
                if (!inBlockquote) {
                    inBlockquote = true;
                }
                if (blockquoteContent) {
                    blockquoteContent += ' ';
                }
                blockquoteContent += blockquoteMatch[1];
            } else {
                if (inBlockquote) {
                    result.push(`<blockquote>${blockquoteContent}</blockquote>`);
                    inBlockquote = false;
                    blockquoteContent = '';
                }
                result.push(line);
            }
        }
        
        if (inBlockquote) {
            result.push(`<blockquote>${blockquoteContent}</blockquote>`);
        }
        
        return result.join('\n');
    }

    /**
     * Render wiki-style headers (= text =)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderWikiHeaders(content) {
        return content.replace(/^(={1,5})\s*(.+?)\s*\1\s*$/gm, (match, equals, text) => {
            const level = equals.length;
            const id = this.generateId(text);
            return `<h${level} id="${id}">${text.trim()}</h${level}>`;
        });
    }

    /**
     * Render categories [[분류:...]]
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderCategories(content) {
        return content.replace(/\[\[분류:([^\]]+)\]\]/g, (match, category) => {
            const categoryName = category.trim();
            const categoryPageTitle = `분류:${categoryName}`;
            return `<div class="wiki-category category-link" data-category="${this.escapeHtml(categoryPageTitle)}"><span class="category-label">분류:</span> <span class="category-name">${this.escapeHtml(categoryName)}</span></div>`;
        });
    }

    /**
     * Render table of contents [목차]
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderTableOfContents(content) {
        return content.replace(/\[목차\]/g, () => {
            const toc = this.generateTOC(content);
            if (toc.length === 0) return '';
            
            let tocHtml = '<div class="wiki-toc"><h4>목차</h4><ul>';
            for (const item of toc) {
                const indent = '  '.repeat(item.level - 1);
                tocHtml += `${indent}<li><a href="#${item.id}">${item.text}</a></li>`;
            }
            tocHtml += '</ul></div>';
            return tocHtml;
        });
    }

    /**
     * Render wiki-style bold (--text--)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderWikiBold(content) {
        return content.replace(/--([^-]+)--/g, '<strong>$1</strong>');
    }

    /**
     * Render strikethrough (~~text~~)
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderStrikethrough(content) {
        return content.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    }

    /**
     * Render footnotes (text[* footnote content])
     * @param {string} content - Content to process
     * @returns {string} Processed content with footnotes
     */
    renderFootnotes(content) {
        let footnoteCounter = 1;
        const footnotes = [];
        
        // Replace footnote references with numbered links
        const processedContent = content.replace(/([^\[\s]+)\[\*\s*([^\]]+)\]/g, (match, text, footnoteContent) => {
            const footnoteId = `footnote-${footnoteCounter}`;
            const backrefId = `backref-${footnoteCounter}`;
            
            footnotes.push({
                id: footnoteId,
                backrefId: backrefId,
                number: footnoteCounter,
                content: footnoteContent.trim()
            });
            
            const result = `${text}<sup><a href="javascript:void(0)" id="${backrefId}" class="footnote-ref" onclick="event.preventDefault(); toggleFootnote('${footnoteId}'); return false;">${footnoteCounter}</a></sup>`;
            footnoteCounter++;
            
            return result;
        });
        
        // Add footnotes section at the end if there are any footnotes
        if (footnotes.length > 0) {
            let footnotesHtml = '<div class="footnotes-section"><hr><h4>각주</h4><ol class="footnotes-list">';
            
            footnotes.forEach(footnote => {
                footnotesHtml += `<li id="${footnote.id}" class="footnote">
                    <span class="footnote-content">${footnote.content}</span>
                    <a href="javascript:void(0)" class="footnote-backref" onclick="event.preventDefault(); scrollToBackref('${footnote.backrefId}'); return false;" title="본문으로 돌아가기">↑</a>
                </li>`;
            });
            
            footnotesHtml += '</ol></div>';
            
            return processedContent + footnotesHtml;
        }
        
        return processedContent;
    }
    
    /**
     * Render images ![imageName] or ![imageName|caption]
     * @param {string} content - Content to process
     * @returns {string} Processed content
     */
    renderImages(content) {
        return content.replace(/!\[([^\]]+)\]/g, (match, imageRef) => {
            const parts = imageRef.split('|');
            const imageName = parts[0].trim();
            const caption = parts[1] ? parts[1].trim() : '';
            
            // Get image from storage
            if (typeof window !== 'undefined' && window.WikiStorage) {
                const storage = new window.WikiStorage();
                const image = storage.getImage(imageName);
                
                if (image) {
                    let html = `<img src="${image.data}" alt="${this.escapeHtml(imageName)}" title="${this.escapeHtml(imageName)}">`;
                    if (caption) {
                        html += `<div class="image-caption">${this.escapeHtml(caption)}</div>`;
                    }
                    return html;
                } else {
                    return `<span style="color: #ef4444; font-style: italic;">[이미지 "${this.escapeHtml(imageName)}"를 찾을 수 없습니다]</span>`;
                }
            }
            
            return match; // Fallback if storage not available
        });
    }

    /**
     * Convert content to table of contents
     * @param {string} content - Wiki content
     * @returns {Array} Array of TOC entries
     */
    generateTOC(content) {
        const toc = [];
        const lines = content.split('\n');
        
        // Match both markdown headers (# text) and wiki headers (= text =)
        const markdownHeaderRegex = /^(#{1,6})\s+(.+)$/;
        const wikiHeaderRegex = /^(={1,5})\s*(.+?)\s*\1\s*$/;
        
        // Process each line to find headers in order
        lines.forEach((line, index) => {
            let match;
            
            // Check for markdown headers
            if ((match = line.match(markdownHeaderRegex)) !== null) {
                const level = match[1].length;
                const text = match[2].trim();
                const id = this.generateId(text);
                
                toc.push({
                    level,
                    text,
                    id,
                    position: index
                });
            }
            // Check for wiki headers
            else if ((match = line.match(wikiHeaderRegex)) !== null) {
                const level = match[1].length;
                const text = match[2].trim();
                const id = this.generateId(text);
                
                toc.push({
                    level,
                    text,
                    id,
                    position: index
                });
            }
        });
        
        // Already in order, no need to sort
        return toc;
    }
}

// Export for use in other modules
window.WikiRenderer = WikiRenderer;
