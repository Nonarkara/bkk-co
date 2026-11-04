// Retired catalogue ids resolve at the trust boundary. An unavailable alias asset is not an empty map.
let map, pending;
export const catalogueUnavailable = () => Object.assign(new Error('Place catalogue is temporarily unavailable. Try again.'), {status:503,catalogue:true});
export async function loadAliases(env, url, knownIds) {
  if(map)return map;
  if(!pending)pending=(async()=>{
    const r=await env.ASSETS.fetch(new URL('/data/aliases.json',url),{signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw catalogueUnavailable();
    const data=await r.json();
    if(!data||typeof data!=='object'||Array.isArray(data)||typeof knownIds?.has!=='function')throw catalogueUnavailable();
    const raw=new Map(Object.entries(data)),next=new Map(),valid=id=>typeof id==='string'&&/^(?:[nwr]\d{1,12}|o[0-9a-f]{12}|h\d{4})$/.test(id);
    for(const [old,target]of raw){
      if(!valid(old)||!valid(target)||knownIds.has(old))throw catalogueUnavailable();
      const seen=new Set([old]);let current=target;
      while(raw.has(current)){if(seen.has(current))throw catalogueUnavailable();seen.add(current);current=raw.get(current);if(!valid(current))throw catalogueUnavailable();}
      if(!knownIds.has(current))throw catalogueUnavailable();
      next.set(old,current);
    }
    map=next;return map;
  })().catch(()=>{pending=undefined;throw catalogueUnavailable();});
  return pending;
}
export const canon = id => (typeof id === 'string' && map?.get(id)) || id;
