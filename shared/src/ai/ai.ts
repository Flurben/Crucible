import {
  BUILDING_STATS,
  UNIT_STATS,
  type BuildingKind,
  type PlayerId,
} from "../sim/constants.ts";
import { buildingCenter, distSq } from "../sim/helpers.ts";
import { canPlaceBuilding } from "../sim/mapgen.ts";
import type { AiDifficulty, Building, Command, SimState, Unit } from "../sim/types.ts";

interface AiMemory {
  phase: "open" | "mid" | "push";
  lastScout: number;
}

const mem = new Map<number, AiMemory>();

function memory(seed: number, player: PlayerId): AiMemory {
  const k = seed * 2 + player;
  let m = mem.get(k);
  if (!m) {
    m = { phase: "open", lastScout: 0 };
    mem.set(k, m);
  }
  return m;
}

export function resetAi(): void {
  mem.clear();
}

export function think(state: SimState, player: PlayerId, difficulty: AiDifficulty): Command[] {
  if (state.winner !== null) return [];
  const cmds: Command[] = [];
  const m = memory(state.seed, player);
  const p = state.players[player];
  const myUnits = state.units.filter((u) => u.alive && u.player === player);
  const myBuildings = state.buildings.filter((b) => b.alive && b.player === player);
  const workers = myUnits.filter((u) => u.kind === "worker");
  const army = myUnits.filter((u) => u.kind !== "worker");
  const keep = myBuildings.find((b) => b.kind === "keep" && b.complete);
  if (!keep) return cmds;

  assignIdleWorkers(state, player, workers, cmds);

  const barracks = myBuildings.filter((b) => b.kind === "barracks");
  const outposts = myBuildings.filter((b) => b.kind === "outpost");
  const towers = myBuildings.filter((b) => b.kind === "tower");
  const forges = myBuildings.filter((b) => b.kind === "forge");

  const wantBarracks = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
  const wantOutposts = difficulty === "easy" ? 1 : 2;
  const wantTowers = difficulty === "easy" ? 0 : difficulty === "medium" ? 1 : 2;
  const wantForge = difficulty !== "easy";

  if (barracks.length < wantBarracks) tryBuild(state, player, workers, "barracks", keep, cmds);
  else if (outposts.length < wantOutposts) tryBuild(state, player, workers, "outpost", keep, cmds);
  else if (wantForge && forges.length < 1 && p.gold >= BUILDING_STATS.forge.gold) {
    tryBuild(state, player, workers, "forge", keep, cmds);
  } else if (towers.length < wantTowers && p.gold >= BUILDING_STATS.tower.gold) {
    tryBuild(state, player, workers, "tower", keep, cmds);
  }

  const workerCap = difficulty === "easy" ? 8 : difficulty === "medium" ? 12 : 16;
  if (keep.queue.length === 0 && workers.length < workerCap && p.gold >= UNIT_STATS.worker.gold) {
    cmds.push({ type: "train", buildingId: keep.id, unit: "worker" });
  }

  for (const b of barracks) {
    if (!b.complete || b.queue.length >= 2) continue;
    const mix = pickUnit(difficulty, army, p.gold);
    if (mix && p.gold >= UNIT_STATS[mix].gold && p.usedSupply + UNIT_STATS[mix].supply <= p.maxSupply) {
      cmds.push({ type: "train", buildingId: b.id, unit: mix });
    }
  }

  if (wantForge && forges[0]?.complete && forges[0].queue.length === 0) {
    if (p.attackLevel < (difficulty === "hard" ? 3 : 1) && p.gold >= 100) {
      cmds.push({ type: "research", buildingId: forges[0].id, upgrade: "attack" });
    } else if (p.armorLevel < (difficulty === "hard" ? 2 : 1) && p.gold >= 100) {
      cmds.push({ type: "research", buildingId: forges[0].id, upgrade: "armor" });
    }
  }

  const pushAt = difficulty === "easy" ? 12 : difficulty === "medium" ? 10 : 8;
  const enemyKeep = state.buildings.find((b) => b.alive && b.player !== player && b.kind === "keep");
  if (army.length >= pushAt && enemyKeep) {
    const c = buildingCenter(enemyKeep.tx, enemyKeep.ty, 4, 4);
    cmds.push({ type: "move", unitIds: army.map((u) => u.id), x: c.x, y: c.y, attackMove: true });
    m.phase = "push";
  } else if (difficulty !== "easy" && army.length >= 4 && state.tick - m.lastScout > 400 && enemyKeep) {
    const c = buildingCenter(enemyKeep.tx, enemyKeep.ty, 4, 4);
    cmds.push({ type: "move", unitIds: [army[0]!.id], x: c.x, y: c.y, attackMove: true });
    m.lastScout = state.tick;
  }

  if (difficulty === "hard") kiteArchers(army, state, player, cmds);
  return cmds;
}

