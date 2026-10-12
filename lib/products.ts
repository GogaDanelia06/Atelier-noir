import * as THREE from 'three';
import { layeredGlass } from './glass';

/* ── the rest of the range, each with its own ritual ──
   Every product shares one small state machine: something has to come off or
   unlock first (lid, cap, pump lock), then the action runs and fires an event
   at a point on the object. The host turns that point into screen space and
   hands it to the overlay that paints the result onto the glass.            */

type State = 'closed' | 'opening' | 'open' | 'closing';

const ease = (x: number) => x * x * (3 - 2 * x);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const V = THREE.Vector2;

export interface Interactive {
  readonly group: THREE.Group;
  readonly emitter: THREE.Object3D;
  focus: number;
  onFire: ((n: number) => void) | null;
  readonly busy: boolean;
  readonly capped: boolean;
  trigger(): void;
  recap(): void;
  update(dt: number): void;
  dispose(): void;
}

type Mats = ReturnType<typeof materials>;
function materials(env: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const d = x.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) {
    const v = 214 + Math.random() * 40;
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const brushed = new THREE.CanvasTexture(c);
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
  brushed.repeat.set(6, 0.7);
  return {
    brushed,
    metal: (hex: number, rough: number) => new THREE.MeshStandardMaterial({
      color: hex, metalness: 1, roughness: rough, roughnessMap: brushed, envMapIntensity: 2.4 * env
    }),
    lacquer: (hex: number) => new THREE.MeshPhysicalMaterial({
      color: hex, metalness: 0, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5 * env
    })
  };
}

function fadeable(root: THREE.Object3D) {
  const mats: THREE.Material[] = [];
  root.traverse(o => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m && !mats.includes(m)) mats.push(m);
  });
  return (o: number) => {
    for (const m of mats) {
      const want = o < 0.999;
      if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; }
      m.opacity = o;
    }
    root.visible = o > 0.01;
  };
}

abstract class Openable implements Interactive {
  readonly group = new THREE.Group();
  /** everything the product animates itself lives in here, under the host's rotation */
  protected readonly body = new THREE.Group();
  readonly emitter = new THREE.Object3D();
  focus = 0;
  onFire: ((n: number) => void) | null = null;

  protected state: State = 'closed';
  protected u = 0;
  protected actT = -1;
  private pending = 0;
  private idle = 0;
  protected mats: Mats;

  protected abstract readonly openS: number;
  protected readonly idleS: number = 8;
  protected abstract pose(u: number, dt: number): void;
  protected abstract act(t: number | null, dt: number): void;
  /** seconds into the action at which it fires */
  protected abstract fireTimes(): number[];
  protected abstract readonly actS: number;

  constructor(env: number) {
    this.mats = materials(env);
    this.group.add(this.body);
  }

  get busy() { return this.state !== 'closed'; }
  get capped() { return this.state === 'closed'; }

  trigger() {
    this.idle = 0;
    if (this.state === 'open') { if (this.actT < 0) this.startAct(); return; }
    this.pending = 1;
    if (this.state === 'closed' || this.state === 'closing') this.state = 'opening';
  }

  private startAct() { this.actT = 0; this.onActStart(); }
  protected onActStart() {}

  recap() {
    if (this.state === 'open' || this.state === 'opening') { this.state = 'closing'; this.pending = 0; this.actT = -1; }
  }

  update(dt: number) {
    dt = Math.min(dt, 0.05);
    if (this.state === 'opening') {
      this.u = Math.min(1, this.u + dt / this.openS);
      if (this.u >= 1) {
        this.state = 'open'; this.idle = 0;
        if (this.pending) { this.pending = 0; this.startAct(); }
      }
    } else if (this.state === 'closing') {
      this.u = Math.max(0, this.u - dt / this.openS);
      if (this.u <= 0) this.state = 'closed';
    } else if (this.state === 'open' && this.actT < 0) {
      this.idle += dt;
      if (this.idle > this.idleS) this.recap();
    }

    if (this.actT >= 0) {
      const before = this.actT;
      this.actT += dt;
      this.fireTimes().forEach((t, n) => { if (before < t && this.actT >= t) this.onFire?.(n); });
      if (this.actT > this.actS) { this.actT = -1; this.idle = 0; }
    }
    this.pose(this.u, dt);
    this.act(this.actT < 0 ? null : this.actT, dt);

    const want = this.state === 'closed' ? 0 : 1;
    this.focus += (want - this.focus) * Math.min(1, dt * 4.5);
  }

