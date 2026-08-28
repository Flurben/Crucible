import colyseus from "colyseus";
import { Schema } from "@colyseus/schema";
import type { ClientMsg, ServerMsg, Command, PlayerId, TickCommands } from "@crucible/shared";

const { Room } = colyseus;
type Client = any;

class State extends Schema {}

interface MatchPlayer {
  client: Client;
  id: string;
  name: string;
  rating: number;
}

export class MatchRoom extends Room<State> {
  override maxClients = 2;
  private p0: MatchPlayer | null = null;
  private p1: MatchPlayer | null = null;
  private currentTick = 0;
  private receivedP0 = false;
  private receivedP1 = false;
  private cmdsP0: Command[] = [];
  private cmdsP1: Command[] = [];
  private history: TickCommands[] = [];
  private hashes = new Map<number, { p0?: number; p1?: number }>();
  private _ranked = false;

  override onCreate(options: { ranked: boolean }) {
    this.setState(new State());
    this._ranked = options.ranked;
    this.setSimulationInterval(() => this.tick(), 50); // 20hz tick

    this.onMessage("cmds", (client, msg: Extract<ClientMsg, { t: "cmds" }>) => {
      if (client === this.p0?.client) {
        if (msg.tick > this.currentTick) {
          this.cmdsP0 = this.cmdsP0.concat(msg.cmds);
          this.receivedP0 = true;
        }
      } else if (client === this.p1?.client) {
        if (msg.tick > this.currentTick) {
          this.cmdsP1 = this.cmdsP1.concat(msg.cmds);
          this.receivedP1 = true;
        }
      }
    });

    this.onMessage("hash", (client, msg: Extract<ClientMsg, { t: "hash" }>) => {
      let h = this.hashes.get(msg.tick);
      if (!h) {
        h = {};
        this.hashes.set(msg.tick, h);
      }
      if (client === this.p0?.client) h.p0 = msg.hash;
      else if (client === this.p1?.client) h.p1 = msg.hash;

      if (h.p0 !== undefined && h.p1 !== undefined) {
        if (h.p0 === h.p1) {
          this.broadcast("hashOk" satisfies ServerMsg["t"], { tick: msg.tick });
        } else {
          console.warn(`[MatchRoom] DESYNC at tick ${msg.tick}`);
          this.broadcast("desync" satisfies ServerMsg["t"], { tick: msg.tick });
        }
        this.hashes.delete(msg.tick);
      }
    });

    this.onMessage("surrender", (client) => {
      const loser = client === this.p0?.client ? 0 : 1;
      const m: Extract<ServerMsg, { t: "end" }> = {
        t: "end",
        winner: (1 - loser) as PlayerId,
        reason: "surrender",
      };
      this.broadcast("end", m);
      this.disconnect();
    });

    this.onMessage("ping", (client, msg: Extract<ClientMsg, { t: "ping" }>) => {
      client.send("pong", { t: "pong", n: msg.n, serverTime: Date.now() } satisfies ServerMsg);
    });
  }

  override onJoin(client: Client, options: { name: string; rating: number; id: string }) {
    if (!this.p0) {
      this.p0 = { client, id: options.id, name: options.name, rating: options.rating };
    } else if (!this.p1) {
      this.p1 = { client, id: options.id, name: options.name, rating: options.rating };
      this.lock();
      this.startMatch();
    }
  }

  override async onLeave(client: Client) {
    if (!this.p0 || !this.p1) return;
    const loser = client === this.p0.client ? 0 : 1;
    const m: Extract<ServerMsg, { t: "end" }> = {
      t: "end",
      winner: (1 - loser) as PlayerId,
      reason: "disconnect",
    };
    this.broadcast("end", m);
    this.disconnect();
  }

  private startMatch() {
    const seed = Math.floor(Math.random() * 0xffffffff);
    
    const m0: Extract<ServerMsg, { t: "match" }> = {
      t: "match",
      matchId: this.roomId,
      seed,
      you: 0,
      opponent: this.p1!.name,
      opponentRating: this.p1!.rating,
      ranked: this._ranked,
    };
    this.p0!.client.send("match", m0);

    const m1: Extract<ServerMsg, { t: "match" }> = {
      t: "match",
      matchId: this.roomId,
      seed,
      you: 1,
      opponent: this.p0!.name,
      opponentRating: this.p0!.rating,
      ranked: this._ranked,
    };
    this.p1!.client.send("match", m1);
  }

  private tick() {
    if (!this.p0 || !this.p1) return;
    
    // Server enforces the current tick. If both sent cmds for it (or an earlier one), 
    // we bundle them and broadcast them to both clients.
    // In lockstep, clients don't advance their sim until they receive this authoritative bundle.
    if (this.receivedP0 && this.receivedP1) {
      const p0 = this.cmdsP0;
      const p1 = this.cmdsP1;
      this.cmdsP0 = [];
      this.cmdsP1 = [];
      this.receivedP0 = false;
      this.receivedP1 = false;
      
      const tc: TickCommands = { tick: this.currentTick, p0, p1 };
      this.history.push(tc);
      
      const out: Extract<ServerMsg, { t: "cmds" }> = {
        t: "cmds",
        tick: this.currentTick,
        p0,
        p1,
      };
      this.broadcast("cmds", out);
      this.currentTick++;
    }
  }
}
