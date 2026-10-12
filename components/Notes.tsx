'use client';

import { useEffect, useRef, useState } from 'react';
import { mountAccord } from '@/lib/accordScene';

const TIERS = [['Top', 'Bergamot, pink pepper, saffron'], ['Heart', 'Turkish rose, Assam oud, jasmine'], ['Base', 'Sandalwood, amber, vanilla, musk']];

export function Notes() {
  const hostRef = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof mountAccord>>(null);
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
    } catch { return; }
    const skin = document.querySelector<HTMLImageElement>('#ba img.after');
    scene.current = mountAccord(hostRef.current!, skin, setLit);
    return () => { scene.current?.dispose(); scene.current = null; };
  }, []);

  const light = (i: number) => { setLit(i); scene.current?.light(i); };

  return (
    <section className="split" id="notes">
      <div className="art rise accord" ref={hostRef}>
        <p className="cap">A drop of No. 07 · Top · Heart · Base</p>
      </div>
      <div className="txt rise d1">
        <p className="kick">No. 07 · The Pyramid</p>
        <h2>How it moves<br />across an evening.</h2>
        <p>A fragrance is a sequence, not a smell. No. 07 opens bright and closes dense — the whole arc takes about nine hours.</p>
        <ul className={'notes' + (lit >= 0 ? ' picked' : '')} onPointerLeave={() => light(-1)}>
          {TIERS.map(([b, s], i) => (
            <li key={b} tabIndex={0} className={i === lit ? 'lit' : undefined} onPointerEnter={() => light(i)} onFocus={() => light(i)}>
              <b>{b}</b><span>{s}</span>
            </li>
          ))}
        </ul>
        <a href="#collection" className="btn btn-k"><span>Shop No. 07 — £185</span></a>
      </div>
    </section>
  );
}
