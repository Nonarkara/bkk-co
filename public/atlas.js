// Coffee atlas: every displayed attribute retains its evidence and every aggregate counts actual points.
(() => {
  const M = AtlasModel,
    empty = () => ({ type: 'FeatureCollection', features: [] });
  const modes = {
    all: ['All places', 'Every selected kind, grouped without an index cutoff.'],
    hotspots: ['Hotspots', 'Catalogue café density, not visits or foot traffic.'],
    hats: ['Hotspot tiles', 'Optional hat-monotile view: cafés counted inside each tile, not visits or foot traffic. Tiles and counts change with zoom.'],
    independent: [
      'Independent',
      'Cafés with no chain signal in the catalogue; ownership is not independently certified.'
    ],
    hidden: [
      'Under the radar',
      'No chain signal and low dataset footprint (0–2/9). Less documented does not mean worse—or secret.'
    ],
    nature: [
      'Near mapped parks',
      'Within 300 m of a mapped park/nature polygon. Straight-line proximity, not an entrance, garden or walking-access promise.'
    ],
    talk: [
      'Talked about',
      'Only branch-verified public discussion evidence. Sampled mentions can include criticism; not live trends.'
    ],
    design: [
      'Design & shophouses',
      'Explicit branch-specific publication evidence, not an inference from a neighbourhood or independence.'
    ],
    streets: [
      'Café streets',
      '308 sampled real OSM street segments; cafés within 40 m. These are proximity counts, not walking connectivity.'
    ],
    triangles: [
      'Coffee triangles',
      'Three independent-signal cafés, 150–700 m apart, near the map centre. Straight lines; checked against the mapped Chao Phraya only.'
    ],
    districts: [
      'Districts',
      'Real OSM district polygons. Counts cover the catalogue boundary, including partial surrounding districts.'
    ]
  };
  let lens = 'all',
    district = null,
    data = null,
    promise = null,
    revision = 0,
    loops = [],
    loop = null,
    last = [],
    images = {},
    mapReady = false,
    provenance = new Map(),
    hatGeom = null, hatRevision = 0, hatDrawnRevision = -1;
  const get = async (path) => {
    const r = await fetch(path, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('Map evidence unavailable. The base map and notebook still work.');
    return r.json();
  };
  async function load() {
    if (data) return data;
    if (!promise)
      promise = Promise.all([
        get('data/atlas-geo.json'),
        get('data/atlas-places.json'),
        get('data/atlas-evidence.json'),
        get('data/atlas-streets.json')
      ])
        .then(([geo, join, evidence, streets]) => {
          const byId = new Map(
              join.rows.map((r) => [r[0], { district: r[1], park: r[2], distance: r[3] }])
            ),
            evidenceById = new Map(evidence.places.map((r) => [r.place_id, r])),
            districtById = new Map(geo.districts.features.map((f) => [f.properties.id, f])),
            parkById = new Map(geo.parks.features.map((f) => [f.properties.id, f]));
          data = {
            geo,
            join,
            evidence,
            streets,
            byId,
            evidenceById,
            districtById,
            parkById,
            streetCafes: new Set(streets.features.flatMap((f) => f.properties.cafeIDs))
          };
          return data;
        })
        .catch((e) => {
          promise = null;
          throw e;
        });
    return promise;
  }
  const evidence = (p) => data?.evidenceById.get(p.id) || provenance.get(p.id) || {};
  function includes(p) {
    const a = data?.byId.get(p.id),
      e = evidence(p);
    if (district && a?.district !== district) return false;
    switch (lens) {
      case 'independent':
      case 'triangles':
        return M.indie(p);
      case 'hidden':
        return M.sparse(p);
      case 'nature':
        return p.k === 'cafe' && a?.distance != null && a.distance <= 300;
      case 'talk':
        return p.k === 'cafe' && e.discussion_count > 0;
      case 'design':
        return p.k === 'cafe' && (e.attributes?.architecture || e.attributes?.shophouse);
      case 'streets':
        return p.k === 'cafe' && data?.streetCafes.has(p.id);
      case 'hats':
      case 'hotspots':
      case 'districts':
        return p.k === 'cafe';
      default:
        return true;
    }
  }
  function props(p) {
    const rating = state.personalRatings?.get(p.id)?.stars || 0;
    return {
      icon: M.icon(p, evidence(p), rating),
      indie: M.indie(p) ? 1 : 0,
      coverage: p.d[3],
      mine: rating
    };
  }
  function selection(p) {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.x, p.y] },
      properties: { id: p.id, n: p.n, ...props(p) }
    };
  }
  function drawIcon(kind, cluster = false) {
    const w = cluster ? 64 : 34,
      h = cluster ? 34 : 34,
      c = document.createElement('canvas');
    c.width = w * 2;
    c.height = h * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    const ink = kind === 'coworking' ? '#986000' : kind === 'restaurant' ? '#666960' : '#7d133a';
    g.strokeStyle = ink;
    g.fillStyle = '#fff';
    g.lineWidth = 1.6;
    g.beginPath();
    if (cluster) {
      g.moveTo(6, 1);
      g.lineTo(w - 6, 1);
      g.lineTo(w - 1, 7);
      g.lineTo(w - 1, h - 7);
      g.lineTo(w - 6, h - 1);
      g.lineTo(6, h - 1);
      g.lineTo(1, h - 7);
      g.lineTo(1, 7);
      g.closePath();
    } else g.arc(17, 17, 15, 0, Math.PI * 2);
    if (kind === 'cafe-hidden') g.setLineDash([3, 2]);
    g.fill();
    g.stroke();
    g.setLineDash([]);
    g.save();
    g.translate(cluster ? 12 : 17, 17);
    g.strokeStyle = ink;
    g.fillStyle = ink;
    g.lineWidth = 1.7;
    if (kind.startsWith('cafe') || kind === 'cafe') {
      g.beginPath();
      g.moveTo(-7, -4);
      g.lineTo(4, -4);
      g.lineTo(4, 2);
      g.quadraticCurveTo(4, 6, -1, 6);
      g.quadraticCurveTo(-7, 6, -7, 2);
      g.closePath();
      g.stroke();
      g.beginPath();
      g.arc(5, 0, 3, -Math.PI / 2, Math.PI / 2);
      g.stroke();
      g.beginPath();
      g.moveTo(-9, 8);
      g.lineTo(7, 8);
      g.stroke();
      g.beginPath();
      g.moveTo(-3, -7);
      g.lineTo(-3, -10);
      g.moveTo(1, -7);
      g.lineTo(1, -10);
      g.stroke();
    } else if (kind === 'coworking') {
      g.strokeRect(-8, -7, 16, 10);
      g.beginPath();
      g.moveTo(-10, 6);
      g.lineTo(10, 6);
      g.moveTo(-8, 6);
      g.lineTo(-8, 10);
      g.moveTo(8, 6);
      g.lineTo(8, 10);
      g.stroke();
    } else if (kind === 'library') {
      g.beginPath();
      g.moveTo(0, -6);
      g.quadraticCurveTo(-5, -10, -9, -7);
      g.lineTo(-9, 6);
      g.quadraticCurveTo(-5, 3, 0, 7);
      g.quadraticCurveTo(5, 3, 9, 6);
      g.lineTo(9, -7);
      g.quadraticCurveTo(5, -10, 0, -6);
      g.lineTo(0, 7);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(0, 1, 7, 0, Math.PI * 2);
      g.moveTo(-11, -7);
      g.lineTo(-11, 8);
      g.moveTo(-14, -7);
      g.lineTo(-14, -2);
      g.lineTo(-8, -2);
      g.lineTo(-8, -7);
      g.moveTo(11, -7);
      g.lineTo(11, 8);
      g.stroke();
    }
    g.restore();
    if (!cluster && ['cafe-star', 'cafe-featured', 'cafe-indie'].includes(kind)) {
      g.fillStyle = '#fff';
      g.fillRect(22, 0, 12, 12);
      g.strokeStyle = ink;
      g.fillStyle = ink;
      if (kind === 'cafe-star') {
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5,
            r = i % 2 ? 2.5 : 5;
          const x = 28 + Math.cos(a) * r,
            y = 6 + Math.sin(a) * r;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.fill();
      } else {
        g.beginPath();
        g.moveTo(28, 1);
        g.lineTo(33, 6);
        g.lineTo(28, 11);
        g.lineTo(23, 6);
        g.closePath();
        kind === 'cafe-featured' ? g.fill() : g.stroke();
      }
    }
    return { data: g.getImageData(0, 0, c.width, c.height), url: c.toDataURL() };
  }
  function install(m) {
    if (mapReady) return;
    mapReady = true;
    get('data/atlas-evidence.json')
      .then((e) => {
        provenance = new Map(e.places.map((p) => [p.place_id, p]));
        refresh();
      })
      .catch(() => {});
    for (const kind of [
      'cafe',
      'cafe-indie',
      'cafe-hidden',
      'cafe-star',
      'cafe-featured',
      'coworking',
      'library',
      'restaurant'
    ]) {
      const a = drawIcon(kind);
      images[kind] = a.url;
      m.addImage('atlas-' + kind, a.data, { pixelRatio: 2 });
    }
    for (const kind of ['cafe', 'coworking', 'library', 'restaurant'])
      m.addImage('atlas-cluster-' + kind, drawIcon(kind, true).data, { pixelRatio: 2 });
    const dominant = [
      'case',
      [
        'all',
        ['>=', ['get', 'cafes'], ['get', 'food']],
        ['>=', ['get', 'cafes'], ['get', 'work']],
        ['>=', ['get', 'cafes'], ['get', 'books']]
      ],
      'cafe',
      ['all', ['>=', ['get', 'food'], ['get', 'work']], ['>=', ['get', 'food'], ['get', 'books']]],
      'restaurant',
      ['>=', ['get', 'work'], ['get', 'books']],
      'coworking',
      'library'
    ];
    m.addLayer({
      id: 'atlas-clusters',
      type: 'symbol',
      source: 'places',
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': ['concat', 'atlas-cluster-', dominant],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ['to-string', ['get', 'point_count']],
        'text-font': ['Noto Sans Bold'],
        'text-size': 14,
        'text-offset': [0.65, 0],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: { 'text-color': '#7d133a' }
    });
    m.addLayer({
      id: 'place-icons',
      type: 'symbol',
      source: 'places',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['concat', 'atlas-', ['get', 'icon']],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });
    m.addLayer({
      id: 'selected-place-icon',
      type: 'symbol',
      source: 'sel',
      layout: {
        'icon-image': ['concat', 'atlas-', ['coalesce', ['get', 'icon'], 'cafe']],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ['get', 'n'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-offset': [0, 1.9],
        'text-anchor': 'top',
        'text-max-width': 16,
        'text-allow-overlap': true
      },
      paint: { 'text-color': '#7d133a', 'text-halo-color': '#fff', 'text-halo-width': 2 }
    });
    m.addSource('atlas-density', { type: 'geojson', data: empty() });
    m.addLayer(
      {
        id: 'atlas-heat',
        type: 'heatmap',
        source: 'atlas-density',
        maxzoom: 16,
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': 0.7,
          'heatmap-radius': 34,
          'heatmap-opacity': 0.52,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(249,193,206,0)',
            0.2,
            '#f9c1ce',
            0.65,
            '#b65779',
            1,
            '#7d133a'
          ]
        }
      },
      'pins-city'
    );
    m.addSource('atlas-hats', {type:'geojson',data:empty()});
    m.addLayer({id:'atlas-hats',type:'fill',source:'atlas-hats',layout:{visibility:'none'},paint:{'fill-color':['step',['get','n'],'#f9c1ce',12,'#7d133a'],'fill-opacity':['interpolate',['linear'],['get','n'],1,.2,12,.4,100,.54]}},'pins-city');
    m.addLayer({id:'atlas-hat-line',type:'line',source:'atlas-hats',layout:{visibility:'none'},paint:{'line-color':'#7d133a','line-width':.7,'line-opacity':.7}},'pins-city');
    for (const id of ['atlas-districts', 'atlas-parks', 'atlas-streets', 'atlas-loops'])
      m.addSource(id, { type: 'geojson', data: empty() });
    m.addLayer(
      {
        id: 'atlas-district-fill',
        type: 'fill',
        source: 'atlas-districts',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'density'],
            0,
            '#fff',
            5,
            '#f9c1ce',
            35,
            '#7d133a'
          ],
          'fill-opacity': 0.28
        }
      },
      'pins-city'
    );
    m.addLayer(
      {
        id: 'atlas-district-line',
        type: 'line',
        source: 'atlas-districts',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#7d133a',
          'line-width': ['case', ['==', ['get', 'chosen'], 1], 3, 1],
          'line-opacity': 0.6
        }
      },
      'pins-city'
    );
    m.addLayer(
      {
        id: 'atlas-park-fill',
        type: 'fill',
        source: 'atlas-parks',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#b6bfc1', 'fill-opacity': 0.5 }
      },
      'pins-city'
    );
    m.addLayer(
      {
        id: 'atlas-park-line',
        type: 'line',
        source: 'atlas-parks',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#7d133a', 'line-width': 1, 'line-dasharray': [3, 2] }
      },
      'pins-city'
    );
    m.addLayer(
      {
        id: 'atlas-street-lines',
        type: 'line',
        source: 'atlas-streets',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#7d133a',
          'line-opacity': 0.75,
          'line-width': ['interpolate', ['linear'], ['get', 'active'], 1, 1.5, 30, 5]
        }
      },
      'pins-city'
    );
    m.addLayer({
      id: 'atlas-street-names',
      type: 'symbol',
      source: 'atlas-streets',
      minzoom: 13,
      layout: {
        visibility: 'none',
        'symbol-placement': 'line',
        'text-field': ['concat', ['get', 'name'], ' · ', ['to-string', ['get', 'active']]],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12
      },
      paint: { 'text-color': '#7d133a', 'text-halo-color': '#fff', 'text-halo-width': 2 }
    });
    m.addLayer(
      {
        id: 'atlas-loop-fill',
        type: 'fill',
        source: 'atlas-loops',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#f9c1ce', 'fill-opacity': 0.2 }
      },
      'pins-city'
    );
    m.addLayer(
      {
        id: 'atlas-loop-line',
        type: 'line',
        source: 'atlas-loops',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#7d133a', 'line-width': 2, 'line-dasharray': [2, 2] }
      },
      'pins-city'
    );
    m.on('click', 'atlas-clusters', async (e) => {
      if(m.getLayer('route-stop')&&m.queryRenderedFeatures(e.point,{layers:['route-stop']}).length)return;
      try {
        const f = e.features[0],
          src = m.getSource('places'),
          z = await src.getClusterExpansionZoom(f.properties.cluster_id);
        if (z > m.getZoom() + 0.1 && z <= 19) {
          m.easeTo({ center: f.geometry.coordinates, zoom: Math.min(19, z + 0.1) });
          return;
        }
        await clusterList(f);
      } catch {
        status('Cluster changed. Tap its current count again.');
      }
    });
    m.on('mouseenter', 'atlas-clusters', () => (m.getCanvas().style.cursor = 'pointer'));
    m.on('mouseleave', 'atlas-clusters', () => (m.getCanvas().style.cursor = ''));
    m.on('click', 'atlas-district-fill', (e) => {
      if (
        m.queryRenderedFeatures(e.point, {
          layers: ['atlas-clusters', 'place-icons', 'route-stop'].filter((id) => m.getLayer(id))
        }).length
      )
        return;
      chooseDistrict(e.features[0].properties.id).catch((e) => status(e.message));
    });
    m.on('click','atlas-hats',e=>{
      if(m.queryRenderedFeatures(e.point,{layers:['atlas-clusters','place-icons','route-stop'].filter(id=>m.getLayer(id))}).length)return;
      const f=e.features?.[0];if(!f||f.properties.patch!==hatGeom?.key){status('Tiles are updating; tap again.');return;}
      tileSheet(Number(f.properties.tile));
    });
    m.on('click', 'atlas-street-lines', (e) => {
      if (
        m.queryRenderedFeatures(e.point, {
          layers: ['atlas-clusters', 'place-icons', 'route-stop'].filter((id) => m.getLayer(id))
        }).length
      )
        return;
      const f = data.streets.features.find((f) => f.properties.id === e.features[0].properties.id);
      if (!f) return;
      const active = new Set(last.map((p) => p.id)),
        ps = f.properties.cafeIDs.filter((id) => active.has(id)).map((id) => state.byId.get(id));
      const sheet = openSheet(
        `<header><h1>${esc(f.properties.name || f.properties.nameTh)}</h1><button class="close" aria-label="Close">×</button></header><p>${fmt(ps.length)} matching cafés within 40 m of this mapped street segment. Proximity is not entrance access or a verified walking route.</p><ul class="atlas-places">${ps.map(placeRow).join('')}</ul><p class="src"><a href="https://www.openstreetmap.org/way/${esc(String(f.properties.sourceID).replace(/^w/, ''))}" target="_blank" rel="noopener">OSM street geometry ↗</a> · 24 Oct 2026</p>`
      );
      sheet.classList.add('atlas-sheet');
      bindPlaces(sheet);
    });
    const dock = document.createElement('div');
    dock.className = 'atlas-dock';
    dock.innerHTML =
      '<div class="atlas-tools"><button data-work-start>Find a work spot</button><button data-atlas-open>Explore ↓</button><button data-atlas-key aria-label="Map key">Key</button><button data-atlas-fit hidden>Show matches</button></div><p class="atlas-state" role="status"></p><button class="atlas-reset" hidden>Clear map view ×</button>';
    document.body.append(dock);
    const positionDock=()=>{dock.style.top=(isPhone()?document.querySelector('.chips').getBoundingClientRect().bottom+12:12)+'px'};
    const observer=new ResizeObserver(positionDock);
    for(const e of document.querySelectorAll('.bar,.chips'))observer.observe(e);
    window.addEventListener('resize',positionDock);
    positionDock();
    dock.querySelector('[data-atlas-open]').onclick = () =>
      lens === 'triangles' && loops.length
        ? triangleSheet()
        : open().catch((e) => status(e.message));
    dock.querySelector('[data-work-start]').onclick=()=>window.WorkFinder?.open();
    window.WorkFinder?.warmEvidence();
    dock.querySelector('[data-atlas-key]').onclick = key;
    dock.querySelector('[data-atlas-fit]').onclick = fitMatches;
    m.on('moveend', () => {updateDock();syncHats()});
    m.on('resize', () => syncHats());
    dock.querySelector('.atlas-reset').onclick = reset;
    updateDock();
  }
  async function clusterList(f) {
    const src = map.getSource('places'),
      rows = await src.getClusterLeaves(f.properties.cluster_id, 100, 0),
      ps = rows.map((f) => state.byId.get(f.properties.id)).filter(Boolean);
    const sheet = openSheet(
      `<header><h1>${fmt(f.properties.point_count)} places together</h1><button class="close" aria-label="Close">×</button></header><p>Actual catalogue locations; the count marker is an aggregate, not a venue pin. Showing ${ps.length}${ps.length < f.properties.point_count ? ' of ' + fmt(f.properties.point_count) : ''}.</p><ul class="atlas-places">${ps.map(placeRow).join('')}</ul>${ps.length < f.properties.point_count ? '<button class="linkish" data-atlas-more>Show more places →</button>' : ''}`
    );
    sheet.classList.add('atlas-sheet');
    bindPlaces(sheet);
    const more = sheet.querySelector('[data-atlas-more]');
    if (more) {
      let offset = rows.length;
      more.onclick = async () => {
        more.disabled = true;
        try {
          const next = await src.getClusterLeaves(f.properties.cluster_id, 100, offset);
          if (sheet !== document.querySelector('#sheet') || !more.isConnected) return;
          offset += next.length;
          sheet.querySelector('.atlas-places').insertAdjacentHTML(
            'beforeend',
            next
              .map((f) => state.byId.get(f.properties.id))
              .filter(Boolean)
              .map(placeRow)
              .join('')
          );
          bindPlaces(sheet);
          more.hidden = offset >= f.properties.point_count || next.length === 0;
          more.textContent = 'Show more · ' + fmt(offset) + ' of ' + fmt(f.properties.point_count);
        } catch {
          more.textContent = 'Cluster changed; close and tap its current count.';
        } finally {
          more.disabled = false;
        }
      };
    }
  }
  function placeRow(p) {
    return `<li><button data-atlas-place="${esc(p.id)}"><img src="${images[props(p).icon]}" alt="" width="28" height="28"><span><b>${esc(p.n)}</b><small>${p.k !== 'cafe' ? KIND_LABEL[p.k] : M.indie(p) ? 'No chain signal' : 'Chain signal'} · footprint ${p.d[3]}/9</small></span></button></li>`;
  }
  function bindPlaces(sheet) {
    sheet
      .querySelectorAll('[data-atlas-place]')
      .forEach((b) => (b.onclick = () => select(state.byId.get(b.dataset.atlasPlace), true)));
  }
  function status(message) {
    const e = document.querySelector('.atlas-state');
    if (e) e.textContent = message;
  }
  function fitMatches() {
    if (!last.length) return;
    const xs = last.map((p) => p.x),
      ys = last.map((p) => p.y);
    map.fitBounds(
      [
        [Math.min(...xs), Math.min(...ys)],
        [Math.max(...xs), Math.max(...ys)]
      ],
      { padding: { top: 150, left: 35, right: 55, bottom: 40 }, maxZoom: 16 }
    );
  }
  function updateDock() {
    const e = document.querySelector('.atlas-state');
    if (!e) return;
    const area = district ? data?.districtById.get(district)?.properties.name : '';
    e.textContent = `${lens === 'all' ? '' : modes[lens][0] + ' · '}${fmt(last.length)} mapped${state.foodLoaded ? '' : ' · loading food'}${area ? ' · ' + area : ''}`;
    document.querySelector('.atlas-reset').hidden = lens === 'all' && !district;
    document.querySelector('[data-atlas-open]').textContent =
      lens === 'triangles' && loops.length ? 'Triangle stops ↓' : 'Explore ↓';
    e.title = modes[lens][1];
    e.dataset.lens = lens;
    const fit = document.querySelector('[data-atlas-fit]');
    if (fit)
      fit.hidden =
        !mapReady || !last.length || last.some((p) => map.getBounds().contains([p.x, p.y]));
    if (lens === 'hotspots') e.textContent += ' · density: pale → dark';
    if (lens === 'hats') e.textContent += ' · café counts per tile';
    if (lens === 'districts') e.textContent += ' · cafés/km²: 0 · 5 · 35+';
    if (lens === 'triangles' && loop) e.textContent = `3 café stops · ${loop.perimeter} m straight-line triangle`;
  }
  function tileSheet(index){
    const ring=hatGeom?.rings[index];if(!ring)return;
    const ps=(hatGeom.placeIDs?.[index]||[]).map(id=>state.byId.get(id)).filter(Boolean);
    const sheet=openSheet(`<header><h1>${fmt(ps.length)} ${ps.length===1?'café':'cafés'} in this tile</h1><button class="close" aria-label="Close">×</button></header><p class="src">Actual catalogue points inside this aggregate polygon. These are not visits or a walking route. Counts and tile boundaries change with zoom.</p><button class="linkish featured-entry" data-hat-back>← Tiles in view</button><ul class="atlas-places">${ps.map(placeRow).join('')}</ul>`);
    sheet.classList.add('atlas-sheet');bindPlaces(sheet);sheet.querySelector('[data-hat-back]').onclick=tileList;
  }
  function tileList(){
    syncHats();const b=map.getBounds(),features=map.getSource('atlas-hats')?._data?.features||[],tiles=features.filter(f=>f.geometry.coordinates[0].some(([x,y])=>b.contains([x,y]))).sort((a,b)=>b.properties.n-a.properties.n);
    const sheet=openSheet(`<header><h1>Hotspot tiles in view</h1><button class="close" aria-label="Close">×</button></header><p class="src">Catalogue café counts per tile, most first. No visits or foot-traffic ranking. Pan or zoom the map to change this view.</p><ol class="atlas-places">${tiles.slice(0,40).map((f,i)=>`<li><button data-hat-tile="${f.properties.tile}" data-hat-patch="${esc(f.properties.patch)}"><b>Tile ${i+1} · ${fmt(f.properties.n)} ${f.properties.n===1?'café':'cafés'}</b></button></li>`).join('')||'<li>No occupied tiles in this map view.</li>'}</ol>${tiles.length>40?'<p class="src">Showing the first40tiles. Zoom in to inspect fewer at once.</p>':''}`);
    sheet.classList.add('atlas-sheet');sheet.querySelectorAll('[data-hat-tile]').forEach(button=>button.onclick=()=>{if(button.dataset.hatPatch!==hatGeom?.key){tileList();return;}tileSheet(Number(button.dataset.hatTile))});
  }
  function syncHats(){
    if(!mapReady||lens!=='hats')return;
    try{
      if(!window.EinsteinHat||!window.HatDensity)throw new Error('Tile module unavailable.');
      const b=map.getBounds(),bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],zoom=map.getZoom();
      const stale=!HatDensity.covers(hatGeom,bounds,zoom);
      if(stale)hatGeom=HatDensity.geometry(bounds,zoom,EinsteinHat);
      if(!stale&&hatDrawnRevision===hatRevision)return;
      const counts=HatDensity.tally(hatGeom,last.filter(p=>p.k==='cafe'));
      map.getSource('atlas-hats')?.setData(HatDensity.featureCollection(hatGeom,counts));
      hatDrawnRevision=hatRevision;
    }catch(e){map.getSource('atlas-hats')?.setData(empty());status('Hotspot tiles unavailable; choose Hotspots or All places.');}
  }
  function onRefresh(ps) {
    last = ps;
    hatRevision++;
    updateDock();
    if (!mapReady) return;
    map.getSource('atlas-density').setData({
      type: 'FeatureCollection',
      features: ps
        .filter((p) => p.k === 'cafe')
        .map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.x, p.y] },
          properties: {}
        }))
    });
    if (data) {
      const counts = new Map(),
        active = new Set(ps.map((p) => p.id));
      for (const p of ps) {
        const d = data.byId.get(p.id)?.district;
        if (d) counts.set(d, (counts.get(d) || 0) + 1);
      }
      map.getSource('atlas-districts').setData({
        ...data.geo.districts,
        features: data.geo.districts.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            active: counts.get(f.properties.id) || 0,
            density:
              (counts.get(f.properties.id) || 0) / Math.max(0.001, f.properties.catalogueAreaKm2),
            chosen: f.properties.id === district ? 1 : 0
          }
        }))
      });
      map.getSource('atlas-parks').setData(data.geo.parks);
      map.getSource('atlas-streets').setData({
        ...data.streets,
        features: data.streets.features
          .map((f) => ({
            ...f,
            properties: {
              ...f.properties,
              active: f.properties.cafeIDs.filter((id) => active.has(id)).length
            }
          }))
          .filter((f) => f.properties.active > 0)
      });
    }
    syncHats();
    visibility();
  }
  function visibility() {
    if (!mapReady) return;
    const visible = (id, on) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    visible('atlas-heat', lens === 'hotspots');
    for(const id of ['atlas-hats','atlas-hat-line'])visible(id,lens==='hats');
    for (const id of ['atlas-district-fill', 'atlas-district-line'])
      visible(id, lens === 'districts' || !!district);
    for (const id of ['atlas-park-fill', 'atlas-park-line']) visible(id, lens === 'nature');
    for (const id of ['atlas-street-lines', 'atlas-street-names']) visible(id, lens === 'streets');
    for (const id of ['atlas-loop-fill', 'atlas-loop-line']) visible(id, lens === 'triangles');
  }
  async function apply(next, area = district) {
    const token = ++revision;
    try {
      if (!modes[next]) return;
      await load();
      if (next === 'triangles' && !(await (window.barriersReady || Promise.resolve(false))))
        throw new Error(
          'River geometry unavailable; no triangle is suggested. Try again after the map loads.'
        );
      if (token !== revision) return;
      lens = next;
      district = area;
      if (next !== 'triangles') {
        loops = [];
        loop = null;
        map.getSource('atlas-loops')?.setData(empty());
      }
      state.mood = null;
      state.flags.clear();
      if (next !== 'all' || area) state.kinds = new Set(['cafe']);
      document
        .querySelectorAll('.flags [data-flag]')
        .forEach((b) => b.setAttribute('aria-pressed', false));
      document
        .querySelectorAll('.chips [data-kind]')
        .forEach((b) => b.setAttribute('aria-pressed', state.kinds.has(b.dataset.kind)));
      closeSheet();
      refresh();
      if (last.length && last.length <= 50 && next !== 'triangles') fitMatches();
      if (next === 'triangles') {
        const c = map.getCenter();
        loops = M.triangles(last, { x: c.lng, y: c.lat }, crossesRiver);
        if (loops.length) showTriangle(loops[0]);
        else status('No supported triangle within 3 km. Pan near cafés and try here.');
      }
    } catch (e) {
      status(e.message);
      throw e;
    }
  }
  async function reset() {
    revision++;
    lens = 'all';
    district = null;
    loops = [];
    loop = null;
    map.getSource('atlas-loops')?.setData(empty());
    window.clearRoute?.();
    refresh();
  }
  function bounds(feature) {
    const pts = [];
    function walk(a) {
      if (typeof a[0] === 'number') pts.push(a);
      else a.forEach(walk);
    }
    walk(feature.geometry.coordinates);
    return [
      [
        Math.max(100.3, Math.min(...pts.map((p) => p[0]))),
        Math.max(13.45, Math.min(...pts.map((p) => p[1])))
      ],
      [
        Math.min(100.95, Math.max(...pts.map((p) => p[0]))),
        Math.min(14.1, Math.max(...pts.map((p) => p[1])))
      ]
    ];
  }
  async function chooseDistrict(id) {
    await load();
    if (!data.districtById.has(id)) return;
    await apply(lens, id);
    const f = data.districtById.get(id);
    map.fitBounds(bounds(f), { padding: 45, maxZoom: 15 });
    districtSheet(f);
  }
  function districtSheet(f) {
    const ps = last.filter((p) => p.k === 'cafe'),
      indies = ps.filter(M.indie),
      hash = (s) => {
        let n = 0;
        for (const c of s) n = (n * 31 + c.charCodeAt(0)) >>> 0;
        return n;
      };
    const day = Passport.day(new Date().toISOString()),
      sample = indies
        .slice()
        .sort((a, b) => hash(day + a.id) - hash(day + b.id))
        .slice(0, 6);
    const sheet = openSheet(
      `<header><h1>${esc(f.properties.name)}<span class="th" lang="th">${esc(f.properties.nameTh || '')}</span></h1><button class="close" aria-label="Close">×</button></header><p>${fmt(ps.length)} cafés in this view · ${fmt(indies.length)} with no chain signal. ${esc(modes[lens][0])}.</p><button class="linkish" data-atlas-area-map>Show this area on map →</button><h2 class="micro">Independent spotlights · rotating sample</h2><p class="src">Six catalogue entries, not a quality ranking. Add your own visit and photos to help small places become better documented.</p><ul class="atlas-places">${sample.map(placeRow).join('')}</ul><p class="src">OSM district ${esc(f.properties.id)} · 24 Oct 2026. Catalogue-covered area ${f.properties.catalogueAreaKm2} of ${f.properties.areaKm2} km². ${ps.length ? '' : 'No places meet the current filters.'}</p>`
    );
    sheet.classList.add('atlas-sheet');
    bindPlaces(sheet);
    sheet.querySelector('[data-atlas-area-map]').onclick = closeSheet;
    map.fitBounds(bounds(f), {
      padding: { top: 40, left: 40, right: 40, bottom: isPhone() ? sheet.offsetHeight + 20 : 40 },
      maxZoom: 15
    });
  }
  function showTriangle(t) {
    loop = t;
    updateDock();
    const ps = t.ids.map((id) => state.byId.get(id));
    map.getSource('atlas-loops').setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...ps.map((p) => [p.x, p.y]), [ps[0].x, ps[0].y]]]
          },
          properties: {}
        }
      ]
    });
    showRoute(ps, true);
    updateDock();
  }
  function triangleSheet() {
    const sheet = openSheet(
      `<header><h1>Coffee triangles</h1><button class="close" aria-label="Close">×</button></header><p>Nearby three-stop possibilities, not walking paths. Each leg 150–700 m, no mapped Chao Phraya crossing. PLUB does not check roads, canals, entrances or opening hours here.</p><button class="linkish" data-atlas-change>Change map view →</button><button class="linkish" data-atlas-refresh>Find triangles near this map centre</button><ul class="atlas-triangles">${loops.map((t) => `<li><button data-triangle="${esc(t.id)}">${t.ids.map((id) => esc(state.byId.get(id).n)).join(' → ')}<small>${t.perimeter} m straight-line perimeter</small></button></li>`).join('')}</ul>${
        loop
          ? `<a class="linkish" href="https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${state.byId.get(loop.ids[0]).y},${state.byId.get(loop.ids[0]).x}&destination=${state.byId.get(loop.ids[0]).y},${state.byId.get(loop.ids[0]).x}&waypoints=${loop.ids
              .slice(1)
              .map((id) => state.byId.get(id).y + ',' + state.byId.get(id).x)
              .join(
                '%7C'
              )}" target="_blank" rel="noopener">Check the walking loop in Google Maps ↗</a>`
          : ''
      }`
    );
    sheet.classList.add('atlas-sheet');
    if (loop) showTriangle(loop);
    sheet.querySelector('[data-atlas-change]').onclick = open;
    sheet.querySelector('[data-atlas-refresh]').onclick = () =>
      apply('triangles')
        .then(triangleSheet)
        .catch((e) => status(e.message));
    sheet.querySelectorAll('[data-triangle]').forEach(
      (b) =>
        (b.onclick = () => {
          const t = loops.find((t) => t.id === b.dataset.triangle);
          closeSheet();
          showTriangle(t);
        })
    );
  }
  async function open() {
    const sheet = openSheet(
      `<header><h1>Explore the coffee city</h1><button class="close" aria-label="Close">×</button></header><p class="src">Choose a view. The map counts all matching records, including small cafés with sparse information.</p>${lens === 'triangles' && loops.length ? '<button class="linkish" data-atlas-stops>See triangle stops →</button>' : ''}${lens==='hats'?'<button class="linkish featured-entry" data-atlas-tile-list>Inspect hotspot tiles in view →</button>':''}<button class="linkish featured-entry" data-featured-open>Featured places · verified branches →</button><button class="linkish featured-entry" data-street-world>Street sketch · explore the neighbourhood →</button><div class="atlas-modes">${Object.entries(
        modes
      )
        .map(
          ([id, [name, how]]) =>
            `<button data-atlas-lens="${id}" aria-pressed="${id === lens}"><b>${esc(name)}</b><small>${esc(how)}</small></button>`
        )
        .join(
          ''
        )}</div><details class="atlas-area"><summary>Choose a district · 50 Bangkok + surrounding</summary><p role="status">Loading sourced boundaries…</p></details>`
    );
    sheet.classList.add('atlas-sheet');
    sheet.querySelector('[data-atlas-stops]')?.addEventListener('click', triangleSheet);
    sheet.querySelector('[data-featured-open]').onclick=()=>window.openFeatured?.();
    sheet.querySelector('[data-street-world]').onclick=()=>window.StreetWorld?.open();
    sheet.querySelector('[data-atlas-tile-list]')?.addEventListener('click',tileList);
    sheet.querySelectorAll('[data-atlas-lens]').forEach(
      (b) =>
        (b.onclick = async () => {
          b.disabled = true;
          try {
            await apply(b.dataset.atlasLens);
          } catch (e) {
            b.disabled = false;
            const out = sheet.querySelector('.src');
            out.textContent = e.message;
          }
        })
    );
    const area = sheet.querySelector('.atlas-area');
    area.addEventListener('toggle', async () => {
      if (!area.open || area.querySelector('select')) return;
      try {
        await load();
        area.querySelector('p').outerHTML =
          `<label>District<select aria-label="Choose district"><option value="">Choose an actual district</option>${data.geo.districts.features
            .slice()
            .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
            .map(
              (f) =>
                `<option value="${esc(f.properties.id)}">${esc(f.properties.name)}${f.properties.bangkok ? '' : ' · ' + esc(f.properties.province)}</option>`
            )
            .join('')}</select></label>`;
        area.querySelector('select').onchange = (e) =>
          chooseDistrict(e.target.value).catch((e) => status(e.message));
      } catch (e) {
        area.querySelector('p').textContent = e.message;
      }
    });
  }
  function key() {
    const sheet = openSheet(
      `<header><h1>Read this map</h1><button class="close" aria-label="Close">×</button></header><ul class="atlas-key">${[
        ['cafe', 'Café'],
        ['coworking', 'Co-working'],
        ['library', 'Library'],
        ['restaurant', 'Food'],
        ['cafe-indie', 'No chain signal'],
        ['cafe-hidden', 'Less documented · low footprint'],
        ['cafe-featured', 'Featured in a verified publication'],
        ['cafe-star', 'Your 4–5/5 visit · device notebook only']
      ]
        .map(([i, t]) => `<li><img src="${images[i]}" alt="" width="34" height="34">${t}</li>`)
        .join(
          ''
        )}</ul>${window.FootprintPalette?.legend()||''}<p class="src">Optional hotspot tiles: hat monotile by Smith, Myers, Kaplan and Goodman-Strauss (2023), implementation adapted from Craig Kaplan’s BSD-3 hatviz. Each tile counts catalogue cafés inside it; pink below12, purple from12. Tile geometry and counts change with zoom. <a href="https://arxiv.org/abs/2303.10798" target="_blank" rel="noopener">Paper ↗</a></p><p>Numbered hexagons group actual places; they are not venue pins. Their icon is the most common selected kind. Tap to zoom; co-located places can be opened from a list. Every active record is counted, regardless of its index.</p><p><b>${esc(modes[lens][0])}</b> · ${esc(modes[lens][1])}</p><p class="src">OSM geography 24 Oct 2026; Overture places 21 Oct 2026. A low footprint is missing information, not bad coffee. Park proximity does not establish access. Publication/discussion evidence is dated and branch-specific; missing evidence means unknown. Districts are OSM administrative geometry, not our 800 m neighbourhood story circles.</p>`
    );
    sheet.classList.add('atlas-sheet');
  }
  function facts(p) {
    const a = data?.byId.get(p.id),
      e = evidence(p),
      park = a?.park ? data.parkById.get(a.park) : null,
      ds = a?.district ? data.districtById.get(a.district) : null;
    const items = [
      ds?.properties.name,
      e.editorial_count > 0 ? 'Featured in a verified publication' : null,
      park && a.distance <= 300
        ? `${a.distance === 0 ? '≤1' : a.distance} m to mapped ${park.properties.name || 'park'} (straight line; access not assured)`
        : null,
      e.discussion_count
        ? `${e.discussion_count} sampled branch-specific discussion threads`
        : null,
      e.attributes?.shophouse
        ? 'Shophouse · source described'
        : e.attributes?.architecture
          ? 'Architecture/design · source described'
          : null
    ].filter(Boolean);
    if (!items.length) return '';
    return `<details class="atlas-facts"><summary>Area &amp; place evidence · ${items.length} signals</summary><p>${items.map(esc).join(' · ')}</p>${e.evidence?.map((v) => `<p class="src"><a href="${esc(v.source_url)}" target="_blank" rel="noopener nofollow">${esc(v.evidence_type.replace(/_/g, ' '))}</a> · ${esc(v.published_at || 'date not stated')} · ${esc(v.attribute_basis || 'branch identity checked against source address')}</p>`).join('') || ''}</details>`;
  }
  window.Atlas = {
    install,
    includes,
    props,
    selection,
    onRefresh,
    apply,
    reset,
    load,
    open,
    key,
    facts,
    chooseDistrict,
    clusterList,
    get lens() {
      return lens;
    },
    get district() {
      return district;
    },
    get data() {
      return data;
    },
    get loops() {
      return loops;
    },
    get images() {
      return images;
    }
  };
})();
