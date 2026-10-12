/* static fallback for browsers without WebGL */
export function FlaconSvg() {
  return (
<svg viewBox="0 0 380 640" role="img" aria-label="GD Beauty flacon">
<defs>
<linearGradient id="liq-f1" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stopColor="#F0B255"/><stop offset=".48" stopColor="#D07F22"/><stop offset="1" stopColor="#94500F"/>
</linearGradient>
<linearGradient id="gl-f1" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stopColor="#fff" stopOpacity=".58"/><stop offset=".14" stopColor="#fff" stopOpacity=".05"/>
<stop offset=".72" stopColor="#fff" stopOpacity=".03"/><stop offset=".92" stopColor="#fff" stopOpacity=".4"/>
<stop offset="1" stopColor="#fff" stopOpacity=".14"/>
</linearGradient>
<linearGradient id="cap-f1" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stopColor="#6E665C"/><stop offset=".16" stopColor="#D9D2C6"/><stop offset=".38" stopColor="#F3EFE7"/>
<stop offset=".62" stopColor="#B6AC9E"/><stop offset=".84" stopColor="#E4DDD1"/><stop offset="1" stopColor="#736B60"/>
</linearGradient>
<linearGradient id="col-f1" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stopColor="#847A6C"/><stop offset=".3" stopColor="#EDE6DA"/>
<stop offset=".6" stopColor="#A79C8C"/><stop offset="1" stopColor="#7C7264"/>
</linearGradient>
<radialGradient id="gr-f1"><stop offset="0" stopColor="#000" stopOpacity=".26"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
<clipPath id="cp-f1"><path d="M62 588 L62 302 C62 288 70 275 84 265 L140 227 L240 227 L296 265 C310 275 318 288 318 302 L318 588 C318 597 311 604 302 604 L78 604 C69 604 62 597 62 588 Z"/></clipPath>
</defs>
<ellipse cx="190" cy="608" rx="158" ry="22" fill="url(#gr-f1)"/>
<rect x="136" y="62" width="108" height="108" rx="3" fill="url(#cap-f1)"/>
<rect x="136" y="62" width="108" height="9" rx="2" fill="#F6F2EA" opacity=".8"/>
<rect x="136" y="162" width="108" height="8" fill="#5F584F" opacity=".55"/>
<rect x="142" y="170" width="96" height="20" rx="2" fill="url(#col-f1)"/>
<rect x="152" y="188" width="76" height="42" fill="url(#liq-f1)" opacity=".55"/>
<rect x="152" y="188" width="76" height="42" fill="url(#gl-f1)"/>
<g clipPath="url(#cp-f1)">
<rect x="60" y="225" width="260" height="382" fill="url(#liq-f1)" opacity=".16"/>
<rect x="60" y="316" width="260" height="292" fill="url(#liq-f1)"/>
<rect x="60" y="313" width="260" height="6" fill="#fff" opacity=".34"/>
<rect x="86" y="225" width="16" height="382" fill="#fff" opacity=".2"/>
<rect x="272" y="225" width="12" height="382" fill="#fff" opacity=".16"/>
<path d="M108 607 L196 225 L232 225 L142 607 Z" fill="#fff" opacity=".06"/>
<rect x="60" y="225" width="260" height="382" fill="url(#gl-f1)"/>
</g>
<path d="M62 588 L62 302 C62 288 70 275 84 265 L140 227 L240 227 L296 265 C310 275 318 288 318 302 L318 588 C318 597 311 604 302 604 L78 604 C69 604 62 597 62 588 Z" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1.6"/>
<rect x="112" y="392" width="156" height="140" fill="#FBF8F2" opacity=".97"/>
<rect x="119" y="399" width="142" height="126" fill="none" stroke="#1C1815" strokeOpacity=".5" strokeWidth="0.8"/>
<text x="190" y="445" textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif" fontSize="25" letterSpacing="2" fill="#1C1815">GD</text>
<text x="190" y="470" textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif" fontSize="16" letterSpacing="4.5" fill="#1C1815">BEAUTY</text>
<rect x="152" y="480" width="76" height="0.9" fill="#1C1815" opacity=".55"/>
<text x="190" y="502" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="7.5" letterSpacing="2.2" fill="#1C1815" opacity=".72">EAU DE PARFUM</text>
<text x="190" y="516" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="7" letterSpacing="2" fill="#1C1815" opacity=".55">PARIS</text>
</svg>
  );
}
