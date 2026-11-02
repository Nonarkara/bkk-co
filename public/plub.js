// Nong Plub, chibi crayon edition. Hand-drawn SVG (no image generation): her brown bob,
// rosy cheeks and dark plaid dress from the SCITI drawings, re-drawn cartoon-style.
// A wax-crayon feel comes from a displacement filter on the line and paper grain on the fills.
(function (root) {
  const INK = '#5a4a3e', SKIN = '#f3cfaa', HAIR = '#7b4a2d', HAIR2 = '#9a6240', CHEEK = '#ee9c86',
    DRESS = '#3f4256', PLAID = '#6c7090', BAG = '#5b7c9c', PAPER = '#fbf6ea', AMBER = '#f59e0b';
  let uid = 0;

  const arms = {
    wave: `<path d="M44 92 Q34 98 30 106" class="ln skin"/><path d="M76 92 Q90 80 92 64" class="ln skin"/>
           <circle cx="92" cy="61" r="5.5" class="ln skin"/><path d="M98 52 q4 3 3 8 M102 58 q3 2 2 6" class="ln" fill="none"/>`,
    point: `<path d="M44 92 Q36 100 36 108" class="ln skin"/><path d="M76 90 Q92 88 104 84" class="ln skin"/>
           <circle cx="106" cy="83" r="5" class="ln skin"/><path d="M110 82 l7 -2" class="ln" fill="none"/>`,
    sketch: `<rect x="34" y="96" width="52" height="30" class="ln" fill="${PAPER}" transform="rotate(-6 60 111)"/>
           <path d="M42 106 q8 -4 14 0 t14 0 M44 114 q10 -3 22 0" class="ln" fill="none" stroke-width="1.6"/>
           <path d="M76 92 Q80 100 72 108" class="ln skin"/><path d="M70 112 l12 -14" stroke="${AMBER}" stroke-width="3.2" stroke-linecap="round"/>
           <path d="M44 92 Q38 100 44 108" class="ln skin"/>`,
    stamp: `<path d="M44 92 Q36 100 38 108" class="ln skin"/><path d="M76 90 Q96 80 100 62" class="ln skin"/>
           <rect x="92" y="46" width="18" height="14" class="ln" fill="${AMBER}"/><rect x="97" y="38" width="8" height="9" class="ln" fill="${HAIR2}"/>
           <path d="M106 70 l6 -2 M106 76 l7 1 M104 82 l5 3" class="ln" fill="none"/>`,
    map: `<path d="M44 92 Q40 100 42 104" class="ln skin"/><path d="M76 92 Q80 100 78 104" class="ln skin"/>
           <path d="M30 98 l20 -6 l20 6 l20 -6 v30 l-20 6 l-20 -6 l-20 6 z" class="ln" fill="${PAPER}"/>
           <path d="M50 92 v30 M70 98 v30" class="ln" fill="none" stroke-width="1.4"/>
           <path d="M38 116 q10 -14 22 -6 t22 -8" stroke="${AMBER}" stroke-width="2.6" fill="none" stroke-dasharray="4 3"/>`,
    cheer: `<path d="M44 92 Q30 80 30 64" class="ln skin"/><path d="M76 92 Q90 80 90 64" class="ln skin"/>
           <circle cx="30" cy="61" r="5.5" class="ln skin"/><circle cx="90" cy="61" r="5.5" class="ln skin"/>
           <path d="M18 50 l4 4 M14 62 h5 M102 50 l-4 4 M106 62 h-5" class="ln" fill="none"/>`,
  };

  function plub(pose = 'wave', size = 96, label = 'Nong Plub, your guide') {
    const id = 'p' + (++uid);
    return `<svg class="plub" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="${size}" height="${Math.round(size * 140 / 120)}" role="img" aria-label="${label}">
  <defs>
    <filter id="${id}c" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/>
    </filter>
    <pattern id="${id}p" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="${DRESS}"/><path d="M0 4h8M4 0v8" stroke="${PLAID}" stroke-width="1.2"/></pattern>
  </defs>
  <style>.ln{stroke:${INK};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.skin{fill:${SKIN}}</style>
  <g filter="url(#${id}c)">
    <ellipse cx="60" cy="134" rx="26" ry="4" fill="${INK}" opacity=".12"/>
    <path d="M52 124 v8 M68 124 v8" class="ln" fill="none" stroke-width="4"/>
    <path d="M44 86 Q60 80 76 86 L84 126 Q60 132 36 126 Z" class="ln" fill="url(#${id}p)"/>
    <path d="M47 86 L72 120" stroke="${BAG}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M54 84 q6 6 12 0" class="ln skin"/>
    <path d="M24 52 Q22 16 60 14 Q98 16 96 52 Q98 74 90 82 L82 70 L38 70 L30 82 Q22 74 24 52 Z" class="ln" fill="${HAIR}"/>
    <ellipse cx="60" cy="52" rx="29" ry="27" class="ln skin"/>
    <path d="M30 48 Q28 20 60 19 Q92 20 90 48 Q80 36 66 40 Q62 31 54 36 Q44 40 30 48 Z" fill="${HAIR}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M40 30 q8 -6 18 -6" stroke="${HAIR2}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="48" cy="56" rx="4" ry="5.2" fill="${INK}"/><ellipse cx="72" cy="56" rx="4" ry="5.2" fill="${INK}"/>
    <circle cx="49.2" cy="53.4" r="1.2" fill="#fff"/><circle cx="73.2" cy="53.4" r="1.2" fill="#fff"/>
    <ellipse cx="41" cy="64" rx="5.5" ry="3.4" fill="${CHEEK}" opacity=".75"/><ellipse cx="79" cy="64" rx="5.5" ry="3.4" fill="${CHEEK}" opacity=".75"/>
    <path d="M53 65 Q60 72 67 65" class="ln" fill="#fff"/>
    ${arms[pose] || arms.wave}
  </g>
</svg>`;
  }

  root.plub = plub;
})(typeof window !== 'undefined' ? window : globalThis);