  dispose() {
    this.group.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | undefined;
      if (mat) { (mat as THREE.MeshStandardMaterial).map?.dispose(); mat.dispose(); }
    });
    this.mats.brushed.dispose();
  }
}

/* ── 02 · Second Skin cream jar ──
   Heavy glass, a whipped peak of cream, a brushed lid. Press it and the lid
   unscrews and flips back while the jar tips toward you. Press again to
   close it.                                                               */
export class CreamJar extends Openable {
  protected readonly openS = 1.25;
  protected readonly actS = 0;
  private lid = new THREE.Group();
  private fadeLid: (o: number) => void;
  private peak = new THREE.Group();

  constructor(env = 1.5) {
    super(env);
    const m = this.mats;

    // a real vessel: outer wall, rim, inner wall, thick base
    const shell = [
      new V(0, -0.62), new V(1.1, -0.62), new V(1.24, -0.56), new V(1.3, -0.44),
      new V(1.3, 0.26), new V(1.27, 0.36), new V(1.18, 0.38), new V(1.14, 0.32),
      new V(1.14, -0.36), new V(1.06, -0.42), new V(0, -0.42)
    ];
    this.body.add(layeredGlass(new THREE.LatheGeometry(shell, 128), { env, edge: 0xFFE6C4, edgeAmount: 0.42 }));

    const creamMat = new THREE.MeshPhysicalMaterial({
      color: 0xF5EFE7, roughness: 0.42, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0xffffff),
      sheenRoughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.9
    });
    const cream = [
      new V(0, -0.41), new V(1.13, -0.41), new V(1.13, 0.16), new V(1.08, 0.24),
      new V(0.86, 0.29), new V(0.55, 0.33), new V(0, 0.34)
    ];
    this.body.add(new THREE.Mesh(new THREE.LatheGeometry(cream, 96), creamMat));

    // the whipped swirl on top
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const a = t * Math.PI * 2 * 2.6;
      const r = 0.72 * (1 - t) + 0.03;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.33 + Math.pow(t, 1.4) * 0.34, Math.sin(a) * r));
    }
    const swirl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.085, 16, false), creamMat);
    this.peak.add(swirl);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), creamMat);
    tip.position.set(pts[120].x, pts[120].y, pts[120].z);
    this.peak.add(tip);
    this.body.add(this.peak);

    // lid
    const lidProfile = [
      new V(0, 0.18), new V(1.3, 0.18), new V(1.36, 0.15), new V(1.38, 0.1),
      new V(1.38, -0.12), new V(1.35, -0.17), new V(1.3, -0.17), new V(1.3, 0.12), new V(0, 0.12)
    ];
    this.lid.add(new THREE.Mesh(new THREE.LatheGeometry(lidProfile, 128), m.metal(0xE9DDC8, 0.26)));
    const knurl = new THREE.Mesh(new THREE.CylinderGeometry(1.385, 1.385, 0.05, 128, 1, true), m.metal(0xC7B79C, 0.4));
    knurl.position.y = -0.06;
    this.lid.add(knurl);
    // a pressed monogram on the top
    const tc = document.createElement('canvas'); tc.width = tc.height = 512;
    const tx = tc.getContext('2d')!;
    tx.fillStyle = '#000'; tx.fillRect(0, 0, 512, 512);
    tx.strokeStyle = '#fff'; tx.lineWidth = 3;
    tx.beginPath(); tx.arc(256, 256, 190, 0, Math.PI * 2); tx.stroke();
    tx.fillStyle = '#fff'; tx.textAlign = 'center'; tx.textBaseline = 'middle';
    tx.font = '150px "Cormorant Garamond", Georgia, serif'; tx.fillText('GD', 256, 240);
    tx.font = '34px Jost, sans-serif'; tx.fillText('S E C O N D   S K I N', 256, 345);
    const mono = new THREE.CanvasTexture(tc);
    const top = new THREE.Mesh(new THREE.CircleGeometry(1.2, 96),
      new THREE.MeshStandardMaterial({ color: 0xFFF6E6, metalness: 1, roughness: 0.5, alphaMap: mono, transparent: true, envMapIntensity: 2 }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.181;
    this.lid.add(top);
    this.lid.position.y = 0.5;
    this.body.add(this.lid);
    this.fadeLid = fadeable(this.lid);

    this.emitter.position.set(0, 0.5, 0);
    this.body.add(this.emitter);
  }

  trigger() {
    if (this.state === 'open' || this.state === 'opening') this.recap();
    else super.trigger();
  }

  protected fireTimes() { return []; }

  protected pose(u: number) {
    const twist = ease(clamp01(u / 0.38));
    const lift = easeOut(clamp01((u - 0.38) / 0.62));
    this.lid.position.set(lift * 0.6, 0.5 + twist * 0.1 + lift * 1.5, -lift * 1.3);
    this.lid.rotation.set(-lift * 1.25, twist * Math.PI * 1.4, 0);
    this.fadeLid(1 - clamp01((lift - 0.5) / 0.5));
    // the jar tips toward the viewer so the cream is on show
    this.body.rotation.x = ease(u) * 0.52;
    this.body.position.y = ease(u) * -0.15;
  }

  protected act() {}
}

