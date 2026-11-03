// Watch / talk. Enrichment sidecar (data/talk-media.json), never a catalogue or a new pin.
// Catalogue sheets load a video only when place_id is that entry's own catalogue seed.
// candidate_only stays in this list, labelled unmatched. Name hints are not matches.
(() => {
  // Pilot note, not a catalogue field: Kamaboko Coffee Camp was reported closed in May 2022.
  const CLOSED = {
    'hidden-kamabokocoffeecamp': {
      when: 'May 2022',
      note: 'Reported closed in May 2022. These videos are historical.',
    },
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let data = null, pending = null, byPlace = new Map(), byId = new Map();

  function closedNote(entry) {
    return entry && CLOSED[entry.id] || null;
  }

  function matched(entry) {
    return !!(entry && entry.location_status === 'catalogue_seed' && typeof entry.place_id === 'string' && entry.place_id);
  }

  function youtubeEmbed(video) {
    if (!video || video.platform !== 'youtube') return null;
    const id = String(video.video_id || '');
    if (!/^[\w-]{11}$/.test(id)) return null;
    const expected = `https://www.youtube-nocookie.com/embed/${id}`;
    return video.embed_url === expected ? expected : null;
  }

  function httpsHost(value, hosts) {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' || u.username || u.password) return null;
      return hosts.includes(u.hostname) ? u.href : null;
    } catch { return null; }
  }

  function watchUrl(video) {
    const id = String(video?.video_id || '');
    const given = httpsHost(video?.url, ['www.youtube.com', 'youtube.com', 'youtu.be']);
    if (given && given.includes(id)) return given;
    return /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
  }

  function use(json) {
    if (!json || json.version !== 1 || !Array.isArray(json.entries)) throw new Error('talk-media schema');
    data = json;
    byPlace = new Map();
    byId = new Map();
    for (const entry of json.entries) {
      if (entry && entry.id) byId.set(entry.id, entry);
      // Name candidates are hints. They never become the place-sheet match.
      if (matched(entry) && (entry.videos || []).some(v => v.platform === 'youtube')) {
        if (!byPlace.has(entry.place_id)) byPlace.set(entry.place_id, entry);
      }
    }
    return json;
  }

  function forPlace(placeId) {
    return placeId ? byPlace.get(placeId) || null : null;
  }

  function load() {
    if (data) return Promise.resolve(data);
    if (pending) return pending;
    pending = (async () => {
      const r = await fetch('data/talk-media.json', { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error('talk-media');
      return use(await r.json());
    })().catch(err => { pending = null; throw err; });
    return pending;
  }

  function player(video) {
    const embed = youtubeEmbed(video);
    const title = video?.title || 'Untitled talk';
    const watch = watchUrl(video);
    const channelHref = httpsHost(video?.channel_url, ['www.youtube.com', 'youtube.com']);
    const channel = video?.channel || 'YouTube';
    const frame = embed
      ? `<iframe class="talk-frame" src="${esc(embed)}" title="${esc(title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
      : `<p class="talk-fallback" role="status">This player can’t be embedded here.</p>`;
    const titleHtml = watch
      ? `<a href="${esc(watch)}" target="_blank" rel="noopener nofollow">${esc(title)}</a>`
      : `<span>${esc(title)}</span>`;
    const channelHtml = channelHref
      ? `<a href="${esc(channelHref)}" target="_blank" rel="noopener nofollow">${esc(channel)}</a>`
      : esc(channel);
    const when = video?.published_at ? ` · ${esc(video.published_at)}` : '';
    return `<figure class="talk-video">${frame}<figcaption>${titleHtml}<span class="src">${channelHtml} · YouTube${when}</span><span class="talk-fallback">If the player stays blank, the channel blocks embeds. The title link still opens YouTube.</span></figcaption></figure>`;
  }

  function tiktokLinks(entry) {
    const links = [];
    const search = httpsHost(entry?.tiktok_search_url, ['www.tiktok.com', 'tiktok.com']);
    if (search) links.push(`<a href="${esc(search)}" target="_blank" rel="noopener nofollow">TikTok search ↗</a>`);
    for (const item of entry?.tiktok_candidates || []) {
      const href = httpsHost(item?.url || item, ['www.tiktok.com', 'tiktok.com']);
      if (href) links.push(`<a href="${esc(href)}" target="_blank" rel="noopener nofollow">${esc(item?.title || 'TikTok')} ↗</a>`);
    }
    return links.length ? `<p class="talk-tiktok">${links.join(' · ')}</p>` : '';
  }

  function status(entry) {
    const closed = closedNote(entry);
    const parts = [];
    if (closed) parts.push(`<p class="talk-closed" role="status" data-closed="2022-05"><b>Closed · ${esc(closed.when)}</b>. ${esc(closed.note)} Not shown as open.</p>`);
    if (matched(entry)) parts.push(`<p class="src">Linked by catalogue id ${esc(entry.place_id)}. The title and channel stay with the people who made the video.</p>`);
    else parts.push(`<p class="talk-unmatched" role="status">Unmatched · discovery. Not a map pin. A catalogue name hint is not a verified place.</p>`);
    return parts.join('');
  }

  function block(entry, { heading = true } = {}) {
    const videos = (entry?.videos || []).filter(v => v && v.platform === 'youtube').slice(0, 5);
    if (!videos.length) return '';
    return `<section class="talk" data-talk="${esc(entry.id)}" data-talk-status="${matched(entry) ? 'catalogue' : 'unmatched'}">${heading ? '<h2 class="micro">Watch / talk</h2>' : ''}${status(entry)}${videos.map(player).join('')}${tiktokLinks(entry)}<p class="src">Enrichment sidecar, not the place catalogue. Embeds use youtube-nocookie. No Wongnai copy.</p></section>`;
  }

  function section(placeId) {
    const entry = forPlace(placeId);
    return entry ? block(entry) : '';
  }

  function listItem(entry) {
    const closed = closedNote(entry);
    const count = (entry.videos || []).length;
    const bits = [
      closed ? `Closed · ${closed.when}` : '',
      matched(entry) ? 'Catalogue place' : 'Unmatched · discovery',
      `${count} ${count === 1 ? 'video' : 'videos'}`,
    ].filter(Boolean);
    const place = matched(entry) ? `<button type="button" class="linkish" data-talk-place="${esc(entry.place_id)}">Open place</button>` : '';
    return `<li><button type="button" class="talk-name" data-talk-entry="${esc(entry.id)}">${esc(entry.name)}</button>${entry.area ? `<span class="talk-area">${esc(entry.area)}</span>` : ''}<p class="src">${esc(bits.join(' · '))}</p>${place}</li>`;
  }

  function rowsFor(json, tab, q) {
    const query = String(q || '').toLowerCase().trim();
    return json.entries.filter(entry => {
      const n = (entry.videos || []).length;
      if (tab === 'map' && !(matched(entry) && n)) return false;
      if (tab === 'unmatched' && !(entry.location_status === 'candidate_only' && n)) return false;
      if (tab !== 'map' && tab !== 'unmatched' && !n) return false;
      if (!query) return true;
      return `${entry.name || ''} ${entry.area || ''}`.toLowerCase().includes(query);
    });
  }

  function bindFrames(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('iframe.talk-frame').forEach(frame => {
      if (frame.dataset.bound) return;
      frame.dataset.bound = '1';
      frame.addEventListener('error', () => {
        const note = document.createElement('p');
        note.className = 'talk-fallback';
        note.setAttribute('role', 'status');
        note.textContent = 'This embed did not load. Use the title link to watch on YouTube.';
        frame.replaceWith(note);
      });
    });
  }

  function openPlace(id, sheet) {
    const place = typeof state !== 'undefined' && state.byId?.get(id);
    if (place && typeof select === 'function') { select(place, true); return; }
    const note = document.createElement('p');
    note.className = 'src';
    note.setAttribute('role', 'status');
    note.textContent = 'That catalogue place is not loaded on the map yet.';
    sheet.querySelector(`[data-talk-place="${CSS.escape(id)}"]`)?.after(note);
  }

  function showEntry(sheet, entry, json, paint) {
    const place = matched(entry)
      ? `<p><button type="button" class="linkish" data-talk-place="${esc(entry.place_id)}">Open place on the map</button></p>`
      : '';
    sheet.innerHTML = `<header><h1>Watch / talk</h1><button class="close" type="button" aria-label="Close">×</button></header><button type="button" class="talk-back" data-talk-back>← All talks</button><h2>${esc(entry.name)}</h2>${entry.area ? `<p class="src">${esc(entry.area)}</p>` : ''}${place}${block(entry, { heading: false })}`;
    sheet.querySelector('.close').onclick = closeSheet;
    sheet.querySelector('[data-talk-back]').onclick = () => paint();
    sheet.querySelector('[data-talk-place]')?.addEventListener('click', e => openPlace(e.currentTarget.dataset.talkPlace, sheet));
    bindFrames(sheet);
    const heading = sheet.querySelector('h1');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  function open() {
    const sheet = openSheet('<header><h1>Watch / talk</h1><button class="close" type="button" aria-label="Close">×</button></header><p role="status">Loading talks…</p>');
    sheet.classList.add('talk-sheet');
    const generation = sheetGeneration;
    let tab = 'video', limit = 8, q = '';
    const renderRows = json => {
      if (generation !== sheetGeneration || sheet.hidden || !sheet.classList.contains('talk-sheet')) return;
      const rows = rowsFor(json, tab, q);
      const shown = rows.slice(0, limit);
      sheet.querySelector('.talk-count').textContent = `${shown.length} of ${rows.length} · ${json.counts?.venues_with_video ?? ''} venues with a video · checked ${json.checked_at || ''}`.replace(/\s+/g, ' ').trim();
      sheet.querySelector('.talk-list').innerHTML = shown.map(listItem).join('') || '<li><p class="src">No talks in this list.</p></li>';
      sheet.querySelectorAll('[data-talk-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.talkTab === tab)));
      const more = sheet.querySelector('.talk-more');
      more.hidden = limit >= rows.length;
      sheet.querySelectorAll('[data-talk-entry]').forEach(b => b.addEventListener('click', () => showEntry(sheet, byId.get(b.dataset.talkEntry), json, () => paint(json))));
      sheet.querySelectorAll('[data-talk-place]').forEach(b => b.addEventListener('click', () => openPlace(b.dataset.talkPlace, sheet)));
    };
    const paint = json => {
      if (generation !== sheetGeneration || sheet.hidden || !sheet.classList.contains('talk-sheet')) return;
      sheet.innerHTML = `<header><h1>Watch / talk</h1><button class="close" type="button" aria-label="Close">×</button></header><p>YouTube talks found by venue name. A place sheet shows a video only when that catalogue id was the seed. Unmatched names stay off the map. Embeds are privacy-enhanced; the title and channel stay attributed. TikTok is a search link only.</p><div class="talk-tabs" role="group" aria-label="Which talks"><button type="button" data-talk-tab="video">With a video</button><button type="button" data-talk-tab="map">On the map</button><button type="button" data-talk-tab="unmatched">Unmatched</button></div><label class="talk-search">Find in this list<input type="search" placeholder="Venue or area" aria-label="Find in talks"></label><p class="src talk-count" role="status"></p><ol class="talk-list"></ol><button type="button" class="talk-more">Show more</button>`;
      sheet.querySelector('.close').onclick = closeSheet;
      sheet.querySelectorAll('[data-talk-tab]').forEach(b => b.onclick = () => { tab = b.dataset.talkTab; limit = 8; renderRows(json); });
      const input = sheet.querySelector('input');
      input.value = q;
      input.oninput = () => { q = input.value; limit = 8; renderRows(json); };
      sheet.querySelector('.talk-more').onclick = () => { limit += 8; renderRows(json); };
      renderRows(json);
      const heading = sheet.querySelector('h1');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    };
    load().then(json => paint(json)).catch(() => {
      if (generation !== sheetGeneration || sheet.hidden) return;
      const p = sheet.querySelector('[role=status]');
      if (p) p.textContent = 'Talks are unavailable. Your map and notebook still work.';
    });
  }

  function attach(sheet, place) {
    if (!sheet || !place) return;
    let generation = 0;
    try { generation = sheetGeneration; } catch { generation = 0; }
    load().then(() => {
      let now = 0;
      try { now = sheetGeneration; } catch { now = generation; }
      if (now !== generation) return;
      if (typeof state !== 'undefined' && state.selected !== place) return;
      if (sheet.hidden) return;
      if (sheet.querySelector('.been-form')?.dataset.place === place.id) return;
      const html = section(place.id);
      const existing = sheet.querySelector('.talk');
      if (!html) { existing?.remove(); return; }
      if (existing) existing.outerHTML = html;
      else {
        const anchor = sheet.querySelector('nav.links');
        if (anchor) anchor.insertAdjacentHTML('beforebegin', html);
        else sheet.insertAdjacentHTML('beforeend', html);
      }
      bindFrames(sheet);
    }).catch(() => {
      // The place sheet stays useful when the sidecar cannot load.
    });
  }

  globalThis.TalkMedia = { use, load, forPlace, block, section, listItem, rowsFor, closedNote, youtubeEmbed, player, attach, open, bindFrames };
})();
