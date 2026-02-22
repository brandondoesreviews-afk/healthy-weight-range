import express from "express";
import { createServer as createViteServer } from "vite";
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE_FILE = path.join(__dirname, 'usage.json');

async function getUsageCount(): Promise<number> {
  try {
    const data = await fs.readFile(USAGE_FILE, 'utf-8');
    const usage = JSON.parse(data);
    return usage.count || 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(USAGE_FILE, JSON.stringify({ count: 0 }), 'utf-8');
      return 0;
    }
    console.error('Error reading usage file:', error);
    return 0;
  }
}

async function incrementUsageCount(): Promise<number> {
  let count = await getUsageCount();
  count++;
  await fs.writeFile(USAGE_FILE, JSON.stringify({ count }), 'utf-8');
  return count;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/usage", async (req, res) => {
    const count = await getUsageCount();
    res.json({ count });
  });

  app.post("/api/usage/increment", async (req, res) => {
    const count = await incrementUsageCount();
    res.json({ count });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
