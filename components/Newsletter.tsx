'use client';

import { useState } from 'react';

export function Newsletter() {
  const [done, setDone] = useState(false);
  return (
    <section className="nl">
      <div className="wrap">
        <h2>The waiting list</h2>
        <p>Releases are small and rarely repeated. We write once a season, before anything goes public.</p>
        <form onSubmit={e => { e.preventDefault(); e.currentTarget.reset(); setDone(true); }}>
          <input type="email" placeholder="you@email.com" required aria-label="Email" />
          <button type="submit">{done ? 'Thank you' : 'Join'}</button>
        </form>
      </div>
    </section>
  );
}
