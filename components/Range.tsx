'use client';

import { useEffect, useRef, useState } from 'react';
import { mountRangeScene, type RangeApi } from '@/lib/rangeScene';
import { Icon } from './Icon';

/* Colour runs through the range's third quarter; scrolling that stretch walks
   the bullet through the six shades. */
const COLOUR_CH = 2;
const SHADES: [string, string][] = [
  ['Nu', '#C98F7A'], ['Rose Cendré', '#C4756E'], ['Brique', '#A6432F'],
  ['Grenat', '#7E2A28'], ['Cacao', '#6E4130'], ['Corail', '#D2705A']
];
const FIGS = ['wood', 'silk', 'swatch', 'body'];
const OBJS = [
  ['ofrag', 'Noler No. 07 Eau de Parfum'], ['ocream', 'Second Skin cream'],
  ['olip', 'Velvet Matte lipstick'], ['obody', 'Sandalwood body oil']
];
const MIST = ['Bergamot · Pink pepper · Saffron', 'Turkish rose · Assam oud · Jasmine', 'Sandalwood · Amber · Vanilla · Musk'];
const TABS = ['Fragrance', 'Skin', 'Colour', 'Body'];

export function Range() {
  const secRef = useRef<HTMLElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const objRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<RangeApi | null>(null);
  const [at, setAt] = useState(0);
  const atRef = useRef(0);
  const [shade, setShade] = useState(0);
  const [gl, setGl] = useState(false);
  const [mistOn, setMistOn] = useState(-1);
  const mistTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* 3D objects */
  useEffect(() => {
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
    } catch { return; }
    const a = mountRangeScene(glRef.current!, secRef.current!);
    if (!a) return;
    api.current = a;
    setGl(true);
    return () => { a.dispose(); api.current = null; };
  }, []);

  /* scroll steps through the four disciplines */
  useEffect(() => {
    const section = secRef.current!, art = artRef.current!, bar = barRef.current!;
    let last = -1, lastShade = -1;
    const sync = () => {
      const total = section.offsetHeight - innerHeight;
      const p = total <= 0 ? 0 : Math.max(0, Math.min(1, -section.getBoundingClientRect().top / total));
      art.style.setProperty('--z', (1 + p * 0.11).toFixed(4));
      bar.style.width = (p * 100).toFixed(1) + '%';
      const i = Math.min(FIGS.length - 1, Math.floor(p * FIGS.length + 0.0001));
      if (i === COLOUR_CH) {
        const sub = Math.max(0, Math.min(0.9999, p * FIGS.length - COLOUR_CH));
        const k = Math.floor(sub * SHADES.length);
        if (k !== lastShade) {
          lastShade = k;
          setShade(k);
          objRef.current?.style.setProperty('--shade', SHADES[k][1]);
          api.current?.shade(SHADES[k][1], SHADES[k][0]);
        }
      }
      if (i !== last) { last = i; atRef.current = i; setAt(i); api.current?.show(i); }
    };
    addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
    return () => { removeEventListener('scroll', sync); removeEventListener('resize', sync); };
  }, []);

  /* light motes, perspective-projected */
  useEffect(() => {
    const cv = dustRef.current!;
    const host = cv.parentElement!;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { cv.style.display = 'none'; return; }
    const ctx = cv.getContext('2d')!;
    const N = 70, F = 620;
    let W = 0, H = 0, raf = 0;
    type M = { x: number; y: number; z: number; r: number; s: number };
    let motes: M[] = [];
    const spawn = (): M => ({ x: (Math.random() - .5) * 1400, y: (Math.random() - .5) * 900, z: 120 + Math.random() * 900, r: .6 + Math.random() * 2.2, s: .25 + Math.random() * .85 });
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const frame = () => {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, W, H);
      const cx = W * .58, cy = H * .5;
      for (const m of motes) {
        m.z -= m.s;
        if (m.z < 60) { Object.assign(m, spawn()); m.z = 900 + Math.random() * 120; }
        const k = F / m.z, x = cx + m.x * k, y = cy + m.y * k;
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        const rad = Math.max(.3, m.r * k * 2.4);
        const a = Math.min(.5, (1 - m.z / 1020) * .5);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 3);
        g.addColorStop(0, 'rgba(255,226,170,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,226,170,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 3, 0, 6.2832); ctx.fill();
      }
    };
    const ro = new ResizeObserver(size); ro.observe(host); size();
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !raf) { if (!motes.length) motes = Array.from({ length: N }, spawn); frame(); }
      if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0 });
    io.observe(host);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  /* press whatever is on show; the atomiser also lets the note pyramid
     surface in the mist, top → heart → base */
  const spray = () => {
    const ch = api.current ? api.current.chapter() : atRef.current;
    if (ch !== 0) { api.current?.act(); return; }
    mistTimers.current.forEach(clearTimeout);
    mistTimers.current = [];
    setMistOn(-1);
    // the cap has to come off first, so the notes wait for it
    const lead = api.current && !api.current.capped() ? 160 : 1250;
    api.current?.act();
    [0, 1280, 2560].forEach((t, k) => {
      mistTimers.current.push(setTimeout(() => setMistOn(k), lead + t));
      mistTimers.current.push(setTimeout(() => setMistOn(n => (n === k ? -1 : n)), lead + t + 1120));
    });
  };
  useEffect(() => {
    // the bottle itself is the obvious thing to press
    const onSpray = (e: MouseEvent) => { if (api.current?.hits(e)) spray(); };
    const el = glRef.current!;
    el.addEventListener('click', onSpray);
    return () => { el.removeEventListener('click', onSpray); mistTimers.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = (i: number) => {
    const s = secRef.current!;
    const total = s.offsetHeight - innerHeight;
    scrollTo({ top: s.offsetTop + total * ((i + 0.5) / FIGS.length), behavior: 'smooth' });
  };
  const jumpShade = (k: number) => {
    const s = secRef.current!;
    const total = s.offsetHeight - innerHeight;
    scrollTo({ top: s.offsetTop + total * ((COLOUR_CH + (k + 0.5) / SHADES.length) / 4), behavior: 'smooth' });
  };

  return (
    <section className="range" id="range" ref={secRef}>
      <div className="range-track">
        <div className="range-art" ref={artRef}>
          {FIGS.map((f, k) => <figure key={f} className={'bgimg' + (k === at ? ' on' : '')} aria-hidden="true" style={{ backgroundImage: `var(--img-${f})` }} />)}
          <div className="range-veil" />
          <canvas className="dust" ref={dustRef} aria-hidden="true" />

          <div className={'range-obj' + (gl ? ' gl' : '')} ref={objRef}>
            {OBJS.map(([img, label], k) => (
              <div key={img} className={'ro' + (k === 2 ? ' ro-colour' : '') + (k === at ? ' on' : '')} role="img" aria-label={label} style={{ backgroundImage: `var(--img-${img})` }}>
                {k === 2 && <span className="tint" />}
              </div>
            ))}
            <div className="robj" ref={glRef} aria-hidden="true" />
          </div>
        </div>

        <div className="range-copy">
          <p className="kick">Four disciplines</p>
          <div className="range-deck">
            <article className={'rc' + (at === 0 ? ' on' : '')}>
              <em>01 — Fragrance</em>
              <h3>Fragrance</h3>
              <p>Six compositions, macerated eighteen months and bottled at parfum strength. Etched to order before filling.</p>
              <div className="engrave">
                <label htmlFor="engText">Engraving <span>— up to 20 characters</span></label>
                <input id="engText" type="text" maxLength={20} placeholder="Your initials" autoComplete="off" spellCheck={false}
                  aria-describedby="engNote" onChange={e => { api.current?.engrave(e.target.value); api.current?.draw(); }} />
                <p className="eng-note" id="engNote">Sandblasted into the glass · complimentary</p>
              </div>
              <button className="spray" type="button" onClick={spray}>
                <Icon name="spray" />
                Press to spray
              </button>
            </article>
            <article className={'rc' + (at === 1 ? ' on' : '')}>
              <em>02 — Skin</em>
              <h3>Skin</h3>
              <p>Barrier-led, fragrance-optional. A whipped cream that melts on contact, in a jar heavy enough to keep on the shelf.</p>
              <span className="meta"><b>Nine</b><span>Products</span></span>
              <button className="spray" type="button" onClick={spray}><Icon name="jar" />Open the jar</button>
            </article>
            <article className={'rc' + (at === 2 ? ' on' : '')}>
              <em>03 — Colour</em>
              <h3>Colour</h3>
              <p>Shades chosen by skin harmony rather than by season. Scroll to change the shade, then take it to the glass.</p>
              <div className="shades">
                <span className="sname">{SHADES[shade][0]}</span>
                <div className="sw">
                  {SHADES.map(([name, hex], k) => (
                    <button key={name} type="button" aria-label={name} className={k === shade ? 'on' : undefined} style={{ background: hex }} onClick={() => jumpShade(k)} />
                  ))}
                </div>
              </div>
              <button className="spray" type="button" onClick={spray}><Icon name="lip" />Swivel &amp; write</button>
            </article>
            <article className={'rc' + (at === 3 ? ' on' : '')}>
              <em>04 — Body</em>
              <h3>Body</h3>
              <p>Oils and balms carrying the parfums&apos; accords at a tenth of the strength. Unlock the pump and press — it is heavier than you think.</p>
              <span className="meta"><b>Four</b><span>Formulas</span></span>
              <button className="spray" type="button" onClick={spray}><Icon name="pump" />Unlock &amp; pump</button>
            </article>
          </div>
        </div>

        <nav className="range-nav">
          {TABS.map((t, k) => <button key={t} className={k === at ? 'on' : undefined} onClick={() => jump(k)}>{t}</button>)}
        </nav>
        <div className="mist" aria-hidden="true">
          {MIST.map((m, k) => <span key={m} className={k === mistOn ? 'on' : undefined}>{m}</span>)}
        </div>
        <div className="range-rail"><span ref={barRef} /></div>
      </div>
    </section>
  );
}
