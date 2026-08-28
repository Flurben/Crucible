import { MAP_H, MAP_W, TILE } from "./constants.ts";

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(distSq(ax, ay, bx, by));
}

export function tileIndex(tx: number, ty: number): number {
  return ty * MAP_W + tx;
}

export function inBounds(tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;
}

export function worldToTile(v: number): number {
  return (v / TILE) | 0;
}

export function tileCenter(t: number): number {
  return t * TILE + (TILE >> 1);
}

export function buildingCenter(tx: number, ty: number, w: number, h: number): { x: number; y: number } {
  return {
    x: tx * TILE + (w * TILE) / 2,
    y: ty * TILE + (h * TILE) / 2,
  };
}

/** Integer step toward a point. Returns true if arrived. */
export function stepToward(
  x: number,
  y: number,
  tx: number,
  ty: number,
  speed: number,
): { x: number; y: number; arrived: boolean } {
  const dx = tx - x;
  const dy = ty - y;
  const d2 = dx * dx + dy * dy;
  if (d2 <= speed * speed) return { x: tx, y: ty, arrived: true };
  const d = Math.sqrt(d2);
  return {
    x: x + ((dx * speed) / d) | 0,
    y: y + ((dy * speed) / d) | 0,
    arrived: false,
  };
}

export function idleOrder() {
  return {
    kind: "idle" as const,
    x: 0,
    y: 0,
    targetId: 0,
    resourceId: 0,
    building: null,
    patrolAx: 0,
    patrolAy: 0,
    patrolBx: 0,
    patrolBy: 0,
    patrolToB: true,
  };
}

export function moveOrder(x: number, y: number, attackMove: boolean) {
  return {
    ...idleOrder(),
    kind: attackMove ? ("attackMove" as const) : ("move" as const),
    x,
    y,
  };
}

const BUCKET = 64;
const BUCKETS_X = Math.ceil((MAP_W * TILE) / BUCKET);
const BUCKETS_Y = Math.ceil((MAP_H * TILE) / BUCKET);

export class SpatialHash {
  private buckets: number[][] = [];

  clear(): void {
    const n = BUCKETS_X * BUCKETS_Y;
    if (this.buckets.length !== n) {
      this.buckets = new Array(n);
      for (let i = 0; i < n; i++) this.buckets[i] = [];
    } else {
      for (let i = 0; i < n; i++) this.buckets[i]!.length = 0;
    }
  }

  insert(id: number, x: number, y: number): void {
    const bx = clamp((x / BUCKET) | 0, 0, BUCKETS_X - 1);
    const by = clamp((y / BUCKET) | 0, 0, BUCKETS_Y - 1);
    this.buckets[by * BUCKETS_X + bx]!.push(id);
  }

  query(x: number, y: number, range: number, out: number[]): void {
    out.length = 0;
    const minX = clamp(((x - range) / BUCKET) | 0, 0, BUCKETS_X - 1);
    const maxX = clamp(((x + range) / BUCKET) | 0, 0, BUCKETS_X - 1);
    const minY = clamp(((y - range) / BUCKET) | 0, 0, BUCKETS_Y - 1);
    const maxY = clamp(((y + range) / BUCKET) | 0, 0, BUCKETS_Y - 1);
    for (let by = minY; by <= maxY; by++) {
      for (let bx = minX; bx <= maxX; bx++) {
        const b = this.buckets[by * BUCKETS_X + bx]!;
        for (let i = 0; i < b.length; i++) out.push(b[i]!);
      }
    }
  }
}
