import { Overlay, clamp01, rand } from './overlay';

/* ── Sandalwood body oil, pumped onto the glass ──
   Each pump throws a few heavy golden drops at the viewer. They splat, sit
   for a beat, then slide down slowly — oil is viscous, so it stick-slips and
   leaves a glossy trail behind it.                                        */

type Blob = {
  // flight
  sx: number; sy: number; tx: number; ty: number; T: number; t: number;
  // on the glass
  x: number; y: number; r: number; vy: number; wait: number; phase: number;
  trail: { x: number; y: number }[];
  landed: boolean; satellite: boolean; born: number;
};

const FADE_AT = 4.5;
const FADE_S = 1.4;

function oilSprite() {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d')!;
  const cx = S / 2, cy = S / 2, R = S * 0.42;
  let g = x.createRadialGradient(cx + R * 0.08, cy + R * 0.16, R * 0.75, cx + R * 0.08, cy + R * 0.16, R * 1.15);
  g.addColorStop(0, 'rgba(60,30,4,.28)'); g.addColorStop(1, 'rgba(60,30,4,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx + R * 0.08, cy + R * 0.16, R * 1.15, 0, Math.PI * 2); x.fill();
  g = x.createRadialGradient(cx - R * 0.1, cy - R * 0.15, R * 0.05, cx, cy, R);
  g.addColorStop(0, 'rgba(246,196,96,.6)');
  g.addColorStop(0.55, 'rgba(214,146,44,.72)');
  g.addColorStop(0.9, 'rgba(140,82,16,.88)');
  g.addColorStop(1, 'rgba(96,52,8,.9)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, R * 0.9, 0, Math.PI * 2); x.clip();
  g = x.createRadialGradient(cx + R * 0.1, cy + R * 0.66, 0, cx + R * 0.1, cy + R * 0.66, R * 0.7);
  g.addColorStop(0, 'rgba(255,232,150,.9)'); g.addColorStop(1, 'rgba(255,232,150,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.restore();
  x.save(); x.translate(cx - R * 0.34, cy - R * 0.38); x.rotate(-0.7); x.scale(1, 0.55);
  g = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,250,235,.75)'); g.addColorStop(1, 'rgba(255,250,235,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 0.32, 0, Math.PI * 2); x.fill();
  x.restore();
  return c;
}

export class OilFx extends Overlay {
  private blobs: Blob[] = [];
  private sprite = oilSprite();

  pump(x: number, y: number) {
    const S = Math.min(this.W, this.H);
    const cx = this.W / 2, cy = this.H / 2;
    // the jet heads at the viewer, landing between the spout and the centre
    const lx = x + (cx - x) * 0.62, ly = y + (cy - y) * 0.35;
    const n = 6 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.pow(Math.random(), 0.7) * S * 0.3;
      const tx = lx + Math.cos(a) * d * 1.3, ty = ly + Math.sin(a) * d * 0.8;
      const main = i < 2;
      this.blobs.push({
        sx: x, sy: y, tx, ty, T: rand(0.22, 0.42), t: 0,
        x, y, r: main ? rand(22, 32) : rand(9, 19), vy: 0, wait: rand(0.25, 1.4), phase: Math.random() * 6,
        trail: [], landed: false, satellite: false, born: this.now
      });
    }
    this.start();
  }

  clear() { this.blobs = []; }

  protected alive() { return this.blobs.length > 0; }

  protected step(dt: number) {
    const add: Blob[] = [];
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i];
      if (!b.landed) {
        b.t += dt;
        const k = clamp01(b.t / b.T);
        b.x = b.sx + (b.tx - b.sx) * k;
        b.y = b.sy + (b.ty - b.sy) * k - Math.sin(k * Math.PI) * 30;
        if (k >= 1) {
          b.landed = true; b.born = this.now; b.trail.push({ x: b.x, y: b.y });
          // the splat throws a few tiny satellites
          const m = b.satellite ? 0 : 2 + ((Math.random() * 4) | 0);
          for (let j = 0; j < m; j++) {
            const a = Math.random() * Math.PI * 2, d = b.r * rand(1.3, 2.6);
            add.push({ sx: 0, sy: 0, tx: 0, ty: 0, T: 0, t: 0, x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d,
              r: rand(1.8, 4.5), vy: 0, wait: 99, phase: 0, trail: [], landed: true, satellite: true, born: this.now });
          }
        }
        continue;
      }
      const age = this.now - b.born;
      if (!b.satellite && age > b.wait && b.r > 6) {
        // viscous: slow terminal speed, and it catches and lets go as it goes
        const vmax = 10 + b.r * 1.9;
        b.vy = Math.min(vmax, b.vy + dt * 24);
        b.phase += dt * rand(1.5, 3);
        const slip = 0.35 + 0.65 * Math.max(0, Math.sin(b.phase));
        b.y += b.vy * slip * dt;
        b.x += Math.sin(b.phase * 0.7) * dt * 2;
        b.r -= dt * 0.32 * slip;
        const last = b.trail[b.trail.length - 1];
        if (!last || Math.hypot(b.x - last.x, b.y - last.y) > 3) b.trail.push({ x: b.x, y: b.y });
      }
      if (age > FADE_AT + FADE_S || b.y - b.r > this.H + 40) this.blobs.splice(i, 1);
    }
    this.blobs.push(...add);
  }

  protected draw() {
    const x = this.ctx;
    for (const b of this.blobs) {
      const a = b.landed ? 1 - clamp01((this.now - b.born - FADE_AT) / FADE_S) : 1;
      if (a <= 0) continue;

      // the trail: a thin glossy film the drop leaves behind
      if (b.trail.length > 1) {
        x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath();
        b.trail.forEach(p => x.lineTo(p.x, p.y));
        x.lineTo(b.x, b.y);
        x.lineWidth = b.r * 1.05;
        x.strokeStyle = `rgba(196,136,40,${0.32 * a})`;
        x.stroke();
        x.lineWidth = b.r * 0.55;
        x.strokeStyle = `rgba(214,156,58,${0.22 * a})`;
        x.stroke();
        x.beginPath();
        b.trail.forEach(p => x.lineTo(p.x - b.r * 0.26, p.y));
        x.lineTo(b.x - b.r * 0.26, b.y);
        x.lineWidth = Math.max(1, b.r * 0.12);
        x.strokeStyle = `rgba(255,240,200,${0.55 * a})`;
        x.stroke();
      }

      // the drop itself; in flight it grows as it comes at you
      const fly = b.landed ? 1 : 0.2 + 0.8 * clamp01(b.t / b.T);
      const r = b.r * fly;
      const stretch = b.landed ? 1 + Math.min(0.4, b.vy / 60) : 1;
      x.globalAlpha = a;
      x.drawImage(this.sprite, b.x - r * 1.2, b.y - r * 1.2 * stretch + (stretch - 1) * r * 0.6, r * 2.4, r * 2.4 * stretch);
      x.globalAlpha = 1;
    }
  }
}
