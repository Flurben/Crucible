import colyseus from "colyseus";
import type { ClientMsg, ServerMsg, RatingRecord } from "@crucible/shared";
import { DEFAULT_RATING } from "@crucible/shared";

const { Room, matchMaker } = colyseus;
type Client = any;

interface QueueEntry {
  client: Client;
  id: string;
  name: string;
  rating: number;
  ranked: boolean;
  joinedAt: number;
}

// In-memory rating mock (in a real app, this hits a DB)
const RATING_DB = new Map<string, RatingRecord>();

export class MatchmakerRoom extends Room {
  private queue: QueueEntry[] = [];
  private intervalCheck: NodeJS.Timeout | null = null;

  override onCreate() {
    this.intervalCheck = setInterval(() => this.checkQueue(), 2000);


    this.onMessage("hello", (client, msg: Extract<ClientMsg, { t: "hello" }>) => {
      // Mock auth — assume the provided name is their ID
      const uid = msg.name; 
      let r = RATING_DB.get(uid);
      if (!r) {
        r = { id: uid, name: uid, rating: DEFAULT_RATING, wins: 0, losses: 0 };
        RATING_DB.set(uid, r);
      }
      const out: Extract<ServerMsg, { t: "welcome" }> = {
        t: "welcome",
        playerId: r.id,
        name: r.name,
        rating: r.rating,
      };
      client.send("welcome", out);
    });

    this.onMessage("queue", (client, msg: Extract<ClientMsg, { t: "queue" }>) => {
      if (this.queue.some((q) => q.client === client)) return; // already queued
      // Use client auth data if present in a real app. We're mocking by fetching by session ID or tracking state.
      // For simplicity, we just use a dummy name/rating if not hello'd properly.
      const entry: QueueEntry = {
        client,
        id: client.sessionId,
        name: "Player",
        rating: 1000,
        ranked: msg.ranked,
        joinedAt: Date.now(),
      };
      this.queue.push(entry);
      // Wait for checkQueue to match them
      client.send("queued", { t: "queued", ranked: msg.ranked } satisfies ServerMsg);
    });

    this.onMessage("cancelQueue", (client) => {
      this.queue = this.queue.filter((q) => q.client !== client);
    });
  }

  override onLeave(client: Client) {
    this.queue = this.queue.filter((q) => q.client !== client);
  }

  override onDispose() {
    if (this.intervalCheck) clearInterval(this.intervalCheck);
  }

  private async checkQueue() {
    if (this.queue.length < 2) return;
    
    // Simple FIFO matching
    const p1 = this.queue.shift()!;
    let p2Index = this.queue.findIndex(q => q.ranked === p1.ranked);
    
    if (p2Index === -1) {
      // no matching player found for this mode, put them back
      this.queue.unshift(p1);
      return;
    }
    
    const p2 = this.queue.splice(p2Index, 1)[0]!;

    try {
      const matchRoom = await matchMaker.createRoom("match", { ranked: p1.ranked });
      // Tell clients to join the newly created match room
      // Server connects them via reservation token
      const res1 = await matchMaker.reserveSeatFor(matchRoom, { id: p1.id, name: p1.name, rating: p1.rating });
      const res2 = await matchMaker.reserveSeatFor(matchRoom, { id: p2.id, name: p2.name, rating: p2.rating });
      
      p1.client.send("matchFound", { sessionId: res1.sessionId, room: res1.room });
      p2.client.send("matchFound", { sessionId: res2.sessionId, room: res2.room });
    } catch (e) {
      console.error("Matchmaking error", e);
      p1.client.send("error", { t: "error", message: "Failed to create match room" } satisfies ServerMsg);
      p2.client.send("error", { t: "error", message: "Failed to create match room" } satisfies ServerMsg);
    }
  }
}
