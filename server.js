import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { db, isDatabaseAvailable } from './server/db.js';
import { pages, comments, images } from './shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { fileStorage } from './server/fileStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

// Broadcast to all connected clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('클라이언트 연결됨');
  
  ws.on('close', () => {
    console.log('클라이언트 연결 해제됨');
  });
});

// 모든 페이지 목록 가져오기
app.get("/pages", async (req, res) => {
  try {
    if (isDatabaseAvailable && db) {
      const result = await db.select({ title: pages.title }).from(pages);
      res.json(result.map(p => p.title));
    } else {
      const titles = await fileStorage.getAllPageTitles();
      res.json(titles);
    }
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: "Failed to fetch pages" });
  }
});

// 특정 페이지 가져오기
app.get("/pages/:title", async (req, res) => {
  try {
    const title = req.params.title;
    
    if (isDatabaseAvailable && db) {
      const [page] = await db.select().from(pages).where(eq(pages.title, title));
      
      if (!page) {
        return res.status(404).json({ error: "Not found" });
      }
      
      // 페이지의 댓글도 함께 가져오기
      const pageComments = await db.select().from(comments)
        .where(eq(comments.pageId, page.id))
        .orderBy(desc(comments.createdAt));
      
      res.json({
        title: page.title,
        content: page.content,
        lastModified: page.lastModified,
        metadata: page.metadata,
        comments: pageComments
      });
    } else {
      const page = await fileStorage.getPage(title);
      if (!page) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(page);
    }
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

// 페이지 저장/업데이트
app.post("/pages/:title", async (req, res) => {
  try {
    const title = req.params.title;
    const { content, metadata = {} } = req.body;
    
    let result;
    if (isDatabaseAvailable && db) {
      // 기존 페이지 확인
      const [existingPage] = await db.select().from(pages).where(eq(pages.title, title));
      
      if (existingPage) {
        // 페이지 업데이트
        [result] = await db.update(pages)
          .set({ 
            content, 
            metadata,
            lastModified: new Date()
          })
          .where(eq(pages.title, title))
          .returning();
      } else {
        // 새 페이지 생성
        [result] = await db.insert(pages)
          .values({ title, content, metadata })
          .returning();
      }
    } else {
      result = await fileStorage.savePage(title, { content, metadata });
    }
    
    // 실시간 업데이트 브로드캐스트
    broadcast({
      type: 'pageUpdated',
      page: result
    });
    
    res.json({ status: "saved", page: result });
  } catch (error) {
    console.error('Error saving page:', error);
    res.status(500).json({ error: "Failed to save page" });
  }
});

// 댓글 관련 API
app.post("/pages/:title/comments", async (req, res) => {
  try {
    const title = req.params.title;
    const { author, content } = req.body;
    
    if (!author || !content) {
      return res.status(400).json({ error: "Author and content are required" });
    }
    
    let comment;
    if (isDatabaseAvailable && db) {
      // 페이지 확인
      const [page] = await db.select().from(pages).where(eq(pages.title, title));
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      // 댓글 추가
      [comment] = await db.insert(comments)
        .values({ pageId: page.id, author, content })
        .returning();
    } else {
      comment = await fileStorage.addComment(title, { author, content });
    }
    
    // 실시간 업데이트 브로드캐스트
    broadcast({
      type: 'commentAdded',
      pageTitle: title,
      comment
    });
    
    res.json({ status: "saved", comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

app.put("/comments/:commentId", async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }
    
    let updatedComment;
    if (isDatabaseAvailable && db) {
      [updatedComment] = await db.update(comments)
        .set({ content, updatedAt: new Date() })
        .where(eq(comments.id, commentId))
        .returning();
    } else {
      updatedComment = await fileStorage.updateComment(commentId, { content });
    }
    
    if (!updatedComment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    // 실시간 업데이트 브로드캐스트
    broadcast({
      type: 'commentUpdated',
      comment: updatedComment
    });
    
    res.json({ status: "updated", comment: updatedComment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

app.delete("/comments/:commentId", async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    
    let deletedComment;
    if (isDatabaseAvailable && db) {
      [deletedComment] = await db.delete(comments)
        .where(eq(comments.id, commentId))
        .returning();
    } else {
      deletedComment = await fileStorage.deleteComment(commentId);
    }
    
    if (!deletedComment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    // 실시간 업데이트 브로드캐스트
    broadcast({
      type: 'commentDeleted',
      commentId
    });
    
    res.json({ status: "deleted" });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// 이미지 관련 API
app.post("/api/images", async (req, res) => {
  try {
    const { name, data, size, mimeType } = req.body;
    
    if (!name || !data || !size || !mimeType) {
      return res.status(400).json({ error: "All image fields are required" });
    }
    
    let image;
    if (isDatabaseAvailable && db) {
      // 이미지 저장
      [image] = await db.insert(images)
        .values({ name, data, size, mimeType })
        .returning();
    } else {
      image = await fileStorage.saveImage({ name, data, size, mimeType });
    }
    
    res.json({ status: "uploaded", image });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

app.get("/api/images", async (req, res) => {
  try {
    let allImages;
    if (isDatabaseAvailable && db) {
      allImages = await db.select().from(images).orderBy(desc(images.uploadedAt));
    } else {
      allImages = await fileStorage.getAllImages();
    }
    res.json(allImages);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// GET endpoint for individual image by name
app.get("/api/images/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    
    let image;
    if (isDatabaseAvailable && db) {
      [image] = await db.select().from(images).where(eq(images.name, name));
    } else {
      const allImages = await fileStorage.getAllImages();
      image = allImages.find(img => img.name === name);
    }
    
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    res.json(image);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

app.delete("/api/images/:name", async (req, res) => {
  try {
    const name = req.params.name;
    
    let deletedImage;
    if (isDatabaseAvailable && db) {
      [deletedImage] = await db.delete(images)
        .where(eq(images.name, name))
        .returning();
    } else {
      deletedImage = await fileStorage.deleteImage(name);
    }
    
    if (!deletedImage) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    res.json({ status: "deleted" });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// API endpoint to get update history from replit.md
app.get("/api/update-history", (req, res) => {
  try {
    const replitMdPath = path.join(__dirname, "replit.md");
    const content = fs.readFileSync(replitMdPath, "utf-8");
    res.json({ content });
  } catch (error) {
    console.error("Error reading replit.md:", error);
    res.status(500).json({ error: "Could not read update history" });
  }
});

// Handle all other routes by serving index.html (for client-side routing)
app.get("*", (req, res) => {
  // Skip API routes
  if (req.path.startsWith("/pages") || req.path.startsWith("/api") || req.path.startsWith("/comments")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  
  // Serve index.html for all page routes
  res.sendFile(path.join(__dirname, "index.html"));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Wiki API 서버 실행됨: http://0.0.0.0:${PORT}`);
  console.log(`✅ WebSocket 서버 실행됨: ws://0.0.0.0:${PORT}/ws`);
});