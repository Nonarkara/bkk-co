// Public discovery is source evidence, separate from visitor ratings and verified map identities.
(() => {
 let request,tab='editorial';
 const load=()=>request||(request=(async()=>{try{const r=await fetch('data/discovery.json',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error();return await r.json()}catch(e){request=null;throw new Error('Café selections are unavailable. Your map and notebook still work.')}})());
 window.openDiscovery=async function(){
  const sheet=openSheet('<header><h1>50 + 50 cafés</h1><button class="close" aria-label="Close">×</button></header><p role="status">Loading sourced selections…</p>');sheet.classList.add('discovery-sheet');
  try{
   const data=await load();if(!sheet.classList.contains('discovery-sheet'))return;
   sheet.innerHTML=`<header><h1>50 + 50 cafés</h1><button class="close" aria-label="Close">×</button></header><div class="discovery-tabs" role="group" aria-label="Café evidence"><button data-cohort="editorial">Editors &amp; institutions · 50</button><button data-cohort="discussion">Public discussions · 50</button></div><p class="discovery-intro"></p><details class="discovery-method"><summary>Sources &amp; method · checked 3 Nov 2026</summary><p></p><p>Names can refer to brands or specific branches. Find branch searches the existing map; we never turn a name match into a guessed pin. Publication dates are not proof that a venue is still open.</p></details><label class="discovery-search">Find in this list<input type="search" placeholder="Café or area" aria-label="Find in café selections"></label><p class="src discovery-count" role="status"></p><ol class="discovery-list"></ol><button class="discovery-more">Show 10 more</button>`;
   sheet.querySelector('.close').onclick=closeSheet;let limit=10;
   function render(){
    const cohort=data[tab],q=sheet.querySelector('input').value.toLowerCase().trim(),rows=cohort.entries.filter(r=>[r.name,r.area||''].join(' ').toLowerCase().includes(q));
    sheet.querySelector('.discovery-intro').textContent=tab==='editorial'?'Cafés selected or featured by publishers and institutions.':'Four public discussions from Mar–Aug 2026. Counts include praise and criticism, not live trends.';
    sheet.querySelector('.discovery-method p').textContent=cohort.method;
    sheet.querySelectorAll('[data-cohort]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cohort===tab));
    sheet.querySelector('.discovery-count').textContent=`${rows.length} of 50 · showing ${Math.min(limit,rows.length)}`;
    sheet.querySelector('.discovery-list').innerHTML=rows.slice(0,limit).map(r=>`<li><div class="discovery-row"><b>${esc(r.name)}</b>${r.area?`<span class="area">${esc(r.area)}</span>`:''}</div><div class="sources">${r.mentions?`${r.mentions} of 4 sampled threads · `:''}${r.sources.map(s=>`<a href="${esc(s.url)}" title="${esc(s.title)}" aria-label="${esc(s.title)} · ${esc(s.published_at||'date not stated')}" target="_blank" rel="noopener nofollow">${tab==='discussion'?esc(new Date(s.published_at+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})):esc(s.publisher||'Source')}${r.publisher_rank&&s.id===r.rank_scope?` · article #${r.publisher_rank}`:''}${tab==='discussion'?'':s.published_at?' · '+esc(s.published_at):' · date not stated'}</a>`).join(' · ')}</div><button class="linkish" data-find-cafe="${esc(r.id)}">Find branch in catalogue →</button></li>`).join('');
    sheet.querySelector('.discovery-more').hidden=limit>=rows.length;
    sheet.querySelectorAll('[data-find-cafe]').forEach(b=>b.onclick=e=>{e.stopPropagation();const r=cohort.entries.find(r=>r.id===b.dataset.findCafe);closeSheet();$('#q').value=r.name;$('#q').focus();$('#q').dispatchEvent(new Event('input',{bubbles:true}))});
   }
   sheet.querySelectorAll('[data-cohort]').forEach(b=>b.onclick=()=>{tab=b.dataset.cohort;limit=10;sheet.querySelector('input').value='';render()});sheet.querySelector('input').oninput=()=>{limit=10;render()};sheet.querySelector('.discovery-more').onclick=()=>{limit+=10;render()};render();sheet.querySelector('h1').tabIndex=-1;sheet.querySelector('h1').focus({preventScroll:true});
  }catch(e){if(sheet.classList.contains('discovery-sheet')){const p=sheet.querySelector('p');p.textContent=e.message;const retry=document.createElement('button');retry.className='linkish';retry.textContent='Retry';retry.onclick=()=>openDiscovery();sheet.append(retry)}}
 };
})();
