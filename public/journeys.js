// Task-first work finder. Source points stay intact; route/traffic decisions belong to the directions provider.
(() => {
  const M = JourneyModel,
    labels = { drive: 'Drive + park', rail: 'BTS / rail', nearby: 'Nearby' },
    tasks = { laptop: 'Laptop', online: 'Online', read: 'Reading' };
  let thai = false;
  const tr = (en, th) => thai ? th : en;
  const modeNames = {drive:'ขับรถและจอด',rail:'BTS / รถไฟฟ้า',nearby:'ใกล้จุดเริ่ม'};
  const taskNames = {laptop:'แล็ปท็อป',online:'ออนไลน์',read:'อ่านหนังสือ'};
  const facilityName = key => ({wifi:'Wi-Fi',power:tr('outlets','ปลั๊กไฟ'),parking:tr('parking','ที่จอดรถ')})[key];
  let data,
    promise,
    evidence,
    evidencePromise,
    revision = 0,
    active = null,
    rows = [],
    contextIDs = new Set(),
    barrierChecked = false,
    railOrigin = null;
  const choice = {
    mode: 'nearby',
    task: 'laptop',
    origin: null,
    radius: 800,
    strict: false,
    lastMile: 'walk',
    system: 'BTS',
    stationID: null,
    duration: 120
  };
  const empty = () => ({ type: 'FeatureCollection', features: [] });
  const current = (sheet) =>
    sheet === active && !sheet.hidden && sheet.classList.contains('journey-sheet');
  const sourceURL = (id) =>
    `https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[id[0]]}/${id.slice(1)}`;
  async function get(path) {
    const r = await fetch(path, { signal: AbortSignal.timeout(15000) });
    if (!r.ok)
      throw new Error('Work-spot evidence is unavailable. Your map and notebook still work.');
    return r.json();
  }
  const loadEvidence = () =>
    evidence
      ? Promise.resolve(evidence)
      : evidencePromise ||
        (evidencePromise = get('data/journey-evidence.json')
          .then((d) => (evidence = d))
          .catch((e) => {
            evidencePromise = null;
            throw e;
          }));
  async function load() {
    if (data) return data;
    if (!promise)
      promise = Promise.all([
        get('data/journey-geo.json'),
        get('data/journey-places.json'),
        loadEvidence()
      ])
        .then(([g, j, e]) => (data = M.makeData(g, j, e)))
        .catch((e) => {
          promise = null;
          throw e;
        });
    return promise;
  }
  function centre() {
    const c = map.getCenter();
    return { x: c.lng, y: c.lat, label: tr('Map centre','จุดกึ่งกลางแผนที่'), kind: 'map' };
  }
  const name = (o) => (thai && o?.nameTh) || o?.label || o?.name || tr('Map centre','จุดกึ่งกลางแผนที่');
  function originLabel() {
    return choice.mode === 'rail'
      ? choice.stationID
        ? (railOrigin ? 'Near my location · ' : '') + name(data?.stationById.get(choice.stationID))
        : choice.system === 'BTS'
          ? tr('Any BTS station','สถานี BTS ใดก็ได้')
          : tr('Any rail station','สถานีรถไฟฟ้าใดก็ได้')
      : name(choice.origin);
  }
  function controls() {
    return `<header><h1>${tr('Find a work spot','หาที่นั่งทำงาน')}</h1><button class="close" aria-label="${tr('Close','ปิด')}">×</button></header>
    <nav class="journey-modes" aria-label="${tr('Your journey','การเดินทาง')}">${Object.entries(labels)
      .map(
        ([id, label]) =>
          `<button data-journey-mode="${id}" aria-pressed="${id === choice.mode}">${thai ? modeNames[id] : label}</button>`
      )
      .join('')}</nav>
    <div class="journey-origin"><label class="sr" for="journey-origin">${tr('Starting place, station or barber','จุดเริ่มต้น สถานี หรือร้านตัดผม')}</label><input id="journey-origin" type="search" autocomplete="off" placeholder="${tr('Starting place, station or barber','จุดเริ่มต้น สถานี หรือร้านตัดผม')}" value="${esc(originLabel())}" aria-controls="journey-origins" aria-expanded="false"><button class="journey-locate" aria-label="${tr('Use my location','ใช้ตำแหน่งของฉัน')}" title="${tr('Use my location','ใช้ตำแหน่งของฉัน')}">⌖</button></div>
    <div id="journey-origins" class="journey-origins" hidden></div>
    <nav class="journey-tasks" aria-label="${tr('Type of work','ประเภทงาน')}">${Object.entries(tasks)
      .map(
        ([id, label]) =>
          `<button data-work-task="${id}" aria-pressed="${id === choice.task}">${thai ? taskNames[id] : label}</button>`
      )
      .join('')}<details class="journey-options"><summary>${tr('Options','ตัวเลือก')}</summary><div>
      <label><input type="checkbox" data-known-only ${choice.strict ? 'checked' : ''}>${tr(' Known facilities only',' เฉพาะที่มีข้อมูลยืนยัน')}</label>
      ${choice.mode === 'rail' ? `<label>${tr('From station','จากสถานี')}<select data-last-mile><option value="walk" ${choice.lastMile === 'walk' ? 'selected' : ''}>${tr('Walk proximity · ≤800 m','ระยะใกล้ · ≤800 ม.')}</option><option value="ride" ${choice.lastMile === 'ride' ? 'selected' : ''}>${tr('Short ride · ≤2.5 km','ต่อรถระยะสั้น · ≤2.5 กม.')}</option></select></label><label><input type="checkbox" data-other-rail ${choice.system === 'all' ? 'checked' : ''}>${tr(' Include MRT, ARL &amp; other rail',' รวม MRT, ARL และสายอื่น')}</label>` : `<label>${tr('Search radius','รัศมีค้นหา')}<select data-radius>${(choice.mode === 'drive' ? [2000, 5000, 10000] : [400, 800, 1500]).map((n) => `<option value="${n}" ${n === choice.radius ? 'selected' : ''}>${n >= 1000 ? n / 1000 + ' km' : n + ' m'} ${tr('straight line','เส้นตรง')}</option>`).join('')}</select></label>`}
      <label>${tr('Time available','เวลาที่มี')}<select data-duration>${[60, 120, 240, 480].map((n) => `<option value="${n}" ${choice.duration === n ? 'selected' : ''}>${n / 60} ${tr(n === 60 ? 'hour' : 'hours','ชม.')}</option>`).join('')}</select></label>
    </div></details></nav>
    ${window.PlacePreferences?.render()||''}
    <p class="journey-status" role="status">${tr('Loading work-spot evidence…','กำลังโหลดข้อมูลสถานที่…')}</p>
    <ol class="journey-results now-list"></ol>
    <button class="journey-more linkish" hidden>${tr('Show 5 more','แสดงเพิ่ม 5 แห่ง')}</button>
    <details class="journey-method"><summary>What this search knows</summary><p>Laptop asks for Wi-Fi and outlets; Online asks for Wi-Fi; Reading needs neither. Drive + park also asks for parking. Known matches lead; unknown facilities stay marked “check first”, unless you choose known only. Place kind, independence and index never prove equipment.</p><p>Distances are straight lines to source points, not road/walking distances. Station points are not entrances. A short ride does not establish motorcycle-taxi availability, fare or access. Parking can be operator-stated or a separately mapped car park with an explicit access tag; neither promises a space.</p><p>Hours use Bangkok time, sampled through your selected window starting now. Travel time is extra. Unknown hours and admission conditions need checking. PLUB has no live route-traffic measurement: check the driving route before leaving.</p><p>OSM geography · 24 Oct 2026 · © OSM contributors, ODbL. Check the date on each operator or editorial source. Seat availability is not live. Starting-place search is local to this catalogue and mapped station/barber points. GPS runs only when you press the location button.</p></details>`;
  }
  function bind(sheet) {
    window.PlacePreferences?.bind(sheet,()=>render(sheet));
    sheet.querySelector('.close').onclick = closeSheet;
    sheet.querySelectorAll('[data-journey-mode]').forEach(
      (b) =>
        (b.onclick = () => {
          choice.mode = b.dataset.journeyMode;
          choice.radius = choice.mode === 'drive' ? 5000 : 800;
          if (choice.mode === 'nearby') choice.duration = 120;
          open();
        })
    );
    sheet.querySelectorAll('[data-work-task]').forEach(
      (b) =>
        (b.onclick = () => {
          choice.task = b.dataset.workTask;
          sheet
            .querySelectorAll('[data-work-task]')
            .forEach((x) => x.setAttribute('aria-pressed', x === b));
          render(sheet);
        })
    );
    const input = sheet.querySelector('#journey-origin'),
      hits = sheet.querySelector('#journey-origins');
    input.onfocus = () => {
      input.select();
      searchOrigins(sheet, '');
    };
    input.oninput = () => searchOrigins(sheet, input.value);
    input.onblur = (e) => {
      input.value = originLabel();
      if (e.relatedTarget && !hits.contains(e.relatedTarget)) {
        hits.hidden = true;
        input.setAttribute('aria-expanded', 'false');
      }
    };
    sheet.onpointerdown = (e) => {
      if (!e.target.closest('.journey-origin,#journey-origins')) {
        hits.hidden = true;
        input.value = originLabel();
        input.setAttribute('aria-expanded', 'false');
      }
    };
    input.onkeydown = (e) => {
      if (e.key === 'Escape' && !hits.hidden) {
        e.preventDefault();
        e.stopPropagation();
        hits.hidden = true;
        input.value = originLabel();
        input.setAttribute('aria-expanded', 'false');
      }
      if (e.key === 'ArrowDown' && !hits.hidden) {
        e.preventDefault();
        hits.querySelector('button')?.focus();
      }
    };
    hits.onkeydown = (e) => {
      if (e.key === 'Escape' && !hits.hidden) {
        e.preventDefault();
        e.stopPropagation();
        input.focus();
        hits.hidden = true;
        input.value = originLabel();
        input.setAttribute('aria-expanded', 'false');
        return;
      }
      const bs = [...hits.querySelectorAll('button')],
        at = bs.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        bs[(at + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length]?.focus();
      }
    };
    sheet.querySelector('.journey-locate').onclick = () => locateUser(sheet);
    sheet.querySelector('[data-known-only]').onchange = (e) => {
      choice.strict = e.target.checked;
      render(sheet);
    };
    sheet.querySelector('[data-radius]')?.addEventListener('change', (e) => {
      choice.radius = +e.target.value;
      render(sheet);
    });
    sheet.querySelector('[data-duration]').onchange = (e) => {
      choice.duration = +e.target.value;
      render(sheet);
    };
    sheet.querySelector('[data-last-mile]')?.addEventListener('change', (e) => {
      choice.lastMile = e.target.value;
      render(sheet);
    });
    sheet.querySelector('[data-other-rail]')?.addEventListener('change', (e) => {
      choice.system = e.target.checked ? 'all' : 'BTS';
      choice.stationID = null;
      railOrigin = null;
      input.value = originLabel();
      render(sheet);
    });
  }
  function searchOrigins(sheet, query) {
    if (!data) return;
    const hits = sheet.querySelector('#journey-origins'),
      input = sheet.querySelector('#journey-origin'),
      q = query.normalize('NFKC').toLowerCase().trim();
    let pool =
      choice.mode === 'rail'
        ? [...data.stationById.values()].filter(
            (s) => M.stationEligible(s) && (choice.system !== 'BTS' || s.systems.includes('BTS'))
          )
        : [
            ...data.raw.geo.origins,
            ...[...data.stationById.values()].filter(M.stationEligible),
            ...state.places
          ];
    const label = (p) => p.name || p.n || '',
      hay = (p) =>
        [label(p), p.nameTh, p.tags?.['addr:street'], p.tags?.['addr:suburb']]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
    pool = q
      ? pool
          .filter((p) => hay(p).includes(q))
          .sort(
            (a, b) =>
              Number(label(b).toLowerCase().startsWith(q)) -
              Number(label(a).toLowerCase().startsWith(q))
          )
      : pool.filter((p) => /^(Siam|Ramkhamhaeng|Asok|Sam Yan)$/i.test(label(p)));
    const picks = pool.slice(0, 6),
      all =
        choice.mode === 'rail'
          ? '<button data-start-any>Any ' +
            (choice.system === 'BTS' ? 'BTS' : 'rail') +
            ' station</button>'
          : '<button data-start-centre>Use current map centre</button>';
    hits.innerHTML =
      all +
      picks
        .map(
          (p, i) =>
            `<button data-origin-index="${i}"><b>${esc(label(p))}</b><small>${data.stationById.has(p.id) ? esc(p.systems.join('/') || 'Rail') + ' station' : p.kind === 'hairdresser' || data.raw.geo.origins.some((o) => o.id === p.id) ? 'Mapped barber / hairdresser' : esc(KIND_LABEL[p.k] || 'Starting place')}${p.nameTh ? ' · ' + esc(p.nameTh) : ''}</small></button>`
        )
        .join('') +
      (!picks.length && q
        ? '<p>No local match. Use your location or move the map and use its centre.</p>'
        : '');
    hits.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    hits
      .querySelector('[data-start-centre]')
      ?.addEventListener('click', () => pickOrigin(centre(), sheet));
    hits.querySelector('[data-start-any]')?.addEventListener('click', () => {
      choice.stationID = null;
      railOrigin = null;
      input.value = originLabel();
      hits.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      render(sheet);
    });
    hits.querySelectorAll('[data-origin-index]').forEach(
      (b) =>
        (b.onclick = () => {
          const p = picks[+b.dataset.originIndex];
          pickOrigin(
            { ...p, label: label(p), kind: data.stationById.has(p.id) ? 'station' : 'place' },
            sheet
          );
        })
    );
  }
  function pickOrigin(origin, sheet) {
    choice.origin = origin;
    if (choice.mode === 'rail') {
      choice.stationID = data.stationById.has(origin.id) ? origin.id : null;
      railOrigin = null;
    }
    const input = sheet.querySelector('#journey-origin');
    input.value = originLabel();
    input.setAttribute('aria-expanded', 'false');
    sheet.querySelector('#journey-origins').hidden = true;
    render(sheet);
  }
  async function locateUser(sheet) {
    const button = sheet.querySelector('.journey-locate'),
      status = sheet.querySelector('.journey-status');
    if (!navigator.geolocation) {
      status.textContent = 'Location is unavailable. Choose a starting place or map centre.';
      return;
    }
    button.disabled = true;
    status.textContent = 'Finding your location…';
    const token = revision;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        button.disabled = false;
        if (!current(sheet) || token !== revision) return;
        const { x, y } = { x: pos.coords.longitude, y: pos.coords.latitude };
        if (x < 100.3 || x > 100.95 || y < 13.45 || y > 14.1) {
          status.textContent =
            'Your location is outside this Bangkok catalogue. Choose a mapped starting place.';
          return;
        }
        choice.origin = {
          x,
          y,
          kind: 'gps',
          label: 'My location',
          accuracy: Math.round(pos.coords.accuracy)
        };
        choice.stationID = null;
        if (choice.mode === 'rail') {
          railOrigin = choice.origin;
          choice.stationID =
            [...data.stationById.values()]
              .filter(
                (s) =>
                  M.stationEligible(s) && (choice.system !== 'BTS' || s.systems.includes('BTS'))
              )
              .sort((a, b) => M.dist(a, choice.origin) - M.dist(b, choice.origin))[0]?.id || null;
        }
        sheet.querySelector('#journey-origin').value =
          choice.mode === 'rail' ? originLabel() : 'My location';
        render(sheet);
      },
      () => {
        button.disabled = false;
        if (current(sheet) && token === revision)
          status.textContent =
            tr('Location was not shared. Choose a starting place or use map centre.','ไม่ได้แชร์ตำแหน่ง เลือกจุดเริ่มต้นหรือใช้จุดกึ่งกลางแผนที่');
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }
  function admission(p) {
    const f = data.evidence.get(p.id)?.facts || {},
      pass = choice.duration <= 180 && f.short_pass ? f.short_pass : f.day_pass;
    let text = '';
    if (pass) {
      const v = pass.value;
      text =
        v.amount_thb === 0
          ? 'Free'
          : v.amount_thb != null
            ? `${v.amount_thb} THB${v.vat_included === false ? ' + VAT' : ''}${v.duration_hours ? ' / ' + v.duration_hours + ' h' : ' day pass'}`
            : 'Visitor pass · price check';
    }
    if (f.access?.value === 'registration_required')
      text += (text ? ' · ' : '') + 'Registration + ID required';
    else if (f.access?.value === 'visitor_pass') text += (text ? ' · ' : '') + tr('Admission required','ต้องลงทะเบียนเข้าใช้');
    else if (f.access?.value === 'wifi_id_required') text += (text ? ' · ' : '') + tr('Wi-Fi: national ID requested','Wi-Fi: ระบุให้แสดงบัตรประชาชน');
    return text;
  }
  const badge = (key, f) =>
    `<span class="${f.value === true ? 'known' : f.value === false ? 'no' : 'unknown'}" data-facility="${key}" data-value="${f.value === null ? 'unknown' : f.value}">${f.value === true ? '✓' : f.value === false ? '×' : '?'} ${{ wifi: 'Wi-Fi', power: tr('Outlets','ปลั๊กไฟ'), parking: tr('Parking','ที่จอดรถ') }[key]}</span>`;
  function sourceFacts(p, f, context = data) {
    const record = context.evidence.get(p.id),
      bits = ['wifi', 'power', 'parking', 'work_allowed']
        .filter((k) => f[k]?.value !== null || (k === 'parking' && f[k]?.source_ids.length))
        .map(
          (k) =>
            `<p><b>${esc({ wifi: 'Wi-Fi', power: 'Outlets', parking: 'Parking', work_allowed: 'Working' }[k])}</b> · ${esc(f[k].note)}</p>`
        );
    if (record?.facts?.hours) bits.push(`<p><b>Hours</b> · ${esc(record.facts.hours.note)}</p>`);
    for (const k of ['access', 'day_pass', 'short_pass'])
      if (record?.facts[k]) bits.push(`<p>${esc(record.facts[k].note)}</p>`);
    const ids = new Set(
      ['wifi', 'power', 'parking', 'work_allowed']
        .flatMap((k) => (f[k]?.basis === 'visitor' ? [] : f[k]?.source_ids || []))
        .concat(record?.source_ids || [])
    );
    const links = [...ids]
      .map((id) => {
        const s = context.raw.evidence?.sources?.[id];
        if (s)
          return `<a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.publisher)}</a> · ${s.tier === 'editorial' ? 'editorial' : 'operator'} · ${esc(s.updated_at || s.published_at || 'publication date unstated')} · checked ${esc(s.checked_at)}`;
        if (/^[nwr]\d+$/.test(id))
          return `<a href="${sourceURL(id)}" target="_blank" rel="noopener">OSM ${esc(id)}</a> · 24 Oct 2026`;
        return '';
      })
      .filter(Boolean);
    return `<details class="journey-evidence"><summary>${tr('Evidence &amp; entry conditions','แหล่งข้อมูลและเงื่อนไขการเข้าใช้')}</summary>${bits.join('')}${links.map((s) => '<p>' + s + '</p>').join('')}<p>Unknown means not documented. Confirm equipment at your seat, admission and parking availability before travelling.</p></details>`;
  }
  function route(p) {
    const inContext = contextIDs.has(p.id);
    if (inContext && choice.mode === 'rail') return M.directions(p, railOrigin, 'transit');
    return M.directions(p, inContext ? choice.origin : null, inContext ? choice.mode : 'drive');
  }

  const evidencedStay = row => row.stay === true && row.missing.length === 0 && !row.preference?.unknown.length;
  function resultCard(r, i) {
    const { p, facilities: f } = r,
      entry = admission(p),
      hours =
        r.stay === true
          ? tr(`Listed hours checked for next ${choice.duration / 60}h`,`ตรวจเวลาตามประกาศสำหรับ ${choice.duration / 60} ชม. ข้างหน้า`)
          : tr('Hours unknown · check your stay','ไม่ทราบเวลาเปิดปิด · ควรสอบถาม');
    const distance =
      choice.mode === 'rail'
        ? `${(r.stationDistance / 1000).toFixed(2)} ${tr('km from','กม. จาก')} ${r.station.systems.join('/') || tr('rail','รถไฟฟ้า')} ${name(r.station)} · ${tr('straight line','เส้นตรง')}`
        : `${(r.d / 1000).toFixed(2)} ${tr('km straight line from','กม. เส้นตรงจาก')} ${name(choice.origin)}`;
    const match = r.missing.length ? tr('Check ', 'ควรสอบถาม ') + r.missing.map(facilityName).join(' + ') : r.required.length ? tr('Needs documented','มีข้อมูลตรงเงื่อนไข') : tr('No equipment filter','ไม่กรองตามอุปกรณ์');
    return `<li data-journey-place="${esc(p.id)}" data-stay-evidence="${evidencedStay(r) ? 'documented' : 'check'}">${i > 0 && !evidencedStay(r) && evidencedStay(rows[i - 1]) ? `<h2 class="journey-hours">${tr('Check before you go','ควรตรวจสอบก่อนเดินทาง')}</h2>` : ''}<div class="journey-result-head"><span class="journey-number">${i + 1}</span><button class="journey-name" data-work-place="${esc(p.id)}">${PlaceTools.name(p.n)}${p.branch ? ` <span class="branch">· ${esc(p.branch)}</span>` : ''}</button></div><p class="journey-distance">${esc(KIND_LABEL[p.k])} · ${esc(distance)}</p><div class="journey-go"><a class="journey-primary" data-journey-directions href="${esc(route(p))}" target="_blank" rel="noopener">${choice.mode === 'drive' ? tr('Drive & check traffic','เส้นทางขับรถและจราจร') : choice.mode === 'rail' ? tr('Transit directions','เส้นทางรถไฟฟ้า') : tr('Walk directions','เส้นทางเดิน')} ↗</a><button data-work-place="${esc(p.id)}">${tr('Place &amp; photos','ข้อมูลและรูปสถานที่')}</button></div><div class="journey-facilities">${['wifi', 'power', ...(choice.mode === 'drive' ? ['parking'] : [])].map((k) => badge(k, f[k])).join('')}<span class="journey-match">${esc(match)}</span></div><p class="journey-hours">${hours}${entry ? ' · ' + esc(entry) : ''}</p>${choice.mode === 'rail' ? `<a class="journey-lastmile" href="${esc(M.directions(p, r.station, choice.lastMile === 'ride' ? 'two-wheeler' : 'walking'))}" target="_blank" rel="noopener">From ${esc(r.station.name)} · ${choice.lastMile === 'ride' ? 'check motorcycle route' : 'check walking route'} ↗</a>` : ''}${r.preference?.requested.length?`<p class="src">${esc(r.preference.summary)}</p>`:''}${sourceFacts(p, f)}</li>`;
  }
  function installMap() {
    if (!map.getLayer('pins-city') || map.getSource('journey-context')) return;
    map.addSource('journey-context', { type: 'geojson', data: empty() });
    map.addLayer({
      id: 'journey-origin-point',
      type: 'circle',
      source: 'journey-context',
      filter: ['==', ['get', 'kind'], 'origin'],
      paint: {
        'circle-radius': 7,
        'circle-color': '#fff',
        'circle-stroke-color': '#34454c',
        'circle-stroke-width': 3
      }
    });
    map.addLayer({
      id: 'journey-station-point',
      type: 'symbol',
      source: 'journey-context',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-font': ['Noto Sans Bold'],
        'text-offset': [0, -1.3],
        'text-anchor': 'bottom'
      },
      paint: { 'text-color': '#34454c', 'text-halo-color': '#fff', 'text-halo-width': 2 }
    });
    for (const id of ['route-line', 'route-stop', 'route-num'])
      if (map.getLayer(id)) map.moveLayer(id);
  }
  function draw() {
    installMap();
    if (!map.getSource('journey-context')) return;
    const features = [],
      stations = new Map(
        rows
          .slice(0, limit)
          .filter((r) => r.station)
          .map((r) => [r.station.id, r.station])
      );
    if (choice.mode !== 'rail' && choice.origin)
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [choice.origin.x, choice.origin.y] },
        properties: { kind: 'origin', label: 'Start · ' + name(choice.origin) }
      });
    for (const s of stations.values())
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.x, s.y] },
        properties: { kind: 'station', label: (s.systems.join('/') || 'Rail') + ' · ' + s.name }
      });
    map.getSource('journey-context').setData({ type: 'FeatureCollection', features });
    const picks = rows.slice(0, limit).map((r) => r.p);
    window.showRoute?.(picks, false);
    const points = [...picks, ...stations.values()];
    if (choice.mode !== 'rail' && choice.origin) points.push(choice.origin);
    if (choice.mode === 'rail' && railOrigin) points.push(railOrigin);
    if (picks.length) {
      const xs = points.map((p) => p.x),
        ys = points.map((p) => p.y),
        dock = document.querySelector('.atlas-dock'),
        mapBox = document.querySelector('#map').getBoundingClientRect(),
        controls = document.querySelector('.maplibregl-ctrl-top-right')?.getBoundingClientRect();
      map.fitBounds(
        [
          [Math.min(...xs), Math.min(...ys)],
          [Math.max(...xs), Math.max(...ys)]
        ],
        {
          padding: {
            top: isPhone()
              ? Math.max(100, dock.getBoundingClientRect().bottom - mapBox.top + 12)
              : 70,
            left: 72,
            right: Math.max(72,controls ? mapBox.right-controls.left+20 : 80),
            bottom: isPhone() ? active.offsetHeight + 25 : 50
          },
          maxZoom: 16
        }
      );
    }
  }
  let limit = 5;
  function render(sheet) {
    if (!data || !current(sheet)) return;
    const token = ++revision;
    sheet.dataset.journeyRevision = token;
    limit = 5;
    rows = M.rank(
      state.places.filter(p=>state.kinds.has(p.k)),
      data,
      state.scores,
      choice,
      new Date(),
      window.isOpen,
      barrierChecked ? crossesRiver : undefined
    );
    if(window.PlacePreferences)rows=PlacePreferences.rank(rows,data,state.scores,{strict:choice.strict});
    rows.sort((a, b) => Number(evidencedStay(b)) - Number(evidencedStay(a)));
    contextIDs = new Set(rows.slice(0, limit).map((r) => r.p.id));
    renderRows(sheet);
    draw();
  }
  function renderRows(sheet) {
    if (!current(sheet)) return;
    contextIDs = new Set(rows.slice(0, limit).map((r) => r.p.id));
    const documented = rows.filter(evidencedStay).length;
    sheet.querySelector('.journey-status').textContent = tr(
      `${rows.length} ${rows.length === 1 ? 'option' : 'options'} · ${documented} with matching facts and hours`,
      `${rows.length} ตัวเลือก · ${documented} แห่งมีข้อมูลและเวลาเปิดตรงเงื่อนไข`
    );
    sheet.querySelector('.journey-results').innerHTML = rows.length
      ? rows.slice(0, limit).map(resultCard).join('')
      : `<li class="journey-empty"><b>${tr('No place meets these settings.','ไม่พบสถานที่ตามเงื่อนไข')}</b><p>${tr('Try a wider radius, a short ride from the station, Reading, or turn off known-only.','ลองเพิ่มรัศมี เลือกต่อรถจากสถานี เลือกอ่านหนังสือ หรือรวมสถานที่ที่ยังต้องสอบถาม')}</p><button class="linkish" data-relax>${tr('Include check-first places','รวมสถานที่ที่ยังต้องสอบถาม')}</button></li>`;
    sheet.querySelector('[data-relax]')?.addEventListener('click', () => {
      choice.strict = false;
      sheet.querySelector('[data-known-only]').checked = false;
      render(sheet);
    });
    sheet
      .querySelectorAll('[data-work-place]')
      .forEach((b) => (b.onclick = () => select(state.byId.get(b.dataset.workPlace), true)));
    const more = sheet.querySelector('.journey-more');
    more.hidden = limit >= rows.length;
    more.onclick = () => {
      limit += 5;
      renderRows(sheet);
      draw();
    };
    if (!barrierChecked)
      sheet.querySelector('.journey-status').textContent +=
        tr(' · river check unavailable; check crossings',' · ยังตรวจการข้ามแม่น้ำไม่ได้ โปรดตรวจเส้นทาง');
  }
  async function open(mode, options = {}) {
    if (options.lang) thai = options.lang === 'th';
    state.mood = null;
    state.flags.clear();
    const resume=(active&&current(active))||document.querySelector('#sheet:not([hidden]) [data-work-back]');
    if(!resume)state.kinds = new Set(['cafe', 'coworking', 'library']);
    document.querySelectorAll('[data-flag]').forEach((b) => b.setAttribute('aria-pressed', false));
    document
      .querySelectorAll('[data-kind]')
      .forEach((b) => b.setAttribute('aria-pressed', state.kinds.has(b.dataset.kind)));
    Atlas.reset();
    const url = new URL(location.href);
    for (const k of ['p', 'hood', 'hop', 'mood']) url.searchParams.delete(k);
    history.replaceState(null, '', url);
    if (mode && labels[mode]) {
      choice.mode = mode;
      choice.radius = mode === 'drive' ? 5000 : 800;
      if (mode === 'nearby') choice.duration = 120;
    }
    if (Object.hasOwn(tasks, options.task)) choice.task = options.task;
    if ([60, 120, 240, 480].includes(options.duration)) choice.duration = options.duration;
    // Selecting a result moves the camera. Returning keeps the original start.
    if (options.origin) choice.origin = options.origin;
    else if (!resume && (!choice.origin || choice.origin.kind === 'map' ||
      (mode && !(globalThis.visibleOnMap?.(choice.origin) ?? map.getBounds().contains([choice.origin.x, choice.origin.y]))))) {
      choice.origin = centre();
    }
    const sheet = openSheet(controls());
    sheet.classList.add('journey-sheet');
    if (thai) sheet.lang = 'th';
    active = sheet;
    bind(sheet);
    const token = ++revision;
    try {
      await Promise.all([load(), ensureWork()]);
      barrierChecked = !!(await (window.barriersReady || Promise.resolve(false)));
      if (!current(sheet) || revision !== token) return;
      sheet.querySelector('#journey-origin').value = originLabel();
      render(sheet);
      if (options.focusPlace) {
        const button = sheet.querySelector('[data-work-place="' + CSS.escape(options.focusPlace) + '"]');
        (button || sheet.querySelector('#journey-origin')).focus({ preventScroll: true });
      }
    } catch (e) {
      if (!current(sheet) || revision !== token) return;
      const status = sheet.querySelector('.journey-status');
      status.textContent = e.message;
      sheet.querySelector('.journey-results').innerHTML =
        '<li><button class="linkish" data-work-retry>Retry work-spot data</button><button class="linkish" data-work-browse>Browse the catalogue</button></li>';
      sheet.querySelector('[data-work-retry]').onclick = () => open();
      sheet.querySelector('[data-work-browse]').onclick = () => {
        closeSheet();
        setListOpen(true);
      };
    }
  }
  function placePanel(p) {
    const context=data || M.makeData({}, {}, evidence || {});
    const f = M.facilities(p, context, state.scores);
    return `<div class="journey-place-facts">${contextIDs.has(p.id) ? `<button class="linkish" data-work-back>${tr('← Back to work spots','← กลับไปยังผลค้นหา')}</button><p>${tr('Directions start','จุดเริ่มต้นเส้นทาง')}: ` + esc(choice.mode === 'rail' ? (railOrigin ? name(railOrigin) : 'choose in Maps') : name(choice.origin)) + '</p>' : ''}<div class="journey-facilities">${badge('parking', f.parking)}</div>${sourceFacts(p, f, context)}${window.PlacePreferences?.renderFacts(p,context,state.scores)||''}<button type="button" class="linkish" data-work-preferences>Find places for my needs →</button></div>`;
  }
  // Detail-only loading makes explicit source tags available even without opening
  // the finder first. Late data may update its own evidence slot, never a newer task.
  function warmPlace(p,slot){
    const generation=sheetGeneration,owner=slot?.closest('#sheet');
    load().then(()=>{
      if(generation!==sheetGeneration||state.selected?.id!==p.id||!owner?.isConnected||owner.hidden||owner.querySelector('.been-form'))return;
      // First-party evidence may replace the slot while the geography is loading.
      // Same task/generation owns its current slot; a detached old node must not
      // prevent the later, richer source facts from reaching the visible sheet.
      const current=owner.querySelector('.journey-place-facts');if(current)current.outerHTML=placePanel(p);
    }).catch(()=>{});
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-work-back]')) open(undefined, { focusPlace: state.selected?.id });
    if(e.target.closest('[data-work-preferences]')){open();const detail=document.querySelector('[data-place-preferences]');if(detail)detail.open=true;}
  });
  window.WorkFinder = {
    open,
    load,
    placePanel,
    warmPlace,
    kindsChanged(){if(active&&current(active)&&data)render(active)},
    directions: route,
    hours: (p) => evidence?.places?.[p.id]?.facts?.hours?.value || p.hours,
    warmEvidence: () =>
      loadEvidence()
        .then(() => {
          refresh();
          const p=state.selected,slot=document.querySelector('.journey-place-facts');
          if(p&&slot&&!document.querySelector('.been-form'))slot.outerHTML=placePanel(p);
        })
        .catch(() => {}),
    get data() {
      return data;
    },
    get choice() {
      return choice;
    },
    get rows() {
      return rows;
    },
    onViewsReady() {
      if (active && current(active) && rows.length) draw();
    },
    clearMap() {
      map.getSource('journey-context')?.setData(empty());
    }
  };
})();
