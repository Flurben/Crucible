import {
  BUILDING_STATS,
  BUILD_RANGE,
  DROP_RANGE,
  FOREST_SPEED,
  GATHER_AMOUNT,
  GATHER_RANGE,
  GATHER_TICKS,
  TILE,
  UNIT_STATS,
  type PlayerId,
} from "./constants.ts";
import { TERRAIN_FOREST } from "./mapgen.ts";
import { applyCommands } from "./commands.ts";
import {
  entityPos,
  findAggro,
  findNearestEnemy,
  inAttackRange,
  rebuildSpatial,
  strikeBuilding,
  strikeUnit,
  towerStrike,
} from "./combat.ts";
import { updateFog } from "./fog.ts";
import { buildingCenter, distSq, idleOrder, stepToward, tileIndex, worldToTile } from "./helpers.ts";
import { findPath, nextWaypoint } from "./pathfinding.ts";
import type { Building, Command, SimState, Unit } from "./types.ts";

export function tick(state: SimState, p0: Command[], p1: Command[]): void {
  if (state.winner !== null) return;
  applyCommands(state, 0, p0);
  applyCommands(state, 1, p1);
  rebuildSpatial(state);
  tickUnits(state);
  tickBuildings(state);
  updateFog(state);
  checkVictory(state);
  state.tick++;
}

function tickUnits(state: SimState): void {
  for (const u of state.units) {
    if (!u.alive) continue;
    if (u.cooldown > 0) u.cooldown--;
    switch (u.order.kind) {
      case "idle":
        idleBehavior(state, u);
        break;
      case "move":
        followPath(state, u, false);
        break;
      case "attackMove":
      case "patrol":
        attackMoveBehavior(state, u);
        break;
      case "attack":
        attackBehavior(state, u);
        break;
      case "gather":
      case "return":
        gatherBehavior(state, u);
        break;
      case "build":
        buildBehavior(state, u);
        break;
    }
  }
}

function unitSpeed(state: SimState, u: Unit): number {
  const base = UNIT_STATS[u.kind].speed;
  const tx = worldToTile(u.x);
  const ty = worldToTile(u.y);
  const t = state.terrain[tileIndex(tx, ty)];
  if (t === TERRAIN_FOREST) return Math.max(1, FOREST_SPEED);
  return base;
}

function followPath(state: SimState, u: Unit, stopOnArrive: boolean): boolean {
  const wp = nextWaypoint(u.path, u.pathIndex);
  if (!wp) {
    if (stopOnArrive) u.order = idleOrder();
    return true;
  }
  const step = stepToward(u.x, u.y, wp.x, wp.y, unitSpeed(state, u));
  u.x = step.x;
  u.y = step.y;
  if (step.arrived) {
    u.pathIndex++;
    if (!nextWaypoint(u.path, u.pathIndex)) {
      if (stopOnArrive) u.order = idleOrder();
      return true;
    }
  }
  return false;
}

function idleBehavior(state: SimState, u: Unit): void {
  if (u.kind === "worker") return;
  const enemy = findAggro(state, u);
  if (!enemy) return;
  if (enemy.kind === "unit") beginAttack(state, u, enemy.unit.id);
  else beginAttack(state, u, enemy.building.id);
}

function beginAttack(state: SimState, u: Unit, targetId: number): void {
  u.order = { ...idleOrder(), kind: "attack", targetId };
  u.attackTarget = targetId;
  const pos = entityPos(state, targetId);
  if (pos) {
    u.path = findPath(state.blocked, u.x, u.y, pos.x, pos.y);
    u.pathIndex = 0;
  }
}

