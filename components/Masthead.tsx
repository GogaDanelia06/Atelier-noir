'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mountHeroFlacon } from '@/lib/heroScene';
import { FlaconSvg } from './FlaconSvg';
import { Icon } from './Icon';

/* Beat 0 rides stage A; beats 1-4 are chapters of one continuous film, so
   advancing between them never touches playback — only the copy changes. */
const A_MS = 8000;
const CUES = [0, 5, 10, 15];
const FILM_MS = 5000;

const BEATS = [
  { t: 'light', eyebrow: 'Premium', title: <>Noler <em>No. 07</em></>,
    lede: 'The composition that made the maison. Oud from Assam, Turkish rose absolute and a base of aged sandalwood — bottled in small batches, numbered by hand.',
    cta: [['Discover No. 07', '#collection', 'btn-t'], ['Shop Now', '#collection', 'btn-k']] },
  { t: 'dark', eyebrow: 'Discover', title: <>No. 07</>,
    lede: 'Held to the light, the concentrate reads amber. On skin it turns to resin and smoke within the hour, and stays there until morning.',
    cta: [['Discover No. 07', '#collection', 'btn-t']] },
  { t: 'dark', eyebrow: 'The Heart', title: <>Oud &amp; Amber</>,
    lede: 'Eighteen months of maceration in oak. We do not accelerate it, and we do not make more than the cellar allows.',
    cta: [['Read the notes', '#notes', 'btn-t']] },
  { t: 'dark', eyebrow: 'After Dark', title: <>Noir <em>Absolu</em></>,
    lede: 'Leather, saffron and black tobacco. The heaviest thing we make, and the only one we recommend wearing after six.',
    cta: [['Discover No. 09', '#collection', 'btn-t'], ['The Maison', '#house', 'btn-o']] },
  { t: 'dark', eyebrow: 'Gifting', title: <>The Coffret</>,
    lede: 'Four 15ml flacons in a lacquered case, engraved to order. Dispatched within two days, anywhere.',
    cta: [['Shop the coffret', '#collection', 'btn-t']] }
] as const;

const NAV = [
  { label: 'Home', href: '#', on: true },
  { label: 'Fragrance', href: '#range', drop: [['No. 07 Noler', '#notes'], ['No. 09 Noir Absolu', '#collection'], ['No. 12 Rose Oud', '#collection'], ['The Coffret', '#collection']] },
  { label: 'Skin', href: '#results', drop: [['Second Skin Serum', '#results'], ['Night Oil No. 03', '#results'], ["L'Huile Body Oil", '#results'], ['Four-week results', '#results']] },
  { label: 'Colour', href: '#collection' },
  { label: 'Body', href: '#range' },
  { label: 'Maison', href: '#house' },
  { label: 'Journal', href: '#journal', drop: [['The Journal', '#journal'], ['Our Perfumers', '#house'], ['Four Weeks', '#results']] }
];

