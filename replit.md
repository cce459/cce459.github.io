# Overview

This is a client-side personal wiki application built with vanilla JavaScript. It allows users to create, edit, search, and organize wiki pages with markdown-like formatting. The application stores all data locally in the browser's localStorage, making it a completely offline-capable personal knowledge management system.

# User Preferences

Preferred communication style: Simple, everyday language.
Main page renamed to '대문' (Korean for "Main Page") at user request.

# System Architecture

## Frontend Architecture
- **Pure JavaScript Architecture**: Built with vanilla JavaScript using class-based modules for better organization and maintainability
- **Component-Based Design**: Separated into logical modules (WikiApp, WikiStorage, WikiRenderer, WikiSearch) with single responsibilities
- **Client-Side Only**: No backend required - runs entirely in the browser
- **Responsive Web Design**: CSS-based responsive layout with mobile-first approach

## Data Storage
- **localStorage-Based Persistence**: All wiki pages, settings, and user data stored in browser's localStorage
- **JSON Data Structure**: Pages stored as objects with title, content, timestamps, and metadata
- **No Database Required**: Eliminates need for server infrastructure or database setup

## Content Management
- **Markdown-Like Rendering**: Custom renderer that converts wiki syntax to HTML for display
- **Real-Time Editing**: Toggle between view and edit modes with live preview capabilities
- **Version Tracking**: Basic history tracking for page modifications
- **Internal Linking**: Support for linking between wiki pages using bracket notation

## Search and Navigation
- **Full-Text Search**: Client-side search across all page content with real-time results
- **Hierarchical Navigation**: Sidebar with page listings and recent pages for easy access
- **Auto-Complete**: Search suggestions based on existing page titles and content

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