/* ── the screen as a pane of glass ──
   A spray leaves the nozzle, travels toward the viewer in perspective and
   lands on the glass as droplets. Fine mist settles as a field of tiny dots;
   the heavier drops bead, merge, and some run down leaving a broken trail.
   Everything evaporates on its own.

   One fixed, pointer-transparent canvas over the page. It only animates while
   there is something on it.                                                  */

type Mote = {
  x: number; y: number; z: number;          // camera space, z = distance to glass
  vx: number; vy: number; vz: number;
  r: number; a: number; wet: number;        // wet: radius of the drop it leaves (0 = none)
};

type Drop = {
  x: number; y: number; r: number;
  a: number;                                // opacity
  born: number; dry: number;                // seconds until it starts to evaporate
  vy: number; wob: number; run: boolean; trail: number;
  sk: number;                               // sprite variant
};

const F = 900;                              // focal length, px
const Z0 = 1400;                            // where the bottle sits
const MAX_DROPS = 1400;

function makeSprite(seed: number) {
  const S = 96;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d')!;
  const cx = S / 2, cy = S / 2, R = S * 0.4;
  // slightly squashed and skewed, so a field of them does not look stamped
  const sx = 1 + (seed % 3 - 1) * 0.06, sy = 1 - (seed % 3 - 1) * 0.05;
  x.translate(cx, cy); x.scale(sx, sy); x.translate(-cx, -cy);

  // contact shadow on the glass, offset away from the light
  let g = x.createRadialGradient(cx + R * 0.1, cy + R * 0.18, R * 0.7, cx + R * 0.1, cy + R * 0.18, R * 1.16);
  g.addColorStop(0, 'rgba(20,12,6,.16)');
  g.addColorStop(1, 'rgba(20,12,6,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx + R * 0.1, cy + R * 0.18, R * 1.16, 0, Math.PI * 2); x.fill();

  x.save();
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
  // the lens inverts what is behind it: dark rim, heaviest along the top
  g = x.createRadialGradient(cx, cy + R * 0.22, R * 0.35, cx, cy + R * 0.1, R * 1.05);
  g.addColorStop(0, 'rgba(255,255,255,.04)');
  g.addColorStop(0.6, 'rgba(60,42,28,.10)');
  g.addColorStop(0.86, 'rgba(40,26,16,.38)');
  g.addColorStop(1, 'rgba(30,20,12,.55)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  // light gathered on the lower inside edge
  g = x.createRadialGradient(cx + R * 0.05, cy + R * 0.7, 0, cx + R * 0.05, cy + R * 0.7, R * 0.75);
  g.addColorStop(0, 'rgba(255,252,246,.85)');
  g.addColorStop(0.5, 'rgba(255,252,246,.3)');
  g.addColorStop(1, 'rgba(255,252,246,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.restore();

  // specular: the window reflection, top left
  x.save();
  x.translate(cx - R * 0.34, cy - R * 0.4);
  x.rotate(-0.7);
  x.scale(1, 0.55);
  g = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.3);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 0.3, 0, Math.PI * 2); x.fill();
  x.restore();
  x.fillStyle = 'rgba(255,255,255,.7)';
  x.beginPath(); x.arc(cx + R * 0.32, cy + R * 0.36, R * 0.07, 0, Math.PI * 2); x.fill();
  return c;
}

function moteSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,248,236,1)');
  g.addColorStop(0.4, 'rgba(255,246,232,.38)');
  g.addColorStop(1, 'rgba(255,246,232,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return c;
}

