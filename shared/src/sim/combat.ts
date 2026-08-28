import {
  AGGRO_RANGE,
  ARMOR_PER_LEVEL,
  ATTACK_PER_LEVEL,
  BONUS,
  BUILDING_BONUS,
  BUILDING_STATS,
  UNIT_STATS,
} from "./constants.ts";
import { buildingCenter, distSq, SpatialHash } from "./helpers.ts";
import { setBlockedRect } from "./mapgen.ts";
import type { Building, SimState, Unit } from "./types.ts";

const unitHash = new SpatialHash();
const queryBuf: number[] = [];
const unitById = new Map<number, Unit>();

export function rebuildSpatial(state: SimState): void {
  unitHash.clear();
  unitById.clear();
  for (const u of state.units) {
    if (!u.alive) continue;
    unitHash.insert(u.id, u.x, u.y);
    unitById.set(u.id, u);
  }
}

export function getUnit(id: number): Unit | undefined {
  return unitById.get(id);
}

export function findNearestEnemy(
  state: SimState,
  u: Unit,
  range: number,
): { kind: "unit"; unit: Unit } | { kind: "building"; building: Building } | null {
  let bestD = range * range;
  let bestUnit: Unit | null = null;
  unitHash.query(u.x, u.y, range, queryBuf);
  for (let i = 0; i < queryBuf.length; i++) {
    const t = unitById.get(queryBuf[i]!);
    if (!t || !t.alive || t.player === u.player) continue;
    const d = distSq(u.x, u.y, t.x, t.y);
    if (d < bestD) {
      bestD = d;
      bestUnit = t;
    }
  }
  let bestB: Building | null = null;
  for (const b of state.buildings) {
    if (!b.alive || b.player === u.player) continue;
    const st = BUILDING_STATS[b.kind];
    const c = buildingCenter(b.tx, b.ty, st.w, st.h);
    const d = distSq(u.x, u.y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      bestB = b;
      bestUnit = null;
    }
  }
  if (bestUnit) return { kind: "unit", unit: bestUnit };
  if (bestB) return { kind: "building", building: bestB };
  return null;
}

export function findAggro(state: SimState, u: Unit) {
  return findNearestEnemy(state, u, AGGRO_RANGE);
}

export function strikeUnit(state: SimState, attacker: Unit, target: Unit): void {
  const atk = UNIT_STATS[attacker.kind];
  const def = UNIT_STATS[target.kind];
  const p = state.players[attacker.player];
  const dp = state.players[target.player];
  const bonus = BONUS[attacker.kind][target.kind] ?? 0;
  const dmg = Math.max(
    1,
    atk.attack + p.attackLevel * ATTACK_PER_LEVEL + bonus - (def.armor + dp.armorLevel * ARMOR_PER_LEVEL),
  );
  target.hp -= dmg;
  if (target.hp <= 0) killUnit(state, target);
}

export function strikeBuilding(state: SimState, attacker: Unit, target: Building): void {
  const atk = UNIT_STATS[attacker.kind];
  const def = BUILDING_STATS[target.kind];
  const p = state.players[attacker.player];
  const bonus = BUILDING_BONUS[attacker.kind] ?? 0;
  const dmg = Math.max(1, atk.attack + p.attackLevel * ATTACK_PER_LEVEL + bonus - def.armor);
  target.hp -= dmg;
  if (target.hp <= 0) killBuilding(state, target);
}

export function towerStrike(state: SimState, _tower: Building, target: Unit): void {
  const st = BUILDING_STATS.tower;
  const dmg = Math.max(1, st.attack - UNIT_STATS[target.kind].armor);
  target.hp -= dmg;
  if (target.hp <= 0) killUnit(state, target);
}

export function killUnit(state: SimState, u: Unit): void {
  if (!u.alive) return;
  u.alive = false;
  u.hp = 0;
  u.order.kind = "idle";
  state.players[u.player].usedSupply -= UNIT_STATS[u.kind].supply;
}

export function killBuilding(state: SimState, b: Building): void {
  if (!b.alive) return;
  b.alive = false;
  b.hp = 0;
  const st = BUILDING_STATS[b.kind];
  for (const item of b.queue) {
    if (item.kind === "unit" && item.unit) {
      state.players[b.player].usedSupply -= UNIT_STATS[item.unit].supply;
      state.players[b.player].gold += UNIT_STATS[item.unit].gold;
    }
  }
  b.queue.length = 0;
  if (b.complete && st.supply > 0) {
    state.players[b.player].maxSupply = Math.max(0, state.players[b.player].maxSupply - st.supply);
  }
  setBlockedRect(state.blocked, b.tx, b.ty, st.w, st.h, 0);
}

export function entityPos(state: SimState, id: number): { x: number; y: number } | null {
  const u = unitById.get(id);
  if (u && u.alive) return { x: u.x, y: u.y };
  for (const b of state.buildings) {
    if (b.id === id && b.alive) {
      const st = BUILDING_STATS[b.kind];
      return buildingCenter(b.tx, b.ty, st.w, st.h);
    }
  }
  return null;
}

export function inAttackRange(ax: number, ay: number, range: number, tx: number, ty: number, radius: number): boolean {
  const r = range + radius;
  return distSq(ax, ay, tx, ty) <= r * r;
}

