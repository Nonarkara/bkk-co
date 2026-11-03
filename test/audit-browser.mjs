import{createRequire}from'node:module';import{writeFile,mkdir,readFile}from'node:fs/promises';import assert from'node:assert/strict';
const{chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||'/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PLUB_URL||'http://localhost:43827';if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Local only');
const out=new URL('../docs/audit-2026-11-03/',import.meta.url);await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const metrics=[];
const ready=async p=>{await p.goto(base);await p.waitForFunction(()=>state.byId.size>10000,{},{timeout:120000});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>map.isStyleLoaded(),{},{timeout:45000})};
try{
 for(const width of[390,1024,1440,1280]){
  const height=width===390?844:width===1280?720:900,c=await b.newContext({viewport:{width,height},timezoneId:'America/New_York'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await ready(p);
  await p.screenshot({path:new URL(`map-${width}.png`,out).pathname});
  await p.locator('#q').fill('Maison space');await p.locator('#hits li[data-id]').first().click();await p.locator('.been-open').waitFor();await p.locator('#sheet .facts').waitFor();const log=await p.locator('.been-open').boundingBox();assert.ok(log.y+log.height<height,'log visit with identity visible');const group=await p.evaluate(()=>{const action=document.querySelector('.been'),ggp=document.querySelector('.ggp'),kind=document.querySelector('.kindline');const bottom=()=>action.getBoundingClientRect().bottom-kind.getBoundingClientRect().bottom;const current=bottom();document.querySelector('.facts').after(action);const old=bottom();ggp.before(action);return{current,old}});assert.ok(group.current<=90);assert.ok(group.old>90,'old action separation must fail');await p.locator('.been-open').click();await p.getByLabel('Your private note',{exact:true}).fill('Outlet by the window. Photograph hours and menu next visit.');
  await p.locator('.been-form input[type=file]').setInputFiles(new URL('fixtures/photo.jpg',import.meta.url).pathname);await p.locator('.photo-preview img').waitFor();
  await p.locator('.photo-preview a').click();await p.locator('.photo-viewer[open]').waitFor();assert.ok(await p.locator('.photo-viewer img').evaluate(i=>i.complete&&i.naturalWidth>0));await p.keyboard.press('Escape');await p.locator('.photo-viewer').waitFor({state:'hidden'});assert.equal(await p.locator('.been-form').count(),1,'escape closes viewer only');
  await p.evaluate(()=>{document.body.style.fontSize='30px';document.querySelector('.work-q').open=true});
  await p.screenshot({path:new URL(`enlarged-form-${width}.png`,out).pathname});
  assert.equal(await p.locator('#sheet').evaluate(e=>e.scrollWidth>e.clientWidth),false,'expanded 30px form fits reading rail');
  await p.evaluate(()=>{document.body.style.fontSize='';document.querySelector('.work-q').open=false});
  if(width===390){await p.locator('.work-q').evaluate(e=>e.open=true);for(const seg of await p.locator('.been-form .seg').all())await seg.locator('button').first().click();await p.route('**/api/scores',r=>r.request().method()==='POST'?undefined:r.continue())}
  await p.getByRole('button',{name:'Save visit',exact:true}).click();await p.locator('.been-form').waitFor({state:'detached',timeout:15000});if(width===390)await p.unroute('**/api/scores');await p.locator('#passport').click();await p.getByRole('heading',{name:'Your notebook',exact:true}).waitFor();await p.locator('.moment').waitFor();
  await p.screenshot({path:new URL(`notebook-${width}.png`,out).pathname});
  const measure=await p.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height,width:r.width}};return{bar:rect('.bar'),chips:rect('.chips'),action:rect('.moment-actions'),sheet:rect('#sheet'),bleed:document.documentElement.scrollWidth>innerWidth}});
  assert.ok(measure.action.bottom<Math.min(600,height-20));assert.ok(measure.bar.height+measure.chips.height<=112);assert.equal(measure.bleed,false);
  const old=await p.evaluate(()=>{const sheet=document.querySelector('#sheet'),section=sheet.querySelector('.moments').closest('section');for(const el of[sheet.querySelector(':scope>.plub-say'),...sheet.querySelectorAll(':scope>details')])if(el)section.before(el);return sheet.querySelector('.moment-actions').getBoundingClientRect().bottom});assert.ok(old>=Math.min(600,height-20),'old utility-first layout must fail');await p.screenshot({path:new URL(`old-utility-${width}.png`,out).pathname});await p.locator('#passport').click();
  for(let i=0;i<5;i++){await p.locator('#passport').click();await p.locator('.moment .thumbs img').waitFor()}
  await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>visitPhotoUrls.length),1,'retired thumbnail URLs revoked');
  await p.locator('.moment .thumbs a').click();await p.locator('.photo-viewer[open]').waitFor();await p.screenshot({path:new URL(`photo-${width}.png`,out).pathname});await p.getByRole('button',{name:'Close photo',exact:true}).click();
  // The public JPEG uses exactly the data: encoding that Chrome blocks in a new tab.
  await p.evaluate(()=>{const node=document.createElement('div');node.className='thumbs';const a=document.createElement('a');a.href='data:image/jpeg;base64,';const img=document.createElement('img');const canvas=document.createElement('canvas');canvas.width=canvas.height=20;img.src=canvas.toDataURL('image/jpeg');img.alt='Public photo fixture';a.append(img);node.append(a);document.querySelector('#sheet').append(node)});
  await p.getByAltText('Public photo fixture').click();await p.locator('.photo-viewer[open]').waitFor();assert.ok(await p.locator('.photo-viewer img').evaluate(i=>i.complete&&i.naturalWidth>0));assert.equal(c.pages().length,1);await p.keyboard.press('Escape');
  // Enriched facts remain alongside their provenance in the actual place sheet.
  const audit=JSON.parse(await readFile(new URL('../public/data/enrichment.json',import.meta.url)));const id=audit.places[0].place;
  await p.evaluate(id=>select(state.byId.get(id),true),id);await p.locator('#sheet .enrichment-source').waitFor();assert.equal(await p.locator('#sheet').evaluate(e=>e.scrollWidth>e.clientWidth),false);
  await p.screenshot({path:new URL(`facts-${width}.png`,out).pathname});assert.deepEqual(errors,[]);metrics.push({width,height,...measure,oldDisplacedBottom:old,placeActionGap:group,pageErrors:errors});await c.close();
 }
 // A backup larger than the import limit is split into independently valid files.
 const c=await b.newContext(),p=await c.newPage();await ready(p);
 const backup=await p.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=900;const g=canvas.getContext('2d'),image=g.createImageData(900,900);let seed=7;for(let i=0;i<image.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;image.data[i]=seed&255;image.data[i+1]=(seed>>>8)&255;image.data[i+2]=(seed>>>16)&255;image.data[i+3]=255}g.putImageData(image,0,0);const photo=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.9));
  const original=Passport.all;Passport.all=async()=>Array.from({length:8},(_,i)=>({uid:crypto.randomUUID(),place:i<2?'same-cafe':'test'+i,at:'2026-11-03',stars:0,words:[],note:'Backup fixture '+i,photos:[photo,photo,photo,photo]}));
  try{const{count,parts}=await Passport.exportFile();let imported=0;const sizes=[];Passport.all=original;for(const blob of parts){sizes.push(blob.size);imported+=await Passport.importFile(new File([blob],'backup.json',{type:'application/json'}))}const countAfter=(await Passport.all()).length;let again=0;for(const blob of parts)again+=await Passport.importFile(new File([blob],'backup.json'));return{count,parts:parts.length,sizes,imported,countAfter,again}}finally{Passport.all=original}
 });assert.equal(backup.count,8);assert.ok(backup.parts>=2);assert.ok(backup.sizes.every(s=>s<15000000));assert.equal(backup.imported,8);assert.equal(backup.countAfter,8);assert.equal(backup.again,0);await c.close();
 await writeFile(new URL('browser-results.json',out),JSON.stringify({metrics,photoViewer:true,photoURLReclaimed:true,backup},null,2)+'\n');console.log('Four-viewport notebook, photo preview/viewer, URL lifecycle, source facts, layout falsifier, large backup roundtrip pass.');
}finally{await b.close()}
