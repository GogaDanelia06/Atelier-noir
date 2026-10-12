'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

const CARDS = [
  ['apoth', 'Fragrance', 'Noler No. 07'], ['skin', 'Skin', 'Second Skin'], ['colour', 'Colour', 'Velvet Matte'],
  ['body', 'Body', 'Sandalwood Balm'], ['serum', 'Skin', 'Night Oil No. 03'], ['swatch', 'Colour', 'Cream Blush']
];
const STEP = 360 / CARDS.length;
const SWEEP = 180;

/* a real 3D carousel: scroll sets a base rotation, drag and buttons add an
   offset on top, so the two inputs never cancel each other */
export function Ring() {
  const secRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState(CARDS[0][2]);
  const nudge = useRef<(d: number) => void>(() => {});

  useEffect(() => {
    const sec = secRef.current!, stage = stageRef.current!, ring = ringRef.current!;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let base = 0, user = 0, rot = 0, target = 0, raf = 0, drag = false, lastX = 0, shown = -1;
    const apply = () => {
      ring.style.setProperty('--rot', rot.toFixed(2) + 'deg');
      const i = ((Math.round(-rot / STEP) % CARDS.length) + CARDS.length) % CARDS.length;
      if (i !== shown) { shown = i; setLabel(CARDS[i][2]); }
    };
    const loop = () => {
      rot += (target - rot) * 0.09; apply();
      if (Math.abs(target - rot) > 0.05) raf = requestAnimationFrame(loop);
      else { rot = target; apply(); raf = 0; }
    };
    const commit = () => {
      target = base + user;
      if (calm || document.hidden) { rot = target; apply(); return; }
      if (!raf) raf = requestAnimationFrame(loop);
    };
    nudge.current = d => { user += d; commit(); };
    const down = (e: PointerEvent) => {
      drag = true; lastX = e.clientX; stage.setPointerCapture(e.pointerId);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      user += (e.clientX - lastX) * 0.38; lastX = e.clientX;
      rot = target = base + user; apply();
    };
    const up = () => { if (!drag) return; drag = false; user = Math.round(user / STEP) * STEP; commit(); };
    const onScroll = () => {
      const r = sec.getBoundingClientRect();
      const p = (innerHeight / 2 - (r.top + r.height / 2)) / (innerHeight / 2 + r.height / 2);
      base = Math.max(-1, Math.min(1, p)) * SWEEP;
      if (!drag) commit();
    };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll(); rot = target; apply();
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointerdown', down); stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up); stage.removeEventListener('pointercancel', up);
      removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section className="ring-sec" id="ring" ref={secRef}>
      <div className="wrap">
        <div className="head rise">
          <div className="rule" />
          <p className="kick">The Coffret</p>
          <h2>Turn the range.</h2>
          <p>Six pieces across the four disciplines. Drag the carousel, or let it turn as you scroll.</p>
        </div>
      </div>
      <div className="ring-stage" ref={stageRef}>
        <div className="ring" ref={ringRef}>
          {CARDS.map(([img, kind, name], k) => (
            <div key={name} className="ring-card" style={{ ['--i' as string]: k, backgroundImage: `var(--img-${img})` }}><i>{kind}</i><b>{name}</b></div>
          ))}
        </div>
        <div className="ring-floor" />
      </div>
      <div className="ring-ui">
        <button aria-label="Previous product" onClick={() => nudge.current(STEP)}><Icon name="prev" /></button>
        <span className="lab">{label}</span>
        <button aria-label="Next product" onClick={() => nudge.current(-STEP)}><Icon name="next" /></button>
      </div>
      <p className="ring-hint">Drag to turn · six pieces</p>
    </section>
  );
}
