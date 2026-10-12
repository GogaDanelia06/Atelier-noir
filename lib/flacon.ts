import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { layeredGlass } from './glass';

/* ── the No. 07 flacon, modelled as a real object ──
   A heavy slab of glass with a thick foot, liquid suspended inside it, a dip
   tube, a ribbed collar, a working actuator and a removable cap. The glass is
   transmissive, so the liquid and tube refract through it rather than sitting
   behind a tinted sheet.

   Pressing it runs a small state machine: the cap unscrews, lifts away, the
   actuator goes down and a spray event fires from the nozzle. Leave it alone
   and the cap comes back.                                                    */

type State = 'capped' | 'uncapping' | 'open' | 'recapping';

const ease = (x: number) => x * x * (3 - 2 * x);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* body silhouette — the same chamfered shoulders as the hero illustration */
const BEVEL = 0.07;
const DEPTH = 0.82;
const BODY_BOTTOM = -1.86;
const BODY_TOP = 1.12;
const FRONT_Z = DEPTH / 2 + BEVEL;

const CAP_Y = 1.6;
const ACT_Y = 1.46;
const UNCAP_S = 1.15;
const IDLE_RECAP_S = 7;

function grainTex(rep: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const d = x.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) {
    const v = 214 + Math.random() * 40;
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
    d.data[i * 4 + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep * 0.12);           // stretched: reads as brushing
  return t;
}

function bodyShape() {
  const w = 0.95 - BEVEL, yb = BODY_BOTTOM + BEVEL, yt = BODY_TOP - BEVEL;
  const ys = 0.7, n = 0.46, r = 0.09;
  const s = new THREE.Shape();
  s.moveTo(-w + r, yb);
  s.lineTo(w - r, yb);
  s.quadraticCurveTo(w, yb, w, yb + r);
  s.lineTo(w, ys);
  s.quadraticCurveTo(w, ys + 0.1, w - 0.07, ys + 0.16);
  s.lineTo(n + 0.06, yt - 0.02);
  s.quadraticCurveTo(n, yt, n - 0.06, yt);
  s.lineTo(-n + 0.06, yt);
  s.quadraticCurveTo(-n, yt, -n - 0.06, yt - 0.02);
  s.lineTo(-w + 0.07, ys + 0.16);
  s.quadraticCurveTo(-w, ys + 0.1, -w, ys);
  s.lineTo(-w, yb + r);
  s.quadraticCurveTo(-w, yb, -w + r, yb);
  return s;
}

function roundedRect(hw: number, y0: number, y1: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-hw + r, y0);
  s.lineTo(hw - r, y0);
  s.quadraticCurveTo(hw, y0, hw, y0 + r);
  s.lineTo(hw, y1 - r);
  s.quadraticCurveTo(hw, y1, hw - r, y1);
  s.lineTo(-hw + r, y1);
  s.quadraticCurveTo(-hw, y1, -hw, y1 - r);
  s.lineTo(-hw, y0 + r);
  s.quadraticCurveTo(-hw, y0, -hw + r, y0);
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel: number, segs = 6) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: segs, curveSegments: 24
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

function labelTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 440;
  const x = c.getContext('2d')!;
  x.fillStyle = '#FBF8F2'; x.fillRect(0, 0, 512, 440);
  // paper tooth
  const d = x.getImageData(0, 0, 512, 440);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 9;
    d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
  }
  x.putImageData(d, 0, 0);
  x.strokeStyle = 'rgba(28,24,21,.5)'; x.lineWidth = 2; x.strokeRect(22, 22, 468, 396);
  x.fillStyle = '#1C1815'; x.textAlign = 'center';
  x.font = '86px "Cormorant Garamond", Georgia, serif'; x.fillText('GD', 256, 170);
  x.font = '46px "Cormorant Garamond", Georgia, serif'; x.fillText('B E A U T Y', 256, 236);
  x.fillRect(176, 266, 160, 2);
  x.font = '21px Jost, sans-serif'; x.fillText('E A U   D E   P A R F U M', 256, 312);
  x.font = '18px Jost, sans-serif'; x.fillStyle = 'rgba(28,24,21,.6)'; x.fillText('No. 07 · 100 ml', 256, 352);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export type FlaconOptions = {
  liquid?: number;
  edge?: number;         // colour the glass thickens toward at grazing angles
  edgeAmount?: number;
  foot?: number;
  envIntensity?: number;
};

