'use client';

import { useEffect } from 'react';

/* reveal on scroll, plus pointer-tilt on the collection tiles */
export function Reveals() {
  useEffect(() => {
    const items = [...document.querySelectorAll<HTMLElement>('.rise')];
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) { items.forEach(n => n.classList.add('in')); return; }
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(n => io.observe(n));
    // backstop: anything on screen gets revealed even if the observer never reports
    const sweep = () => items.forEach(n => {
      if (n.classList.contains('in')) return;
      const r = n.getBoundingClientRect();
      if (r.top < innerHeight * 1.05 && r.bottom > -80) { n.classList.add('in'); io.unobserve(n); }
    });
    addEventListener('scroll', sweep, { passive: true });
    const t = setTimeout(sweep, 2200);

    const offs: (() => void)[] = [];
    if (matchMedia('(hover: hover)').matches) {
      document.querySelectorAll<HTMLElement>('.tile').forEach(card => {
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
          card.style.transform = `translateY(-5px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
        };
        const leave = () => { card.style.transform = ''; };
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        offs.push(() => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); });
      });
    }
    return () => { io.disconnect(); removeEventListener('scroll', sweep); clearTimeout(t); offs.forEach(f => f()); };
  }, []);
  return null;
}