function attackMoveBehavior(state: SimState, u: Unit): void {
  const enemy = findAggro(state, u);
  if (enemy) {
    const id = enemy.kind === "unit" ? enemy.unit.id : enemy.building.id;
    const pos = entityPos(state, id);
    const range = UNIT_STATS[u.kind].range;
    if (pos && inAttackRange(u.x, u.y, range, pos.x, pos.y, 12)) {
      tryStrike(state, u, id);
      return;
    }
    if (pos) {
      const step = stepToward(u.x, u.y, pos.x, pos.y, unitSpeed(state, u));
      u.x = step.x;
      u.y = step.y;
      return;
    }
  }
  const arrived = followPath(state, u, u.order.kind !== "patrol");
  if (arrived && u.order.kind === "patrol") {
    u.order.patrolToB = !u.order.patrolToB;
    const tx = u.order.patrolToB ? u.order.patrolBx : u.order.patrolAx;
    const ty = u.order.patrolToB ? u.order.patrolBy : u.order.patrolAy;
    u.path = findPath(state.blocked, u.x, u.y, tx, ty);
    u.pathIndex = 0;
  }
}

function attackBehavior(state: SimState, u: Unit): void {
  const id = u.order.targetId || u.attackTarget;
  const pos = entityPos(state, id);
  if (!pos) {
    u.order = idleOrder();
    u.attackTarget = 0;
    return;
  }
  const range = UNIT_STATS[u.kind].range;
  if (inAttackRange(u.x, u.y, range, pos.x, pos.y, 12)) {
    tryStrike(state, u, id);
    return;
  }
  followPath(state, u, false);
  if (state.tick % 10 === 0) {
    u.path = findPath(state.blocked, u.x, u.y, pos.x, pos.y);
    u.pathIndex = 0;
  }
}

function tryStrike(state: SimState, u: Unit, targetId: number): void {
  if (u.cooldown > 0) return;
  for (const t of state.units) {
    if (t.id === targetId && t.alive) {
      strikeUnit(state, u, t);
      u.cooldown = UNIT_STATS[u.kind].attackTicks;
      return;
    }
  }
  for (const b of state.buildings) {
    if (b.id === targetId && b.alive) {
      strikeBuilding(state, u, b);
      u.cooldown = UNIT_STATS[u.kind].attackTicks;
      return;
    }
  }
  u.order = idleOrder();
}

function gatherBehavior(state: SimState, u: Unit): void {
  if (u.kind !== "worker") return;
  if (u.order.kind === "return" || u.carrying > 0 && u.order.kind === "gather" && !nearMine(state, u)) {
    const drop = nearestDropoff(state, u.player, u.x, u.y);
    if (!drop) return;
    if (distSq(u.x, u.y, drop.x, drop.y) <= DROP_RANGE * DROP_RANGE) {
      state.players[u.player].gold += u.carrying;
      u.carrying = 0;
      u.order.kind = "gather";
      const m = state.mines.find((x) => x.id === u.order.resourceId && x.remaining > 0);
      if (m) {
        u.path = findPath(state.blocked, u.x, u.y, m.tx * TILE + TILE, m.ty * TILE + TILE);
        u.pathIndex = 0;
      } else {
        u.order = idleOrder();
      }
      return;
    }
    followPath(state, u, false);
    return;
  }
  const m = state.mines.find((x) => x.id === u.order.resourceId);
  if (!m || m.remaining <= 0) {
    u.order = idleOrder();
    return;
  }
  const mx = m.tx * TILE + TILE;
  const my = m.ty * TILE + TILE;
  if (distSq(u.x, u.y, mx, my) > GATHER_RANGE * GATHER_RANGE) {
    followPath(state, u, false);
    return;
  }
  if (u.cooldown > 0) return;
  const take = Math.min(GATHER_AMOUNT, m.remaining);
  m.remaining -= take;
  u.carrying = take;
  u.cooldown = GATHER_TICKS;
  u.order.kind = "return";
  const drop = nearestDropoff(state, u.player, u.x, u.y);
  if (drop) {
    u.path = findPath(state.blocked, u.x, u.y, drop.x, drop.y);
    u.pathIndex = 0;
  }
}

function nearMine(state: SimState, u: Unit): boolean {
  const m = state.mines.find((x) => x.id === u.order.resourceId);
  if (!m) return false;
  const mx = m.tx * TILE + TILE;
  const my = m.ty * TILE + TILE;
  return distSq(u.x, u.y, mx, my) <= GATHER_RANGE * GATHER_RANGE * 4;
}