/* ── 03 · Velvet Matte lipstick ──
   The cap pulls off, the bullet swivels up out of its sleeve, and it writes. */
export class Lipstick extends Openable {
  protected readonly openS = 1.0;
  protected readonly actS = 1.3;
  protected readonly idleS = 9;
  readonly bulletMat: THREE.MeshPhysicalMaterial;
  private cap = new THREE.Group();
  private fadeCap: (o: number) => void;
  private bullet = new THREE.Group();
  private rise = 0;
  private quick = false;

  constructor(env = 1.5) {
    super(env);
    const m = this.mats;
    this.bulletMat = new THREE.MeshPhysicalMaterial({
      color: 0xC98F7A, metalness: 0, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.34, envMapIntensity: 0.22
    });
    const bulletGeo = (r: number, h: number, slant: number) => {
      const g = new THREE.CylinderGeometry(r, r * 0.98, h, 96, 1, false);
      const pos = g.attributes.position, top = h / 2 - 1e-4;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > top) pos.setY(i, pos.getY(i) + pos.getZ(i) * slant);
      pos.needsUpdate = true;
      g.computeVertexNormals();
      return g;
    };
    const b = new THREE.Mesh(bulletGeo(0.3, 1.2, 0.6), this.bulletMat);
    b.position.y = 1.33;
    this.bullet.add(b);
    this.body.add(this.bullet);

    const lacquer = m.lacquer(0x241C17);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.4, .43, 1.95, 96), lacquer);
    tube.position.y = -.78; this.body.add(tube);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.435, .435, .07, 96), m.metal(0xC9B48F, .28));
    base.position.y = -1.79; this.body.add(base);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .05, 96), m.metal(0xB5A27F, .3));
    collar.position.y = .21; this.body.add(collar);
    // an open sleeve, so the bullet can sit down inside it
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.335, .335, .52, 96, 1, true), m.metal(0xE2D2B4, .14));
    sleeve.position.y = .48; this.body.add(sleeve);
    const lining = new THREE.Mesh(new THREE.CylinderGeometry(.33, .33, .5, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x14100D, roughness: .8, side: THREE.BackSide }));
    lining.position.y = .48; this.body.add(lining);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(.33, 48), new THREE.MeshBasicMaterial({ color: 0x0C0907 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = .24; this.body.add(floor);

    // cap
    const capBody = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, 1.78, 96), m.lacquer(0x241C17));
    capBody.position.y = 1.1; this.cap.add(capBody);
    const capRing = new THREE.Mesh(new THREE.CylinderGeometry(.437, .437, .07, 96), m.metal(0xC9B48F, .26));
    capRing.position.y = .25; this.cap.add(capRing);
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(.42, .43, .02, 96), m.metal(0xD9C7A6, .22));
    capTop.position.y = 2.0; this.cap.add(capTop);
    this.body.add(this.cap);
    this.fadeCap = fadeable(this.cap);

    this.emitter.position.set(0, 1.9, 0.2);
    this.bullet.add(this.emitter);
    this.setRise(0);
  }

  private setRise(r: number) {
    this.rise = r;
    this.bullet.position.y = -1.0 + ease(r) * 1.0;
    this.bullet.rotation.y = ease(r) * Math.PI * 2.2;
  }

  // first time the bullet has to swivel up before it can write
  protected onActStart() { this.quick = this.rise > 0.99; }
  protected fireTimes() { return [this.quick ? 0.12 : 0.95]; }

  protected pose(u: number) {
    const pull = easeOut(clamp01(u / 0.45));
    const away = easeOut(clamp01((u - 0.4) / 0.6));
    this.cap.position.set(away * 0.9, pull * 0.55 + away * 1.4, away * 0.4);
    this.cap.rotation.set(0, pull * 0.9, -away * 0.8);
    this.fadeCap(1 - clamp01((away - 0.45) / 0.55));
    // a writing lean once it is open
    this.body.rotation.z = -ease(this.focus) * 0.32;
    this.body.rotation.x = ease(this.focus) * 0.16;
  }

  protected act(t: number | null, dt: number) {
    // the bullet comes up when open and goes back down before the cap returns
    const want = this.state === 'open' ? 1 : 0;
    if (want && this.rise < 1 && t !== null) this.setRise(Math.min(1, this.rise + dt / 0.85));
    if (!want && this.rise > 0) this.setRise(Math.max(0, this.rise - dt / 0.35));
    if (this.state === 'closing' && this.rise > 0.02) this.u = Math.max(this.u, 0.999);
  }
}

