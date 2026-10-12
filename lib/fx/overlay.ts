/* A fixed, pointer-transparent canvas over the viewport that only animates
   while it has something to show. Each screen effect extends it.          */
export abstract class Overlay {
  protected ctx: CanvasRenderingContext2D;
  protected W = 0;
  protected H = 0;
  protected dpr = 1;
  protected now = 0;
  private raf = 0;
  private last = 0;
  private ready = false;

  constructor(protected canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * this.dpr; this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // resizing clears the canvas; a running loop repaints on its next frame
    if (!this.raf && this.ready) this.draw();
  }

  protected start() {
    this.ready = true;
    if (this.raf) return;
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.now += dt;
      this.step(dt);
      this.ctx.clearRect(0, 0, this.W, this.H);
      this.draw();
      if (this.alive()) this.raf = requestAnimationFrame(loop);
      else { this.raf = 0; this.ctx.clearRect(0, 0, this.W, this.H); }
    };
    this.raf = requestAnimationFrame(loop);
  }

  protected abstract step(dt: number): void;
  protected abstract draw(): void;
  protected abstract alive(): boolean;

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

export const ease = (x: number) => x * x * (3 - 2 * x);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
