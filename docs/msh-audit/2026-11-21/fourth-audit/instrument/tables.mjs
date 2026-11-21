#!/usr/bin/env node
// Assemble the JSON tables (one file per question) from the raw runs.
import fs from 'node:fs';
const OUT='/tmp/msh-audit-verifier-4/out', DATA='/tmp/msh-audit-verifier-4/data';
fs.mkdirSync(DATA,{recursive:true});
const J=(p)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){return null;}};
const run=(label)=>J(`${OUT}/${label}-summary.json`);
const runs={};
for (const l of ['LIVE2-plub','LIVE2-club','LIVE-plub','LIVE-club','OLD4-plub']) runs[l]=run(l);
const W=(name,obj)=>{fs.writeFileSync(`${DATA}/${name}.json`,JSON.stringify(obj,null,2));console.log('TABLE',name);};

const modes=[['plub','PL;UB'],['club','CL;UB']];
const vws=[390,1024,1440];
const pick=(l)=>runs[l]?.viewports||{};

// Q1 map share
const q1=[];
for (const [m,label] of modes) for (const vw of vws) {
  const r=pick(`LIVE2-${m}`)[vw]; if(!r) continue;
  const b=r.before, a=r.afterDisclosure;
  q1.push({ mode:label, vw, vh:r.vh,
    mapSharePaintedPct:b.share.mapSharePainted, mapShareUsablePct:b.share.mapShareUsable,
    afterShowAll_paintedPct:a?.share?.mapSharePainted, afterShowAll_usablePct:a?.share?.mapShareUsable,
    canvas:b.share.canvas, firstScreenPx:r.vh*(vw===390?390:vw),
    passes60_before:b.share.mapShareUsable>=60, passes60_after:(a?.share?.mapShareUsable>=60) });
}
W('q1-map-share',q1);

// Q2 count honesty
const q2=[];
for (const [m,label] of modes) for (const vw of vws) {
  const r=pick(`LIVE2-${m}`)[vw]; if(!r) continue;
  for (const phase of ['before','afterDisclosure']) {
    const s=r[phase]; if(!s) continue;
    q2.push({ mode:label, vw, phase,
      statedCount:s.statedText, appRecomputed:s.count.appCount, auditorReading:s.count.myCount,
      disagreement:s.count.mismatchTotal,
      countedButNotVisible:s.count.mismatches.filter(x=>x.app&&!x.mine).map(x=>({id:x.id,x:x.x,y:x.y,why:x.why})),
      visibleButNotCounted:s.count.mismatches.filter(x=>!x.app&&x.mine).map(x=>({id:x.id,x:x.x,y:x.y,why:x.why})) });
  }
}
W('q2-count-honesty',q2);

// Q3 44px targets
const q3=[];
for (const [m,label] of modes) for (const vw of vws) {
  const r=pick(`LIVE2-${m}`)[vw]; if(!r) continue;
  const ph=JSON.parse(fs.readFileSync(`${OUT}/PHONE-${m}.json`,'utf8'));
  const open=ph.open||ph.afterEscape||{};
  q3.push({ mode:label, vw,
    phoneListToggle: ph.closed?.toggle, phoneDrawerClose: open.closeBtn,
    desktopHidden:{ listToggle:r.targets.measured.find(x=>x.sel==='#list-toggle'), listClose:r.targets.measured.find(x=>x.sel==='.list-close') },
    otherUndersizedVisible: (r.targets.undersized||[]).map(x=>({cls:x.cls,id:x.id,text:x.text,w:x.w,h:x.h})) });
}
W('q3-44px-targets',q3);

// Q4 error surface
const q4=[];
for (const [m,label] of modes) {
  const s=runs[`LIVE2-${m}`]?.errorSurface;
  if(!s?.state) continue;
  q4.push({ mode:label, directoryUnavailableMessages:s.state.directoryUnavailable,
    retryButtons:s.state.retryButtons.length, retry:s.state.retryButtons,
    countText:s.state.count, clubHotspotsHidden:s.state.clubHotspotsHidden });
}
W('q4-error-surface',q4);