/* ── 04 · Sandalwood body oil ──
   The pump head is locked sideways; it twists to face you, springs up, and
   pumps twice.                                                           */
export class OilPump extends Openable {
  protected readonly openS = 0.85;
  protected readonly actS = 1.05;
  private head = new THREE.Group();

  constructor(env = 1.5) {
    super(env);
    const m = this.mats;
    const p = [new V(0, -1.6), new V(.7, -1.6), new V(.82, -1.53), new V(.86, -1.44),
      new V(.86, .74), new V(.84, .88), new V(.72, .98), new V(.4, 1.04), new V(.34, 1.2)];
    const glassBody = layeredGlass(new THREE.LatheGeometry(p, 128), { env, edge: 0xFFE6C4, edgeAmount: 0.42 });
    this.body.add(glassBody);
    const fill = p.filter(q => q.y <= .45).map(q => new V(q.x * .93, q.y + (q.y < -1.5 ? 0.12 : 0)));
    fill.push(new V(fill[fill.length - 1].x, .45), new V(0, .45));
    const oil = new THREE.MeshPhysicalMaterial({
      color: 0xD9A03C, roughness: 0.04, metalness: 0, emissive: new THREE.Color(0x7A4A0C), emissiveIntensity: 0.6,
      clearcoat: 0.8, clearcoatRoughness: 0.05, envMapIntensity: 0.7
    });
    this.body.add(new THREE.Mesh(new THREE.LatheGeometry(fill, 96), oil));
    const surface = new THREE.Mesh(new THREE.CircleGeometry(.79, 64), new THREE.MeshBasicMaterial({ color: 0xF0BE62, transparent: true, opacity: 0.55 }));
    surface.rotation.x = -Math.PI / 2; surface.position.y = .451; this.body.add(surface);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, 2.6, 12),
      new THREE.MeshStandardMaterial({ color: 0xEDE6DA, roughness: .35 }));
    tube.position.y = -.2; this.body.add(tube);

    const nk = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, .34, 96), m.metal(0xE2D2B4, .26));
    nk.position.y = 1.34; this.body.add(nk);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .3, 24), m.metal(0xF2E8D6, .18));
    stem.position.y = 1.55; this.body.add(stem);

    const hd = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .38, 96), m.metal(0xF2E8D6, .18));
    this.head.add(hd);
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(.23, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.metal(0xF2E8D6, .18));
    capTop.scale.y = .3; capTop.position.y = .19; this.head.add(capTop);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(.06, .075, .55, 32), m.metal(0xF2E8D6, .18));
    spout.rotation.z = Math.PI / 2; spout.position.set(.42, .1, 0); this.head.add(spout);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.04, 20), new THREE.MeshBasicMaterial({ color: 0x0B0806 }));
    hole.rotation.y = Math.PI / 2; hole.position.set(.698, .1, 0); this.head.add(hole);
    this.emitter.position.set(.75, .1, 0);
    this.head.add(this.emitter);
    this.head.position.y = 1.72;
    this.body.add(this.head);
  }

  protected fireTimes() { return [0.14, 0.6]; }

  protected pose(u: number) {
    // locked: spout to the side. Unlocked: turned to face the viewer, up a little
    const turn = ease(clamp01(u / 0.7));
    const pop = easeOut(clamp01((u - 0.6) / 0.4));
    this.head.rotation.y = 0.2 - turn * (Math.PI / 2 + 0.2);   // → spout points at the camera
    this.head.userData.base = 1.72 + pop * 0.12;
  }

  protected act(t: number | null) {
    let dip = 0;
    if (t !== null) {
      for (const at of [0.06, 0.52]) {
        const k = t - at;
        if (k >= 0 && k < 0.42) dip = Math.max(dip, k < 0.09 ? easeOut(k / 0.09) : 1 - easeOut(clamp01((k - 0.12) / 0.3)));
      }
    }
    this.head.position.y = (this.head.userData.base ?? 1.72) - dip * 0.13;
    this.body.rotation.x = ease(this.focus) * 0.08;
    this.group.userData.kick = dip;
  }
}
