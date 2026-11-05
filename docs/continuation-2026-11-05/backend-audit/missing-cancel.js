// Manga lens: the same mapped facts, drawn as line and tone.
// A lens, not a second map. It changes how the existing source is drawn, never what it says.
// Screentone is drawn at runtime; no asset is fetched and no data source is added.
(() => {
  const GROUND = 'manga-ground';
  const OPACITY = { background: 'background-opacity', fill: 'fill-opacity', line: 'line-opacity', symbol: 'text-opacity' };
  // The wash is one bounded response to one deliberate action: paper first, then the drawing arrives.
  const WASH = [
    { ids: ['manga-park', 'manga-landcover', 'manga-landuse', 'manga-town', 'manga-water'], delay: 20, duration: 100 },
    { ids: ['manga-building', 'manga-building-tone', 'manga-building-line'], delay: 60, duration: 100 },
    { ids: ['manga-road-major-casing', 'manga-road-major-core', 'manga-road-minor', 'manga-road-path', 'manga-rail', 'manga-water-line'], delay: 100, duration: 100 },
    { ids: ['manga-water-label', 'manga-road-label', 'manga-place-label'], delay: 140, duration: 100 },
  ];
  const MARK = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="1.6" y="1.6" width="16.8" height="16.8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3.4 14.2 L14.2 3.4" stroke="currentColor" stroke-width="1"/><circle cx="6.4" cy="6.4" r="1.15" fill="currentColor"/><circle cx="12.6" cy="12.6" r="1.15" fill="currentColor"/><circle cx="12.9" cy="6.1" r="0.7" fill="currentColor"/></svg>';

  let map = null, style = null, stylePromise = null, installed = false;
  let preferred = false, held = false, button = null;
  let baseState = new Map(), targets = new Map(), timers = [], failure = '';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wanted = () => preferred || held;
  const still = () => reduce.matches || document.hidden;
  const clearTimers = () => { for (const t of timers) clearTimeout(t); timers = []; };

  // ---- screentone -------------------------------------------------------------
  // Four tiles, each a power of two so the pattern repeats cleanly across tiles.
  function tile(draw, size = 8) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    draw(g, size);
    return g.getImageData(0, 0, size, size);
  }
  const TONES = {
    'manga-tone-dot': () => tile((g) => {
      g.fillStyle = '#9c9482';
      for (const [x, y] of [[2, 2], [6, 6]]) { g.beginPath(); g.arc(x, y, 1.15, 0, Math.PI * 2); g.fill(); }
    }),
    'manga-tone-hatch': () => tile((g, s) => {
      g.strokeStyle = '#b6ad9b'; g.lineWidth = 1;
      for (let x = -s; x < s; x += 4) { g.beginPath(); g.moveTo(x + 0.5, s); g.lineTo(x + s + 0.5, 0); g.stroke(); }
    }),
    'manga-tone-water': () => tile((g) => {
      g.strokeStyle = '#a4aeb6'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 4.5); g.lineTo(8, 4.5); g.stroke();
    }),
    'manga-tone-shade': () => tile((g) => {
      g.fillStyle = '#cbc4b4';
      for (const [x, y] of [[1, 1], [5, 5]]) { g.beginPath(); g.arc(x, y, 0.6, 0, Math.PI * 2); g.fill(); }
    }),
  };
  function ensureImages() {
    for (const [id, draw] of Object.entries(TONES)) {
      if (!map.hasImage(id)) map.addImage(id, draw());
    }
  }

  // ---- installation ------------------------------------------------------------
  function designOpacity(layer) {
    const key = OPACITY[layer.type];
    if (!key) return 1;
    const value = layer.paint && layer.paint[key];
    return typeof value === 'number' ? value : 1;
  }
  function install() {
    if (installed || !map || !style) return false;
    // Never gate on map.isStyleLoaded(): MapLibre reports false while any tile is still
    // loading, so on a live map it is almost never true. The style's own load event and
    // the presence of layers are the honest signals.
    const layers = map.getStyle && map.getStyle().layers;
    if (!layers || !layers.length) return false;
    const anchor = layers.find(l => !l.id.startsWith('manga-'));
    if (!anchor) return false;
    // Only the basemap is hidden when the lens is on. Catalogue pins, neighbourhood rings,
    // atlas lenses and routes are drawn by the app and must survive the swap.
    const previous = baseState, recycled = layers.some(l => l.id.startsWith('manga-'));
    baseState = new Map(layers
      .filter(l => !l.id.startsWith('manga-') && (l.type === 'background' || l.source === 'openmaptiles' || l.source === 'ne2_shaded'))
      .map(l => [l.id, recycled && previous.has(l.id) ? previous.get(l.id) : l.layout?.visibility || 'visible']));
    for (const layer of style.layers) {
      targets.set(layer.id, designOpacity(layer));
      if (map.getLayer(layer.id)) continue;
      map.addLayer({
        ...layer,
        layout: { ...(layer.layout || {}), visibility: 'none' },
      }, anchor.id);
    }
    installed = true;
    return true;
  }
  function installNow() {
    try {
      ensureImages();
      if (!install()) return false;
      failure = '';
      apply(true);
      paint();
      return true;
    } catch (e) {
      failure = e && e.message ? e.message : String(e);
      console.warn('Manga view could not start:', failure);
      paint();
      return false;
    }
  }
  function restore() {
    // A style reload drops added layers and images; rebuild before anything is shown.
    installed = false;
    targets = new Map();
    installNow();
  }

  // ---- visibility ---------------------------------------------------------------
  function baseVisible(on) {
    for (const [id, was] of baseState) {
      if (!map.getLayer(id)) continue;
      map.setLayoutProperty(id, 'visibility', on ? was : 'none');
    }
  }
  function setOpacity(id, value, instant = false) {
    if (!map.getLayer(id)) return;
    const layer = style.layers.find(l => l.id === id);
    const key = OPACITY[layer?.type];
    if (!key) return;
    map.setPaintProperty(id, key + '-transition', { duration: instant ? 0 : 100, delay: 0 });
    map.setPaintProperty(id, key, value);
  }
  function layerVisible(id, on) {
    if (!map.getLayer(id)) return;
    map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  }

  // One bounded transition. Paper appears at once; ink, tone and labels arrive in order.
  function apply(force) {
    if (!installed) return;
    const on = wanted();
    clearTimers();
    if (on) {
      baseVisible(false);
      for (const id of style.layers) {
        if (id.id === GROUND) continue;
        layerVisible(id.id, true);
        setOpacity(id.id, 0, true);
      }
      layerVisible(GROUND, true);
      setOpacity(GROUND, 1, true);
      if (still() || force) {
        for (const id of style.layers) setOpacity(id.id, targets.get(id.id) ?? 1, true);
        return;
      }
      for (const group of WASH) {
        timers.push(setTimeout(() => {
          for (const id of group.ids) setOpacity(id, targets.get(id) ?? 1);
        }, group.delay));
      }
      timers.push(setTimeout(() => apply(true), 240));
    } else {
      // The paper lifts first, so the civic map shows through the ink as it clears.
      const groups = [...WASH].reverse();
      if (still() || force) {
        for (const id of style.layers) { setOpacity(id.id, 0, true); layerVisible(id.id, false); }
        baseVisible(true);
        return;
      }
      baseVisible(true);
      timers.push(setTimeout(() => setOpacity(GROUND, 0), 0));
      groups.forEach((group, i) => {
        timers.push(setTimeout(() => {
          for (const id of group.ids) setOpacity(id, 0);
        }, i * 40));
      });
      timers.push(setTimeout(() => {
        for (const id of style.layers) layerVisible(id.id, false);
        setOpacity(GROUND, 1, true);
        clearTimers();
      }, 240));
    }
  }

  // ---- control ------------------------------------------------------------------
  function paint() {
    if (!button) return;
    button.setAttribute('aria-pressed', installed && wanted() ? 'true' : 'false');
    // Inside the street sketch the drawing is always line and tone, so the toggle cannot lie about it.
    button.disabled = held;
    button.title = held ? 'Manga view · the street sketch is always drawn in line and tone'
      : failure ? `Manga view unavailable — ${failure} · tap to retry`
      : 'Manga view · line and tone';
  }
  function settle() { if (timers.length) apply(true); }
  async function set(next) {
    preferred = !!next;
    if (!installed && preferred && !await ready()) { preferred = false; paint(); return false; }
    paint();
    apply(false);
  }
  function hold(active) {
    if (held === !!active) return;
    held = !!active;
    paint();
    // Holding is a task change (the street sketch opens, or a place sheet takes the map
    // back), not a decorative moment: the lens yields or takes the map at once. The wash
    // stays reserved for the reader's own toggle.
    apply(true);
  }

  function ensureStyle() {
    if (style) return Promise.resolve(style);
    if (!stylePromise) stylePromise = fetch('styles/plub-manga.json', { signal: AbortSignal.timeout(15000) })
      .then(r => { if (!r.ok) throw new Error('Manga view is unavailable.'); return r.json(); })
      .then(s => { style = s; return s; })
      .catch(e => { stylePromise = null; throw e; });
    return stylePromise;
  }
  function ready() {
    if (installed) return Promise.resolve(true);
    return ensureStyle().then(() => {
      if (!installNow()) {
        // The style is still arriving. Install the moment it does.
        map.once('style.load', () => { if (installNow()) apply(true); });
      }
      return installed;
    }).catch(e => {
      // A lens that silently does nothing is a lie. Say so, and say why.
      failure = e && e.message ? e.message : String(e);
      console.warn('Manga view could not start:', failure);
      paint();
      return false;
    });
  }

  function attach(m) {
    if (!m || map) return;
    map = m;
    document.addEventListener('pointerdown', e => { if (!e.target.closest?.('.manga-toggle')) settle(); }, true);
    
    document.addEventListener('wheel', settle, { passive: true, capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
    reduce.addEventListener('change', settle);
    map.on('style.load', () => { if (style) { if (installed) restore(); else installNow(); } else ready(); });
    const control = {
      onAdd() {
        const box = document.createElement('div');
        box.className = 'maplibregl-ctrl maplibregl-ctrl-group manga-ctrl';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'manga-toggle';
        b.innerHTML = MARK;
        b.setAttribute('aria-label', 'Manga view');
        b.setAttribute('aria-pressed', 'false');
        b.title = 'Manga view · line and tone';
        b.onclick = () => set(!preferred);
        box.append(b);
        button = b;
        paint();
        return box;
      },
      onRemove() { button = null; },
    };
    map.addControl(control, 'top-right');
    if (map.isStyleLoaded()) ready();
  }

  globalThis.MangaLens = {
    attach, set, hold, paint, ready, settle,
    get installed() { return installed; },
    get preferred() { return preferred; },
    get held() { return held; },
    get active() { return installed && wanted(); },
    layers: () => (style ? style.layers.map(l => l.id) : []),
    tones: () => Object.keys(TONES),
  };
})();
