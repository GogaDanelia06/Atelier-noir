'use client';

import { useEffect, useRef } from 'react';
import { WetScreen } from '@/lib/wetScreen';
import { LipstickFx } from '@/lib/fx/lipstick';
import { OilFx } from '@/lib/fx/oil';

type Detail = { x: number; y: number; power?: number; color?: string; name?: string };

/* The screen as a pane of glass: products leave something on it. It belongs
   to the moment, so the moment you scroll away it is wiped.              */
export function ScreenFx() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const wetRef = useRef<HTMLCanvasElement>(null);
  const lipRef = useRef<HTMLCanvasElement>(null);
  const oilRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const wet = new WetScreen(wetRef.current!);
    const lip = new LipstickFx(lipRef.current!);
    const oil = new OilFx(oilRef.current!);
    const all = [wet, lip, oil];

    let anchor: number | null = null;          // scroll position when the glass got wet
    let wipeTimer: ReturnType<typeof setTimeout> | null = null;
    const touched = () => {
      anchor = scrollY;
      if (wipeTimer) { clearTimeout(wipeTimer); wipeTimer = null; }
      wrap.classList.remove('gone');
    };

    const on = (name: string, fn: (d: Detail) => void) => {
      const h = (e: Event) => { touched(); fn((e as CustomEvent<Detail>).detail); };
      addEventListener(name, h);
      return () => removeEventListener(name, h);
    };
    const offs = [
      on('flacon:spray', d => wet.spray(d.x, d.y, d.power ?? 1)),
      on('fx:lipstick', d => lip.write(d.x, d.y, d.color ?? '#C98F7A', d.name ?? 'Nu')),
      on('fx:oil', d => oil.pump(d.x, d.y))
    ];

    // a small scroll is forgiven; anything more fades the glass and clears it
    const onScroll = () => {
      if (anchor === null || Math.abs(scrollY - anchor) < 24) return;
      anchor = null;
      wrap.classList.add('gone');
      wipeTimer = setTimeout(() => {
        // resizing resets the bitmap, so the glass is clean even between frames
        all.forEach(f => { f.clear(); f.resize(); });
        wrap.classList.remove('gone');
        wipeTimer = null;
      }, 260);
    };
    addEventListener('scroll', onScroll, { passive: true });

    const onResize = () => all.forEach(f => f.resize());
    addEventListener('resize', onResize);
    return () => {
      offs.forEach(f => f());
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      if (wipeTimer) clearTimeout(wipeTimer);
      all.forEach(f => f.dispose());
    };
  }, []);

  return (
    <div className="fx-wrap" ref={wrapRef} aria-hidden="true">
      <canvas ref={oilRef} className="fx" />
      <canvas ref={lipRef} className="fx" />
      <canvas ref={wetRef} className="fx" />
    </div>
  );
}