function nearestDropoff(state: SimState, player: PlayerId, x: number, y: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const b of state.buildings) {
    if (!b.alive || !b.complete || b.player !== player) continue;
    if (b.kind !== "keep" && b.kind !== "outpost") continue;
    const st = BUILDING_STATS[b.kind];
    const c = buildingCenter(b.tx, b.ty, st.w, st.h);
    const d = distSq(x, y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function buildBehavior(state: SimState, u: Unit): void {
  const b = state.buildings.find((x) => x.id === u.order.targetId);
  if (!b || !b.alive) {
    u.order = idleOrder();
    return;
  }
  if (b.complete) {
    u.order = idleOrder();
    return;
  }
  const st = BUILDING_STATS[b.kind];
  const c = buildingCenter(b.tx, b.ty, st.w, st.h);
  if (distSq(u.x, u.y, c.x, c.y) > BUILD_RANGE * BUILD_RANGE) {
    followPath(state, u, false);
    return;
  }
  b.progress++;
  b.hp = Math.max(1, ((st.hp * b.progress) / st.buildTicks) | 0);
  if (b.progress >= st.buildTicks) {
    b.complete = true;
    b.hp = st.hp;
    if (st.supply > 0) state.players[b.player].maxSupply += st.supply;
    u.order = idleOrder();
  }
}

function tickBuildings(state: SimState): void {
  for (const b of state.buildings) {
    if (!b.alive || !b.complete) continue;
    if (b.cooldown > 0) b.cooldown--;
    if (b.kind === "tower") tickTower(state, b);
    if (b.queue.length === 0) continue;
    const item = b.queue[0]!;
    item.remaining--;
    if (item.remaining > 0) continue;
    b.queue.shift();
    if (item.kind === "unit" && item.unit) spawnUnit(state, b, item.unit);
    else if (item.kind === "upgrade" && item.upgrade) {
      const p = state.players[b.player];
      if (item.upgrade === "attack") p.attackLevel = Math.min(3, p.attackLevel + 1);
      else p.armorLevel = Math.min(3, p.armorLevel + 1);
    }
  }
}

function tickTower(state: SimState, b: Building): void {
  if (b.cooldown > 0) return;
  const st = BUILDING_STATS.tower;
  const c = buildingCenter(b.tx, b.ty, st.w, st.h);
  const dummy: Unit = {
    id: -1,
    player: b.player,
    kind: "archer",
    x: c.x,
    y: c.y,
    hp: 1,
    cooldown: 0,
    order: idleOrder(),
    carrying: 0,
    buildProgress: 0,
    path: [],
    pathIndex: 0,
    attackTarget: 0,
    alive: true,
  };
  const enemy = findNearestEnemy(state, dummy, st.range);
  if (enemy && enemy.kind === "unit") {
    towerStrike(state, b, enemy.unit);
    b.cooldown = st.attackTicks;
  }
}

function spawnUnit(state: SimState, b: Building, kind: Unit["kind"]): void {
  const st = UNIT_STATS[kind];
  const bs = BUILDING_STATS[b.kind];
  const c = buildingCenter(b.tx, b.ty, bs.w, bs.h);
  const u: Unit = {
    id: state.nextId++,
    player: b.player,
    kind,
    x: c.x,
    y: c.y + 20,
    hp: st.hp,
    cooldown: 0,
    order: idleOrder(),
    carrying: 0,
    buildProgress: 0,
    path: [],
    pathIndex: 0,
    attackTarget: 0,
    alive: true,
  };
  if (b.rallyX || b.rallyY) {
    u.order = { ...idleOrder(), kind: "attackMove", x: b.rallyX, y: b.rallyY };
    u.path = findPath(state.blocked, u.x, u.y, b.rallyX, b.rallyY);
    u.pathIndex = 0;
  }
  state.units.push(u);
}

function checkVictory(state: SimState): void {
  const keep0 = state.buildings.some((b) => b.alive && b.player === 0 && b.kind === "keep");
  const keep1 = state.buildings.some((b) => b.alive && b.player === 1 && b.kind === "keep");
  if (!keep0 || state.players[0].surrendered) {
    state.players[0].alive = false;
    state.winner = 1;
  } else if (!keep1 || state.players[1].surrendered) {
    state.players[1].alive = false;
    state.winner = 0;
  }
}

