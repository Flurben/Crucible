import { Server } from "colyseus";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { MatchmakerRoom } from "./rooms/MatchmakerRoom.ts";
import { MatchRoom } from "./rooms/MatchRoom.ts";

const port = Number(process.env.PORT || 2567);
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

gameServer.listen(port).then(() => {
  console.log(`⚔️ Crucible Colyseus server listening on port ${port}`);
});
