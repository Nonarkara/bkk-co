// Render app icons and preview cards from the same intact artwork and live typography.
import{createRequire}from'node:module';import{readFile,writeFile,mkdir}from'node:fs/promises';
const{chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||'/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PLUB_URL||'http://localhost:43827',root=new URL('../public/',import.meta.url),art='data:image/png;base64,'+(await readFile(new URL('plub/nong-plub.png',root))).toString('base64');
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{const p=await b.newPage();await p.goto(base);await p.waitForFunction(()=>state.byId.size===57538,{},{timeout:120000});await p.evaluate(()=>document.fonts.ready);
const assets=await p.evaluate(async art=>{
 await hoodsReady;const img=new Image();img.src=art;await img.decode();const out=[];
 for(const n of[192,512]){const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,n,n);const h=n*.88,w=h*img.naturalWidth/img.naturalHeight;g.drawImage(img,(n-w)/2,n*.06,w,h);out.push({path:`icons/plub-${n}.png`,url:c.toDataURL('image/png')})}
 const cards=[{slug:'default',name:'Bangkok’s place notebook',th:'Cafés · co-working · libraries',line:state.places.length.toLocaleString('en-US')+' source-backed places · private notes and photos'},...hoods.list.map(h=>({slug:h.slug,name:h.name,th:h.th,mood:h.for,line:`${h.stats.work} work spots within 800 m · station-circle rank #${h.stats.stationRank} of ${h.stats.stations} · mean index ${h.stats.ggp}`}))];
 for(const card of cards){const c=document.createElement('canvas');c.width=1200;c.height=630;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,1200,630);let x=60;g.font='700 54px "Sao Chingcha"';for(const text of['PL',';','UB']){g.fillStyle=text===';'?'#e88ba1':'#7d133a';g.fillText(text,x,100);x+=g.measureText(text).width+3}g.fillStyle='#7d133a';g.font='400 22px Jost';g.fillText('placemaking laboratory ; urban bureau',60,142);g.font='500 54px Jost, Prompt';g.fillText(card.name,60,250);g.font='400 30px Prompt, Jost';g.fillText(card.th,60,300);if(card.mood){g.font='500 32px Jost';g.fillText('For '+card.mood.toLowerCase(),60,363)}g.font='400 23px Jost';g.fillText(card.line,60,500);g.font='400 23px Jost';g.fillText('co.nonarkara.org',60,563);const h=350,w=h*img.naturalWidth/img.naturalHeight;g.drawImage(img,1140-w,155,w,h);out.push({path:`og/${card.slug}.png`,url:c.toDataURL('image/png')})}
 return out;
},art);
for(const a of assets){await mkdir(new URL(a.path.split('/')[0]+'/',root),{recursive:true});await writeFile(new URL(a.path,root),Buffer.from(a.url.split(',')[1],'base64'))}console.log('Rendered '+assets.length+' consistent brand assets from intact sticker.');
}finally{await b.close()}
