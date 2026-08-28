import {
  BUILDING_STATS,
  GOLD_MINE_AMOUNT,
  KEEP_REVEAL_RADIUS,
  MAP_H,
  MAP_W,
  STARTING_GOLD,
  STARTING_WORKERS,
  TILE,
  UNIT_STATS,
  type Terrain,
} from "./constants.ts";
import { buildingCenter, inBounds, tileIndex, idleOrder } from "./helpers.ts";
import { Rng } from "./rng.ts";
import type { Building, GoldMine, SimState, Unit } from "./types.ts";

export const TERRAIN_PLAINS = 0;
export const TERRAIN_FOREST = 1;
export const TERRAIN_ROCK = 2;
export const TERRAIN_GOLD = 3;

export function terrainByte(t: Terrain): number {
  switch (t) {
    case "plains":
      return TERRAIN_PLAINS;
    case "forest":
      return TERRAIN_FOREST;
    case "rock":
      return TERRAIN_ROCK;
    case "gold":
      return TERRAIN_GOLD;
  }
}

function paintRect(
  terrain: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): void {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (inBounds(tx, ty)) terrain[tileIndex(tx, ty)] = t;
    }
  }
}

function paintDisk(terrain: Uint8Array, cx: number, cy: number, r: number, t: number): void {
  const r2 = r * r;
  for (let ty = cy - r; ty <= cy + r; ty++) {
    for (let tx = cx - r; tx <= cx + r; tx++) {
      if (!inBounds(tx, ty)) continue;
      const dx = tx - cx;
      const dy = ty - cy;
      if (dx * dx + dy * dy <= r2) terrain[tileIndex(tx, ty)] = t;
    }
  }
}

function mirror(tx: number, ty: number): { tx: number; ty: number } {
  return { tx: MAP_W - 1 - tx, ty: MAP_H - 1 - ty };
}

function placeKeep(
  buildings: Building[],
  nextId: { v: number },
  player: 0 | 1,
  tx: number,
  ty: number,
): Building {
  const stats = BUILDING_STATS.keep;
  const c = buildingCenter(tx, ty, stats.w, stats.h);
  const b: Building = {
    id: nextId.v++,
    player,
    kind: "keep",
    tx,
    ty,
    hp: stats.hp,
    cooldown: 0,
    complete: true,
    progress: stats.buildTicks,
    queue: [],
    rallyX: c.x + (player === 0 ? 64 : -64),
    rallyY: c.y + (player === 0 ? 64 : -64),
    alive: true,
  };
  buildings.push(b);
  return b;
}

function placeWorkers(
  units: Unit[],
  nextId: { v: number },
  player: 0 | 1,
  cx: number,
  cy: number,
): void {
  const stats = UNIT_STATS.worker;
  const offsets = [
    [-40, 20],
    [-10, 40],
    [20, 30],
    [-30, 50],
    [10, 55],
    [-50, 35],
  ];
  for (let i = 0; i < STARTING_WORKERS; i++) {
    const o = offsets[i]!;
    const dx = player === 0 ? o[0]! : -o[0]!;
    const dy = player === 0 ? o[1]! : -o[1]!;
    units.push({
      id: nextId.v++,
      player,
      kind: "worker",
      x: cx + dx,
      y: cy + dy,
      hp: stats.hp,
      cooldown: 0,
      order: idleOrder(),
      carrying: 0,
      buildProgress: 0,
      path: [],
      pathIndex: 0,
      attackTarget: 0,
      alive: true,
    });
  }
}

function placeMine(mines: GoldMine[], nextId: { v: number }, tx: number, ty: number): void {
  mines.push({ id: nextId.v++, tx, ty, remaining: GOLD_MINE_AMOUNT });
}

function revealAround(explored: Uint8Array, cx: number, cy: number, r: number): void {
  for (let ty = cy - r; ty <= cy + r; ty++) {
    for (let tx = cx - r; tx <= cx + r; tx++) {
      if (!inBounds(tx, ty)) continue;
      const dx = tx - cx;
      const dy = ty - cy;
      if (dx * dx + dy * dy <= r * r) explored[tileIndex(tx, ty)] = 1;
    }
  }
}

