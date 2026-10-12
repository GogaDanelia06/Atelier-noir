'use client';

import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

/* eased follow, and a sweep the first time it is seen */
export function BeforeAfter() {
  const baRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ba = baRef.current!, range = rangeRef.current!;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let target = 50, shown = 50, raf = 0, dragging = false;
    const apply = (v: number) => {
      ba.style.setProperty('--split', v.toFixed(2) + '%');
      if (Math.abs(+range.value - v) > 0.5) range.value = String(v);
    };
    const loop = () => {
      shown += (target - shown) * (dragging ? 0.35 : 0.09);
      apply(shown);
      if (Math.abs(target - shown) > 0.05) raf = requestAnimationFrame(loop);
      else { apply(target); raf = 0; }
    };
    const set = (v: number) => {
      target = Math.max(0, Math.min(100, v));
      if (calm || document.hidden) { shown = target; apply(target); return; }
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const fromX = (x: number) => { const r = ba.getBoundingClientRect(); set(((x - r.left) / r.width) * 100); };
    const down = (e: PointerEvent) => { dragging = true; ba.setPointerCapture(e.pointerId); fromX(e.clientX); };
    const move = (e: PointerEvent) => { if (dragging) fromX(e.clientX); };
    const stop = () => { dragging = false; };
    const input = () => { dragging = true; set(+range.value); dragging = false; };
    ba.addEventListener('pointerdown', down);
    ba.addEventListener('pointermove', move);
    ba.addEventListener('pointerup', stop);
    ba.addEventListener('pointercancel', stop);
    range.addEventListener('input', input);

    let io: IntersectionObserver | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!calm) {
      shown = target = 88; apply(88);
      let played = false;
      const play = () => {
        if (played) return;
        played = true;
        timers.push(setTimeout(() => set(22), 260), setTimeout(() => set(50), 1500));
      };
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io?.disconnect(); play(); } }, { threshold: 0.35 });
      io.observe(ba);
    } else apply(50);

    return () => {
      cancelAnimationFrame(raf); io?.disconnect(); timers.forEach(clearTimeout);
      ba.removeEventListener('pointerdown', down); ba.removeEventListener('pointermove', move);
      ba.removeEventListener('pointerup', stop); ba.removeEventListener('pointercancel', stop);
      range.removeEventListener('input', input);
    };
  }, []);

  return (
    <section className="sec" id="results">
      <div className="wrap">
        <div className="head rise">
          <div className="rule" />
          <p className="kick">L&apos;Huile No. 07 · Four weeks</p>
          <h2>Two photos,<br />one ritual.</h2>
          <p>The same cheek at day 0 and day 28 of the body oil. Macro, 100mm, identical lighting — drag the handle to compare.</p>
        </div>
        <div className="ba-grid">
          <div className="ba rise" id="ba" ref={baRef} style={{ ['--split' as string]: '50%' }}>
            <img className="before" src="/img/before.jpg" alt="Cheek at day 0" />
            <img className="after" src="/img/after.jpg" alt="Cheek at day 28" />
            <span className="tag l">Day 0</span>
            <span className="tag r">Day 28</span>
            <div className="line"><div className="knob"><Icon name="split" /></div></div>
            <input ref={rangeRef} type="range" min="0" max="100" defaultValue="50" step="0.1" aria-label="Reveal day 28" />
          </div>
          <aside className="ba-side rise d1">
            <div className="fig"><b>96%</b><span>Reported a calmer barrier</span></div>
            <div className="fig"><b>104</b><span>Participants, unsupervised</span></div>
            <blockquote>“Nothing dramatic in week one. By week four my skin had simply stopped reacting to everything.”</blockquote>
            <cite>Subject 04 · 42 · combination skin</cite>
          </aside>
        </div>
        <p className="ba-note">Illustrative comparison · 100mm macro · replace with study photography before publishing</p>
      </div>
    </section>
  );
}
