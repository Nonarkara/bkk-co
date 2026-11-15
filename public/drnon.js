// Dr Non, chibi crayon edition — CL;UB mascot (botanical green lab jacket, glasses, field notebook).
// Hand-drawn SVG matching plub.js's displacement-filter crayon linework.
(function (root) {
  const INK = '#253122', SKIN = '#f3cfaa', HAIR = '#2c2927', JACKET = '#819238',
    COLLAR = '#afd472', SHIRT = '#ffffff', PAPER = '#fbf6ea', LENS = '#b5decc', ACCENT = '#87c540';
  let uid = 0;

  const arms = {
    wave: `<path d="M44 92 Q34 98 30 106" class="ln skin"/><path d="M76 92 Q90 80 92 64" class="ln skin"/>
           <circle cx="92" cy="61" r="5.5" class="ln skin"/><path d="M98 52 q4 3 3 8 M102 58 q3 2 2 6" class="ln" fill="none"/>`,
    point: `<path d="M44 92 Q36 100 36 108" class="ln skin"/><path d="M76 90 Q92 88 104 84" class="ln skin"/>
           <circle cx="106" cy="83" r="5" class="ln skin"/><path d="M110 82 l7 -2" class="ln" fill="none"/>`,
    inspect: `<path d="M44 92 Q36 100 40 108" class="ln skin"/>
              <path d="M76 90 Q92 84 96 68" class="ln skin"/>
              <circle cx="98" cy="56" r="10" class="ln" fill="${LENS}" opacity=".85"/>
              <path d="M92 64 L84 74" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`,
    map: `<path d="M44 92 Q40 100 42 104" class="ln skin"/><path d="M76 92 Q80 100 78 104" class="ln skin"/>
           <path d="M30 98 l20 -6 l20 6 l20 -6 v30 l-20 6 l-20 -6 l-20 6 z" class="ln" fill="${PAPER}"/>
           <path d="M50 92 v30 M70 98 v30" class="ln" fill="none" stroke-width="1.4"/>
           <path d="M38 116 q10 -14 22 -6 t22 -8" stroke="${ACCENT}" stroke-width="2.6" fill="none" stroke-dasharray="4 3"/>`,
    cheer: `<path d="M44 92 Q30 80 30 64" class="ln skin"/><path d="M76 92 Q90 80 90 64" class="ln skin"/>
           <circle cx="30" cy="61" r="5.5" class="ln skin"/><circle cx="90" cy="61" r="5.5" class="ln skin"/>`,
  };

  function drnon(pose = 'wave', size = 96, label = 'Dr Non, CL;UB guide') {
    const id = 'dn' + (++uid);
    return `<svg class="plub drnon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="${size}" height="${Math.round(size * 140 / 120)}" role="img" aria-label="${label}">
  <defs>
    <filter id="${id}c" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4"/>
    </filter>
  </defs>
  <style>.ln{stroke:${INK};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.skin{fill:${SKIN}}</style>
  <g filter="url(#${id}c)">
    <ellipse cx="60" cy="134" rx="26" ry="4" fill="${INK}" opacity=".12"/>
    <path d="M52 124 v8 M68 124 v8" class="ln" fill="none" stroke-width="4"/>
    <path d="M42 86 Q60 81 78 86 L84 126 Q60 131 36 126 Z" class="ln" fill="${JACKET}"/>
    <path d="M54 84 L60 112 L66 84 Z" class="ln" fill="${SHIRT}"/>
    <path d="M46 85 L54 98 M74 85 L66 98" stroke="${COLLAR}" stroke-width="3" stroke-linecap="round"/>
    <path d="M54 84 q6 6 12 0" class="ln skin"/>
    <path d="M27 48 Q26 16 60 15 Q94 16 93 48 Q91 32 78 28 Q60 22 42 28 Q29 32 27 48 Z" class="ln" fill="${HAIR}"/>
    <ellipse cx="60" cy="53" rx="28" ry="26" class="ln skin"/>
    <path d="M32 45 Q38 22 60 22 Q82 22 88 45 Q76 34 62 37 Q54 31 46 37 Q38 35 32 45 Z" fill="${HAIR}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="38" y="48" width="17" height="12" rx="3" fill="${LENS}" fill-opacity=".3" stroke="${INK}" stroke-width="2"/>
    <rect x="65" y="48" width="17" height="12" rx="3" fill="${LENS}" fill-opacity=".3" stroke="${INK}" stroke-width="2"/>
    <path d="M55 54 h10" stroke="${INK}" stroke-width="2"/>
    <circle cx="47" cy="54" r="3.2" fill="${INK}"/><circle cx="73" cy="54" r="3.2" fill="${INK}"/>
    <circle cx="48.2" cy="52.6" r="1" fill="#fff"/><circle cx="74.2" cy="52.6" r="1" fill="#fff"/>
    <path d="M53 67 Q60 72 67 67" class="ln" fill="none"/>
    ${arms[pose] || arms.wave}
  </g>
</svg>`;
  }

  root.drnon = drnon;
})(typeof window !== 'undefined' ? window : globalThis);
