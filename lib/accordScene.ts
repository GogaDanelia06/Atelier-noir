import * as THREE from 'three';

/* ── a drop of the concentrate, landing and absorbing ──
   A looping beauty shot: the droplet falls, flattens on impact, spreads,
   throws two rings, and sinks away. Hovering a tier tints the oil.        */

const TINT = [0xE09A2E, 0xB84A32, 0x8F4409];      // top · heart · base

export function mountAccord(host: HTMLElement, skinImg: HTMLImageElement | null, onCycle: (i: number) => void) {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 1.3, 3.7);
  camera.lookAt(0, 0.3, 0);

  const pm = new THREE.PMREMGenerator(renderer);
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#5A452E'); g.addColorStop(.5, '#241A12'); g.addColorStop(1, '#0A0705');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    const box = (cx: number, cy: number, r: number, a: number) => {
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, 'rgba(255,247,233,' + a + ')');
      rg.addColorStop(1, 'rgba(255,247,233,0)');
      x.fillStyle = rg; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    };
    box(240, 120, 240, 1); box(800, 150, 190, .85); box(512, 430, 380, .3);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    scene.environment = pm.fromEquirectangular(t).texture;
  }

  function softDisc(inner: number, outer: number) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,' + inner + ')');
    g.addColorStop(.62, 'rgba(255,255,255,' + (inner * .8) + ')');
    g.addColorStop(.9, 'rgba(255,255,255,' + outer + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(128, 128, 127, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(c);
  }
  function ringTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(.72, 'rgba(255,255,255,0)');
    g.addColorStop(.86, 'rgba(255,255,255,.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(128, 128, 127, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(c);
  }

  const oilCol = new THREE.Color(TINT[2]);

  /* real skin: the day-28 macro from the before/after section */
  let skin: THREE.Texture | null = null;
  if (skinImg) {
    skin = new THREE.Texture(skinImg);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.wrapS = skin.wrapT = THREE.MirroredRepeatWrapping;
    skin.repeat.set(2.4, 2.4);
    if (skinImg.complete && skinImg.naturalWidth) skin.needsUpdate = true;
    else skinImg.addEventListener('load', () => { if (skin) skin.needsUpdate = true; }, { once: true });
  }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({
      map: skin, color: skin ? 0x9A7658 : 0x2A1C12,
      bumpMap: skin, bumpScale: skin ? 0.045 : 0,
      roughness: .58, metalness: 0, envMapIntensity: .12
    })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* pooled light: transparent at the centre, dark at the rim */
  {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(256, 232, 30, 256, 232, 262);
    g.addColorStop(0, 'rgba(6,4,3,0)');
    g.addColorStop(.42, 'rgba(6,4,3,.34)');
    g.addColorStop(.78, 'rgba(6,4,3,.82)');
    g.addColorStop(1, 'rgba(6,4,3,.97)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c);
    const K = 20 / 8.4;
    t.repeat.set(K, K);
    t.offset.set(-(K - 1) / 2, -(K - 1) / 2);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    v.rotation.x = -Math.PI / 2; v.position.y = .004;
    scene.add(v);
  }

  const oilMat = new THREE.MeshPhysicalMaterial({
    color: oilCol, roughness: .1, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.1
  });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), oilMat);
  scene.add(drop);

  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: oilCol, roughness: .34, metalness: 0, transparent: true,
      opacity: 0, alphaMap: softDisc(1, .25), envMapIntensity: .3, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = .012;
  scene.add(pool);

  const damp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x1A120B, transparent: true, opacity: 0, map: softDisc(.85, .1), depthWrite: false }));
  damp.rotation.x = -Math.PI / 2; damp.position.y = .006;
  scene.add(damp);

  const rt = ringTex();
  const rings = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: 0, depthWrite: false,
        color: 0xF6D9A4, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.y = .02;
    scene.add(m);
    return m;
  });

  scene.add(new THREE.AmbientLight(0xffe9cf, .3));
  const key = new THREE.DirectionalLight(0xfff4e4, 1.6); key.position.set(-2.4, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc98a, 1.0); rim.position.set(3, 1.6, -2.6); scene.add(rim);

  let lit = -1, cycle = 0;
  const target = new THREE.Color(TINT[2]);
  const light = (i: number) => { lit = i; target.set(TINT[i < 0 ? 2 : i]); };

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CYCLE = 5200;
  const ease = (x: number) => x * x * (3 - 2 * x);
  let t0 = performance.now(), raf = 0;

  function tick() {
    let u = ((performance.now() - t0) % CYCLE) / CYCLE;
    if (calm) u = 0.55;
    oilCol.lerp(target, .06);
    oilMat.color.copy(oilCol);
    oilMat.emissive.copy(oilCol).multiplyScalar(.10);
    pool.material.color.copy(oilCol);

    if (u < .30) {
      const k = ease(u / .30);
      drop.visible = true;
      drop.position.y = 1.9 - k * 1.42;
      const stretch = 1 + k * .3;
      drop.scale.set(.5 / Math.sqrt(stretch), .5 * stretch, .5 / Math.sqrt(stretch));
      pool.material.opacity = 0; damp.material.opacity = 0;
      rings.forEach(r => r.material.opacity = 0);
    } else if (u < .40) {
      const k = (u - .30) / .10;
      drop.visible = true;
      drop.position.y = .48 - k * .34;
      drop.scale.set(.5 * (1 + k * .8), .5 * (1 - k * .7), .5 * (1 + k * .8));
      const r = .5 + k * .62;
      pool.scale.set(r, r, 1);
      pool.material.opacity = k * .95;
    } else {
      const k = (u - .40) / .60;
      drop.visible = false;
      const r = 1.12 + ease(Math.min(1, k * 1.5)) * .86;
      pool.scale.set(r, r, 1);
      pool.material.opacity = .95 * (1 - ease(Math.min(1, Math.max(0, (k - .18) / .82))));
      damp.scale.set(r * .96, r * .96, 1);
      damp.material.opacity = .5 * Math.sin(Math.min(1, k * 1.2) * Math.PI);
      rings.forEach((ring, i) => {
        const rk = Math.min(1, Math.max(0, k * 1.5 - i * .22));
        const rr = .85 + rk * 2.6;
        ring.scale.set(rr, rr, 1);
        ring.material.opacity = .34 * Math.sin(rk * Math.PI) * (1 - i * .35);
      });
    }

    // with no pointer, walk the tiers so the pyramid still explains itself
    if (!calm) {
      cycle += 1;
      if (cycle > 200) { cycle = 1; const n = lit < 0 ? 0 : (lit + 1) % 3; light(n); onCycle(n); }
    }
    renderer.render(scene, camera);
  }
  function frame() { raf = requestAnimationFrame(frame); tick(); }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { t0 = performance.now(); frame(); }
    if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0 });
  io.observe(host);
  tick();

  return {
    light(i: number) { light(i); cycle = 0; },
    dispose() {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      skin?.dispose();
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}
