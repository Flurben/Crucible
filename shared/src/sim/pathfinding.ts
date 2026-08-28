import { MAP_H, MAP_W, TILE } from "./constants.js";
import { inBounds, tileIndex, worldToTile } from "./helpers.js";

const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];
const COST = [10, 10, 10, 10, 14, 14, 14, 14];

const SIZE = MAP_W * MAP_H;
const gScore = new Int32Array(SIZE);
const cameFrom = new Int32Array(SIZE);
const closed = new Uint8Array(SIZE);
const heap: number[] = [];
const heapF: number[] = [];
let gen = 1;
const visited = new Int32Array(SIZE);

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax > bx ? ax - bx : bx - ax;
  const dy = ay > by ? ay - by : by - ay;
  const min = dx < dy ? dx : dy;
  const max = dx > dy ? dx : dy;
  return min * 14 + (max - min) * 10;
}

function heapPush(idx: number, f: number): void {
  heap.push(idx);
  heapF.push(f);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heapF[p]! <= heapF[i]!) break;
    const ti = heap[i]!;
    const tf = heapF[i]!;
    heap[i] = heap[p]!;
    heapF[i] = heapF[p]!;
    heap[p] = ti;
    heapF[p] = tf;
    i = p;
  }
}

function heapPop(): number {
  const out = heap[0]!;
  const last = heap.pop()!;
  const lastF = heapF.pop()!;
  if (heap.length === 0) return out;
  heap[0] = last;
  heapF[0] = lastF;
  let i = 0;
  for (;;) {
    const l = i * 2 + 1;
    const r = l + 1;
    let s = i;
    if (l < heap.length && heapF[l]! < heapF[s]!) s = l;
    if (r < heap.length && heapF[r]! < heapF[s]!) s = r;
    if (s === i) break;
    const ti = heap[i]!;
    const tf = heapF[i]!;
    heap[i] = heap[s]!;
    heapF[i] = heapF[s]!;
    heap[s] = ti;
    heapF[s] = tf;
    i = s;
  }
  return out;
}

function walkable(blocked: Uint8Array, tx: number, ty: number): boolean {
  if (!inBounds(tx, ty)) return false;
  return blocked[tileIndex(tx, ty)] === 0;
}

function nearestWalkable(blocked: Uint8Array, tx: number, ty: number): { tx: number; ty: number } {
  if (walkable(blocked, tx, ty)) return { tx, ty };
  for (let r = 1; r < 12; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx !== r && dx !== -r && dy !== r && dy !== -r) continue;
        if (walkable(blocked, tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy };
      }
    }
  }
  return { tx, ty };
}

/** A* on the tile grid. Returns world-space waypoints (tile centers). */
export function findPath(
  blocked: Uint8Array,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
): number[] {
  const startT = nearestWalkable(blocked, worldToTile(sx), worldToTile(sy));
  const goalT = nearestWalkable(blocked, worldToTile(gx), worldToTile(gy));
  const start = tileIndex(startT.tx, startT.ty);
  const goal = tileIndex(goalT.tx, goalT.ty);
  if (start === goal) return [gx, gy];

  gen++;
  if (gen > 2_000_000_000) {
    gen = 1;
    visited.fill(0);
  }
  heap.length = 0;
  heapF.length = 0;
  gScore[start] = 0;
  visited[start] = gen;
  closed[start] = 0;
  heapPush(start, heuristic(startT.tx, startT.ty, goalT.tx, goalT.ty));

  let found = false;
  let expanded = 0;
  const LIMIT = 2500;

  while (heap.length > 0 && expanded < LIMIT) {
    const current = heapPop();
    if (visited[current] !== gen) continue;
    if (closed[current] === 1 && visited[current] === gen) continue;
    closed[current] = 1;
    expanded++;
    if (current === goal) {
      found = true;
      break;
    }
    const cx = current % MAP_W;
    const cy = (current / MAP_W) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = cx + DX[d]!;
      const ny = cy + DY[d]!;
      if (!walkable(blocked, nx, ny)) continue;
      if (d >= 4) {
        if (!walkable(blocked, cx + DX[d]!, cy) || !walkable(blocked, cx, cy + DY[d]!)) continue;
      }
      const ni = ny * MAP_W + nx;
      const tentative = gScore[current]! + COST[d]!;
      if (visited[ni] !== gen || tentative < gScore[ni]!) {
        visited[ni] = gen;
        closed[ni] = 0;
        gScore[ni] = tentative;
        cameFrom[ni] = current;
        const f = tentative + heuristic(nx, ny, goalT.tx, goalT.ty);
        heapPush(ni, f);
      }
    }
  }

  const path: number[] = [];
  if (!found) {
    path.push(gx, gy);
    return path;
  }

  const tiles: number[] = [];
  let cur = goal;
  tiles.push(cur);
  while (cur !== start) {
    cur = cameFrom[cur]!;
    tiles.push(cur);
  }
  tiles.reverse();

  const simplified: number[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]!;
    const wx = (t % MAP_W) * TILE + (TILE >> 1);
    const wy = ((t / MAP_W) | 0) * TILE + (TILE >> 1);
    if (simplified.length >= 2) {
      const px = simplified[simplified.length - 4]!;
      const py = simplified[simplified.length - 3]!;
      if (hasLineOfSight(blocked, px, py, wx, wy)) {
        simplified[simplified.length - 2] = wx;
        simplified[simplified.length - 1] = wy;
        continue;
      }
    }
    simplified.push(wx, wy);
  }
  if (simplified.length >= 2) {
    simplified[simplified.length - 2] = gx;
    simplified[simplified.length - 1] = gy;
  } else {
    simplified.push(gx, gy);
  }
  return simplified;
}

function hasLineOfSight(blocked: Uint8Array, x0: number, y0: number, x1: number, y1: number): boolean {
  const tx1 = worldToTile(x1);
  const ty1 = worldToTile(y1);
  let x = worldToTile(x0);
  let y = worldToTile(y0);
  const dx = tx1 > x ? 1 : tx1 < x ? -1 : 0;
  const dy = ty1 > y ? 1 : ty1 < y ? -1 : 0;
  const adx = tx1 > x ? tx1 - x : x - tx1;
  const ady = ty1 > y ? ty1 - y : y - ty1;
  let err = adx - ady;
  for (let i = 0; i < adx + ady + 2; i++) {
    if (!walkable(blocked, x, y)) return false;
    if (x === tx1 && y === ty1) return true;
    const e2 = err * 2;
    if (e2 > -ady) {
      err -= ady;
      x += dx;
    }
    if (e2 < adx) {
      err += adx;
      y += dy;
    }
  }
  return true;
}

export function nextWaypoint(path: number[], index: number): { x: number; y: number } | null {
  const i = index * 2;
  if (i + 1 >= path.length) return null;
  return { x: path[i]!, y: path[i + 1]! };
}

