import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Flacon, contactShadow, emitSpray, presentAngle, toViewport } from './flacon';

/* ── hero flacon ──
   The light stage of the hero, now a real object. It idles on a slow sway and
   leans toward the pointer; press it and it uncaps and sprays at the viewer. */
export function mountHeroFlacon(host: HTMLElement, opts: { onState?: (open: boolean) => void } = {}) {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0.25, 10.4);
  camera.lookAt(0, 0.1, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  scene.environment = envTex;

  const flacon = new Flacon({ envIntensity: 1 });
  scene.add(flacon.group);

  const shadow = contactShadow(2.6, 0.62);
  shadow.position.set(0, -1.9, -0.25);
  scene.add(shadow);

  scene.add(new THREE.AmbientLight(0xfff3e4, 0.35));
  const key = new THREE.DirectionalLight(0xfff4e4, 1.4); key.position.set(-4, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9a8, 1.6); rim.position.set(5, 2, -4); scene.add(rim);

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  flacon.onSpray = () => {
    const p = toViewport(flacon.nozzle, camera, renderer.domElement);
    emitSpray(p.x, p.y, 1);
  };

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole object, with the lifted cap, inside narrow frames
    const fitH = 5.2, fitW = 3.4;
    const vH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = Math.max(fitH / vH, fitW / (vH * camera.aspect)) + 0.6;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  /* pointer: lean toward it, and know when it is over the glass */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let px = 0, py = 0, lx = 0, ly = 0, hovering = false;
  const hit = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(flacon.group, true).length > 0;
  };
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width - 0.5;
    py = (e.clientY - r.top) / r.height - 0.5;
    hovering = hit(e);
    renderer.domElement.style.cursor = hovering ? 'pointer' : '';
  };
  const onLeave = () => { px = py = 0; hovering = false; };
  const onClick = (e: PointerEvent) => { if (hit(e)) { flacon.trigger(); } };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', onLeave);
  renderer.domElement.addEventListener('click', onClick as EventListener);

  let t = 0, raf = 0, last = performance.now(), hoverK = 0, wasOpen = false;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!calm) t += dt;
    flacon.update(dt);
    if (flacon.busy !== wasOpen) { wasOpen = flacon.busy; opts.onState?.(wasOpen); }

    lx += (px - lx) * 0.06; ly += (py - ly) * 0.06;
    hoverK += ((hovering ? 1 : 0) - hoverK) * 0.1;

    const sway = Math.sin(t * 0.45) * 0.42 + 0.3 + lx * 0.6;
    const g = flacon.group;
    g.rotation.y = presentAngle(sway, flacon.focus, 0.12);
    g.rotation.x = (Math.sin(t * 0.7) * 0.03 + ly * 0.12) * (1 - flacon.focus * 0.6);
    g.rotation.z = Math.sin(t * 0.5) * 0.012 - (g.userData.kick || 0) * 0.012;
    g.position.y = Math.sin(t * 1.1) * 0.035 + hoverK * 0.05 - (g.userData.kick || 0) * 0.02;
    const s = 1 + hoverK * 0.015;
    g.scale.set(s, s, s);
    shadow.material.opacity = 1 - hoverK * 0.15;

    renderer.render(scene, camera);
  }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0 });
  io.observe(host);

  return {
    trigger: () => flacon.trigger(),
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('click', onClick as EventListener);
      flacon.dispose(); envTex.dispose(); pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
