import * as THREE from 'three';
import { Flacon, contactShadow, emitSpray, presentAngle, toViewport } from './flacon';
import { CreamJar, Lipstick, OilPump } from './products';

const fire = (name: string, detail: object) => window.dispatchEvent(new CustomEvent(name, { detail }));

/* ── four products, modelled and lit for real ──
   The active object follows the chapter, rotation follows scroll, and the
   lipstick bullet takes whichever shade the Colour chapter is on. The
   fragrance is the full working flacon: press it and it sprays.            */

export type RangeApi = {
  show(i: number): void;
  shade(hex: string, name: string): void;
  engrave(text: string): void;
  /** press whichever product is on show (queued if a chapter is mid-change) */
  act(): void;
  /** the chapter the scene is on, or heading to */
  chapter(): number;
  hits(e: MouseEvent): boolean;
  capped(): boolean;
  draw(): void;
  dispose(): void;
};

export function mountRangeScene(host: HTMLElement, sec: HTMLElement): RangeApi | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.15, 9.2);

  /* A studio with structure — a horizon, a floor bounce and two softboxes.
     Glass only looks like glass if there is something worth reflecting. */
  function studio() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const x = c.getContext('2d')!;
    const sky = x.createLinearGradient(0, 0, 0, 300);
    sky.addColorStop(0, '#3A2C1E'); sky.addColorStop(1, '#0E0906');
    x.fillStyle = sky; x.fillRect(0, 0, 1024, 300);
    const flr = x.createLinearGradient(0, 300, 0, 512);
    flr.addColorStop(0, '#241A12'); flr.addColorStop(1, '#070504');
    x.fillStyle = flr; x.fillRect(0, 300, 1024, 212);
    x.fillStyle = 'rgba(255,238,214,.16)'; x.fillRect(0, 297, 1024, 5);
    const box = (cx: number, cy: number, w: number, h: number, a: number) => {
      const g2 = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
      g2.addColorStop(0, 'rgba(255,248,236,' + a + ')');
      g2.addColorStop(.55, 'rgba(255,244,226,' + (a * .32).toFixed(3) + ')');
      g2.addColorStop(1, 'rgba(255,244,226,0)');
      x.fillStyle = g2; x.fillRect(cx - w, cy - h, w * 2, h * 2);
    };
    // hard-edged strip boxes give the glass its long vertical highlights
    x.fillStyle = 'rgba(255,246,230,.95)'; x.fillRect(150, 40, 46, 230); x.fillRect(860, 60, 34, 200);
    box(200, 110, 150, 250, 1);
    box(840, 130, 120, 210, .9);
    box(512, 430, 460, 110, .3);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studioTex = studio();
  const envTex = pmrem.fromEquirectangular(studioTex).texture;
  scene.environment = envTex;

  /* each chapter's object, all of them working */
  const flacon = new Flacon({ envIntensity: 1.5, edge: 0xFFE6C4, edgeAmount: 0.42, foot: 0xE8D6BC });
  const jar = new CreamJar(1.5);
  const lipstick = new Lipstick(1.5);
  const pump = new OilPump(1.5);
  let shadeHex = '#C98F7A', shadeName = 'Nu';

  const at = (o: THREE.Object3D) => toViewport(o, camera, renderer.domElement);
  flacon.onSpray = () => { const p = at(flacon.nozzle); emitSpray(p.x, p.y, 1); };
  lipstick.onFire = () => { const p = at(lipstick.emitter); fire('fx:lipstick', { x: p.x, y: p.y, color: shadeHex, name: shadeName }); };
  pump.onFire = () => { const p = at(pump.emitter); fire('fx:oil', { x: p.x, y: p.y }); };

  type Item = { obj: { group: THREE.Group; focus: number; capped: boolean; trigger(): void; recap(): void; update(dt: number): void; dispose(): void };
    front: number; offset: number; fit: number; y: number };
  const items: Item[] = [
    { obj: flacon, front: 0.14, offset: 0, fit: 1, y: 0 },
    { obj: jar, front: 0, offset: 0, fit: 1.05, y: 0.2 },
    { obj: lipstick, front: 0, offset: -0.5, fit: 1.0, y: 0 },
    { obj: pump, front: 0.1, offset: 0, fit: 1, y: 0 }
  ];
  const groups = items.map(it => { const g = new THREE.Group(); g.add(it.obj.group); return g; });
  groups.forEach(g => { g.visible = false; scene.add(g); });
  groups[0].visible = true;

  const shadow = contactShadow(2.0, 0.52);
  shadow.position.set(0, -1.86, -0.2);
  scene.add(shadow);

  scene.add(new THREE.AmbientLight(0xffe9cf, 0.09));
  const key = new THREE.DirectionalLight(0xfff4e4, 1.1); key.position.set(-4, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc98a, 1.6); rim.position.set(5, 1.5, -4); scene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 0.5); top.position.set(0, 8, 1); scene.add(top);

  let cur = 0, spin = 0, shown = 0, ease = 1, queued = false;

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const progress = () => {
    const total = sec.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, -sec.getBoundingClientRect().top / total));
  };

  /* the bottle itself is the obvious thing to press */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const overObject = (e: PointerEvent | MouseEvent) => {
    if (ease < 1) return false;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(items[shown].obj.group, true).length > 0;
  };
  const onMove = (e: PointerEvent) => { renderer.domElement.style.cursor = overObject(e) ? 'pointer' : ''; };
  renderer.domElement.addEventListener('pointermove', onMove);

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, last = performance.now();

  function tick(step: boolean) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const p = progress();
    if (step && !calm) spin += 0.0026;
    const rot = p * Math.PI * 2.0 + spin + Math.sin(spin * 1.7) * 0.16 + 0.5;

    if (ease < 1) {
      ease = Math.min(1, ease + (step ? 0.055 : 0.5));
      if (ease > 0.5 && shown !== cur) {
        groups[shown].visible = false; shown = cur; groups[shown].visible = true;
        items.forEach((it, n) => { if (n !== shown) it.obj.recap(); });
      }
    }
    // a press that arrived mid-transition goes to the product that is arriving
    if (queued && ease >= 1) { queued = false; items[shown].obj.trigger(); }
    items.forEach(it => it.obj.update(step ? dt : 0.25));

    const k = ease < 1 ? Math.abs(ease - 0.5) * 2 : 1;
    const it = items[shown], g = groups[shown], f = it.obj.focus;
    const kick = it.obj.group.userData.kick || 0;
    g.rotation.y = presentAngle(rot, f, it.front) + it.offset;
    g.rotation.x = Math.sin(spin * 0.9) * 0.05 * (1 - f);
    g.rotation.z = Math.sin(spin * 0.6) * 0.018 - kick * 0.015 * f;
    const sc = (0.72 + 0.28 * k) * it.fit * (1 - f * 0.08);
    g.scale.set(sc, sc, sc);
    g.position.y = -0.1 + it.y + (1 - k) * 0.5 + Math.sin(spin * 1.15) * 0.045 - f * 0.12;
    renderer.render(scene, camera);
  }
  function frame() { raf = requestAnimationFrame(frame); tick(true); }
  const play = (on: boolean) => {
    if (on && !raf) { last = performance.now(); frame(); }
    if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  const io = new IntersectionObserver(([e]) => play(e.isIntersecting), { threshold: 0 });
  io.observe(sec);
  const onScroll = () => { if (!raf) tick(false); };
  window.addEventListener('scroll', onScroll, { passive: true });
  tick(false);

  const api: RangeApi = {
    show(i) { if (i !== cur) { cur = i; ease = 0; queued = false; } },
    shade(hex, name) { shadeHex = hex; shadeName = name; lipstick.bulletMat.color.set(hex); },
    engrave(text) { flacon.engrave(text); },
    act() {
      if (calm) return;
      if (ease >= 1 && shown === cur) items[shown].obj.trigger();
      else { queued = true; if (!raf) tick(false); }
    },
    chapter: () => cur,
    hits: overObject,
    capped: () => items[shown].obj.capped,
    draw() { tick(false); },
    dispose() {
      cancelAnimationFrame(raf); raf = 0;
      io.disconnect(); ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      renderer.domElement.removeEventListener('pointermove', onMove);
      items.forEach(it => it.obj.dispose());
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | undefined;
        if (mat && !Array.isArray(mat)) mat.dispose();
      });
      studioTex.dispose(); envTex.dispose(); pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
  return api;
}
