// Account and sharing UI. Device moments never upload without a deliberate action.
(() => {
 let who=null,createdKey=null;
 const api=async(path,method='GET',body,extra={})=>{
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),12000);
  try {
   const r=await fetch('/api/'+path,{signal:controller.signal,method,credentials:'same-origin',headers:{...(body?{'content-type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
   let data;try{data=await r.json()}catch(e){if(e.name==='AbortError')throw e;throw new Error('Connection unavailable. Your device copy is safe.')}
   if(!r.ok)throw new Error(data.error||'Request failed.');return data;
  }catch(e){if(e.name==='AbortError')throw new Error('Cloud request timed out. Your device copy is safe. Reopen Cloud notebook to check or retry.');throw e}
  finally{clearTimeout(deadline)}
 };
 const auth=(path,method='GET',body,actor=who)=>{if(!actor)throw new Error('Sign in to your cloud notebook first.');return api(path,method,body,{'x-plub-account':actor.id})};
 const saveFile=(name,data,type='application/json')=>{const u=URL.createObjectURL(new Blob([data],{type})),a=Object.assign(document.createElement('a'),{href:u,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)};
 const message=(root,text)=>{let out=root.querySelector('.notebook-message');if(!out){out=document.createElement('p');out.className='notebook-message';out.setAttribute('role','status');root.prepend(out)}out.textContent=text;return out};
 const refreshNotebook=async()=>{await loadVisits();refresh();await openPassport()};
 async function cloudPhoto(blob){
  let size=960,b=blob;
  for(let i=0;i<5;i++){b=await Passport.shrink(b,size);if(b.size<=125000)return Passport.toDataUrl(b);size=Math.round(size*.72)}
  throw new Error('This photo is too large for cloud backup. Your original is still on this device.');
 }
 async function backup(key,snapshot,expectedOwner=who?.id){
  if(!expectedOwner)throw new Error('Open Notes and sign in before backing up.');
  const actor=(await api('account')).account;if(!actor)throw new Error('Open Notes → Cloud notebook to create an account or sign in first.');
  if(expectedOwner!==actor.id)throw new Error('Account changed. Preview again before sharing.');
  const v=snapshot||await Passport.get(key);if(!v)throw new Error('Visit not found.');
  const identity=await Passport.mutate(key,c=>({...c,uid:c.uid||crypto.randomUUID()}));
  const uid=identity.uid;
  const revision=v.cloudOwner===actor.id?(v.cloudRevision||0):0;
  const photos=await Promise.all((v.photos||[]).map(cloudPhoto));
  const result=await auth('notebook/'+uid,'PUT',{place:v.place,at:Passport.day(v),stars:v.stars||0,words:v.words||[],note:v.note||'',photos,revision},actor);
  // Do not overwrite a local edit made while the upload was in flight.
  await Passport.mutate(key,latest=>({...latest,cloudOwner:actor.id,cloudRevision:result.revision,cloudAt:v.updated||v.at}));
  return {id:uid,revision:result.revision,actor};
 }
 function accountHtml(){
  return `<details class="cloud-account"><summary>Cloud notebook${who?' · '+esc(who.name):' · Sign in / Create'}</summary>
  <p>Free, community supported. Back up selected visits to PLUB and open them on another device. Private notes and photos are stored on our server; they are never public automatically.</p>
  ${who?`<p>Signed in as <b>${esc(who.name)}</b>. Up to 100 cloud visits; four compressed photos per visit.</p><div class="notebook-actions"><button data-cloud-list>↓ Restore / manage</button><button data-cloud-export>Export cloud data</button><button data-cloud-out>Sign out</button></div>
  <details><summary>Research &amp; account</summary><label class="research"><input type="checkbox" data-research ${who.research?'checked':''}> Contribute my saved place visits to PLUB research</label><p>Optional. Helps us understand which places people visit and supports this free project. We count saved visits by place. Public results need at least 5 contributors. Notes, photos and background location are excluded. Turn off any time to exclude your visits from future results.</p><label>Public name<input data-public-name maxlength="40" value="${esc(who.name)}"></label><button data-account-save>Save choices</button><p>Research notice: 3 November 2026. Account ID:<code>${esc(who.id)}</code></p><button data-account-delete>Delete cloud account &amp; posts</button></details>`:
  `<form class="cloud-create"><label>Your public name<input name="name" maxlength="40" value="Neighbour" autocomplete="nickname" required></label><button class="send">Create my cloud notebook</button></form>
   <form class="cloud-login"><label>Have a notebook key?<input type="password" name="key" autocomplete="off" spellcheck="false" required minlength="43" maxlength="43" placeholder="Paste your private notebook key"></label><button>Sign in</button></form>`}
  <p class="src">A notebook key opens your cloud data. Keep it private. We cannot recover a lost key. Device notes remain after signing out; use Clear device on a shared phone. Cloudflare processes hosting data; see <a href="/privacy.html" target="_blank" rel="noopener">privacy and community rules</a>.</p></details>`;
 }
 function bindAccount(tools){
  tools.querySelector('.cloud-create')?.addEventListener('submit',async e=>{
   e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;
   try{const r=await api('account/create','POST',{name:e.target.elements.name.value});who=r.account;createdKey=r.recoveryKey;await openPassport()}
   catch(err){message(tools,err.message);b.disabled=false}
  });
  tools.querySelector('.cloud-login')?.addEventListener('submit',async e=>{
   e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;
   try{who=(await api('account/login','POST',{key:e.target.elements.key.value.trim()})).account;createdKey=null;await openPassport()}
   catch(err){message(tools,err.message);b.disabled=false}
  });
  tools.querySelector('[data-cloud-out]')?.addEventListener('click',async()=>{try{await api('account/logout','POST',{});who=null;createdKey=null;await openPassport()}catch(e){message(tools,e.message)}});
  tools.querySelector('[data-account-save]')?.addEventListener('click',async()=>{try{who=(await auth('account','PATCH',{name:tools.querySelector('[data-public-name]').value,research:tools.querySelector('[data-research]').checked,notice:'2026-11-03'})).account;message(tools,'Choices saved. Turning research off excludes your visits from future results.')}catch(e){message(tools,e.message)}});
  tools.querySelector('[data-account-delete]')?.addEventListener('click',async()=>{
   if(!confirm('Delete your live cloud account, all cloud visits and public recommendations? Device copies remain. Cloudflare recovery backups may last up to 30 days.'))return;
   try{const actor=who;await auth('account','DELETE',undefined,actor);for(const v of await Passport.all())if(v.cloudOwner===actor.id)await Passport.mutate(v.key,c=>{if(c.cloudOwner!==actor.id)return c;const {cloudOwner,cloudRevision,cloudAt,...rest}=c;return rest});who=null;createdKey=null;await openPassport()}catch(e){message(tools,e.message)}
  });
  tools.querySelector('[data-cloud-list]')?.addEventListener('click',()=>cloudList(tools));
  tools.querySelector('[data-cloud-export]')?.addEventListener('click',async e=>{
   const b=e.target;b.disabled=true;try{const actor=who,{entries}=await auth('notebook','GET',undefined,actor),parts=[JSON.stringify({app:'plub-cloud',account:actor}).slice(0,-1)+',"entries":['];
    for(let i=0;i<entries.length;i++){const entry=await auth('notebook/'+entries[i].id,'GET',undefined,actor);parts.push(new Blob([(i?',':'')+JSON.stringify(entry)]));message(tools,`Preparing cloud export ${i+1}/${entries.length}…`)}
    const contributions=await auth('account/contributions','GET',undefined,actor);parts.push('],"posts":[');
    for(let i=0;i<contributions.posts.length;i++){const post=await auth('account/contributions/'+contributions.posts[i].id,'GET',undefined,actor);parts.push(new Blob([(i?',':'')+JSON.stringify(post)]))}
    parts.push('],"reports":'+JSON.stringify(contributions.reports)+'}');saveFile('plub-cloud-data.json',new Blob(parts,{type:'application/json'}));message(tools,'Cloud data downloaded, including private photos. Keep this file private.')}catch(err){message(tools,err.message)}finally{b.disabled=false}
  });
 }
 async function cloudList(tools){
  const actor=who;try{const {entries,limit}=await auth('notebook','GET',undefined,actor);let list=tools.querySelector('.cloud-visits');if(!list){list=document.createElement('div');list.className='cloud-visits';tools.querySelector('.cloud-account').append(list)}
   list.innerHTML=`<h2>Cloud copies · ${entries.length}/${limit}</h2><p>Restore deliberately. Device copies and public recommendations have separate controls.</p><ul>${entries.map(v=>`<li><b>${esc(state.byId.get(v.payload.place)?.n||v.payload.place)}</b> · ${esc(v.payload.at)} · ${v.photoCount} photos<div class="notebook-actions"><button data-restore="${esc(v.id)}">Restore to device</button><button data-cloud-delete="${esc(v.id)}">Delete cloud copy &amp; post</button></div></li>`).join('')}</ul>`;
   list.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{
    const r=await auth('notebook/'+b.dataset.restore,'GET',undefined,actor),p=state.byId.get(r.payload.place);if(!p)throw new Error(state.foodLoaded?'This place is not in the current catalogue.':'Place data is still loading. Try restoring again in a moment.');
    const old=(await Passport.all()).find(v=>v.uid===r.id);if(old&&!confirm('Replace this device copy with the cloud version? Export a backup first if you want to keep both versions.'))return;
    const photos=await Promise.all(r.payload.photos.map(async u=>(await fetch(u)).blob()));
    if((await api('account')).account?.id!==actor.id)throw new Error('Account changed. Restore again after signing in.');
    await Passport.put({...r.payload,...(old?{key:old.key}:{}),uid:r.id,name:p.n,kind:p.k,y:p.y,x:p.x,photos,cloudOwner:actor.id,cloudRevision:r.revision,updated:r.payload.at,cloudAt:r.payload.at});
    await refreshNotebook();
   }catch(e){message(tools,e.message)}finally{b.disabled=false}});
   list.querySelectorAll('[data-cloud-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this cloud copy and its public recommendation? Your device copy is kept.'))return;try{await auth('notebook/'+b.dataset.cloudDelete,'DELETE',{revision:entries.find(v=>v.id===b.dataset.cloudDelete).revision},actor);for(const v of await Passport.all())if(v.uid===b.dataset.cloudDelete&&v.cloudOwner===actor.id)await Passport.mutate(v.key,c=>{if(c.cloudOwner!==actor.id)return c;const {cloudOwner,cloudRevision,cloudAt,...rest}=c;return rest});await refreshNotebook();message($('#notebook-tools'),'Cloud copy deleted. Your device copy is kept.')}catch(e){message(tools,e.message)}});
  }catch(e){message(tools,e.message)}
 }
 async function edit(key){
  const v=await Passport.get(key);if(!v)return;
  const sheet=openSheet(`<header><h1>Edit visit</h1><button class="close" aria-label="Close">×</button></header><p>${esc(v.name)} · device copy</p><form class="edit-visit"><label>Visit date<input name="at" type="date" required value="${esc(Passport.day(v))}"></label><label>Stars<select name="stars">${[0,1,2,3,4,5].map(i=>`<option value="${i}" ${i===(v.stars||0)?'selected':''}>${i?i+' of 5':'Not rated'}</option>`).join('')}</select></label><label>Your private note<textarea name="note" rows="5" maxlength="600">${esc(v.note)}</textarea></label><p>Photos and feelings are kept. Cloud copies and public posts change only when you back up or share again.</p><button class="send">Save changes</button><button type="button" data-cancel-edit>Cancel</button></form>`);sheet.classList.add('notebook-sheet');
  sheet.querySelector('[data-cancel-edit]').onclick=openPassport;
  sheet.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('.send');b.disabled=true;try{await Passport.update(key,{at:e.target.elements.at.value,stars:+e.target.elements.stars.value,note:e.target.elements.note.value});await refreshNotebook()}catch(err){message(sheet,err.message);b.disabled=false}};
 }
 async function sharing(key,expectedOwner=who?.id){
  const stored=await Passport.get(key);if(!stored)return;
  const v={...stored,words:[...(stored.words||[])],photos:[...(stored.photos||[])]}, actor=(await api('account')).account;
  if(!expectedOwner||actor?.id!==expectedOwner)throw new Error('Account changed or not signed in. Open Notes before sharing.');
  const sheet=openSheet(`<header><h1>Recommend this place</h1><button class="close" aria-label="Close">×</button></header><p><b>${esc(v.name)}</b></p><div class="plub-say">${plub('point',104)}<p>Share what helped you. Be kind, describe your own visit, and keep other people's private details out.</p></div><p>This publishes as <b>${esc(actor.name)}</b>: your note, stars and feelings on the place's community page. Your visit date is kept private.</p><blockquote>${esc(v.note||'No written note')} · ${v.stars?v.stars+'/5':'Not rated yet'}</blockquote><label class="research"><input type="checkbox" data-share-photos> Also publish ${v.photos?.length||0} ${(v.photos?.length||0)===1?'photo':'photos'}. I have permission from anyone identifiable.</label><p>Photos are resized and metadata removed before upload. Public copies can be saved by other people.</p><button class="send" data-publish>Back up &amp; publish recommendation</button><button class="linkish" data-cancel-share>Keep private</button><p class="src">Requires a signed-in cloud notebook. You can remove your post on the place page. Three reports temporarily hide a post for review.</p>`);sheet.classList.add('notebook-sheet');
  sheet.querySelector('[data-cancel-share]').onclick=openPassport;
  sheet.querySelector('[data-publish]').onclick=async e=>{const b=e.target;b.disabled=true;try{if(!actor)throw new Error('Create or sign in to your cloud notebook first.');const saved=await backup(key,v,actor.id);await auth('notebook/'+saved.id+'/publish','POST',{confirm:true,photos:sheet.querySelector('[data-share-photos]').checked,revision:saved.revision},actor);await refreshNotebook();message($('#notebook-tools'),'Recommendation published. Your device copy is kept.')}catch(err){message(sheet,err.message);b.disabled=false}};
 }
 async function community(container,p){
  container.innerHTML='<h2>Community notes</h2><p role="status">Loading recommendations…</p>';
  try{const actor=(await api('account')).account;const {posts}=await api('community?place='+encodeURIComponent(p.id));if(!container.isConnected)return;
   container.innerHTML=`<h2>Community notes</h2><p>Recent 5 recommendations. Personal experiences, not verified facts. Be kind.</p>${posts.length?posts.map(v=>`<article class="community-note"><b>${esc(v.name)}</b> · ${v.stars?esc(v.stars)+'/5':'Not rated'}<p>${esc(v.note)}</p>${v.words.length?`<p>${v.words.map(esc).join(' · ')}</p>`:''}<div class="thumbs">${v.photos.map(u=>`<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="Photo shared by ${esc(v.name)}" loading="lazy"></a>`).join('')}</div><button data-post="${esc(v.id)}" data-own="${v.mine}" class="linkish">${v.mine?'Remove my post':'Report'}</button></article>`).join(''):'<p>No recommendations yet. Log a visit, then choose Share in your notebook.</p>'}`;
   container.querySelectorAll('[data-post]').forEach(b=>b.onclick=async()=>{try{if(b.dataset.own==='true'){if(!confirm('Remove your public recommendation and photos?'))return;await auth('community/'+b.dataset.post,'DELETE',undefined,actor)}else{let reason=prompt('Report reason: rude, privacy, spam, or other');if(!reason)return;await auth('community/'+b.dataset.post+'/report','POST',{reason:reason.trim().toLowerCase()},actor)}await community(container,p);message(container,b.dataset.own==='true'?'Removed.':'Report sent. Thank you.')}catch(e){message(container,e.message)}});
  }catch(e){container.innerHTML='<h2>Community notes</h2>';message(container,e.message)}
 }
 async function moderation(root){
  const section=document.createElement('details');section.innerHTML='<summary>Moderation · owner</summary><label>Moderator key<input type="password" autocomplete="off"></label><button>Open review queue</button><p class="src">Owner access only. The key is kept in memory for this open view.</p><div class="moderation-results"></div>';root.append(section);
  section.querySelector('button').onclick=async()=>{const moderationKey=section.querySelector('input').value;section.querySelector('input').value='';const list=section.querySelector('.moderation-results');try{const {posts}=await api('moderation','GET',undefined,{'x-plub-moderator':moderationKey});list.innerHTML=`<p>${posts.length} most recent / reported posts.</p>${posts.map(p=>`<article><b>${esc(state.byId.get(p.place_id)?.n||p.place_id)}</b><p>${esc(p.payload.note)}</p><p>${p.reports} reports · ${esc(p.reasons||'No active reasons')} · ${p.hidden?'Hidden for review':'Visible'}</p><div class="thumbs">${p.payload.photos.map(u=>`<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="Public photo under review" loading="lazy"></a>`).join('')}</div>${p.hidden?`<button data-restore-post="${esc(p.id)}">Keep visible / clear reports</button>`:''}<button data-remove-post="${esc(p.id)}">Remove post &amp; photos</button></article>`).join('')}`;list.querySelectorAll('[data-restore-post]').forEach(b=>b.onclick=async()=>{try{await api('community/'+b.dataset.restorePost,'PATCH',{visible:true},{'x-plub-moderator':moderationKey});b.closest('article').remove()}catch(e){message(list,e.message)}});list.querySelectorAll('[data-remove-post]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this public recommendation and its photos?'))return;try{await api('community/'+b.dataset.removePost,'DELETE',undefined,{'x-plub-moderator':moderationKey});b.closest('article').remove()}catch(e){message(list,e.message)}})}catch(e){message(list,e.message)}};
 }
 function deviceTools(tools){
   const local=document.createElement('details');local.className='local-settings';local.innerHTML='<summary>Device &amp; installation</summary><p>Install from your browser menu: Add to Home Screen / Install app. Internet is needed for maps and cloud data; device notes remain in this browser.</p><button data-clear-local>Clear this device</button><p class="src">This removes device visits and text drafts. Cloud copies and posts remain. Export first.</p>';tools.append(local);local.querySelector('button').onclick=async()=>{if(!confirm('Delete all visits and photos on this device? Export first. Cloud copies remain.'))return;try{await Passport.clear();Object.keys(sessionStorage).filter(k=>k.startsWith('plub-draft-')).forEach(k=>sessionStorage.removeItem(k));await refreshNotebook()}catch(e){message(tools,e.message)}};
   const research=document.createElement('details');research.innerHTML='<summary>Community contribution insights</summary><div></div>';tools.append(research);
   research.addEventListener('toggle',async()=>{if(!research.open)return;const pane=research.querySelector('div');pane.textContent='Loading contributed visit counts…';try{const d=await api('research');pane.innerHTML=`<p>Saved visits from people who chose to contribute. At least 5 accounts per place; up to 100 places. Not a citywide popularity measure.</p><p>Updated ${esc(new Date(d.asOf).toLocaleString('en-GB',{timeZone:'Asia/Bangkok'}))} Bangkok time.</p>${d.places.length?'<ul>'+d.places.map(p=>`<li>${esc(state.byId.get(p.place_id)?.n||p.place_id)} · ${p.contributors} contributors · ${p.visits} saved visits</li>`).join('')+'</ul>':'<p>No place has five contributing accounts yet. Smaller groups stay private.</p>'}`}catch(e){pane.textContent=e.message}});
   moderation(tools);
 }
 const Notebook=window.Notebook={
  async mount(sheet,visits){
   sheet.classList.add('notebook-sheet');const tools=sheet.querySelector('#notebook-tools');
   tools.innerHTML=`<div class="notebook-actions"><button data-find-place>＋ Log a visit</button><a href="/privacy.html" target="_blank" rel="noopener">Privacy &amp; kindness</a></div><label class="notebook-search">Find in your notebook<input type="search" placeholder="Place, note or feeling" autocomplete="off"></label><div class="cloud-slot"><p role="status">Checking cloud sign-in…</p></div>`;
   tools.querySelector('[data-find-place]').onclick=()=>{closeSheet();$('#q').focus();$('#q').placeholder='Which place did you visit?'};
   tools.querySelector('input[type=search]').oninput=e=>{const q=e.target.value.toLowerCase();sheet.querySelectorAll('.moment').forEach((row,i)=>{const v=visits[i];const hidden=![v.name,v.note,...(v.words||[])].join(' ').toLowerCase().includes(q);row.hidden=hidden;if(row.previousElementSibling?.classList.contains('moment-place'))row.previousElementSibling.hidden=hidden})};
   // Daily entries outrank account/device utilities. Keep every secondary tool discoverable below them.
   const moments=sheet.querySelector('.moments')?.closest('section'),guide=sheet.querySelector(':scope > .plub-say'),stamps=sheet.querySelector('.notebook-stamps');
   if(visits.length&&moments&&guide){moments.after(guide);if(stamps)guide.after(stamps)}
   deviceTools(sheet);
   const slot=tools.querySelector('.cloud-slot');try{who=(await api('account')).account;if(!slot.isConnected)return;slot.innerHTML=accountHtml();bindAccount(slot);sheet.querySelectorAll('[data-note-backup],[data-note-share]').forEach(b=>b.dataset.accountId=who?.id||'');
    if(createdKey){const box=document.createElement('div');box.className='new-notebook-key';box.innerHTML=`<h2>Save your sign-in key now</h2><p>Anyone with this key can open your cloud notebook. We cannot recover it if it is lost.</p><label>Private notebook key<input readonly value="${createdKey}" type="password"></label><button data-save-key>↓ Save key file</button><button data-show-key>Show key</button><button data-dismiss-key>I saved my key</button>`;tools.prepend(box);box.querySelector('[data-save-key]').onclick=()=>saveFile('plub-private-notebook-key.txt',createdKey,'text/plain');box.querySelector('[data-show-key]').onclick=()=>{const input=box.querySelector('input');input.type=input.type==='password'?'text':'password'};box.querySelector('[data-dismiss-key]').onclick=()=>{createdKey=null;box.remove()}}
   }catch(e){if(slot.isConnected){slot.innerHTML='<p>Cloud unavailable; device notes still work.</p>';message(slot,e.message)}}

  },
 };
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-note-edit],[data-note-backup],[data-note-share]');if(!b)return;
  const key=+(b.dataset.noteEdit||b.dataset.noteBackup||b.dataset.noteShare);b.disabled=true;
  try{if(b.hasAttribute('data-note-edit'))await edit(key);else if(b.hasAttribute('data-note-share'))await sharing(key,b.dataset.accountId||who?.id);else{await backup(key,undefined,b.dataset.accountId||who?.id);await refreshNotebook();message($('#notebook-tools'),'Cloud copy saved. Private; nothing published.')}}catch(err){message($('#sheet'),err.message)}finally{b.disabled=false}
 });
 window.addEventListener('beforeunload',e=>{if(createdKey){e.preventDefault();e.returnValue=''}});
 // The place sheet remains useful without a cloud account.
 const observer=new MutationObserver(()=>{const sheet=$('#sheet');if(!state.selected||!sheet.querySelector('.kindline')||sheet.querySelector('.community-notes')||sheet.querySelector('.been-form'))return;
  const p=state.selected,section=document.createElement('details');section.className='community-notes';section.innerHTML='<summary>Community notes &amp; photos</summary><div></div>';sheet.append(section);section.addEventListener('toggle',()=>{if(section.open)community(section.querySelector('div'),p)})});
 observer.observe($('#sheet'),{childList:true});
})();