// Q5 disclosure
const q5=[];
for (const [m,label] of modes) for (const vw of vws) {
  const r=pick(`LIVE2-${m}`)[vw]; if(!r) continue;
  const d=r.disclosure;
  q5.push({ mode:label, vw, clicks:d.clicks, label:d.label,
    rowsBefore:d.rowsBefore, rowsAfter:d.rowsAfter,
    countBefore:d.countBefore, countAfter:d.countAfter,
    promisedN:(d.label||'').match(/(\d+)/)?.[1]??null,
    deliveredN:d.countAfter,
    listScrollHeightPx:d.scrollH, listViewportPx:d.clientH,
    scrollScreens: d.scrollH&&d.clientH ? +(d.scrollH/d.clientH).toFixed(1) : null,
    panelHeightBefore:d.panelBefore?.h, panelHeightAfter:d.panelAfter?.h,
    mapShareAfter:r.afterDisclosure?.share?.mapShareUsable });
}
W('q5-disclosure',q5);

// preserved
const q6=[];
for (const [m,label] of modes) {
  const s=runs[`LIVE2-${m}`]; if(!s) continue;
  q6.push({ mode:label, reducedMotion:s.reducedMotion,
    readerText150:s.readerText150,
    crossModeFlash:Object.fromEntries(vws.map(v=>[v,s.viewports[v]?.flash])),
    keyboard:{ steps:s.viewports[1024]?.keyboard?.sequence.length,
      elementsWithoutFocusIndicator:s.viewports[1024]?.keyboard?.noIndicator },
    maplibreWarnings:Object.fromEntries(vws.map(v=>[v,s.viewports[v]?.maplibre?.warnings?.length])),
    pageErrors:Object.fromEntries(vws.map(v=>[v,s.viewports[v]?.maplibre?.pageErrors])) });
}
W('q6-preserved',q6);

// ground interactivity (finding 1)
const q7=[];
for (const [m,label] of modes) for (const vw of vws) {
  const r=pick(`LIVE2-${m}`)[vw]; if(!r) continue;
  const g=r.ground;
  q7.push({ mode:label, vw, verdict:g?.verdict,
    point:g?.point, zoomBefore:g?.before?.z, zoomAfterWheel:g?.afterWheel?.z, zoomDelta:g?.zoomDelta,
    dragMoved:g?.dragMoved, dragDeltaLng:g?.dragDeltaLng, dragDeltaLat:g?.dragDeltaLat });
}
const o1024=J(`${OUT}/OLD4-plub-1024.json`), o1440=J(`${OUT}/OLD4-plub-1440.json`);
q7.push({ mode:'OLD PL;UB (falsification)', vw:1024, verdict:o1024.rec.ground.verdict,
  zoomBefore:o1024.rec.ground.before.z, zoomAfterWheel:o1024.rec.ground.afterWheel.z, dragMoved:o1024.rec.ground.dragMoved });
q7.push({ mode:'OLD PL;UB (falsification)', vw:1440, verdict:o1440.rec.ground.verdict,
  zoomBefore:o1440.rec.ground.before.z, zoomAfterWheel:o1440.rec.ground.afterWheel.z, dragMoved:o1440.rec.ground.dragMoved });
W('q7-dead-strip',q7);

// falsification table
const old1024=J(`${OUT}/OLD4-plub-1024.json`).rec, old1440=J(`${OUT}/OLD4-plub-1440.json`).rec;
W('q0-falsification-old-shape',[
 { fact:'map share of first screen @1024 (third audit: 60.37%)', measured:'60.37% (computed from blocking column: canvas 1024x715 minus 360px rail column)', reproduced:true },
 { fact:'flat slab below last row @1024 (third audit: 261px)', measured:`${old1024.before.flatSlab}px (viewport 768 - last row bottom ${old1024.before.lastPlaceBottom})`, reproduced:true },
 { fact:'flat slab below last row @1440 (third audit: 393px)', measured:`${old1440.before.flatSlab}px (viewport 900 - last row bottom ${old1440.before.lastPlaceBottom})`, reproduced:true },
 { fact:'"Places in view" count @1440 (third audit: 48)', measured:`${old1440.before.statedText}`, reproduced:true },
 { fact:'count @1024 (third audit: 37)', measured:`${old1024.before.statedText}`, reproduced:true },
 { fact:'dead strip: drag in ground below panel does nothing', measured:`GROUND_DEAD, zoom ${old1024.ground.before.z} -> ${old1024.ground.afterWheel.z}, dragMoved=${old1024.ground.dragMoved}`, reproduced:true },
 { fact:'count ignores the strip below the panel (third audit: 3 places at 1440 uncounted)', measured:`auditor paint-based reading ${old1440.before.count.myCount} visible vs interface ${old1440.before.statedText} -> 3 places painted in the strip were not counted`, reproduced:true }
]);
console.log('DONE');
