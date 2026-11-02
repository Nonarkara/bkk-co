import {createRequire} from 'node:module';import{writeFile,mkdir}from'node:fs/promises';import assert from'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||'/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PLUB_URL||'http://localhost:4186';if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Local write tests only.');
const out=new URL('../docs/notebook-2026-11-03/',import.meta.url);await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[];let key,accountId;
async function ready(p){await p.goto(base);await p.waitForFunction(()=>typeof state!=='undefined'&&state.byId.size>10000,{},{timeout:120000});await p.evaluate(()=>document.fonts.ready)}
try{
 for(const width of [390,1024,1440,1280]){
  const c=await b.newContext({viewport:{width,height:width===390?844:width===1280?720:900},timezoneId:'Asia/Bangkok',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await ready(p);await p.screenshot({path:new URL(`after-map-${width}.png`,out).pathname});
  await p.locator('#passport').click();await p.getByRole('heading',{name:'Your notebook',exact:true}).waitFor();await p.getByText('Cloud notebook · Sign in / Create',{exact:true}).waitFor();
  await p.screenshot({path:new URL(`after-empty-${width}.png`,out).pathname});
  const geometry=await p.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height,width:b.width}};return{viewport:{width:innerWidth,height:innerHeight},bar:r('.bar'),chips:r('.chips'),sheet:r('#sheet'),action:r('[data-find-place]'),map:r('#map'),bleed:document.documentElement.scrollWidth>innerWidth}});
  assert.equal(geometry.bleed,false);assert.ok(geometry.bar.height+geometry.chips.height<=112);assert.ok(geometry.action.top>=0&&geometry.action.bottom<geometry.viewport.height,'log action visible');
  await p.locator('.cloud-account').evaluate(e=>e.open=true);
  if(!key){await p.locator('.cloud-create [name=name]').fill('Notebook browser test');const response=p.waitForResponse(r=>r.url().endsWith('/api/account/create')&&r.request().method()==='POST');await p.getByRole('button',{name:'Create my cloud notebook'}).click();const data=await(await response).json();assert.ok(data.account);key=data.recoveryKey;accountId=data.account.id;await p.getByRole('button',{name:'I saved my key'}).click()}
  else{await p.locator('.cloud-login [name=key]').fill(key);await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.getByText('Cloud notebook · Notebook browser test',{exact:true}).waitFor()}
  await p.getByRole('button',{name:'＋ Log a visit'}).click();await p.locator('#q').fill('Maison space');await p.locator('#hits li[data-id]').first().click();await p.locator('.been-open').waitFor();await p.locator('.been-open').click();
  await p.getByLabel('Your private note',{exact:true}).fill('Quiet corner for tomorrow. A private notebook test.');
  await p.getByRole('button',{name:'4 of 5',exact:true}).click();
  const jpeg=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d');g.fillStyle='#f9c1ce';g.fillRect(0,0,24,24);return c.toDataURL('image/jpeg')});
  await mkdir(new URL('fixtures/',import.meta.url),{recursive:true});await writeFile(new URL('fixtures/photo.jpg',import.meta.url),Buffer.from(jpeg.split(',')[1],'base64'));
  await p.locator('.been-form input[type=file]').setInputFiles({name:'test.jpg',mimeType:'image/jpeg',buffer:Buffer.from(jpeg.split(',')[1],'base64')});
  await p.getByRole('button',{name:'Save visit',exact:true}).click();await p.locator('.been-form').waitFor({state:'detached'});await p.locator('#passport').click();await p.locator('.moment').first().waitFor();
  await p.locator('[data-note-edit]').first().click();await p.locator('.edit-visit textarea').fill('Edited private note · Bangkok notebook.');await p.getByRole('button',{name:'Save changes',exact:true}).click();await p.getByText('Edited private note · Bangkok notebook.',{exact:true}).waitFor();
  await p.locator('[data-note-backup]').first().click();await p.getByText('Cloud copy saved. Private; nothing published.',{exact:true}).waitFor();
  assert.equal((await p.request.get(base+'/api/community?place=h0001').then(r=>r.json())).posts.length,0,'backup stays private');
  await p.screenshot({path:new URL(`after-populated-${width}.png`,out).pathname});
  const entryAction=await p.locator('.moment-actions').first().boundingBox();assert.ok(entryAction.y>=0&&entryAction.y+entryAction.height<Math.min(600,geometry.viewport.height-20),'first saved visit actions visible without scrolling');
  // Restore the original utility bands before the entry; the same budget must reject it.
  const displaced=await p.evaluate(()=>{const sheet=document.querySelector('#sheet'),moments=sheet.querySelector('.moments').closest('section');for(const node of [sheet.querySelector(':scope>.plub-say'),...sheet.querySelectorAll(':scope>details')])if(node)moments.before(node);const r=sheet.querySelector('.moment-actions').getBoundingClientRect();return{top:r.top,bottom:r.bottom}});
  assert.throws(()=>assert.ok(displaced.bottom<Math.min(600,geometry.viewport.height-20)),'utility-band displacement must fail');
  await p.locator('#passport').click();await p.locator('.moment-actions').first().waitFor();await p.getByText('Cloud notebook · Notebook browser test',{exact:true}).waitFor();

  // Search hides both the name and its moment, then restores them.
  await p.getByRole('searchbox',{name:'Find in your notebook'}).fill('no such private note');assert.equal(await p.locator('.moment:visible').count(),0);await p.getByRole('searchbox',{name:'Find in your notebook'}).fill('');
  await p.locator('[data-note-share]').first().click();assert.equal(await p.locator('[data-share-photos]').isChecked(),false);await p.screenshot({path:new URL(`after-share-${width}.png`,out).pathname});
  // Change local contents after the preview: only the previewed snapshot may publish.
  await p.evaluate(async()=>{const v=(await Passport.all())[0];await Passport.update(v.key,{note:'NEVER PUBLISH THIS UNREVIEWED EDIT'})});
  await p.getByRole('button',{name:'Back up & publish recommendation'}).click();await p.getByText('Recommendation published. Your device copy is kept.',{exact:true}).waitFor();
  const pub=await p.request.get(base+'/api/community?place=h0001').then(r=>r.json());assert.ok(pub.posts.some(v=>v.note==='Edited private note · Bangkok notebook.'&&v.photos.length===0));assert.ok(!pub.posts.some(v=>v.note.includes('UNREVIEWED')));
  // Remove disposable public posts; preserve private cloud entries for cross-device restore.
  await p.evaluate(async({accountId})=>{const r=await fetch('/api/community?place=h0001').then(r=>r.json());for(const post of r.posts.filter(v=>v.mine))await fetch('/api/community/'+post.id,{method:'DELETE',headers:{'content-type':'application/json','x-plub-account':accountId}})},{accountId});
  // User-selected30px text must reflow and preserve every control.
  if(width===390){await p.evaluate(()=>document.documentElement.style.setProperty('--body','30px'));await p.locator('[data-note-edit]').first().scrollIntoViewIfNeeded();await p.screenshot({path:new URL('after-enlarged-390.png',out).pathname});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.locator('[data-note-edit]').first().click();await p.locator('.edit-visit textarea').fill('Large text edit still works');await p.getByRole('button',{name:'Save changes',exact:true}).click();await p.getByText('Large text edit still works',{exact:true}).waitFor()}
  assert.deepEqual(errors,[]);results.push({width,...geometry,edit:true,privateBackup:true,photoOptional:true,previewSnapshotPreserved:true,entryAction,utilityBandFalsifier:displaced,pageErrors:errors});await c.close();
 }
 // Fresh device restores full note/photos without needing the original IndexedDB.
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();await ready(p);await p.locator('#passport').click();await p.locator('.cloud-account').evaluate(e=>e.open=true);await p.locator('.cloud-login [name=key]').fill(key);await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.getByText('Cloud notebook · Notebook browser test',{exact:true}).waitFor();await p.locator('.cloud-account').evaluate(e=>e.open=true);await p.getByRole('button',{name:'↓ Restore / manage'}).click();await p.locator('[data-restore]').first().click();await p.locator('.moment').first().waitFor();assert.equal(await p.locator('.moment img').count(),1);await p.screenshot({path:new URL('after-restored-390.png',out).pathname});
 // Cloud stall must leave device controls accessible and must terminate honestly.
 await p.route('**/api/account',()=>{});await p.locator('#passport').click();await p.getByText('Device & installation',{exact:true}).waitFor();await p.getByText('Cloud request timed out.',{exact:false}).waitFor({timeout:18000});await p.screenshot({path:new URL('after-timeout-390.png',out).pathname});await p.unroute('**/api/account');
 await p.evaluate(async({accountId})=>{await fetch('/api/account',{method:'DELETE',headers:{'x-plub-account':accountId}})},{accountId});await c.close();
 await writeFile(new URL('browser-results.json',out),JSON.stringify({results,crossDeviceRestore:true,cloudTimeoutLeavesLocalControls:true},null,2)+'\n');console.log('Notebook browser flows pass at390/1024/1440/1280; cross-device restore and cloud timeout pass.');
}finally{if(key){await fetch(base+'/api/account/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({key})}).then(async r=>{const cookie=r.headers.get('set-cookie')?.split(';')[0];if(cookie)await fetch(base+'/api/account',{method:'DELETE',headers:{origin:base,cookie,'x-plub-account':accountId}})})}await b.close()}