export class Flacon {
  readonly group = new THREE.Group();
  readonly nozzle = new THREE.Object3D();
  /** 0 → host owns the rotation, 1 → present the nozzle to the camera */
  focus = 0;
  onSpray: (() => void) | null = null;

  private state: State = 'capped';
  private u = 0;                     // 0 capped … 1 cap fully away
  private pressT = -1;
  private pending = 0;
  private idle = 0;
  private settleT = -1;

  private cap = new THREE.Group();
  private capMats: THREE.MeshStandardMaterial[] = [];
  private actuator = new THREE.Group();
  private engCanvas: HTMLCanvasElement;
  private engTex: THREE.CanvasTexture;
  private engMesh: THREE.Mesh;
  private disposables: { dispose(): void }[] = [];

  constructor(opts: FlaconOptions = {}) {
    const env = opts.envIntensity ?? 1;
    const brushed = grainTex(6);
    this.disposables.push(brushed);

    const liquid = new THREE.MeshPhysicalMaterial({
      color: opts.liquid ?? 0xA8500A, metalness: 0, roughness: 0.06,
      emissive: new THREE.Color(0x6A2400), emissiveIntensity: 0.35,
      clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 0.55 * env
    });
    const metal = (hex: number, rough: number) => new THREE.MeshStandardMaterial({
      color: hex, metalness: 1, roughness: rough, roughnessMap: brushed, envMapIntensity: 1.6 * env
    });
    const champagne = metal(0xE4D3B4, 0.26);
    const bright = metal(0xF1E6D2, 0.14);

    /* glass body — one solid, thick-walled slab */
    const bodyGeo = extrude(bodyShape(), DEPTH, BEVEL, 8);
    this.group.add(layeredGlass(bodyGeo, { env, edge: opts.edge, edgeAmount: opts.edgeAmount }));
    // the heavy foot: denser glass under the liquid
    const foot = new THREE.Mesh(extrude(roundedRect(0.84, BODY_BOTTOM + 0.04, -1.42, 0.06), DEPTH - 0.04, 0.05, 4),
      new THREE.MeshPhysicalMaterial({ color: opts.foot ?? 0xF3ECE2, transparent: true, opacity: 0.28, roughness: 0.05,
        metalness: 0, clearcoat: 1, envMapIntensity: 2 * env, depthWrite: false }));
    foot.renderOrder = 1;
    this.group.add(foot);

    /* the juice, held inside the walls with a heavy glass foot under it */
    const liqGeo = extrude(roundedRect(0.7, -1.38, 0.32, 0.08), DEPTH - 0.3, 0.05, 4);
    this.group.add(new THREE.Mesh(liqGeo, liquid));
    // the meniscus — a bright line where the surface meets the glass
    const men = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.012, DEPTH - 0.24),
      new THREE.MeshBasicMaterial({ color: 0xFFE2B0 })
    );
    men.position.y = 0.37;
    this.group.add(men);

    /* dip tube */
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 2.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xEDE6DA, roughness: 0.35, metalness: 0 })
    );
    tube.position.set(0, -0.2, 0);
    this.group.add(tube);

    /* ribbed collar crimped onto the neck */
    const ribs: THREE.Vector2[] = [new THREE.Vector2(0, 1.08), new THREE.Vector2(0.37, 1.08)];
    for (let i = 0; i < 7; i++) {
      const y = 1.1 + i * 0.032;
      ribs.push(new THREE.Vector2(0.37, y), new THREE.Vector2(0.355, y + 0.016));
    }
    ribs.push(new THREE.Vector2(0.37, 1.34), new THREE.Vector2(0.33, 1.36), new THREE.Vector2(0.1, 1.36));
    const collar = new THREE.Mesh(new THREE.LatheGeometry(ribs, 96), champagne);
    this.group.add(collar);
    // stem from collar to actuator
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 24), bright);
    stem.position.y = 1.38;
    this.group.add(stem);

    /* actuator, with a nozzle facing the front */
    const actProfile = [
      new THREE.Vector2(0, -0.13), new THREE.Vector2(0.24, -0.13), new THREE.Vector2(0.255, -0.11),
      new THREE.Vector2(0.255, 0.08), new THREE.Vector2(0.24, 0.12), new THREE.Vector2(0.17, 0.14),
      new THREE.Vector2(0, 0.145)
    ];
    const act = new THREE.Mesh(new THREE.LatheGeometry(actProfile, 96), bright);
    this.actuator.add(act);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 12, 32), champagne);
    ring.position.set(0, 0.0, 0.252);
    this.actuator.add(ring);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.034, 24), new THREE.MeshBasicMaterial({ color: 0x0A0806 }));
    hole.position.set(0, 0.0, 0.257);
    this.actuator.add(hole);
    this.nozzle.position.set(0, 0, 0.27);
    this.actuator.add(this.nozzle);
    this.actuator.position.y = ACT_Y;
    this.group.add(this.actuator);

    /* the cap — a heavy brushed block, as on the illustration */
    const capMat = metal(0xE8DCC6, 0.3);
    const capBody = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.9, 0.92, 6, 0.07), capMat);
    this.cap.add(capBody);
    const capBand = new THREE.Mesh(new RoundedBoxGeometry(1.012, 0.05, 0.932, 2, 0.02), metal(0xB9A788, 0.34));
    capBand.position.y = -0.38;
    this.cap.add(capBand);
    this.capMats = [capMat, capBand.material as THREE.MeshStandardMaterial];
    this.cap.position.y = CAP_Y;
    this.group.add(this.cap);

    /* paper label on the front face */
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 0.91),
      new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.75, metalness: 0, envMapIntensity: 0.5 * env })
    );
    label.position.set(0, -0.6, FRONT_Z + 0.004);
    this.group.add(label);
    const labelBack = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 0.91),
      new THREE.MeshStandardMaterial({ color: 0xF2ECE2, roughness: 0.8 })
    );
    labelBack.position.set(0, -0.6, FRONT_Z + 0.002);
    labelBack.rotation.y = Math.PI;
    this.group.add(labelBack);

    /* engraving — sandblasted into the foot, so it is frosted, not printed */
    this.engCanvas = document.createElement('canvas');
    this.engCanvas.width = 1024; this.engCanvas.height = 160;
    this.engTex = new THREE.CanvasTexture(this.engCanvas);
    this.engMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.235),
      new THREE.MeshStandardMaterial({
        color: 0xF6F0E6, roughness: 0.9, metalness: 0, transparent: true,
        alphaMap: this.engTex, depthWrite: false, envMapIntensity: 0.4 * env
      })
    );
    this.engMesh.position.set(0, -1.6, FRONT_Z + 0.003);
    this.engMesh.visible = false;
    this.group.add(this.engMesh);
  }

  get busy() { return this.state !== 'capped'; }
  get capped() { return this.state === 'capped'; }

  /** click / button — open it if needed, then spray */
  trigger() {
    this.idle = 0;
    if (this.state === 'open') { this.press(); return; }
    this.pending = 1;
    if (this.state === 'capped' || this.state === 'recapping') this.state = 'uncapping';
  }

  recap() {
    if (this.state === 'open' || this.state === 'uncapping') { this.state = 'recapping'; this.pending = 0; }
  }

  engrave(text: string) {
    const x = this.engCanvas.getContext('2d')!;
    const W = this.engCanvas.width, H = this.engCanvas.height;
    x.clearRect(0, 0, W, H);
    const t = (text || '').trim().toUpperCase();
    if (!t) { this.engMesh.visible = false; this.engTex.needsUpdate = true; return; }
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let size = 104;
    const spacing = () => Math.max(2, size * 0.18);
    const setFont = () => {
      x.font = size + 'px "Cormorant Garamond", Georgia, serif';
      if ('letterSpacing' in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = spacing() + 'px';
    };
    setFont();
    while (size > 24 && x.measureText(t).width + spacing() * t.length > W * 0.84) { size -= 3; setFont(); }
    x.fillText(t, W / 2, H / 2 + 4);
    this.engMesh.visible = true;
    this.engTex.needsUpdate = true;
  }

  private press() {
    if (this.pressT >= 0 && this.pressT < 0.2) return;   // still on the way down
    this.pressT = 0;
  }

  private setCapOpacity(o: number) {
    for (const m of this.capMats) {
      const want = o < 0.999;
      if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; }
      m.opacity = o;
    }
    this.cap.visible = o > 0.01;
  }

  private placeCap() {
    const u = this.u;
    // 0 → .32 : unscrew a half turn while rising off the thread
    // .32 → 1 : lift clear, swing away and fade
    const twist = ease(clamp01(u / 0.32));
    const lift = easeOut(clamp01((u - 0.32) / 0.68));
    this.cap.position.set(
      -lift * 1.25,
      CAP_Y + twist * 0.09 + lift * 1.45,
      lift * 0.9
    );
    this.cap.rotation.set(-lift * 0.35, twist * Math.PI * 0.55 + lift * 0.4, lift * 0.55);
    this.setCapOpacity(1 - clamp01((lift - 0.55) / 0.45));
  }

  update(dt: number) {
    dt = Math.min(dt, 0.05);

    if (this.state === 'uncapping') {
      this.u = Math.min(1, this.u + dt / UNCAP_S);
      if (this.u >= 1) {
        this.state = 'open';
        this.idle = 0;
        if (this.pending) { this.pending = 0; this.press(); }
      }
    } else if (this.state === 'recapping') {
      this.u = Math.max(0, this.u - dt / UNCAP_S);
      if (this.u <= 0) { this.state = 'capped'; this.settleT = 0; }
    } else if (this.state === 'open') {
      this.idle += dt;
      if (this.idle > IDLE_RECAP_S && this.pressT < 0) this.recap();
    }
    this.placeCap();

    // the cap lands with a small seat-down
    if (this.settleT >= 0) {
      this.settleT += dt;
      this.cap.position.y = CAP_Y - Math.sin(Math.min(1, this.settleT / 0.18) * Math.PI) * 0.025;
      if (this.settleT > 0.18) this.settleT = -1;
    }

    // actuator: fast down, short hold, spring back
    let dip = 0;
    if (this.pressT >= 0) {
      const before = this.pressT;
      this.pressT += dt;
      const t = this.pressT;
      if (t < 0.07) dip = easeOut(t / 0.07);
      else if (t < 0.16) dip = 1;
      else dip = 1 - easeOut(Math.min(1, (t - 0.16) / 0.2));
      if (before < 0.05 && t >= 0.05 && this.onSpray) this.onSpray();
      if (t > 0.4) this.pressT = -1;
    }
    this.actuator.position.y = ACT_Y - dip * 0.055;
    this.group.userData.kick = dip;

    const want = this.state === 'capped' ? 0 : 1;
    this.focus += (want - this.focus) * Math.min(1, dt * 4.5);
  }

  dispose() {
    this.group.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach(mm => {
        const anyM = mm as THREE.MeshStandardMaterial;
        anyM.map?.dispose(); anyM.alphaMap?.dispose();
        mm.dispose();
      });
    });
    this.disposables.forEach(d => d.dispose());
  }
}

/** blend a free rotation toward the nearest "facing the camera" angle */
export function presentAngle(rot: number, focus: number, front = 0.18) {
  const TAU = Math.PI * 2;
  const target = Math.round((rot - front) / TAU) * TAU + front;
  return rot + (target - rot) * ease(focus);
}

export function contactShadow(w = 2.3, h = 0.6) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 126);
  g.addColorStop(0, 'rgba(0,0,0,.5)');
  g.addColorStop(0.45, 'rgba(0,0,0,.14)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sp.scale.set(w, h, 1);
  return sp;
}

/** viewport position of an object, for handing the spray to the overlay */
export function toViewport(obj: THREE.Object3D, camera: THREE.Camera, canvas: HTMLCanvasElement) {
  const v = new THREE.Vector3();
  obj.getWorldPosition(v);
  v.project(camera);
  const r = canvas.getBoundingClientRect();
  return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
}

export function emitSpray(x: number, y: number, power = 1) {
  window.dispatchEvent(new CustomEvent('flacon:spray', { detail: { x, y, power } }));
}
