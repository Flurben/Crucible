import type { SimState } from "@crucible/shared";
import { MAP_H, MAP_W, TILE, TERRAIN_FOREST } from "@crucible/shared";
import type { Camera } from "./camera.ts";

export class Minimap {
  w = 200;
  h = 200;
  x = 0;
  y = 0;

  resize(vw: number, vh: number) {
    this.x = vw - this.w - 16;
    this.y = vh - this.h - 16;
  }

  draw(ctx: CanvasRenderingContext2D, state: SimState, cam: Camera, local: number) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = "#1a110a";
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.strokeStyle = "#5a4020";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.w, this.h);

    const fw = MAP_W * TILE;
    const fh = MAP_H * TILE;

    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (state.terrain[ty * MAP_W + tx] === TERRAIN_FOREST) {
          ctx.fillStyle = "#1a3a1a";
          ctx.fillRect((tx * TILE * this.w) / fw, (ty * TILE * this.h) / fh, Math.max(1, (TILE * this.w) / fw), Math.max(1, (TILE * this.h) / fh));
        }
      }
    }

    const rw = (cam.vw / cam.zoom / fw) * this.w;
    const rh = (cam.vh / cam.zoom / fh) * this.h;
    const rx = (cam.x / fw) * this.w;
    const ry = (cam.y / fh) * this.h;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, ry, rw, rh);

    for (const b of state.buildings) {
      if (!b.alive) continue;
      const fidx = state.visible[local][b.ty * MAP_W + b.tx];
      if (fidx === 0 && state.explored[local][b.ty * MAP_W + b.tx] === 0) continue;
      ctx.fillStyle = b.player === local ? "#4ec4e0" : "#e85050";
      ctx.fillRect(((b.tx * TILE) / fw) * this.w, ((b.ty * TILE) / fh) * this.h, 4, 4);
    }
    for (const u of state.units) {
      if (!u.alive) continue;
      const fidx = (u.y / TILE) | 0;
      const cidx = (u.x / TILE) | 0;
      if (state.visible[local][fidx * MAP_W + cidx] === 0) continue;
      ctx.fillStyle = u.player === local ? "#4ec4e0" : "#e85050";
      ctx.fillRect((u.x / fw) * this.w, (u.y / fh) * this.h, 2, 2);
    }
    ctx.restore();
  }

  hit(mx: number, my: number) {
    return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
  }

  click(mx: number, my: number, fw: number, fh: number) {
    const nx = (mx - this.x) / this.w;
    const ny = (my - this.y) / this.h;
    return { x: nx * fw, y: ny * fh };
  }
}
