// Optional device preferences and discrete evidence: no invented scores or inferred atmosphere.
(function(root){
 'use strict';
 const KEY='plub.place-preferences.v1',labels={wifi:'Wi-Fi',power:'Outlets',ac:'Air conditioning',alcohol:'Alcohol',coffee:'Coffee',cozy:'Cozy',large:'Large space',intimate:'Intimate',stylish:'Stylish',public_view:'Public view'};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lookup=(map,id)=>map instanceof Map?map.get(id):map?.[id];
 const clean=value=>{const v=value&&typeof value==='object'?value:{};return {wifi:['any','fast'].includes(v.wifi)?v.wifi:'',power:v.power===true,ac:v.ac===true,alcohol:v.alcohol===true,coffee:v.coffee===true,space:['cozy','large'].includes(v.space)?v.space:'',atmosphere:['intimate','stylish','public_view'].includes(v.atmosphere)?v.atmosphere:''}};
 let current,loaded=false;
 function storage(provided){try{return provided===undefined?root.localStorage:provided}catch{return null}}
 function load(provided){let prefs={};try{const raw=storage(provided)?.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(parsed.version===1)prefs=parsed.preferences}}catch{}current=clean(prefs);loaded=true;return {...current}}
 function get(){return {...(loaded?current:load())}}
 function set(value){current=clean(value);loaded=true;return get()}
 function save(value=get(),provided){set(value);try{const store=storage(provided);if(!store)return false;store.setItem(KEY,JSON.stringify({version:1,preferences:current}));return true}catch{return false}}
 function clear(provided){set({});try{const store=storage(provided);if(!store)return false;store.removeItem(KEY);return true}catch{return false}}
 const safeURL=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null}catch{return null}};
 const sourceURL=id=>/^[nwr]\d+$/.test(id||'')?`https://www.openstreetmap.org/${{n:'node',w:'way',r:'relation'}[id[0]]}/${id.slice(1)}`:null;
 const unknown=()=>({value:null,basis:'unknown',note:'Not documented; check with the venue.',sources:[]});
 function facts(p,data,scores={}){
  const record=lookup(data?.evidence,p.id),tagRecord=data?.raw?.join?.venueTags?.[p.id],tags=tagRecord?.tags||{},registry=data?.raw?.evidence?.sources||{},date=data?.raw?.geo?.manifest?.asOf||data?.raw?.join?.manifest?.asOf||'snapshot date unknown',score=lookup(scores,p.id),out={};
  const sources=ids=>(ids||[]).flatMap(id=>{const s=registry[id];if(!s)return [];return [{label:s.publisher||id,url:safeURL(s.url),date:s.updated_at||s.published_at||'publication date unstated',checked:s.checked_at||'check date unknown',tier:s.tier||'publisher'}]});
  const osmSources=()=>[{label:'OpenStreetMap '+(tagRecord?.sourceID||p.id),url:sourceURL(tagRecord?.sourceID||p.id),date,tier:'mapped tag'}];
  const visitorSources=()=>[{label:'PLUB visitor ratings',url:`https://co.nonarkara.org/?p=${encodeURIComponent(p.id)}`,date:score?.last||'rating date unknown',tier:'visitor'}];
  const M=root.JourneyModel;
  const facilities=M?.facilities(p,data,scores)||{};
  for(const key of Object.keys(labels)){
   out[key]=unknown();const documented=record?.facts?.[key],ids=documented?.source_ids||record?.source_ids||[],refs=sources(ids);
   // Subjective qualities require an explicit visitor claim; publisher prose cannot become a quality score.
   const soft=['cozy','large','intimate','stylish','public_view'].includes(key);
   if(typeof documented?.value==='boolean'&&refs.some(s=>s.url)&&(!soft||refs.every(s=>s.tier==='visitor'))){out[key]={value:documented.value,basis:soft?'visitor':'publisher',note:(documented.note||'Explicit source claim.')+' Checked '+(documented.checked_at||'date unknown')+'.',sources:refs};continue}
   if(['wifi','power'].includes(key)&&facilities[key]?.value!==null&&typeof facilities[key]?.value==='boolean'){
    const f=facilities[key];if(f.basis==='visitor'&&(!Number.isInteger(score?.n)||score.n<=0))continue;const refs=f.basis==='visitor'?visitorSources():f.basis==='osm'?osmSources():sources(f.source_ids);if(!['visitor','osm'].includes(f.basis)&&!refs.some(s=>s.url))continue;out[key]={...f,sources:refs};continue;
   }
   if(key==='ac'){
    const value=String(tags.air_conditioning||'').toLowerCase();if(['yes','no'].includes(value))out[key]={value:value==='yes',basis:'osm',note:`Venue air_conditioning=${value}; current operation unverified.`,sources:osmSources()};
   }
   if(key==='alcohol'){
    // Only an explicit venue-level alcohol or serves:alcohol tag proves this claim.
    const value=String(tags.alcohol??tags['serves:alcohol']??'').toLowerCase();if(['yes','no'].includes(value))out[key]={value:value==='yes',basis:'osm',note:`Explicit venue alcohol tag=${value}; service time/licence unverified.`,sources:osmSources()};
   }
   if(key==='coffee'&&p.k==='cafe')out[key]={value:true,basis:'category',note:'Listed as a café in the source catalogue; menu, service and coffee quality are unverified.',sources:[{label:'PLUB café catalogue',url:`https://co.nonarkara.org/?p=${encodeURIComponent(p.id)}`,date:'catalogue snapshot; see place sources',tier:'category only'}]};
  }
  out.fast=unknown();
  if(out.wifi.value===false)out.fast={...out.wifi,note:'Wi-Fi explicitly absent. '+out.wifi.note};
  else if(Number.isInteger(score?.n)&&score.n>0&&Number.isFinite(score.wifi)&&score.wifi>=1&&score.wifi<=3){
   // Only a unanimous Fast aggregate (3/3) establishes this discrete visitor label.
   out.fast={value:score.wifi===3?true:score.wifi<=2?false:null,basis:'visitor',note:`${score.n} visitor rating${score.n===1?'':'s'}; Wi-Fi average ${score.wifi}/3 (1 None, 2 Slow, 3 Fast). “Fast” is a visitor label, not a measured Mbps speed.`,sources:visitorSources()};
  }
  return out;
 }
 function requested(value){const p=clean(value);return [...(p.wifi?[p.wifi==='fast'?'fast':'wifi']:[]),...['power','ac','alcohol','coffee'].filter(k=>p[k]),...(p.space?[p.space]:[]),...(p.atmosphere?[p.atmosphere]:[])]}
 function match(p,data,scores={},prefs=get()){
  const all=facts(p,data,scores),keys=requested(prefs),known=keys.filter(k=>all[k].value===true),missing=keys.filter(k=>all[k].value===null),conflicts=keys.filter(k=>all[k].value===false);
  return {facts:all,requested:keys,known,unknown:missing,conflicts,complete:keys.length>0&&!missing.length&&!conflicts.length,summary:keys.length?`Current preferences: ${known.length}/${keys.length} documented matches · ${missing.length} unknown${conflicts.length?' · '+conflicts.length+' documented conflicts':''}`:'No current preference filter'};
 }
 function rank(rows,data,scores={},options={}){
  const prefs=options.preferences||get(),strict=options.strict===true;
  return rows.map((row,index)=>({...row,preference:match(row.p||row,data,scores,prefs),preferenceOrder:index})).filter(row=>!row.preference.conflicts.length&&(!strict||!row.preference.unknown.length)).sort((a,b)=>b.preference.known.length-a.preference.known.length||a.preference.unknown.length-b.preference.unknown.length||a.preferenceOrder-b.preferenceOrder);
 }
 function render(value=get()){
  const p=clean(value),select=(key,title,values)=>`<label>${title}<select data-preference="${key}"><option value="">Any</option>${values.map(([v,l])=>`<option value="${v}" ${p[key]===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
  return `<details class="place-preferences" data-place-preferences><summary>Your place preferences</summary><p class="src">Optional, local to this browser. Save stores only these choices on this device; no account, location or browsing history. Unknown evidence stays unknown.</p><div class="place-preference-controls">${select('wifi','Wi-Fi',[['any','Available'],['fast','Visitor-rated Fast']])}${['power','ac','alcohol','coffee'].map(k=>`<label><input type="checkbox" data-preference="${k}" ${p[k]?'checked':''}>${labels[k]}</label>`).join('')}${select('space','Space',[['cozy','Cozy'],['large','Large']])}${select('atmosphere','Atmosphere',[['intimate','Intimate'],['stylish','Stylish'],['public_view','Public view']])}</div><p class="src">Atmosphere and size need explicit visitor evidence. “Fast” is a visitor label, never measured Mbps. Café category does not verify the menu.</p><div class="place-preference-actions"><button type="button" data-preferences-save>Save on this device</button><button type="button" data-preferences-clear>Clear preferences</button></div><p class="src" role="status" data-preferences-status></p></details>`;
 }
 function bind(container,onChange=()=>{}){
  const host=container?.matches?.('[data-place-preferences]')?container:container?.querySelector?.('[data-place-preferences]');if(!host)return;
  const inputs=[...host.querySelectorAll('[data-preference]')],read=()=>clean(Object.fromEntries(inputs.map(el=>[el.dataset.preference,el.type==='checkbox'?el.checked:el.value]))),status=text=>{host.querySelector('[data-preferences-status]').textContent=text};
  inputs.forEach(el=>el.onchange=()=>{set(read());status('Applied for this visit. Press Save to keep these choices on this device.');onChange(get())});
  host.querySelector('[data-preferences-save]').onclick=()=>{const saved=save(read());status(saved?'Saved on this device only.':'Applied for this visit. Browser storage is unavailable; choices were not saved.');onChange(get())};
  host.querySelector('[data-preferences-clear]').onclick=()=>{const cleared=clear();inputs.forEach(el=>{if(el.type==='checkbox')el.checked=false;else el.value=''});status(cleared?'Preferences cleared from this device.':'Choices cleared for this visit. Browser storage could not be cleared; stored choices may return.');onChange(get())};
 }
 function renderFacts(p,data,scores={},prefs=get()){
  const result=match(p,data,scores,prefs),allKeys=['wifi','fast','power','ac','alcohol','coffee','cozy','large','intimate','stylish','public_view'],keys=[...new Set(['wifi','power','ac',...requested(prefs)])];
  const label=key=>key==='fast'?'Visitor-rated Fast':labels[key];
  return `<section class="place-preference-facts" aria-label="Amenity evidence"><p class="src">${esc(result.summary)}</p><div class="place-preference-gauges">${keys.map(key=>{const f=result.facts[key],value=f.value===null?'unknown':f.value?'documented':'absent';return `<span data-preference-fact="${key}" data-value="${value}">${f.value===null?'?':f.value?'✓':'×'} ${esc(label(key))} · ${value}</span>`}).join('')}</div><details><summary>Amenity evidence &amp; dates</summary>${allKeys.map(key=>{const f=result.facts[key];return `<p><b>${esc(label(key))}</b> · ${esc(f.note)}${f.sources.map(s=>`<br>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.label)}</a>`:esc(s.label)} · ${esc(s.tier)} · ${esc(s.date)}${s.checked?' · checked '+esc(s.checked):''}`).join('')}</p>`}).join('')}<p>Discrete source claims, not live equipment checks. Unknown means no supporting evidence. No continuous speed or atmosphere gauge is inferred.</p></details></section>`;
 }
 root.PlacePreferences={load,get,set,save,clear,clean,facts,match,rank,render,bind,renderFacts};
 if(typeof module!=='undefined')module.exports=root.PlacePreferences;
})(typeof window!=='undefined'?window:globalThis);