export function generateMap(seed: number): SimState {
  const rng = new Rng(seed);
  const terrain = new Uint8Array(MAP_W * MAP_H);
  const blocked = new Uint8Array(MAP_W * MAP_H);
  const explored0 = new Uint8Array(MAP_W * MAP_H);
  const explored1 = new Uint8Array(MAP_W * MAP_H);
  const visible0 = new Uint8Array(MAP_W * MAP_H);
  const visible1 = new Uint8Array(MAP_W * MAP_H);

  const buildings: Building[] = [];
  const units: Unit[] = [];
  const mines: GoldMine[] = [];
  const nextId = { v: 1 };

  const keep0 = { tx: 8, ty: 8 };
  const keep1 = mirror(keep0.tx + 3, keep0.ty + 3);
  keep1.tx -= 3;
  keep1.ty -= 3;

  paintDisk(terrain, keep0.tx + 2, keep0.ty + 2, 8, TERRAIN_PLAINS);
  paintDisk(terrain, keep1.tx + 2, keep1.ty + 2, 8, TERRAIN_PLAINS);

  const rockPatches = 18 + rng.int(6);
  for (let i = 0; i < rockPatches; i++) {
    const tx = 6 + rng.int(MAP_W - 12);
    const ty = 6 + rng.int(MAP_H - 12);
    const r = 1 + rng.int(3);
    paintDisk(terrain, tx, ty, r, TERRAIN_ROCK);
    const m = mirror(tx, ty);
    paintDisk(terrain, m.tx, m.ty, r, TERRAIN_ROCK);
  }

  const forestPatches = 28 + rng.int(8);
  for (let i = 0; i < forestPatches; i++) {
    const tx = 4 + rng.int(MAP_W - 8);
    const ty = 4 + rng.int(MAP_H - 8);
    const r = 2 + rng.int(4);
    paintDisk(terrain, tx, ty, r, TERRAIN_FOREST);
    const m = mirror(tx, ty);
    paintDisk(terrain, m.tx, m.ty, r, TERRAIN_FOREST);
  }

  paintRect(terrain, keep0.tx - 1, keep0.ty - 1, 8, 8, TERRAIN_PLAINS);
  paintRect(terrain, keep1.tx - 1, keep1.ty - 1, 8, 8, TERRAIN_PLAINS);

  const mineOffsets = [
    { tx: 16, ty: 8 },
    { tx: 8, ty: 16 },
    { tx: 22, ty: 22 },
    { tx: 36, ty: 12 },
    { tx: 12, ty: 36 },
    { tx: 38, ty: 38 },
  ];
  for (const o of mineOffsets) {
    paintRect(terrain, o.tx, o.ty, 2, 2, TERRAIN_GOLD);
    placeMine(mines, nextId, o.tx, o.ty);
    const m = mirror(o.tx + 1, o.ty + 1);
    const mtx = m.tx - 1;
    const mty = m.ty - 1;
    paintRect(terrain, mtx, mty, 2, 2, TERRAIN_GOLD);
    placeMine(mines, nextId, mtx, mty);
  }

  const b0 = placeKeep(buildings, nextId, 0, keep0.tx, keep0.ty);
  const b1 = placeKeep(buildings, nextId, 1, keep1.tx, keep1.ty);
  const c0 = buildingCenter(b0.tx, b0.ty, 4, 4);
  const c1 = buildingCenter(b1.tx, b1.ty, 4, 4);
  placeWorkers(units, nextId, 0, c0.x, c0.y);
  placeWorkers(units, nextId, 1, c1.x, c1.y);

  for (let i = 0; i < terrain.length; i++) {
    blocked[i] = terrain[i] === TERRAIN_ROCK || terrain[i] === TERRAIN_GOLD ? 1 : 0;
  }
  for (const b of buildings) {
    const st = BUILDING_STATS[b.kind];
    for (let ty = b.ty; ty < b.ty + st.h; ty++) {
      for (let tx = b.tx; tx < b.tx + st.w; tx++) {
        if (inBounds(tx, ty)) blocked[tileIndex(tx, ty)] = 1;
      }
    }
  }

  revealAround(explored0, keep0.tx + 2, keep0.ty + 2, KEEP_REVEAL_RADIUS);
  revealAround(explored1, keep1.tx + 2, keep1.ty + 2, KEEP_REVEAL_RADIUS);

  return {
    tick: 0,
    seed,
    winner: null,
    nextId: nextId.v,
    units,
    buildings,
    mines,
    players: [
      {
        gold: STARTING_GOLD,
        usedSupply: STARTING_WORKERS,
        maxSupply: BUILDING_STATS.keep.supply,
        attackLevel: 0,
        armorLevel: 0,
        alive: true,
        surrendered: false,
      },
      {
        gold: STARTING_GOLD,
        usedSupply: STARTING_WORKERS,
        maxSupply: BUILDING_STATS.keep.supply,
        attackLevel: 0,
        armorLevel: 0,
        alive: true,
        surrendered: false,
      },
    ],
    terrain,
    blocked,
    explored: [explored0, explored1],
    visible: [visible0, visible1],
  };
}

export function isWalkable(blocked: Uint8Array, tx: number, ty: number): boolean {
  if (!inBounds(tx, ty)) return false;
  return blocked[tileIndex(tx, ty)] === 0;
}

export function setBlockedRect(
  blocked: Uint8Array,
  tx: number,
  ty: number,
  w: number,
  h: number,
  value: number,
): void {
  for (let y = ty; y < ty + h; y++) {
    for (let x = tx; x < tx + w; x++) {
      if (inBounds(x, y)) blocked[tileIndex(x, y)] = value;
    }
  }
}

export function canPlaceBuilding(
  state: SimState,
  tx: number,
  ty: number,
  w: number,
  h: number,
): boolean {
  if (tx < 1 || ty < 1 || tx + w >= MAP_W - 1 || ty + h >= MAP_H - 1) return false;
  for (let y = ty; y < ty + h; y++) {
    for (let x = tx; x < tx + w; x++) {
      if (!inBounds(x, y)) return false;
      const t = state.terrain[tileIndex(x, y)]!;
      if (t === TERRAIN_ROCK || t === TERRAIN_GOLD) return false;
      if (state.blocked[tileIndex(x, y)] !== 0) return false;
    }
  }
  return true;
}

export function worldSize(): { w: number; h: number } {
  return { w: MAP_W * TILE, h: MAP_H * TILE };
}

