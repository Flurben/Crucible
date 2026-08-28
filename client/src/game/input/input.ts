import {
  BUILDING_STATS,
  type BuildingKind,
  type Command,
  type PlayerId,
  type SimState,
} from "@crucible/shared";
import { buildingCenter, distSq, worldToTile } from "@crucible/shared";
import type { Camera } from "../camera.ts";

export type BuildGhost = { kind: BuildingKind; valid: boolean; tx: number; ty: number } | null;

export interface InputState {
  selected: number[];
  boxStart: { x: number; y: number } | null;
  boxEnd: { x: number; y: number } | null;
  buildGhost: BuildGhost;
  hoverWorld: { x: number; y: number };
  keys: Set<string>;
}

export function createInput(): InputState {
  return {
    selected: [],
    boxStart: null,
    boxEnd: null,
    buildGhost: null,
    hoverWorld: { x: 0, y: 0 },
    keys: new Set(),
  };
}

function hitUnit(state: SimState, x: number, y: number, _player: PlayerId): number | null {
  let best: number | null = null;
  let bestD = 18 * 18;
  for (const u of state.units) {
    if (!u.alive) continue;
    const d = distSq(x, y, u.x, u.y);
    if (d < bestD) {
      bestD = d;
      best = u.id;
    }
  }
  return best;
}

function hitBuilding(state: SimState, x: number, y: number): number | null {
  const tx = worldToTile(x);
  const ty = worldToTile(y);
  for (const b of state.buildings) {
    if (!b.alive) continue;
    const st = BUILDING_STATS[b.kind];
    if (tx >= b.tx && tx < b.tx + st.w && ty >= b.ty && ty < b.ty + st.h) return b.id;
  }
  return null;
}

function hitMine(state: SimState, x: number, y: number): number | null {
  const tx = worldToTile(x);
  const ty = worldToTile(y);
  for (const m of state.mines) {
    if (m.remaining <= 0) continue;
    if (tx >= m.tx && tx < m.tx + 2 && ty >= m.ty && ty < m.ty + 2) return m.id;
  }
  return null;
}

export function selectedUnits(state: SimState, ids: number[], player: PlayerId) {
  const set = new Set(ids);
  return state.units.filter((u: any) => u.alive && u.player === player && set.has(u.id));
}

export function selectedBuildings(state: SimState, ids: number[], player: PlayerId) {
  const set = new Set(ids);
  return state.buildings.filter((b: any) => b.alive && b.player === player && set.has(b.id));
}

export function issueRightClick(
  state: SimState,
  input: InputState,
  player: PlayerId,
  wx: number,
  wy: number,
  attackMove: boolean,
): Command[] {
  const units = selectedUnits(state, input.selected, player);
  if (units.length === 0) {
    const blds = selectedBuildings(state, input.selected, player);
    if (blds.length === 1) return [{ type: "rally", buildingId: blds[0]!.id, x: wx | 0, y: wy | 0 }];
    return [];
  }
  const enemyU = hitUnit(state, wx, wy, player);
  if (enemyU !== null) {
    const u = state.units.find((x: any) => x.id === enemyU);
    if (u && u.player !== player) {
      return [{ type: "attack", unitIds: units.map((x: any) => x.id), targetId: enemyU }];
    }
  }
  const enemyB = hitBuilding(state, wx, wy);
  if (enemyB !== null) {
    const b = state.buildings.find((x: any) => x.id === enemyB);
    if (b && b.player !== player) {
      return [{ type: "attack", unitIds: units.map((x: any) => x.id), targetId: enemyB }];
    }
  }
  const workers = units.filter((u: any) => u.kind === "worker");
  const mine = hitMine(state, wx, wy);
  if (mine !== null && workers.length > 0) {
    return [{ type: "gather", unitIds: workers.map((w: any) => w.id), resourceId: mine }];
  }
  return [{ type: "move", unitIds: units.map((u: any) => u.id), x: wx | 0, y: wy | 0, attackMove }];
}

