import {
  BUILDING_STATS,
  MAX_PRODUCTION_QUEUE,
  MAX_SUPPLY,
  MAX_UPGRADE,
  UNIT_STATS,
  UPGRADE_COST,
  UPGRADE_TICKS,
  type BuildingKind,
  type PlayerId,
} from "./constants.ts";
import { buildingCenter, idleOrder, moveOrder } from "./helpers.ts";
import { canPlaceBuilding, setBlockedRect } from "./mapgen.ts";
import { findPath } from "./pathfinding.ts";
import type { Building, Command, SimState, Unit } from "./types.ts";

function ownedUnits(state: SimState, player: PlayerId, ids: number[]): Unit[] {
  const set = new Set(ids);
  const out: Unit[] = [];
  for (const u of state.units) {
    if (u.alive && u.player === player && set.has(u.id)) out.push(u);
  }
  return out;
}

function ownedBuilding(state: SimState, player: PlayerId, id: number): Building | null {
  for (const b of state.buildings) {
    if (b.alive && b.player === player && b.id === id && b.complete) return b;
  }
  return null;
}

function assignPath(state: SimState, u: Unit, x: number, y: number): void {
  u.path = findPath(state.blocked, u.x, u.y, x, y);
  u.pathIndex = 0;
}

function findTargetPos(state: SimState, id: number): { x: number; y: number } | null {
  for (const u of state.units) if (u.id === id && u.alive) return { x: u.x, y: u.y };
  for (const b of state.buildings) {
    if (b.id === id && b.alive) {
      const st = BUILDING_STATS[b.kind];
      return buildingCenter(b.tx, b.ty, st.w, st.h);
    }
  }
  return null;
}

export function applyCommands(state: SimState, player: PlayerId, cmds: Command[]): void {
  for (const c of cmds) applyCommand(state, player, c);
}

function applyCommand(state: SimState, player: PlayerId, c: Command): void {
  switch (c.type) {
    case "move": {
      const units = ownedUnits(state, player, c.unitIds);
      const n = units.length;
      const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
      let i = 0;
      for (const u of units) {
        const ox = ((i % cols) - (cols - 1) / 2) * 22;
        const oy = (((i / cols) | 0) - (cols - 1) / 2) * 22;
        i++;
        u.order = moveOrder((c.x + ox) | 0, (c.y + oy) | 0, c.attackMove);
        u.attackTarget = 0;
        assignPath(state, u, u.order.x, u.order.y);
      }
      break;
    }
    case "attack": {
      for (const u of ownedUnits(state, player, c.unitIds)) {
        u.order = { ...idleOrder(), kind: "attack", targetId: c.targetId };
        u.attackTarget = c.targetId;
        const t = findTargetPos(state, c.targetId);
        if (t) assignPath(state, u, t.x, t.y);
      }
      break;
    }
    case "gather": {
      for (const u of ownedUnits(state, player, c.unitIds)) {
        if (u.kind !== "worker") continue;
        u.order = { ...idleOrder(), kind: "gather", resourceId: c.resourceId };
        const m = state.mines.find((x) => x.id === c.resourceId);
        if (m) assignPath(state, u, m.tx * 32 + 32, m.ty * 32 + 32);
      }
      break;
    }
    case "build":
      startBuild(state, player, c.workerId, c.building, c.tx, c.ty);
      break;
    case "train":
      startTrain(state, player, c.buildingId, c.unit);
      break;
    case "research":
      startResearch(state, player, c.buildingId, c.upgrade);
      break;
    case "stop": {
      for (const u of ownedUnits(state, player, c.unitIds)) {
        u.order = idleOrder();
        u.path = [];
        u.pathIndex = 0;
        u.attackTarget = 0;
      }
      break;
    }
    case "patrol": {
      for (const u of ownedUnits(state, player, c.unitIds)) {
        u.order = {
          ...idleOrder(),
          kind: "patrol",
          patrolAx: u.x,
          patrolAy: u.y,
          patrolBx: c.x,
          patrolBy: c.y,
          x: c.x,
          y: c.y,
          patrolToB: true,
        };
        assignPath(state, u, c.x, c.y);
      }
      break;
    }
    case "rally": {
      const b = ownedBuilding(state, player, c.buildingId);
      if (b) {
        b.rallyX = c.x;
        b.rallyY = c.y;
      }
      break;
    }
    case "cancel": {
      const b = ownedBuilding(state, player, c.buildingId);
      if (!b || b.queue.length === 0) break;
      const item = b.queue.pop()!;
      const p = state.players[player];
      if (item.kind === "unit" && item.unit) {
        p.gold += UNIT_STATS[item.unit].gold;
        p.usedSupply -= UNIT_STATS[item.unit].supply;
      } else if (item.kind === "upgrade") {
        const lvl = item.upgrade === "attack" ? p.attackLevel : p.armorLevel;
        p.gold += UPGRADE_COST[Math.min(lvl, 2)]!;
      }
      break;
    }
    case "surrender":
      state.players[player].surrendered = true;
      state.players[player].alive = false;
      break;
  }
}

