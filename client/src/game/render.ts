import { BUILDING_STATS, MAP_H, MAP_W, TILE, type SimState, type PlayerId } from "@crucible/shared";
import type { Camera } from "./camera.ts";
import type { InputState } from "./input/input.ts";

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  cam: Camera,
  input: InputState,
  localUser: PlayerId,
) {
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, cam.vw, cam.vh);

  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  // Terrain
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const v = state.terrain[ty * MAP_W + tx];
      if (v === 1) { // grass
        ctx.fillStyle = "#2a3a2a";
      } else if (v === 2) { // forest
        ctx.fillStyle = "#1a2a1a";
      } else {
        ctx.fillStyle = "#111"; // dirt
      }
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }

  // Mines
  for (const m of state.mines) {
    if (m.remaining <= 0) continue;
    ctx.fillStyle = "#e8a23a";
    ctx.fillRect(m.tx * TILE, m.ty * TILE, TILE * 2, TILE * 2);
  }

  const selected = new Set(input.selected);

  // Buildings
  for (const b of state.buildings) {
    if (!b.alive) continue;
    
    // Check fog
    if (state.visible[localUser][b.ty * MAP_W + b.tx] === 0 && b.player !== localUser && state.explored[localUser][b.ty * MAP_W + b.tx] === 0) continue;

    const st = BUILDING_STATS[b.kind];
    const w = st.w * TILE;
    const h = st.h * TILE;
    const x = b.tx * TILE;
    const y = b.ty * TILE;

    ctx.fillStyle = b.player === localUser ? "#3a4a5a" : "#5a2a2a";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = b.player === localUser ? "#4ec4e0" : "#e85050";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    if (b.player === localUser && !b.complete) { // incomplete overlay
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#4ec4e0";
      ctx.fillRect(x, y + h - 4, w * (b.progress / (st.gold * 5)), 4);
    }
    
    if (selected.has(b.id)) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    }

    if (b.queue.length > 0 && b.player === localUser) {
      ctx.fillStyle = "#e8a23a";
      ctx.fillRect(x, y - 6, w * (1 - b.queue[0]!.remaining / b.queue[0]!.total), 4);
    }
  }

  // Units
  for (const u of state.units) {
    if (!u.alive) continue;
    
    const uty = (u.y / TILE) | 0;
    const utx = (u.x / TILE) | 0;
    if (state.visible[localUser][uty * MAP_W + utx] === 0 && u.player !== localUser) continue;

    ctx.beginPath();
    ctx.arc(u.x, u.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = u.player === localUser ? "#4ec4e0" : "#e85050";
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (selected.has(u.id)) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    if (u.kind === "archer") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(u.x - 2, u.y - 2, 4, 4);
    } else if (u.kind === "knight") {
       ctx.fillStyle = "#fff";
       ctx.beginPath(); ctx.arc(u.x, u.y, 4, 0, Math.PI*2); ctx.fill();
    }
  }

  // Build Ghost
  if (input.buildGhost) {
    const { kind, tx, ty, valid } = input.buildGhost;
    const st = BUILDING_STATS[kind];
    ctx.fillStyle = valid ? "rgba(78, 196, 224, 0.4)" : "rgba(232, 80, 80, 0.4)";
    ctx.fillRect(tx * TILE, ty * TILE, st.w * TILE, st.h * TILE);
    ctx.strokeStyle = valid ? "#4ec4e0" : "#e85050";
    ctx.lineWidth = 2;
    ctx.strokeRect(tx * TILE, ty * TILE, st.w * TILE, st.h * TILE);
  }

  // Selection Box
  if (input.boxStart && input.boxEnd) {
    ctx.fillStyle = "rgba(78, 196, 224, 0.2)";
    const x = Math.min(input.boxStart.x, input.boxEnd.x);
    const y = Math.min(input.boxStart.y, input.boxEnd.y);
    const w = Math.abs(input.boxStart.x - input.boxEnd.x);
    const h = Math.abs(input.boxStart.y - input.boxEnd.y);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#4ec4e0";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  // Fog of War (simple dark overlay per tile)
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const idx = ty * MAP_W + tx;
      if (state.visible[localUser][idx] === 0) {
        ctx.fillStyle = state.explored[localUser][idx] === 0 ? "rgba(13,13,13,0.9)" : "rgba(13,13,13,0.5)";
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }

  ctx.restore();
}
