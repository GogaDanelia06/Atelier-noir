import { Overlay, clamp01, ease, rand } from './overlay';

/* ── Velvet Matte: written on the glass like a mirror ──
   A hand-drawn heart in one stroke, then the shade's name in script. The wax
   drags: it skips, it streaks, and it builds up where the stroke turns.     */

type Note = {
  color: string; name: string;
  cx: number; cy: number; size: number; tilt: number;
  heart: { x: number; y: number }[];
  born: number; fadeAt: number;
  pattern: CanvasPattern | null;
  word: HTMLCanvasElement | null;
};

const HEART_S = 1.05;
const WORD_S = 0.95;
const HOLD_S = 4.5;
const FADE_S = 0.9;

function mix(hex: string, to: number, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = (c: number) => Math.round(c + (to - c) * k);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/** waxy texture: streaks along the stroke, specks, and skips where it missed */
function waxPattern(ctx: CanvasRenderingContext2D, hex: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const x = c.getContext('2d')!;
  x.fillStyle = hex; x.fillRect(0, 0, 160, 160);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * 160, len = rand(20, 120), x0 = Math.random() * 160;
    x.strokeStyle = Math.random() < 0.5 ? mix(hex, 255, 0.28) : mix(hex, 0, 0.22);
    x.globalAlpha = rand(0.15, 0.4);
    x.lineWidth = rand(0.6, 1.8);
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y + rand(-3, 3)); x.stroke();
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) {
    x.globalAlpha = rand(0.3, 0.9);
    x.beginPath(); x.ellipse(Math.random() * 160, Math.random() * 160, rand(0.4, 2.6), rand(0.3, 0.9), 0, 0, Math.PI * 2); x.fill();
  }
  return ctx.createPattern(c, 'repeat');
}

export class LipstickFx extends Overlay {
  private notes: Note[] = [];

  write(_x: number, _y: number, color: string, name: string) {
    for (const n of this.notes) n.fadeAt = Math.min(n.fadeAt, this.now);
    const S = Math.min(this.W, this.H);
    // a mirror is written on in front of you: centre-ish, never quite straight
    const cx = this.W * rand(0.42, 0.58), cy = this.H * rand(0.36, 0.44);
    const size = S * rand(0.17, 0.2);
    const heart: { x: number; y: number }[] = [];
    const N = 160, ph = Math.random() * 10;
    for (let i = 0; i <= N; i++) {
      // start at the top cusp, go round once, overshoot a touch past the start
      const t = (i / N) * (Math.PI * 2 + 0.25);
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const wob = Math.sin(t * 3 + ph) * 0.45 + Math.sin(t * 7 + ph * 2) * 0.2;
      heart.push({ x: (hx + wob) / 16, y: (hy + wob * 0.6) / 16 });
    }
    this.notes.push({
      color, name, cx, cy, size, tilt: rand(-0.12, 0.08), heart,
      born: this.now, fadeAt: this.now + HOLD_S, pattern: waxPattern(this.ctx, color), word: null
    });
    // the script face may still be loading; draw the word once it is ready
    const note = this.notes[this.notes.length - 1];
    const px = Math.round(size * 0.78);
    document.fonts.load(`${px}px "Pinyon Script"`).finally(() => { note.word = this.renderWord(note, px); });
    this.start();
  }

  clear() { this.notes = []; }

  private renderWord(n: Note, px: number) {
    const c = document.createElement('canvas');
    const font = `${px}px "Pinyon Script", "Snell Roundhand", cursive`;
    const m = this.ctx; m.save(); m.font = font;
    const w = Math.ceil(m.measureText(n.name).width + px * 0.8); m.restore();
    c.width = w * this.dpr; c.height = Math.ceil(px * 1.6) * this.dpr;
    const x = c.getContext('2d')!;
    x.scale(this.dpr, this.dpr);
    x.font = font; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(30,10,6,.28)'; x.shadowBlur = 1.5; x.shadowOffsetY = 1;
    x.fillStyle = waxPattern(x, n.color) ?? n.color;
    x.lineJoin = 'round';
    x.strokeStyle = x.fillStyle; x.lineWidth = px * 0.035;
    x.strokeText(n.name, px * 0.4, px * 0.8);
    x.fillText(n.name, px * 0.4, px * 0.8);
    x.shadowColor = 'transparent';
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(255,255,255,.14)';
    x.fillRect(0, 0, w, px * 0.7);
    return c;
  }

  protected alive() { return this.notes.length > 0; }

  protected step() {
    this.notes = this.notes.filter(n => this.now < n.fadeAt + FADE_S);
  }

  protected draw() {
    const x = this.ctx;
    for (const n of this.notes) {
      const age = this.now - n.born;
      const a = 1 - clamp01((this.now - n.fadeAt) / FADE_S);
      x.save();
      x.globalAlpha = a;
      x.translate(n.cx, n.cy);
      x.rotate(n.tilt);

      // the heart, drawn as it is written
      const k = ease(clamp01(age / HEART_S));
      const upto = Math.max(2, Math.floor(k * n.heart.length));
      const P = (i: number) => ({ x: n.heart[i].x * n.size, y: n.heart[i].y * n.size });
      const lw = n.size * 0.13;
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.shadowColor = 'rgba(30,10,6,.3)'; x.shadowBlur = 2; x.shadowOffsetY = 1.5;
      x.strokeStyle = n.pattern ?? n.color;
      x.beginPath();
      for (let i = 0; i < upto; i++) { const p = P(i); x.lineTo(p.x, p.y); }
      x.lineWidth = lw; x.stroke();
      x.shadowColor = 'transparent';
      // wax builds up at the start and where the pressure lifts
      const s0 = P(0);
      x.fillStyle = n.pattern ?? n.color;
      x.beginPath(); x.ellipse(s0.x, s0.y, lw * 0.75, lw * 0.6, 0.4, 0, Math.PI * 2); x.fill();
      // satin sheen riding the upper edge of the stroke
      x.beginPath();
      for (let i = 0; i < upto; i++) { const p = P(i); x.lineTo(p.x - lw * 0.18, p.y - lw * 0.22); }
      x.lineWidth = lw * 0.16; x.strokeStyle = 'rgba(255,255,255,.3)'; x.stroke();
      x.setLineDash([lw * 0.4, lw * 1.3, lw * 0.15, lw * 0.9]);
      x.beginPath();
      for (let i = 0; i < upto; i++) { const p = P(i); x.lineTo(p.x + lw * 0.2, p.y + lw * 0.16); }
      x.lineWidth = lw * 0.22; x.strokeStyle = mix(n.color, 0, 0.3); x.globalAlpha = a * 0.35; x.stroke();
      x.setLineDash([]);
      x.globalAlpha = a;

      // then the shade's name, revealed left to right like a hand writing it
      if (n.word && age > HEART_S * 0.8) {
        const wk = ease(clamp01((age - HEART_S * 0.8) / WORD_S));
        const ww = n.word.width / this.dpr, wh = n.word.height / this.dpr;
        const wx = -ww / 2, wy = n.size * 1.12;
        x.save();
        x.beginPath(); x.rect(wx, wy - 4, ww * wk, wh + 8); x.clip();
        x.rotate(-0.04);
        x.drawImage(n.word, wx, wy, ww, wh);
        x.restore();
      }
      x.restore();
    }
  }
}