function pickUnit(d: AiDifficulty, army: Unit[], gold: number): Unit["kind"] | null {
  const swords = army.filter((u) => u.kind === "swordsman").length;
  const archers = army.filter((u) => u.kind === "archer").length;
  const knights = army.filter((u) => u.kind === "knight").length;
  if (d === "easy") return gold >= UNIT_STATS.swordsman.gold ? "swordsman" : null;
  if (knights < army.length / 5 && gold >= UNIT_STATS.knight.gold) return "knight";
  if (archers <= swords && gold >= UNIT_STATS.archer.gold) return "archer";
  if (gold >= UNIT_STATS.swordsman.gold) return "swordsman";
  return null;
}

function assignIdleWorkers(state: SimState, player: PlayerId, workers: Unit[], cmds: Command[]): void {
  const idle = workers.filter((w) => w.order.kind === "idle" && w.carrying === 0);
  if (idle.length === 0) return;
  const mines = nearbyMines(state, player);
  if (mines.length === 0) return;
  for (let i = 0; i < idle.length; i++) {
    cmds.push({ type: "gather", unitIds: [idle[i]!.id], resourceId: mines[i % mines.length]!.id });
  }
}

function nearbyMines(state: SimState, player: PlayerId) {
  const keep = state.buildings.find((b) => b.alive && b.player === player && b.kind === "keep");
  if (!keep) return state.mines.filter((m) => m.remaining > 0);
  const c = buildingCenter(keep.tx, keep.ty, 4, 4);
  return state.mines
    .filter((m) => m.remaining > 0)
    .sort((a, b) => distSq(c.x, c.y, a.tx * 32, a.ty * 32) - distSq(c.x, c.y, b.tx * 32, b.ty * 32))
    .slice(0, 3);
}

function tryBuild(
  state: SimState,
  player: PlayerId,
  workers: Unit[],
  kind: BuildingKind,
  keep: Building,
  cmds: Command[],
): void {
  const st = BUILDING_STATS[kind];
  if (state.players[player].gold < st.gold) return;
  if (state.buildings.some((b) => b.player === player && b.kind === kind && !b.complete)) return;
  const worker = workers.find((w) => w.order.kind === "gather" || w.order.kind === "idle");
  if (!worker) return;
  const spot = findBuildSpot(state, keep, st.w, st.h, kind);
  if (!spot) return;
  cmds.push({ type: "build", workerId: worker.id, building: kind, tx: spot.tx, ty: spot.ty });
}

function findBuildSpot(
  state: SimState,
  keep: Building,
  w: number,
  h: number,
  kind: BuildingKind,
): { tx: number; ty: number } | null {
  const dir = keep.player === 0 ? 1 : -1;
  const extra = kind === "tower" ? 8 : kind === "outpost" ? 10 : 5;
  for (let r = extra; r < extra + 18; r++) {
    for (let a = 0; a < 16; a++) {
      const tx = keep.tx + dir * (r + (a % 4));
      const ty = keep.ty + dir * (r + ((a / 4) | 0));
      if (canPlaceBuilding(state, tx, ty, w, h)) return { tx, ty };
    }
  }
  return null;
}

function kiteArchers(army: Unit[], state: SimState, player: PlayerId, cmds: Command[]): void {
  const enemyArmy = state.units.filter((u) => u.alive && u.player !== player && u.kind !== "worker");
  if (enemyArmy.length === 0) return;
  for (const u of army) {
    if (u.kind !== "archer") continue;
    let nearest: Unit | null = null;
    let best = Infinity;
    for (const e of enemyArmy) {
      const d = distSq(u.x, u.y, e.x, e.y);
      if (d < best) {
        best = d;
        nearest = e;
      }
    }
    if (!nearest || best >= 70 * 70) continue;
    const dx = u.x - nearest.x;
    const dy = u.y - nearest.y;
    cmds.push({
      type: "move",
      unitIds: [u.id],
      x: u.x + Math.sign(dx || 1) * 40,
      y: u.y + Math.sign(dy || 1) * 40,
      attackMove: true,
    });
  }
}