export function trySelect(
  state: SimState,
  input: InputState,
  player: PlayerId,
  wx: number,
  wy: number,
  additive: boolean,
): void {
  const uid = hitUnit(state, wx, wy, player);
  if (uid !== null) {
    const u = state.units.find((x: any) => x.id === uid)!;
    if (u.player === player) {
      input.selected = additive ? Array.from(new Set([...input.selected, uid])) : [uid];
      return;
    }
  }
  const bid = hitBuilding(state, wx, wy);
  if (bid !== null) {
    const b = state.buildings.find((x: any) => x.id === bid)!;
    if (b.player === player) {
      input.selected = additive ? Array.from(new Set([...input.selected, bid])) : [bid];
      return;
    }
  }
  if (!additive) input.selected = [];
}

export function boxSelect(
  state: SimState,
  input: InputState,
  player: PlayerId,
  a: { x: number; y: number },
  b: { x: number; y: number },
  additive: boolean,
): void {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const ids: number[] = [];
  for (const u of state.units) {
    if (!u.alive || u.player !== player) continue;
    if (u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY) ids.push(u.id);
  }
  if (ids.length === 0) {
    for (const bld of state.buildings) {
      if (!bld.alive || bld.player !== player) continue;
      const st = BUILDING_STATS[bld.kind];
      const c = buildingCenter(bld.tx, bld.ty, st.w, st.h);
      if (c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY) ids.push(bld.id);
    }
  }
  input.selected = additive ? Array.from(new Set([...input.selected, ...ids])) : ids;
}

export function hotkeyCommand(
  state: SimState,
  input: InputState,
  player: PlayerId,
  key: string,
): Command[] {
  const units = selectedUnits(state, input.selected, player);
  const blds = selectedBuildings(state, input.selected, player);
  const k = key.toLowerCase();
  if (k === "s") return [{ type: "stop", unitIds: units.map((u: any) => u.id) }];
  if (k === "r") return [{ type: "surrender" }];
  const keep = blds.find((b: any) => b.kind === "keep");
  const barracks = blds.find((b: any) => b.kind === "barracks");
  const forge = blds.find((b: any) => b.kind === "forge");
  if (keep && k === "w") return [{ type: "train", buildingId: keep.id, unit: "worker" }];
  if (barracks) {
    if (k === "q") return [{ type: "train", buildingId: barracks.id, unit: "swordsman" }];
    if (k === "w") return [{ type: "train", buildingId: barracks.id, unit: "archer" }];
    if (k === "e") return [{ type: "train", buildingId: barracks.id, unit: "knight" }];
  }
  if (forge) {
    if (k === "q") return [{ type: "research", buildingId: forge.id, upgrade: "attack" }];
    if (k === "w") return [{ type: "research", buildingId: forge.id, upgrade: "armor" }];
  }
  if (k === "x" && blds.length === 1) return [{ type: "cancel", buildingId: blds[0]!.id }];
  const workers = units.filter((u: any) => u.kind === "worker");
  if (workers.length) {
    const map: Record<string, BuildingKind> = { b: "barracks", n: "outpost", t: "tower", f: "forge" };
    if (map[k]) input.buildGhost = { kind: map[k]!, valid: false, tx: 0, ty: 0 };
  }
  return [];
}

export function confirmBuild(
  state: SimState,
  input: InputState,
  player: PlayerId,
  wx: number,
  wy: number,
  canPlace: (tx: number, ty: number, w: number, h: number) => boolean,
): Command[] {
  if (!input.buildGhost) return [];
  const kind = input.buildGhost.kind;
  const st = BUILDING_STATS[kind];
  const tx = worldToTile(wx) - ((st.w / 2) | 0);
  const ty = worldToTile(wy) - ((st.h / 2) | 0);
  const workers = selectedUnits(state, input.selected, player).filter((u: any) => u.kind === "worker");
  input.buildGhost = null;
  if (!workers.length || !canPlace(tx, ty, st.w, st.h)) return [];
  return [{ type: "build", workerId: workers[0]!.id, building: kind, tx, ty }];
}

export function edgePan(cam: Camera, mx: number, my: number, dt: number): void {
  const edge = 18;
  const speed = 700 * dt;
  let dx = 0;
  let dy = 0;
  if (mx < edge) dx = -speed;
  if (mx > cam.vw - edge) dx = speed;
  if (my < edge) dy = -speed;
  if (my > cam.vh - edge) dy = speed;
  if (dx || dy) cam.pan(dx, dy);
}