export class WetScreen {
  private ctx: CanvasRenderingContext2D;
  private W = 0; private H = 0; private dpr = 1;
  private motes: Mote[] = [];
  private drops: Drop[] = [];
  private sprites: HTMLCanvasElement[];
  private mote: HTMLCanvasElement;
  private haze = 0; private hx = 0; private hy = 0;
  private raf = 0; private last = 0; private now = 0;
  private emitQ: { x: number; y: number; power: number; left: number }[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.sprites = [0, 1, 2].map(makeSprite);
    this.mote = moteSprite();
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * this.dpr; this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.raf) this.draw();
  }

  /** a single press of the actuator, from a nozzle at viewport (x, y) */
  spray(x: number, y: number, power = 1) {
    this.emitQ.push({ x, y, power, left: 0.32 });
    this.hx = x; this.hy = y;
    this.start();
  }

  clear() { this.drops = []; this.motes = []; this.emitQ = []; this.haze = 0; }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.now += dt;
      this.step(dt);
      this.draw();
      if (this.motes.length || this.drops.length || this.emitQ.length || this.haze > 0.004) {
        this.raf = requestAnimationFrame(loop);
      } else {
        this.raf = 0;
        this.ctx.clearRect(0, 0, this.W, this.H);
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  private emit(src: { x: number; y: number; power: number }, n: number) {
    const cx = this.W / 2, cy = this.H / 2;
    const short = Math.min(this.W, this.H);
    // the plume heads at the viewer, so it lands between the nozzle and centre
    const lx = src.x + (cx - src.x) * 0.38, ly = src.y + (cy - src.y) * 0.3 - short * 0.04;
    for (let i = 0; i < n; i++) {
      const z = Z0 * (0.92 + Math.random() * 0.12);
      // gaussian-ish landing spread, wider for the fine stuff
      const fine = Math.random() < 0.82;
      const spread = short * (fine ? 0.42 : 0.3) * src.power;
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(-2 * Math.log(Math.random() + 1e-6)) * 0.5 * spread;
      const tx = lx + Math.cos(ang) * rad, ty = ly + Math.sin(ang) * rad * 0.82;
      const zEnd = 26;
      const x0 = (src.x - cx) * z / F, y0 = (src.y - cy) * z / F;
      const x1 = (tx - cx) * zEnd / F, y1 = (ty - cy) * zEnd / F;
      const T = 0.42 + Math.random() * 0.55;       // seconds to arrive
      this.motes.push({
        x: x0, y: y0, z,
        vx: (x1 - x0) / T, vy: (y1 - y0) / T, vz: (zEnd - z) / T,
        r: 0.25 + Math.random() * 0.9,
        a: 0.12 + Math.random() * 0.22,
        wet: fine
          ? (Math.random() < 0.85 ? 1 + Math.pow(Math.random(), 1.6) * 2.6 : 0)
          : 2.4 + Math.pow(Math.random(), 2) * 10
      });
    }
  }

  private land(x: number, y: number, r: number) {
    if (x < -20 || y < -20 || x > this.W + 20 || y > this.H + 20) return;
    // landing on an existing drop merges into it
    if (r > 2) {
      for (let i = this.drops.length - 1; i >= Math.max(0, this.drops.length - 400); i--) {
        const d = this.drops[i];
        const dx = d.x - x, dy = d.y - y;
        if (dx * dx + dy * dy < (d.r + r) * (d.r + r) * 0.5) {
          d.r = Math.min(26, Math.sqrt(d.r * d.r + r * r));
          d.a = 1; d.born = this.now;
          return;
        }
      }
    }
    if (this.drops.length >= MAX_DROPS) this.drops.splice(0, this.drops.length - MAX_DROPS + 1);
    this.drops.push({
      x, y, r, a: 0, born: this.now,
      dry: 1.8 + Math.random() * 2 + r * 0.15,
      vy: 0, wob: Math.random() * 10, run: false, trail: 0,
      sk: (Math.random() * 3) | 0
    });
  }

  private step(dt: number) {
    const cx = this.W / 2, cy = this.H / 2;

    // the actuator is held for a fraction of a second — emit across it
    for (let i = this.emitQ.length - 1; i >= 0; i--) {
      const q = this.emitQ[i];
      const n = Math.round(1700 * dt * q.power);
      this.emit(q, n);
      q.left -= dt;
      if (q.left <= 0) this.emitQ.splice(i, 1);
    }
    if (this.emitQ.length) this.haze = Math.min(1, this.haze + dt * 2.2);
    else this.haze = Math.max(0, this.haze - dt * 0.55);

    // motes fly toward the glass, slowing a little as the plume opens
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
      m.vy += 18 * dt;                       // a touch of gravity on the way
      if (m.z <= 26) {
        if (m.wet > 0) this.land(cx + m.x * F / m.z, cy + m.y * F / m.z, m.wet);
        this.motes.splice(i, 1);
      }
    }

    // drops: bead in, run if heavy, evaporate
    const runners: Drop[] = [];
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      const age = this.now - d.born;
      if (d.a < 1 && age < 0.3) d.a = Math.min(1, d.a + dt * 9);
      if (!d.run && d.r > 7.5 && age > 0.6 && Math.random() < dt * (d.r - 7) * 0.35) d.run = true;
      if (d.run) {
        d.vy = Math.min(d.r * 16, d.vy + dt * (40 + d.r * 10));
        d.wob += dt * 3;
        d.x += Math.sin(d.wob) * dt * 7;
        d.y += d.vy * dt;
        d.trail += d.vy * dt;
        d.r -= dt * 0.45;                     // it loses water to the trail
        if (d.trail > d.r * 1.6 && d.r > 3) {
          d.trail = 0;
          if (this.drops.length < MAX_DROPS) this.drops.push({
            x: d.x + (Math.random() - 0.5) * 2, y: d.y - d.r * 1.1, r: 0.8 + Math.random() * d.r * 0.22,
            a: 0.9, born: this.now, dry: 2 + Math.random() * 3, vy: 0, wob: 0, run: false, trail: 0,
            sk: (Math.random() * 3) | 0
          });
        }
        if (d.r < 4.5) { d.run = false; d.vy = 0; }
        runners.push(d);
      }
      if (age > d.dry) {
        d.r -= dt * (0.8 + d.r * 0.12);
        d.a -= dt * 0.45;
      }
      if (d.r <= 0.3 || d.a <= 0 || d.y - d.r > this.H + 30) this.drops.splice(i, 1);
    }
    // a running drop swallows whatever it passes over
    for (const d of runners) {
      for (let j = this.drops.length - 1; j >= 0; j--) {
        const o = this.drops[j];
        if (o === d || o.run) continue;
        const dx = o.x - d.x, dy = o.y - d.y;
        if (dy > d.r * 1.2 || dy < -d.r) continue;
        if (dx * dx + dy * dy < (d.r + o.r * 0.5) * (d.r + o.r * 0.5)) {
          d.r = Math.min(24, Math.sqrt(d.r * d.r + o.r * o.r * 0.8));
          this.drops.splice(j, 1);
        }
      }
    }
  }

  private draw() {
    const x = this.ctx;
    x.clearRect(0, 0, this.W, this.H);

    // the breath of fine mist that fogs the glass for a moment
    if (this.haze > 0.004) {
      const R = Math.max(this.W, this.H) * 0.62;
      const g = x.createRadialGradient(this.hx, this.hy, 0, this.hx, this.hy, R);
      g.addColorStop(0, `rgba(255,250,242,${0.22 * this.haze})`);
      g.addColorStop(0.5, `rgba(255,250,242,${0.1 * this.haze})`);
      g.addColorStop(1, 'rgba(255,250,242,0)');
      x.fillStyle = g; x.fillRect(0, 0, this.W, this.H);
    }

    // drops on the glass
    for (const d of this.drops) {
      const s = d.r * 2.5;                   // sprite has margin for the shadow
      x.globalAlpha = Math.max(0, Math.min(1, d.a));
      if (d.run) {
        // a running drop is a teardrop: stretch it along its travel
        const k = Math.min(0.5, d.vy / 400);
        x.drawImage(this.sprites[d.sk], d.x - s / 2 * (1 - k * 0.3), d.y - s / 2 * (1 + k), s * (1 - k * 0.3), s * (1 + k));
      } else {
        x.drawImage(this.sprites[d.sk], d.x - s / 2, d.y - s / 2, s, s);
      }
    }

    // the plume in flight, in perspective — grows as it nears the glass
    const cx = this.W / 2, cy = this.H / 2;
    x.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const k = F / m.z;
      const px = cx + m.x * k, py = cy + m.y * k;
      const rad = Math.max(0.6, m.r * k * 9);
      const near = 1 - m.z / Z0;
      x.globalAlpha = m.a * Math.min(1, near * 4) * (1 - Math.pow(near, 6));
      x.drawImage(this.mote, px - rad, py - rad, rad * 2, rad * 2);
    }
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
  }

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
