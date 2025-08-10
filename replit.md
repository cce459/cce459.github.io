# Overview

This is a client-side personal wiki application built with vanilla JavaScript. It allows users to create, edit, search, and organize wiki pages with markdown-like formatting. The application stores all data locally in the browser's localStorage, making it a completely offline-capable personal knowledge management system.

# User Preferences

Preferred communication style: Simple, everyday language.
Main page renamed to '대문' (Korean for "Main Page") at user request.
User requested new features: page templates, favorites system, enhanced search with previews and highlighting, commenting system for pages, footnote functionality, and punycode-based URLs.
User requested automatic file page creation for uploaded images.
User reported footnote link navigation issue where clicking footnote numbers redirected to main page instead of scrolling to footnote - implemented Namuwiki-style popup system where clicking footnote numbers shows popup with footnote content.
User requested site update history feature in settings menu to view replit.md contents in real-time - added API endpoint and modal interface.
User requested Namuwiki-style link syntax [[target|display]] where display text can be different from target page - implemented with special styling and backlink detection.
User requested YouTube embed syntax [[htp://yt.VIDEO_ID]] to display YouTube videos directly in pages with responsive iframe player. Updated to support both formats: [[htp://yt.VIDEO_ID]] and [[htp://VIDEO_ID.yt]] (fixed August 10, 2025).
User requested automatic [[분류:미분류]] category addition to all uploaded image file pages for better organization.
User requested to remove markdown support and use only wiki markup syntax.
User requested mobile optimization for Samsung A16 phone display - implemented comprehensive responsive design with touch-friendly interface, optimized font sizes, and mobile-first layout.
Mobile optimization completed with responsive breakpoints (768px, 480px, 360px), touch-friendly button sizes (44px minimum), improved font stacks for Korean text, and enhanced click event handling for mobile devices.
User requested changing '즐겨찾기' (favorites) to '개추한 문서' (recommended documents) throughout the interface - updated all UI text and code references (August 10, 2025).
User requested removal of delete page and page history features from settings menu - removed buttons, event listeners, functions, and modal HTML (August 10, 2025).
User requested Chinese character font change to use Chinese font stack - updated CSS font-family to prioritize Chinese fonts: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'SimSun', 'Noto Sans SC', 'Source Han Sans SC' for proper Chinese character rendering (August 10, 2025).
Fixed file upload functionality that was failing due to method name mismatch and parameter issues - corrected storage.saveImage() to storage.uploadImage() with proper parameters and async handling. Added error handling for getImage() checks during upload process (August 10, 2025).

# System Architecture

## Frontend Architecture
- **Pure JavaScript Architecture**: Built with vanilla JavaScript using class-based modules for better organization and maintainability
- **Component-Based Design**: Separated into logical modules (WikiApp, WikiStorage, WikiRenderer, WikiSearch) with single responsibilities
- **Hybrid Architecture**: Client-side focused with minimal Node.js server for file operations and API endpoints
- **Responsive Web Design**: CSS-based responsive layout with mobile-first approach

## Data Storage
- **localStorage-Based Persistence**: All wiki pages, settings, and user data stored in browser's localStorage
- **JSON Data Structure**: Pages stored as objects with title, content, timestamps, and metadata
- **No Database Required**: Eliminates need for server infrastructure or database setup

## Content Management
- **Page Templates**: Pre-defined templates for notes, meetings, projects, diary, and reference materials
- **Markdown-Like Rendering**: Custom renderer that converts wiki syntax to HTML for display
- **Real-Time Editing**: Toggle between view and edit modes with live preview capabilities
- **Version Tracking**: Basic history tracking for page modifications
- **Internal Linking**: Support for linking between wiki pages using bracket notation
- **Tag System**: Hashtag-based tagging with #tagname syntax for content organization (supports spaces in tag names)
- **Backlink Detection**: Automatic discovery and display of pages linking to current page
- **Comments System**: Page-level commenting with author attribution, editing, and deletion capabilities
- **Footnotes System**: Namuwiki-style footnotes using text[* footnote content] syntax with popup preview system - clicking footnote numbers shows content in popup with option to navigate to full footnote
- **File Management**: Automatic file page creation for uploaded images with metadata and usage information

## Search and Navigation
- **Enhanced Search**: Advanced client-side search with content previews, highlighting, and scoring
- **Search Suggestions**: Auto-complete based on page titles and tags
- **Hierarchical Navigation**: Sidebar with page listings, recent pages, and favorites for easy access
- **Favorites System**: User can bookmark frequently used pages with star icon
- **Tagged Navigation**: Clickable tags for content discovery
- **Punycode URLs**: Clean URL structure using Base64URL encoding for Korean page names (e.g., /encoded-name instead of /#한글페이지)

## User Interface Design
- **CSS Custom Properties**: Modern CSS variables for theming and consistent design tokens
- **Feather Icons**: Lightweight icon system for UI elements
- **Modal Interactions**: Clean modal dialogs for page creation and settings
- **Keyboard Shortcuts**: Enhanced user experience with keyboard navigation support

# External Dependencies

## Frontend Libraries
- **Feather Icons**: Icon library loaded via CDN for UI iconography
- **No JavaScript Frameworks**: Deliberately framework-free to minimize dependencies and complexity

## Browser APIs
- **localStorage API**: For persistent data storage in the browser
- **DOM APIs**: Standard web APIs for UI manipulation and event handling
- **CSS Grid/Flexbox**: Modern CSS layout systems for responsive design

## Development Tools
- **No Build Process**: Direct HTML/CSS/JS files that can run without compilation
- **No Package Manager**: Zero npm dependencies for maximum simplicity and portability