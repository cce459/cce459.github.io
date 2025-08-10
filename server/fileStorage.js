import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');
const pagesFile = path.join(dataDir, 'pages.json');
const commentsFile = path.join(dataDir, 'comments.json');
const imagesFile = path.join(dataDir, 'images.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize files if they don't exist
function initializeFile(filePath, defaultContent = {}) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
  }
}

initializeFile(pagesFile, {});
initializeFile(commentsFile, []);
initializeFile(imagesFile, []);

// Helper functions
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return filePath === commentsFile || filePath === imagesFile ? [] : {};
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

// File storage API
export const fileStorage = {
  // Pages
  async getAllPageTitles() {
    const pages = readJsonFile(pagesFile);
    return Object.keys(pages);
  },

  async getPage(title) {
    const pages = readJsonFile(pagesFile);
    const page = pages[title];
    if (!page) return null;

    // Get comments for this page
    const comments = readJsonFile(commentsFile);
    const pageComments = comments.filter(c => c.pageTitle === title);

    return {
      title,
      content: page.content || page, // Handle both old and new format
      lastModified: page.lastModified || new Date().toISOString(),
      metadata: page.metadata || {},
      comments: pageComments
    };
  },

  async savePage(title, { content, metadata = {} }) {
    const pages = readJsonFile(pagesFile);
    const now = new Date().toISOString();
    
    pages[title] = {
      content,
      metadata,
      lastModified: now,
      createdAt: pages[title]?.createdAt || now
    };

    const success = writeJsonFile(pagesFile, pages);
    if (success) {
      return {
        title,
        content,
        metadata,
        lastModified: now
      };
    }
    throw new Error('Failed to save page');
  },

  // Comments
  async addComment(pageTitle, { author, content }) {
    const comments = readJsonFile(commentsFile);
    const newComment = {
      id: Date.now(), // Simple ID generation
      pageTitle,
      author,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    comments.push(newComment);
    const success = writeJsonFile(commentsFile, comments);
    if (success) {
      return newComment;
    }
    throw new Error('Failed to add comment');
  },

  async updateComment(commentId, { content }) {
    const comments = readJsonFile(commentsFile);
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) return null;

    comments[commentIndex].content = content;
    comments[commentIndex].updatedAt = new Date().toISOString();

    const success = writeJsonFile(commentsFile, comments);
    if (success) {
      return comments[commentIndex];
    }
    throw new Error('Failed to update comment');
  },

  async deleteComment(commentId) {
    const comments = readJsonFile(commentsFile);
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) return null;

    const deletedComment = comments.splice(commentIndex, 1)[0];
    const success = writeJsonFile(commentsFile, comments);
    if (success) {
      return deletedComment;
    }
    throw new Error('Failed to delete comment');
  },

  // Images
  async getAllImages() {
    return readJsonFile(imagesFile);
  },

  async saveImage({ name, data, size, mimeType }) {
    const images = readJsonFile(imagesFile);
    const newImage = {
      id: Date.now(),
      name,
      data,
      size,
      mimeType,
      uploadedAt: new Date().toISOString()
    };

    images.push(newImage);
    const success = writeJsonFile(imagesFile, images);
    if (success) {
      return newImage;
    }
    throw new Error('Failed to save image');
  },

  async deleteImage(name) {
    const images = readJsonFile(imagesFile);
    const imageIndex = images.findIndex(img => img.name === name);
    
    if (imageIndex === -1) return null;

    const deletedImage = images.splice(imageIndex, 1)[0];
    const success = writeJsonFile(imagesFile, images);
    if (success) {
      return deletedImage;
    }
    throw new Error('Failed to delete image');
  }
};