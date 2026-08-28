import { MAP_H, MAP_W, TILE } from "@crucible/shared";

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  vw = 800;
  vh = 600;

  resize(w: number, h: number): void {
    this.vw = w;
    this.vh = h;
  }

  worldW(): number {
    return MAP_W * TILE;
  }
  worldH(): number {
    return MAP_H * TILE;
  }

  clamp(): void {
    const maxX = Math.max(0, this.worldW() - this.vw / this.zoom);
    const maxY = Math.max(0, this.worldH() - this.vh / this.zoom);
    this.x = Math.min(maxX, Math.max(0, this.x));
    this.y = Math.min(maxY, Math.max(0, this.y));
  }

  pan(dx: number, dy: number): void {
    this.x += dx / this.zoom;
    this.y += dy / this.zoom;
    this.clamp();
  }

  setZoom(z: number, cx: number, cy: number): void {
    const wx = this.x + cx / this.zoom;
    const wy = this.y + cy / this.zoom;
    this.zoom = Math.min(2.2, Math.max(0.45, z));
    this.x = wx - cx / this.zoom;
    this.y = wy - cy / this.zoom;
    this.clamp();
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: this.x + sx / this.zoom, y: this.y + sy / this.zoom };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom };
  }

  centerOn(wx: number, wy: number): void {
    this.x = wx - this.vw / (2 * this.zoom);
    this.y = wy - this.vh / (2 * this.zoom);
    this.clamp();
  }
}
