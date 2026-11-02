// Link-preview cards (1200×630) for public/og/. Run in the browser console on the dev site
// (wrangler dev) with a local receiver on :8811 that writes POSTed PNGs to public/og/.
// Drawn with canvas so Nong Plub's SVG and the house fonts render exactly as on the site.
async function ogCards() {
  await hoodsReady; await document.fonts.ready;
  const POSE = { default: 'map', ari: 'sketch', samyan: 'cheer', charoenkrung: 'point', thonglo: 'wave' };
  const cards = [{ name: 'default', title: "Bangkok's Great Good Places", th: 'Cafés · co-working · libraries',
    line: `${state.places.length.toLocaleString('en-US')} places · scored from open data · 4 neighbourhoods` }]
    .concat(hoods.list.map(h => ({ name: h.slug, title: h.name, th: h.th, for: h.for,
      line: `${h.stats.work} work spots within ~10 min · #${h.stats.stationRank} ${/^(BTS|MRT)/.test(h.anchorLabel) ? 'of' : 'vs'} ${h.stats.stations} stations · ✦${h.stats.ggp} avg` })));
  for (const c of cards) {
    const cv = Object.assign(document.createElement('canvas'), { width: 1200, height: 630 }), g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 1200, 630);
    g.fillStyle = '#20201d'; g.font = '600 40px Jost'; g.fillText('PLUB', 72, 96);
    g.fillStyle = '#575951'; g.font = '400 24px Jost'; g.fillText('Placemaking Laboratory Urban Bureau', 72, 132);
    let y = 260;
    if (c.for) { g.fillStyle = '#575951'; g.font = '500 24px Jost'; g.fillText('SOCIALLY OPTIMIZED FOR', 72, 214); }
    let fs = c.for ? 88 : 64; // shrink until the headline clears Plub
    do { g.font = `600 ${fs}px Jost`; } while (g.measureText(c.for || c.title).width > 720 && --fs > 40);
    g.fillStyle = '#20201d'; g.fillText(c.for || c.title, 72, y + (c.for ? 30 : 0));
    g.font = '400 40px Prompt'; g.fillStyle = '#575951'; g.fillText(c.for ? `${c.title} ${c.th}` : c.th, 72, y + (c.for ? 96 : 62));
    g.fillStyle = '#20201d'; g.font = '400 28px Jost'; g.fillText(c.line, 72, 520);
    g.fillStyle = '#f59e0b'; g.fillRect(72, 548, 64, 6);
    g.fillStyle = '#575951'; g.font = '400 24px Jost'; g.fillText('co.nonarkara.org', 152, 558);
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(plub(POSE[c.name], 320, 'Nong Plub'));
    await img.decode();
    g.drawImage(img, 820, 150, 320, 373);
    await fetch('http://localhost:8811/', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: c.name, data: cv.toDataURL('image/png') }) });
  }
  return cards.map(c => c.name);
}
