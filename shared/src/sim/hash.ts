import type { SimState } from "./types.ts";

/** djb2 over the live sim — used for lockstep desync detection. */
export function hashState(s: SimState): number {
  let h = 5381;
  const mix = (v: number) => {
    h = ((h << 5) + h + (v | 0)) | 0;
  };
  mix(s.tick);
  mix(s.nextId);
  mix(s.players[0].gold);
  mix(s.players[0].usedSupply);
  mix(s.players[1].gold);
  mix(s.players[1].usedSupply);
  for (const u of s.units) {
    if (!u.alive) continue;
    mix(u.id);
    mix(u.x);
    mix(u.y);
    mix(u.hp);
    mix(u.cooldown);
  }
  for (const b of s.buildings) {
    if (!b.alive) continue;
    mix(b.id);
    mix(b.hp);
    mix(b.progress);
    mix(b.queue.length);
  }
  for (const m of s.mines) mix(m.remaining);
  return h >>> 0;
}
