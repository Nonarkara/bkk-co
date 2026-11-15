// The neighbourhood comparison grid.
//
// This lived as an inline script in the page. It now lives here so the
// Content-Security-Policy can say script-src 'self' with no 'unsafe-inline' —
// the one hole that let any injected markup run.
fetch('data/street-areas.json').then(r => r.json()).then(d => {
  const rows = d.areas.map((a, i) => `
    <article class="hood-card">
      <p class="micro">${String(i + 1).padStart(2, '0')} · ${a.mood || 'Sourced stroll'} · ${a.radiusM || 0}m radius</p>
      <h2>${a.name}<span class="th" lang="th">${a.nameTh || ''}</span></h2>
      <p class="hood-primary"><b>Cafés within 800m: ${a.cafesWithin800m || 0}</b> · Mix: ${Object.entries(a.mix || {}).map(([kind, count]) => `${count} ${kind}`).join(' · ')}</p>
      <p class="meta">${a.basis || ''}</p>
      <nav class="hood-actions"><a href="/?plan=map&amp;at=${encodeURIComponent(`${a.anchor.y},${a.anchor.x}`)}">Open on map</a><a href="/?plan=3d&amp;area=${encodeURIComponent(a.id)}">3D walkthrough</a></nav>
    </article>
  `).join('');
  document.getElementById('compare').innerHTML = `<div class="hood-grid">${rows}</div>`;
}).catch(() => {
  document.getElementById('compare').textContent = 'Neighbourhood data is unavailable. Try the map or reload.';
});
