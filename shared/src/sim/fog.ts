import { BUILDING_STATS, MAP_H, MAP_W, UNIT_STATS, type PlayerId } from "./constants.js";
import { inBounds, tileIndex, worldToTile } from "./helpers.js";
import type { SimState } from "./types.js";

function stampVision(grid: Uint8Array, explored: Uint8Array, cx: number, cy: number, r: number): void {
  const r2 = r * r;
  for (let ty = cy - r; ty <= cy + r; ty++) {
    for (let tx = cx - r; tx <= cx + r; tx++) {
      if (!inBounds(tx, ty)) continue;
      const dx = tx - cx;
      const dy = ty - cy;
      if (dx * dx + dy * dy <= r2) {
        const i = tileIndex(tx, ty);
        grid[i] = 1;
        explored[i] = 1;
      }
    }
  }
}

export function updateFog(state: SimState): void {
  state.visible[0].fill(0);
  state.visible[1].fill(0);

  for (const u of state.units) {
    if (!u.alive) continue;
    const vis = UNIT_STATS[u.kind].vision;
    stampVision(state.visible[u.player], state.explored[u.player], worldToTile(u.x), worldToTile(u.y), vis);
  }
  for (const b of state.buildings) {
    if (!b.alive || !b.complete) continue;
    const st = BUILDING_STATS[b.kind];
    const cx = b.tx + ((st.w - 1) >> 1);
    const cy = b.ty + ((st.h - 1) >> 1);
    stampVision(state.visible[b.player], state.explored[b.player], cx, cy, st.vision);
  }
}

export function isVisible(state: SimState, player: PlayerId, x: number, y: number): boolean {
  const tx = worldToTile(x);
  const ty = worldToTile(y);
  if (!inBounds(tx, ty)) return false;
  return state.visible[player][tileIndex(tx, ty)] === 1;
}

export function isExplored(state: SimState, player: PlayerId, tx: number, ty: number): boolean {
  if (!inBounds(tx, ty)) return false;
  return state.explored[player][tileIndex(tx, ty)] === 1;
}

export function isTileVisible(state: SimState, player: PlayerId, tx: number, ty: number): boolean {
  if (!inBounds(tx, ty)) return false;
  return state.visible[player][tileIndex(tx, ty)] === 1;
}

export { MAP_W, MAP_H };
