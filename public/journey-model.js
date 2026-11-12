// Pure journey meanings. Every positive facility keeps its evidence; missing stays unknown.
(function(root){
 'use strict';
 const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=180&&Math.abs(p.y)<=90;
 const dist=(a,b)=>valid(a)&&valid(b)?Math.hypot((a.y-b.y)*111320,(a.x-b.x)*111320*Math.cos((a.y+b.y)*Math.PI/360)):Infinity;
 const riverSegments=lines=>lines.flatMap(line=>line.slice(1).map((point,i)=>[line[i],point]));
 function crossesSegments(a,b,segments){
  const ccw=(p,q,r)=>(r[1]-p[1])*(q[0]-p[0])>(q[1]-p[1])*(r[0]-p[0]);
  const A=[a.x,a.y],B=[b.x,b.y];
  return segments.some(([C,D])=>ccw(A,C,D)!==ccw(B,C,D)&&ccw(A,B,C)!==ccw(A,B,D));
 }
 function stationEligible(station){
  if(!valid(station)||station.eligible===false)return false;
  const tags=station.tags||{},inactive=['disused','proposed','construction','abandoned','demolished'];
  if(String(tags.access||'').split(';').some(v=>['no','private','permit','military'].includes(v.trim())))return false;
  if(inactive.includes(tags.railway)||inactive.includes(tags.station))return false;
  return !inactive.some(life=>[life,life+':railway',life+':public_transport','railway:'+life].some(k=>tags[k]!=null&&!['','no','false','0'].includes(String(tags[k]))));
 }
 function makeData(geo={},join={},evidence={}){
  const cols=join.workCols||[];
  return {stationById:new Map((geo.stations||[]).map(s=>[s.id,s])),
   joinById:new Map((join.workRows||[]).map(r=>[r[0],Object.fromEntries(cols.map((c,i)=>[c,r[i]]))])),
   parkingById:new Map(Object.entries(join.parking||{})),evidence:new Map(Object.entries(evidence.places||{})),
   raw:{geo,join,evidence}};
 }
 const fact=(value=null,basis='unknown',note='Not documented; check with the venue.',source_ids=[])=>({value,basis,note,source_ids});
 const lookup=(source,id)=>source instanceof Map?source.get(id):source?.[id];
 function facilities(p,data,scores={}){
  const record=lookup(data?.evidence,p.id),first=record?.facts||{},tags=data?.raw?.join?.venueTags?.[p.id]?.tags||{},
   score=lookup(scores,p.id),asOf=data?.raw?.geo?.manifest?.asOf||'snapshot date unknown',out={};
  const visitor=field=>{
   const value=score?.[field];if(!(score?.n>0)||typeof value!=='number'||!Number.isFinite(value)||value<1||value>3)return null;
   // validateScore accepts1=None/No,2=Slow/Few/OK,3=Fast/Plenty/Welcome.
   const result=value===1?false:value>=2?true:null;
   return result===null?null:fact(result,'visitor',`${score.n} visitor rating${score.n===1?'':'s'}; last ${score.last||'date unknown'}; ${field} average ${value}.`,[p.id]);
  };
  const osm=(value,note)=>fact(value,'osm',`${note} OpenStreetMap ${asOf}; current availability is not confirmed.`,[p.id]);
  for(const key of ['wifi','power','parking','work_allowed']){
   if(typeof first[key]?.value==='boolean'){
    const f=first[key],ids=[...(f.source_ids||record.source_ids||[])],tiers=ids.map(id=>data?.raw?.evidence?.sources?.[id]?.tier);
    const basis=tiers.length&&tiers.every(t=>t==='first_party')?'first_party':tiers.length&&tiers.every(t=>t==='editorial')?'editorial':'publisher';
    out[key]=fact(f.value,basis,`${f.note||'Publisher-stated fact.'} Checked ${f.checked_at||'date unknown'}.`,ids);continue;
   }
   out[key]=fact();
   if(key==='wifi'||key==='power'||key==='work_allowed'){
    const crowd=visitor(key==='work_allowed'?'laptop':key);
    if(crowd){out[key]=crowd;continue;}
   }
   if(key==='wifi'){
    if(tags.internet_access==='no')out[key]=osm(false,'Venue internet_access=no.');
    else if(['wlan','yes'].includes(tags.internet_access))out[key]=osm(true,`Venue internet_access=${tags.internet_access}.`);
    else if(p.flags&2)out[key]=osm(false,'Catalogue has an explicit no-internet tag.');
    else if(p.flags&1)out[key]=osm(true,'Catalogue has a Wi-Fi tag.');
   }
   if(key==='power'){
    const direct=tags.socket??tags.power_supply;
    if(['no','0','none'].includes(direct))out[key]=osm(false,`Venue socket/power_supply=${direct}.`);
    else if(direct==='yes')out[key]=osm(true,'Venue explicitly tags socket/power_supply=yes; outlet at your seat is not assured.');
    // Ordinary mains sockets only. EV connectors and generation types are not laptop outlets.
    else if(['schuko','bs1363','nema_5_15','nema_5_20'].some(type=>{
     const count=tags['socket:'+type];return count==='yes'||typeof count==='string'&&/^\d+$/.test(count)&&Number(count)>0;
    }))out[key]=osm(true,'Venue has a positive ordinary mains socket count; outlet at your seat is not assured.');
   }
   if(key==='parking'){
    if(tags.parking==='no')out[key]=osm(false,'Venue parking=no.');
    else if(tags.parking==='yes')out[key]=osm(true,'Venue parking=yes; fees/spaces are not confirmed.');
    else{
     const j=data?.joinById?.get(p.id),explicit=j&&data?.parkingById?.get(j.parkingExplicitAccessID);
     if(explicit?.accessClass==='access_tagged'&&['yes','permissive','designated'].includes(explicit.tags?.access)&&Number.isFinite(j.parkingExplicitAccessM)&&j.parkingExplicitAccessM>=0&&j.parkingExplicitAccessM<=150){
      out[key]=fact(true,'nearby_explicit_access',`Nearby mapped car park ${j.parkingExplicitAccessM} m straight-line; access=${explicit.tags?.access||'tagged'}. Not venue/on-site parking; entrance, fees and available spaces unverified.`,[explicit.sourceID||j.parkingExplicitAccessID]);
     }else if(j?.parkingID){
      const nearby=data.parkingById.get(j.parkingID);
      out[key]=fact(null,'unknown',`Nearby mapped car park ${j.parkingM} m straight-line; access ${nearby?.tags?.access||'unknown'} (${nearby?.accessClass||'unknown'}). This does not establish usable or venue parking.`,[nearby?.sourceID||j.parkingID]);
     }
    }
   }
  }
  out.hours=first.hours?.value||p.hours||null;
  return out;
 }
 function requireRiver(crosses){if(typeof crosses!=='function')throw new Error('River geometry unavailable; no same-bank journey can be claimed.');return crosses;}
 function rank(places,data,scores,opts={},now=new Date(),isOpen,crossesRiver){
  const mode=opts.mode||'nearby',task=opts.task||'laptop',origin=valid(opts.origin)?opts.origin:null;
  if(!['drive','rail','nearby'].includes(mode))return [];
  if(mode!=='rail'&&!origin)return [];
  const required=task==='laptop'?['wifi','power']:task==='online'?['wifi']:[];
  if(mode==='drive')required.push('parking');
  const start=now instanceof Date?now:new Date(now);if(!Number.isFinite(start.getTime()))return [];
  const duration=Number.isFinite(opts.duration)?Math.min(1440,Math.max(0,opts.duration)):120;
  const samples=[];for(let m=0;m<duration;m+=15)samples.push(m);samples.push(duration);
  const radius=mode==='rail'?(opts.lastMile==='ride'?2500:800):(Number.isFinite(opts.radius)?opts.radius:mode==='drive'?5000:800);
  const out=[];
  for(const p of places){
   if(!valid(p)||!['cafe','coworking','library'].includes(p.k))continue;
   let station=null,stationDistance=null,d;
   if(mode==='rail'){
    const j=data.joinById.get(p.id),bts=opts.system==='BTS';
    const id=opts.stationID||(bts?j?.btsID:j?.railID);station=data.stationById.get(id);
    if(!stationEligible(station)||bts&&!station.systems?.includes('BTS'))continue;
    stationDistance=opts.stationID?dist(p,station):(bts?j?.btsM:j?.railM);
    if(!Number.isFinite(stationDistance)||stationDistance<0||stationDistance>radius)continue;
    d=stationDistance;
    if(typeof crossesRiver==='function'&&crossesRiver(station,p))continue;
   }else{
    d=dist(p,origin);if(d>radius)continue;
    if(typeof crossesRiver==='function'&&crossesRiver(origin,p))continue;
   }
   const f=facilities(p,data,scores);
   if(task!=='read'&&f.work_allowed.value===false)continue;
   if(required.some(key=>f[key].value===false))continue;
   const missing=required.filter(key=>f[key].value===null);if(opts.strict&&missing.length)continue;
   const accessWindow=data.evidence?.get(p.id)?.facts?.day_pass?.value?.access_hours;
   let stay=accessWindow?null:true,closed=false;
   for(const minutes of samples){
    const time=new Date(start.getTime()+minutes*60000);
    if(accessWindow){
     // A pass clock limits visitor admission even when full members have24/7 access.
     // It supplies no weekdays, so inside this clock still does not establish stay=true.
     const match=/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(accessWindow);
     if(match){
      const a=Number(match[1])*60+Number(match[2]),b=Number(match[3])*60+Number(match[4]);
      const local=new Date(time.getTime()+7*3600000),t=local.getUTCHours()*60+local.getUTCMinutes();
      if(a<1440&&b<=1440&&Number(match[2])<60&&Number(match[4])<60&&!(a<b?t>=a&&t<b:t>=a||t<b)){closed=true;break;}
     }
    }
    let state=null;
    if(typeof isOpen==='function'&&f.hours){try{state=isOpen(f.hours,time);}catch{state=null;}}
    if(state===false){closed=true;break;}if(state!==true)stay=null;
   }
   if(closed)continue;
   out.push({p,d,station,stationDistance,facilities:f,missing,required:[...required],stay,matched:required.filter(key=>f[key].value===true).length});
  }
  return out.sort((a,b)=>a.missing.length-b.missing.length||Number(b.facilities.work_allowed.value===true)-Number(a.facilities.work_allowed.value===true)||a.d-b.d||(Number(b.p.idx??b.p.i)||0)-(Number(a.p.idx??a.p.i)||0)||String(a.p.id).localeCompare(String(b.p.id)));
 }
 function directions(p,origin,mode='nearby'){
  if(!valid(p))return null;
  const url=new URL('https://www.google.com/maps/dir/');url.searchParams.set('api','1');
  url.searchParams.set('destination',`${p.y},${p.x}`);
  url.searchParams.set('travelmode',mode==='two-wheeler'?'two-wheeler':['drive','driving','ride'].includes(mode)?'driving':mode==='transit'?'transit':'walking');
  if(valid(origin))url.searchParams.set('origin',`${origin.y},${origin.x}`);
  return url.href;
 }
 root.JourneyModel={makeData,facilities,rank,dist,directions,requireRiver,stationEligible,riverSegments,crossesSegments};
 if(typeof module!=='undefined')module.exports=root.JourneyModel;
})(typeof window!=='undefined'?window:globalThis);
