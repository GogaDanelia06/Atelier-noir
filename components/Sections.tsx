import { Icon } from './Icon';
import { Newsletter } from './Newsletter';

export function Bento() {
  const tiles = [
    ['t-lg', '#range', 'apoth', 'Fragrance · No. 07', 'Noler Eau de Parfum', '100ml · £185'],
    ['', '#range', 'colour', 'Colour', 'Velvet Matte', 'Six shades · £38'],
    ['', '#results', 'skin', 'Skin · No. 01', 'Second Skin', '30ml · £96'],
    ['t-wide', '#range', 'body', 'Body', 'Sandalwood Balm', '200ml · £58'],
    ['t-wide', '#results', 'serum', 'Skin · No. 03', 'Night Oil', '30ml · £72'],
    ['t-wide', '#range', 'swatch', 'Colour', 'Cream Blush', 'Four shades · £34']
  ];
  return (
    <section className="sec" id="collection">
      <div className="wrap">
        <div className="head rise">
          <div className="rule" />
          <p className="kick">The Range</p>
          <h2>Fragrance, skin,<br />colour and body.</h2>
          <p>Four disciplines under one roof. Composed in Grasse, formulated in small batches, and numbered by hand.</p>
        </div>
        <div className="bento rise d1">
          {tiles.map(([cls, href, img, no, h, pr]) => (
            <a key={h} className={'tile ' + cls} href={href} style={{ backgroundImage: `var(--img-${img})` }}>
              <div className="tile-in"><p className="no">{no}</p><h3>{h}</h3><span className="pr">{pr}</span></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Quote() {
  return (
    <section className="quote">
      <div className="wrap">
        <blockquote className="rise">“A perfume should not announce you. It should be the reason someone turns around after you have already gone.”</blockquote>
        <cite>Hélène Marchand · Head Perfumer, GD Beauty</cite>
      </div>
    </section>
  );
}

export function Maison() {
  return (
    <section className="split" id="house" style={{ direction: 'rtl' }}>
      <div className="art rise bgimg" role="img" aria-label="Amber apothecary flacons" style={{ backgroundImage: 'var(--img-apoth)' }} />
      <div className="txt rise d1" style={{ direction: 'ltr' }}>
        <p className="kick">The Maison</p>
        <h2>Grasse, since 1974.</h2>
        <p>GD Beauty began as a supplier — we composed for other houses for thirty years before we put our own name on a bottle. That is why the range is short and the concentrations are high.</p>
        <p>Everything is macerated for a minimum of eighteen months, decanted by hand, and released only when the cellar says it is finished. In a good year that is four thousand flacons. In a poor one, far fewer.</p>
        <a href="#journal" className="btn btn-k"><span>Read the house notes</span></a>
      </div>
    </section>
  );
}

export function Journal() {
  const posts = [
    ['/img/journal-1.jpg', 'Composition · 6 min', 'Why we macerate for eighteen months', 'The difference between a fragrance that lasts four hours and one that lasts twelve is almost never the concentration.'],
    ['/img/wood.jpg', 'Materials · 4 min', 'Sourcing Assam oud, honestly', 'What a plantation certificate actually proves, and the three questions we ask before we buy a single kilo.'],
    ['/img/journal-3.jpg', 'Wearing · 3 min', 'The two-spray rule', 'High-concentration parfum behaves differently on skin than the eau de toilette most people learned on.']
  ];
  return (
    <section className="sec" id="journal">
      <div className="wrap">
        <div className="head rise">
          <div className="rule" />
          <p className="kick">The Journal</p>
          <h2>From the atelier.</h2>
        </div>
        <div className="jr rise d1">
          {posts.map(([src, meta, h, p]) => (
            <article key={h}>
              <div className="ph"><img src={src} alt="" loading="lazy" /></div>
              <p className="meta">{meta}</p>
              <h3>{h}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <>
      <Newsletter />
      <footer>
        <div className="wrap">
          <div className="fg">
            <div>
              <span className="mark"><b>GD</b><i>BEAUTY</i></span>
              <p>Fragrance, skin, colour and body — composed and bottled in Grasse since 1974.</p>
            </div>
            <div><h4>Shop</h4><ul><li><a href="#range">Fragrance</a></li><li><a href="#results">Skin</a></li><li><a href="#collection">Colour</a></li><li><a href="#range">Body</a></li></ul></div>
            <div><h4>Maison</h4><ul><li><a href="#house">Our story</a></li><li><a href="#house">The perfumers</a></li><li><a href="#notes">Materials</a></li><li><a href="#journal">Journal</a></li></ul></div>
            <div><h4>Care</h4><ul><li><a href="#">Shipping &amp; returns</a></li><li><a href="#">Engraving</a></li><li><a href="#">Contact</a></li><li><a href="#">Stockists</a></li></ul></div>
          </div>
          <div className="fb"><span>© 2026 GD Beauty</span><span>Grasse · London · Tokyo</span></div>
        </div>
      </footer>
      <a href="#" className="chat" aria-label="Chat"><Icon name="chat" /></a>
    </>
  );
}
