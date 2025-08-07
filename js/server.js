const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_PATH = path.join(__dirname, "data", "pages.json");

app.use(cors());
app.use(express.json());

function readPages() {
  if (!fs.existsSync(DATA_PATH)) return {};
  const data = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(data || "{}");
}

function writePages(pages) {
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

app.listen(PORT, () => {
  console.log(`✅ Wiki API 서버 실행됨: http://localhost:${PORT}`);
});
