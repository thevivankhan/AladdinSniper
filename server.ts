import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Allow iframe embedding on Pocket Option & trading domains
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self' * https://*.p.finance https://*.pocketoption.com https://*.po.trade https://*.po8.cash https://*.po2.cash https://*.po-trade.com;");
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  let telegramConfig = { token: '', chatId: '' };

  app.post("/api/telegram/config", (req, res) => {
    console.log("Saving Telegram config:", req.body);
    telegramConfig = req.body;
    res.json({ status: "ok" });
  });

  app.post("/api/telegram/test", async (req, res) => {
    console.log("Testing Telegram connection with config:", telegramConfig);
    if (!telegramConfig.token || !telegramConfig.chatId) {
      console.error("Credentials missing");
      return res.status(400).json({ error: "Credentials not configured" });
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramConfig.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramConfig.chatId,
          text: "✅ Aladdin AI: Connection Successful!",
          parse_mode: 'HTML'
        })
      });
      const data = await response.json();
      console.log("Telegram API response:", data);
      if (data.ok) {
        res.json({ status: "ok" });
      } else {
        res.status(400).json({ error: data.description });
      }
    } catch (err) {
      console.error("Telegram fetch error:", err);
      res.status(500).json({ error: "Failed to connect to Telegram" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
