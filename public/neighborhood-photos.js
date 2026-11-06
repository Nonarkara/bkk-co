// Real, credited reference photographs. No photo is presented as the selected venue.
(() => {
 let cached, pending;
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=u=>{try{const v=new URL(u,location.origin);return ['http:','https:'].includes(v.protocol)?v.href:''}catch{return ''}};
 async function load(){
  if(cached)return cached;
  if(!pending)pending=fetch('/data/neighborhood-photos.json',{signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw Error('Photos unavailable');return r.json()}).then(d=>{
   if(!Array.isArray(d.photos))throw Error('Photos unavailable');cached=d;return d;
  }).catch(err=>{pending=null;throw err});
  return pending;
 }
 const hash=s=>Array.from(s).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 function credits(p){return `<span class="reference-credit">${e(p.creator)} · <a href="${e(safe(p.licenseUrl))}" target="_blank" rel="noopener">${e(p.license)}</a> · <a href="${e(safe(p.sourcePage))}" target="_blank" rel="noopener">Source</a></span>`}
 function show(p,opener){
  const dialog=document.createElement('dialog');dialog.className='photo-viewer neighborhood-photo-dialog';
  dialog.innerHTML=`<button type="button" aria-label="Close photograph">×</button><figure><img src="${e(p.url)}" alt="${e(p.title)}"><figcaption><b>Neighborhood reference—not this venue</b><p>${e(p.title)}</p>${credits(p)}<p class="src">${e(p.changes)} ${e(p.attributionStatement||'')} ${e(p.sourceCredit||'')}</p></figcaption></figure>`;
  document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();if(opener?.isConnected)opener.focus()},{once:true});dialog.addEventListener('click',ev=>{if(ev.target===dialog)dialog.close()});dialog.showModal();
 }
 const name=(d,slug)=>d.neighborhoods?.find(n=>n.slug===slug)?.name||'Bangkok';
 function photos(d,slug){return slug?d.photos.filter(p=>p.neighborhoods.includes(slug)):d.photos}
 async function attach(slot,p,slug){
  if(!slot)return;const generation=sheetGeneration;
  slot.textContent='Loading neighborhood reference…';
  try{const d=await load();if(!slot.isConnected||generation!==sheetGeneration)return;
   // Fifth source-backed area uses the existing Meet’s space anchor; never a venue photo claim.
   if(!slug&&p&&Math.hypot((p.x-100.61656)*108000,(p.y-13.76998)*111320)<=800)slug='ramkhamhaeng';
   const pool=photos(d,slug),fallback=!slug||!pool.length,group=fallback?photos(d,'bangkok'):pool,photo=(group.length?group:d.photos)[hash(p?.id||slug||'Bangkok')%(group.length||d.photos.length)];
   if(!photo){slot.textContent='No neighborhood photographs available.';return}
   slot.innerHTML=`<figure class="place-reference"><button type="button" class="reference-image" aria-label="Enlarge ${e(photo.title)}"><img src="${e(photo.url)}" alt="${e(photo.title)}" width="104" height="78" loading="lazy"></button><figcaption><b>${fallback?'Bangkok reference—not this venue or neighborhood':'Neighborhood reference—not this venue'}</b><span>${e(name(d,fallback?'bangkok':slug))}</span>${credits(photo)}<button class="linkish" type="button" data-reference-gallery>More neighborhood photos →</button><details><summary>Photo changes &amp; credits</summary><p>${e(photo.title)}. Thumbnail cropped to fit; full photo available. ${e(photo.changes)} ${e(photo.attributionStatement||'')} ${e(photo.sourceCredit||'')}</p></details></figcaption></figure>`;
   slot.querySelector('.reference-image').onclick=ev=>show(photo,ev.currentTarget);slot.querySelector('[data-reference-gallery]').onclick=()=>gallery(fallback?null:slug);
  }catch{if(slot.isConnected&&generation===sheetGeneration){slot.innerHTML='<span>Neighborhood photos unavailable.</span> <button type="button" class="linkish">Retry photos</button>';slot.querySelector('button').onclick=()=>attach(slot,p,slug)}}
 }
 async function gallery(slug){
  const sheet=openSheet('<header><h1>Neighborhood photographs</h1><button class="close" aria-label="Close">×</button></header><p>Real photographs for neighborhood context—not venue photos. Each keeps its photographer, reuse license and source.</p><div class="reference-gallery-body">Loading photographs…</div>',{keepRoute:true});sheet.classList.add('reference-gallery');const generation=sheetGeneration;
  try{const d=await load();if(!sheet.isConnected||generation!==sheetGeneration)return;const body=sheet.querySelector('.reference-gallery-body');
   body.innerHTML=`<label>Neighborhood <select aria-label="Photo neighborhood"><option value="">All neighborhoods · ${d.photos.length} photos</option>${(d.neighborhoods||[]).map(n=>`<option value="${e(n.slug)}" ${n.slug===slug?'selected':''}>${e(n.name)} · ${n.count}</option>`).join('')}</select></label><p class="reference-count" role="status"></p><ol class="reference-gallery-list"></ol><button type="button" class="reference-more">Show 12 more</button>`;
   let limit=12;const render=()=>{const group=photos(d,body.querySelector('select').value),visible=group.slice(0,limit);body.querySelector('.reference-count').textContent=`${visible.length} of ${group.length} real photographs · source dates in photo credits`;
    body.querySelector('ol').innerHTML=visible.map(photo=>`<li><button type="button" class="reference-image" data-photo="${e(photo.id)}" aria-label="Enlarge ${e(photo.title)}"><img src="${e(photo.url)}" alt="${e(photo.title)}" loading="lazy" width="104" height="78"></button><div><b>${e(photo.title)}</b>${credits(photo)}<details><summary>Source date &amp; changes</summary><p>${e(photo.dateTaken||'Capture date not supplied')} · ${e(photo.changes)} ${e(photo.attributionStatement||'')} ${e(photo.sourceCredit||'')}</p><p>Association: ${e(photo.association?.basis)}. Collection checked ${e(d.asOf)}.</p></details></div></li>`).join('');
    body.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>show(d.photos.find(p=>p.id===b.dataset.photo),b));body.querySelector('.reference-more').hidden=limit>=group.length;
   };body.querySelector('select').onchange=()=>{limit=12;render()};body.querySelector('.reference-more').onclick=()=>{limit+=12;render()};render();
  }catch{if(generation===sheetGeneration)sheet.querySelector('.reference-gallery-body').innerHTML='<p>Photographs unavailable. The map and notebook still work.</p><button type="button" class="linkish" data-photo-retry>Retry photos</button>';sheet.querySelector('[data-photo-retry]')?.addEventListener('click',()=>gallery(slug))}
 }
 window.NeighborhoodPhotos={load,attach,gallery};
})();