function startBuild(
  state: SimState,
  player: PlayerId,
  workerId: number,
  kind: BuildingKind,
  tx: number,
  ty: number,
): void {
  const worker = state.units.find((u) => u.id === workerId && u.alive && u.player === player);
  if (!worker || worker.kind !== "worker") return;
  const st = BUILDING_STATS[kind];
  const p = state.players[player];
  if (p.gold < st.gold) return;
  if (kind === "outpost" && p.maxSupply >= MAX_SUPPLY) return;
  if (!canPlaceBuilding(state, tx, ty, st.w, st.h)) return;
  if (kind === "keep") {
    const keeps = state.buildings.filter((b) => b.alive && b.player === player && b.kind === "keep").length;
    if (keeps >= 1) return;
  }
  p.gold -= st.gold;
  const c = buildingCenter(tx, ty, st.w, st.h);
  const b: Building = {
    id: state.nextId++,
    player,
    kind,
    tx,
    ty,
    hp: 1,
    cooldown: 0,
    complete: false,
    progress: 0,
    queue: [],
    rallyX: c.x,
    rallyY: c.y + 48,
    alive: true,
  };
  state.buildings.push(b);
  setBlockedRect(state.blocked, tx, ty, st.w, st.h, 1);
  worker.order = {
    ...idleOrder(),
    kind: "build",
    targetId: b.id,
    building: kind,
    x: c.x,
    y: c.y,
  };
  assignPath(state, worker, c.x, c.y);
}

function startTrain(state: SimState, player: PlayerId, buildingId: number, unit: Unit["kind"]): void {
  const b = ownedBuilding(state, player, buildingId);
  if (!b || b.queue.length >= MAX_PRODUCTION_QUEUE) return;
  const allowed =
    (b.kind === "keep" && unit === "worker") ||
    (b.kind === "barracks" && (unit === "swordsman" || unit === "archer" || unit === "knight"));
  if (!allowed) return;
  const st = UNIT_STATS[unit];
  const p = state.players[player];
  if (p.gold < st.gold) return;
  if (p.usedSupply + st.supply > p.maxSupply) return;
  p.gold -= st.gold;
  p.usedSupply += st.supply;
  b.queue.push({ kind: "unit", unit, upgrade: null, remaining: st.trainTicks, total: st.trainTicks });
}

function startResearch(
  state: SimState,
  player: PlayerId,
  buildingId: number,
  upgrade: "attack" | "armor",
): void {
  const b = ownedBuilding(state, player, buildingId);
  if (!b || b.kind !== "forge" || b.queue.length >= MAX_PRODUCTION_QUEUE) return;
  const p = state.players[player];
  const current = upgrade === "attack" ? p.attackLevel : p.armorLevel;
  const queued = b.queue.filter((q) => q.upgrade === upgrade).length;
  if (current + queued >= MAX_UPGRADE) return;
  const lvl = current + queued;
  const cost = UPGRADE_COST[lvl]!;
  if (p.gold < cost) return;
  p.gold -= cost;
  const ticks = UPGRADE_TICKS[lvl]!;
  b.queue.push({ kind: "upgrade", unit: null, upgrade, remaining: ticks, total: ticks });
}

