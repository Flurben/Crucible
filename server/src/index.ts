import colyseus from "colyseus";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { MatchmakerRoom } from "./rooms/MatchmakerRoom.js";
import { MatchRoom } from "./rooms/MatchRoom.js";

const { Server } = colyseus;

const port = Number(process.env.PORT || process.env.SERVER_PORT || 2567);
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const gameServer = new Server({
  server: httpServer,
});

gameServer.define("matchmaker", MatchmakerRoom);
gameServer.define("match", MatchRoom);

app.get("/health", (_req, res) => res.send("OK"));

// Serve static web client if built, otherwise display status page
const clientDist = path.resolve(process.cwd(), "client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/health")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Crucible Game Server</title>
    <meta charset="utf-8">
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f19; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
      h1 { margin-top: 0; color: #f59e0b; font-size: 1.8rem; }
      .badge { display: inline-block; background: #059669; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; margin-bottom: 1rem; }
      p { color: #94a3b8; line-height: 1.6; }
      a { color: #38bdf8; text-decoration: none; font-weight: 500; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>⚔️ Crucible Game Server</h1>
      <div class="badge">● Online & Operational</div>
      <p>Colyseus WebSocket Game Server is listening on port <strong>2567</strong>.</p>
      <p><a href="/health">View /health Status</a></p>
    </div>
  </body>
</html>`);
  });
}

httpServer.listen(port, () => {
  console.log(`⚔️ Crucible Colyseus server listening on port ${port}`);
});



