// MSH audit #3 — independent measuring instrument (Verifier).
// Built from the live rendered interface only. Does NOT read scripts/audit-msh.mjs.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];

export const MODES = [
  { name: 'PL;UB', url: 'https://co.nonarkara.org/' },
  { name: 'CL;UB', url: 'https://club.nonarkara.org/' },
];

// Trap the MapLibre Map instance as it is constructed, so the audit can
// interrogate the live camera instead of guessing from CSS.
export const MAP_TRAP = `
(() => {
  const holder = {};
  Object.defineProperty(window, 'maplibregl', {
    configurable: true,
    get() { return holder.v; },
    set(v) {
      holder.v = v;
      try {
        const OrigMap = v.Map;
        v.Map = class extends OrigMap {
          constructor(...a) { super(...a); window.__auditMap = this; }
        };
      } catch (e) { window.__auditTrapError = String(e); }
    }
  });
})();
`;

const PAGE_PROBE = () => {
  const R = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      top: +r.top.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
    };
  };
  const first = (s) => document.querySelector(s);
  const all = (s) => Array.from(document.querySelectorAll(s));

  // Rectangle-union area, so overlapping occluders are not subtracted twice.
  const unionArea = (rects) => {
    if (!rects.length) return 0;
    const xs = [...new Set(rects.flatMap(r => [r.left, r.right]))].sort((a, b) => a - b);
    let area = 0;
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i], x1 = xs[i + 1];
      if (x1 - x0 <= 0) continue;
      const mid = (x0 + x1) / 2;
      const spans = rects.filter(r => r.left <= mid && r.right >= mid)
        .map(r => [r.top, r.bottom]).sort((a, b) => a[0] - b[0]);
      let h = 0, cur = null;
      for (const [t, b] of spans) {
        if (cur === null) { cur = [t, b]; continue; }
        if (t <= cur[1]) cur[1] = Math.max(cur[1], b);
        else { h += cur[1] - cur[0]; cur = [t, b]; }
      }
      if (cur) h += cur[1] - cur[0];
      area += (x1 - x0) * h;
    }
    return area;
  };
  const clip = (r, box) => {
    if (!r) return null;
    const left = Math.max(r.left, box.left), right = Math.min(r.right, box.right);
    const top = Math.max(r.top, box.top), bottom = Math.min(r.bottom, box.bottom);
    if (right <= left || bottom <= top) return null;
    return { left, right, top, bottom, w: right - left, h: bottom - top };
  };

  const vw = window.innerWidth, vh = window.innerHeight;
  const map = window.__auditMap;

  const bar = R(first('header.bar'));
  const chips = R(first('nav.chips'));
  const mapEl = R(first('#map'));
  const side = R(first('aside.side'));
  const listWrap = R(first('#list-wrap'));
  const railHeader = R(first('.rail-header'));
  const listEl = R(first('#list'));
  const sheetEl = R(first('#sheet'));
  const countEl = first('#count');

  const occluderSel = [
    'header.bar', 'nav.chips', '#list-wrap', 'aside.side .sheet',
    '.atlas-dock', '.maplibregl-ctrl-top-right', '.maplibregl-ctrl-bottom-right',
    '.maplibregl-ctrl-bottom-left', '.maplibregl-ctrl-top-left',
  ].join(',');
  const occluders = all(occluderSel).map(R).filter(Boolean)
    .filter(r => r.w > 0 && r.h > 0)
    .map(r => clip(r, mapEl))
    .filter(Boolean);

  const mapArea = mapEl ? mapEl.w * mapEl.h : 0;
  const occluded = unionArea(occluders);
  const visibleMap = Math.max(0, mapArea - occluded);
  const visibleMapShare = (visibleMap / (vw * vh)) * 100;

  const railClip = clip(listWrap, mapEl);
  const shareRailOnly = ((mapArea - (railClip ? railClip.w * railClip.h : 0)) / (vw * vh)) * 100;

  const chromeBandH = (bar ? bar.h : 0) + (chips ? chips.h : 0);
  const chromeShare = (chromeBandH / vh) * 100;
  const chromeWithRailH = chromeBandH + (railHeader ? railHeader.h : 0);
  const chromeWithRailShare = (chromeWithRailH / vh) * 100;

  const panelBottom = listWrap ? listWrap.bottom : 0;
  let lastContentBottom = 0, lastContentSel = null;
  for (const el of all('#list li')) {
    const r = R(el);
    if (!r || r.h === 0) continue;
    if (r.bottom > lastContentBottom) { lastContentBottom = r.bottom; lastContentSel = el.className || el.tagName; }
  }
  const deadBelow = listWrap ? +(panelBottom - lastContentBottom).toFixed(1) : null;

  let cam = null;
  if (map) {
    try {
      const c = map.getCenter();
      const canvas = map.getCanvas();
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      const pt = map.project([c.lng, c.lat]);
      const pad = map.getPadding();
      const appBounds = map.getBounds();
      const rawSW = map.unproject([0, ch]), rawNE = map.unproject([cw, 0]);
      const appSW = map.unproject([360, ch]), appNE = map.unproject([cw, 0]);
      const railRight = railClip ? railClip.right : mapEl.left;
      cam = {
        center: [+c.lng.toFixed(6), +c.lat.toFixed(6)],
        zoom: +map.getZoom().toFixed(3),
        padding: { top: pad.top, bottom: pad.bottom, left: pad.left, right: pad.right },
        projectedCentre: { x: +pt.x.toFixed(1), y: +pt.y.toFixed(1) },
        canvas: { w: cw, h: ch },
        rawBounds: { sw: [+rawSW.lng.toFixed(6), +rawSW.lat.toFixed(6)], ne: [+rawNE.lng.toFixed(6), +rawNE.lat.toFixed(6)] },
        appBoundsComputed: { sw: [+appSW.lng.toFixed(6), +appSW.lat.toFixed(6)], ne: [+appNE.lng.toFixed(6), +appNE.lat.toFixed(6)] },
        appBoundsReported: { sw: [+appBounds.getSouthWest().lng.toFixed(6), +appBounds.getSouthWest().lat.toFixed(6)], ne: [+appBounds.getNorthEast().lng.toFixed(6), +appBounds.getNorthEast().lat.toFixed(6)] },
        visibleRegionCentreX: +(((mapEl.left + railRight) + mapEl.right) / 2).toFixed(1),
        canvasCentreX: +(mapEl.left + cw / 2).toFixed(1),
        railRight: +railRight.toFixed(1),
      };
    } catch (e) { cam = { error: String(e) }; }
  }

  const listRows = all('#list li[data-id]').map(el => {
    const r = R(el);
    const id = el.dataset.id;
    let projected = null;
    if (map && id && window.state && window.state.byId) {
      const p = window.state.byId.get(id);
      if (p) { const pt = map.project([p.x, p.y]); projected = { x: +pt.x.toFixed(1), y: +pt.y.toFixed(1) }; }
    }
    return { id, name: el.querySelector('.row-title')?.textContent?.trim() || null, rect: r, projected };
  });

  let stripUnderPanel = 0, independentVisible = null, independentStrip = null;
  if (map && window.state && mapEl) {
    const railRight = railClip ? railClip.right : mapEl.left;
    const kinds = window.state.kinds;
    let vis = 0, strip = 0;
    for (const p of window.state.places || []) {
      const pt = map.project([p.x, p.y]);
      const x = mapEl.left + pt.x, y = mapEl.top + pt.y;
      if (x < mapEl.left || x > mapEl.right || y < mapEl.top || y > mapEl.bottom) continue;
      const hidden = occluders.some(o => x >= o.left && x <= o.right && y >= o.top && y <= o.bottom);
      if (hidden) continue;
      if (!kinds || !kinds.has(p.k)) continue;
      vis++;
      if (x < railRight && y > (listWrap ? listWrap.bottom : 0)) strip++;
    }
    independentVisible = vis;
    independentStrip = strip;
    stripUnderPanel = strip;
  }

  const moreButtons = all('#list .list-more').map(b => b.textContent.trim());
  const metaMsgs = all('#list li.meta').map(b => b.textContent.trim());

  return {
    viewport: { vw, vh },
    rects: { bar, chips, mapEl, side, listWrap, railHeader, listEl, sheetEl },
    occluders,
    mapArea: +mapArea.toFixed(1),
    occluded: +occluded.toFixed(1),
    visibleMap: +visibleMap.toFixed(1),
    visibleMapShare: +visibleMapShare.toFixed(2),
    shareRailOnly: +shareRailOnly.toFixed(2),
    chromeBandH: +chromeBandH.toFixed(1),
    chromeShare: +chromeShare.toFixed(2),
    chromeWithRailH: +chromeWithRailH.toFixed(1),
    chromeWithRailShare: +chromeWithRailShare.toFixed(2),
    panel: { bottom: +panelBottom.toFixed(1), lastContentBottom: +lastContentBottom.toFixed(1), lastContentSel, deadBelow },
    countText: countEl ? countEl.textContent.trim() : null,
    listRowCount: listRows.length,
    listRows,
    moreButtons,
    metaMsgs,
    stripUnderPanel, independentVisible, independentStrip,
    cam,
    state: window.state ? {
      catalogueStatus: window.state.catalogueStatus,
      cannabisStatus: window.state.cannabisStatus,
      clubMode: window.state.clubMode,
      kinds: window.state.kinds ? Array.from(window.state.kinds) : null,
      totalPlaces: window.state.places ? window.state.places.length : null,
    } : null,
    bodyScrollH: document.documentElement.scrollHeight,
    innerH: vh,
  };
};
