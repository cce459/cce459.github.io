import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const DATA_PATH = path.join(__dirname, "data", "pages.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readPages() {
  if (!fs.existsSync(DATA_PATH)) return {};
  const data = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(data || "{}");
}

function writePages(pages) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(pages, null, 2));
}

app.get("/pages", (req, res) => {
  const pages = readPages();
  res.json(Object.keys(pages));
});

app.get("/pages/:title", (req, res) => {
  const pages = readPages();
  const title = req.params.title;
  if (!pages[title]) return res.status(404).json({ error: "Not found" });
  res.json({ title, content: pages[title] });
});

app.post("/pages/:title", (req, res) => {
  const pages = readPages();
  const title = req.params.title;
  const content = req.body.content || "";
  pages[title] = content;
  writePages(pages);
  res.json({ status: "saved" });
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
  if (req.path.startsWith("/pages") || req.path.startsWith("/api")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  
  // Serve index.html for all page routes
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Wiki API 서버 실행됨: http://0.0.0.0:${PORT}`);
});