export function Masthead() {
  const [i, setI] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [glFailed, setGlFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const stageARef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);
  const flacRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iRef = useRef(0);
  const wasOnA = useRef(true);
  const hold = useRef(false);            // hovering, or the flacon is open

  const calm = useRef(false);
  useEffect(() => { calm.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (calm.current || hold.current) return;
    timer.current = setTimeout(() => go(iRef.current + 1), iRef.current === 0 ? A_MS : FILM_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = useCallback((n: number, jumped = false) => {
    const next = (n + BEATS.length) % BEATS.length;
    iRef.current = next;
    setI(next);
    const onA = next === 0;
    const sa = stageARef.current;
    if (onA && sa) { sa.classList.remove('run'); void sa.offsetWidth; sa.classList.add('run'); }   // restart the push-in
    const film = filmRef.current;
    if (!onA && film && (jumped || wasOnA.current)) { try { film.currentTime = CUES[next - 1]; } catch {} }
    wasOnA.current = onA;
    schedule();
  }, [schedule]);

  /* auto-advance, keys, swipe, visibility */
  useEffect(() => {
    const hero = heroRef.current!, film = filmRef.current!;
    schedule();
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') go(iRef.current + 1, true);
      if (e.key === 'ArrowLeft') go(iRef.current - 1, true);
      if (e.key === 'Escape') setDrawer(false);
    };
    const enter = () => { hold.current = true; if (timer.current) clearTimeout(timer.current); };
    const leave = () => { hold.current = false; schedule(); };
    const vis = () => {
      if (document.hidden) { if (timer.current) clearTimeout(timer.current); film.pause(); }
      else { if (!calm.current) film.play().catch(() => {}); schedule(); }
    };
    let x0: number | null = null;
    const ts = (e: TouchEvent) => { x0 = e.touches[0].clientX; };
    const te = (e: TouchEvent) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) go(iRef.current + (dx < 0 ? 1 : -1), true);
      x0 = null;
    };
    addEventListener('keydown', onKey);
    hero.addEventListener('mouseenter', enter);
    hero.addEventListener('mouseleave', leave);
    document.addEventListener('visibilitychange', vis);
    hero.addEventListener('touchstart', ts, { passive: true });
    hero.addEventListener('touchend', te, { passive: true });

    const io = new IntersectionObserver(([e]) => {
      if (calm.current) return;
      if (e.isIntersecting) film.play().catch(() => {}); else film.pause();
    }, { threshold: 0.05 });
    io.observe(hero);
    if (calm.current) film.pause();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      removeEventListener('keydown', onKey);
      hero.removeEventListener('mouseenter', enter);
      hero.removeEventListener('mouseleave', leave);
      document.removeEventListener('visibilitychange', vis);
      hero.removeEventListener('touchstart', ts);
      hero.removeEventListener('touchend', te);
      io.disconnect();
    };
  }, [go, schedule]);

  /* stuck header + top progress */
  useEffect(() => {
    const hero = heroRef.current!, bar = topbarRef.current!;
    const onScroll = () => {
      const r = hero.getBoundingClientRect();
      if (r.height >= 200) setStuck(r.bottom <= 80);
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0).toFixed(2) + '%';
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); };
  }, []);

  /* hero depth: copy and product ride separate planes */
  useEffect(() => {
    const hero = heroRef.current!;
    if (calm.current || !matchMedia('(hover: hover)').matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => {
      cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
      hero.style.setProperty('--mx', cx.toFixed(4));
      hero.style.setProperty('--my', cy.toFixed(4));
      raf = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    const move = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const out = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', out);
    return () => { cancelAnimationFrame(raf); hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', out); };
  }, []);

  /* the flacon — real glass, and it sprays */
  useEffect(() => {
    const host = flacRef.current!;
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { setGlFailed(true); return; }
    } catch { setGlFailed(true); return; }
    const scene = mountHeroFlacon(host, {
      onState: o => {
        setOpen(o);
        hold.current = o;
        if (o) { if (timer.current) clearTimeout(timer.current); } else schedule();
      }
    });
    if (!scene) { setGlFailed(true); return; }
    return () => scene.dispose();
  }, [schedule]);

  useEffect(() => { document.body.style.overflow = drawer ? 'hidden' : ''; }, [drawer]);

  const t = BEATS[i].t;
  const hdrTone = stuck ? 'stuck t-light' : t === 'dark' ? 't-dark' : 't-light';

  return (
    <>
      <div className="topbar" ref={topbarRef} />

      <div className="util">
        <div className="wrap">
          <div className="util-l">
            <span>Premium · Perfumed in Grasse</span>
            <span className="sep" />
            <span>Complimentary engraving on every flacon</span>
          </div>
          <div className="util-r">
            <a href="#"><Icon name="search" />Search</a>
            <a href="#"><Icon name="globe" />Maison Gifts <u>▾</u></a>
            <span className="sep" />
            <a href="#"><Icon name="user" />Sign In <u>▾</u></a>
          </div>
        </div>
      </div>

      <div className="ann">
        <p>Fragrance · Skin · Colour · Body — the No. 07 reissue is here <a href="#collection">Learn more</a></p>
      </div>

      <header className={'hdr ' + hdrTone}>
        <div className="wrap">
          <a href="#" className="mark"><b>GD</b><i>BEAUTY</i></a>
          <div className="nav-wrap">
            <ul className="nav">
              {NAV.map(n => (
                <li key={n.label} className={n.on ? 'on' : undefined}>
                  <a href={n.href}>{n.label}{n.drop && <svg className="car" viewBox="0 0 12 12"><path d="m2 4.5 4 4 4-4" /></svg>}</a>
                  {n.drop && (
                    <ul className="drop">
                      {n.drop.map(([l, h]) => <li key={l}><a href={h}>{l}</a></li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="icons">
            <button aria-label="Search"><Icon name="search" /></button>
            <button aria-label="Account"><Icon name="user" /></button>
            <button aria-label="Bag"><Icon name="bag" /><span className="bdg">0</span></button>
            <button className="brg" aria-label="Menu" onClick={() => setDrawer(true)}><Icon name="menu" /></button>
          </div>
        </div>
      </header>

      <div className={'dw' + (drawer ? ' open' : '')}>
        <div className="dw-t">
          <span className="mark"><b>GD</b><i>BEAUTY</i></span>
          <button className="dw-x" aria-label="Close menu" onClick={() => setDrawer(false)}><Icon name="close" /></button>
        </div>
        <nav onClick={() => setDrawer(false)}>
          <a href="#">Home</a><a href="#range">Fragrance</a><a href="#results">Skin</a>
          <a href="#collection">Colour</a><a href="#range">Body</a>
          <a href="#house">Maison</a><a href="#journal">Journal</a>
        </nav>
        <div className="sub"><a href="#">Search</a><a href="#">Sign in</a><a href="#">Maison Gifts</a><a href="#">Stockists</a></div>
      </div>

      <section className="hero" id="hero" data-t={t} ref={heroRef}>
        <div ref={stageARef} className={'stage sa run' + (i === 0 ? ' on' : '')}>
          <div className="bg"><img src="/img/hero-plate.jpg" alt="" /></div>
          <div className="veil" />
          <div className={'flac' + (glFailed ? '' : ' gl') + (open ? ' open' : '')} ref={flacRef}>
            {glFailed && <FlaconSvg />}
            {!glFailed && <span className="flac-hint">{open ? 'Press again to spray' : 'Press the flacon'}</span>}
          </div>
        </div>

        <div className={'stage sb' + (i !== 0 ? ' on' : '')}>
          <video ref={filmRef} muted loop playsInline autoPlay preload="auto" poster="/img/film-poster.jpg">
            <source src="/film.mp4" type="video/mp4" />
          </video>
          <div className="veil" />
        </div>

        <div className="copy">
          <div className="deck">
            {BEATS.map((b, n) => (
              <div key={n} className={'beat ' + b.t + (n === i ? ' on' : '')}>
                <p className="eyebrow">{b.eyebrow}</p>
                <h1 className="ttl">{b.title}</h1>
                <p className="lede">{b.lede}</p>
                <div className="cta">
                  {b.cta.map(([label, href, cls]) => <a key={label} href={href} className={'btn ' + cls}><span>{label}</span></a>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="arw p" aria-label="Previous" onClick={() => go(iRef.current - 1, true)}><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg></button>
        <button className="arw n" aria-label="Next" onClick={() => go(iRef.current + 1, true)}><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg></button>
        <div className="dots">
          {BEATS.map((_, n) => <button key={n} aria-label={'Chapter ' + (n + 1)} className={n === i ? 'on' : undefined} onClick={() => go(n, true)} />)}
        </div>
        <a href="#collection" className="tab"><Icon name="gift" />Gift Book</a>
      </section>
    </>
  );
}
