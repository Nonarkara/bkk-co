// Shared place language: the same category silhouettes in search, filters and on the map.
(() => {
  const paths = {
    cafe: '<path d="M5 8h11v6c0 6-11 6-11 0zM16 9h2c5 0 5 6-2 6M3 21h16M8 2v3m5-3v3"/>',
    coworking: '<path d="M4 4h16v11H4zM2 19h20M5 19v4m14-4v4"/>',
    library: '<path d="M12 5Q7 1 2 4v15q5-3 10 1 5-4 10-1V4q-5-3-10 1v15"/>',
    restaurant: '<circle cx="12" cy="13" r="6"/><path d="M2 2v20m-2-20v7h4V2m18 0v20"/>'
  };
  function symbol(kind) {
    return `<svg class="place-symbol" viewBox="-1 0 26 26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[kind] || paths.cafe}</svg>`;
  }
  function icon(p) {
    const kind = window.Atlas?.props(p).icon, url = window.Atlas?.images[kind];
    return url ? `<img class="place-symbol place-badge" src="${url}" alt="">` : symbol(p.k);
  }
  const normalize = s => String(s || '').normalize('NFKD').replace(/([\p{Script=Latin}])\p{M}+/gu, '$1').toLowerCase().replace(/[’'`]/g, '').replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim();
  // A catalogue name may be Thai. Thai needs its own face, its own leading and
  // no tracking — and the browser only applies those when the text is marked as
  // Thai. Unmarked, a Thai name falls back to a Latin stack and its stacked
  // vowel and tone marks lose the room they need.
  const THAI = /[฀-๿]/;
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function name(s) {
    const text = String(s ?? '');
    return THAI.test(text) ? `<span lang="th">${escape(text)}</span>` : escape(text);
  }
  function query(value) {
    try {
      const u=new URL(value),match=/^\/maps\/place\/([^/]+)/.exec(u.pathname);
      if(u.protocol==='https:'&&['google.com','www.google.com','maps.google.com'].includes(u.hostname)&&match)return decodeURIComponent(match[1].replace(/\+/g,' '));
    } catch { /* a place name is the normal case */ }
    return value;
  }
  const matches = (p, q) => normalize(q).split(/\s+/).every(t => normalize(p.n + ' ' + (p.aliases || []).join(' ')).includes(t));
  async function share({title, url}, root) {
    const witness=root.firstElementChild, current=()=>root.isConnected&&root.firstElementChild===witness;
    const notice = text => {
      if(!current())return null;
      let out = root.querySelector('.share-status');
      if (!out) { out = document.createElement('p'); out.className='share-status'; out.setAttribute('role','status'); root.append(out); }
      out.textContent = text;
      return out;
    };
    if (navigator.share) {
      try { await navigator.share({title,url}); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    if(!current())return;
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(url); notice('Link copied'); return; } catch { /* manual copy below */ }
    }
    const out=notice('Copy this place link: '), input=document.createElement('input');
    if(!out)return;
    input.readOnly=true; input.value=url; input.setAttribute('aria-label','Place link to copy'); out.append(input); input.focus(); input.select();
  }
  globalThis.PlaceTools = {symbol, icon, normalize, query, matches, share, name};
})();
