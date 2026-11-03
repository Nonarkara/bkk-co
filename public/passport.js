// Passport: visits, impressions and photos, kept on this device only (IndexedDB).
// Device storage remains primary. Cloud backup is explicit and lives in notebook.js.
(function (root) {
  const DB = 'bkkco-passport', STORE = 'visits';
  let dbp;

  function db() {
    if (!dbp) dbp = new Promise((ok, fail) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'key', autoIncrement: true }).createIndex('place', 'place');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => fail(r.error);
    });
    return dbp;
  }

  async function tx(mode, fn) {
    const d = await db();
    return new Promise((ok, fail) => {
      const t = d.transaction(STORE, mode), s = t.objectStore(STORE);
      const req = fn(s);
      t.oncomplete = () => ok(req && req.result);
      t.onerror = () => fail(t.error);
    });
  }

  // Phone photos are 3-12 MB; keep a 1280 px JPEG so a year of visits fits comfortably.
  async function shrink(file, max = 1280) {
    if (!file || !/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type) || file.size > 20000000) throw new Error('Choose a photo under 20 MB.');
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
    if (!blob) throw new Error('Photo could not be read.');
    return blob;
  }

  const toDataUrl = blob => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });

  const Passport = {
    async all() { return (await tx('readonly', s => s.getAll())) || []; },
    async forPlace(id) { return (await tx('readonly', s => s.index('place').getAll(id))) || []; },
    async get(key) { return tx('readonly', s => s.get(key)); },
    async mutate(key, fn) {
      const d = await db();
      return new Promise((ok, fail) => {
        const t = d.transaction(STORE, 'readwrite'), store = t.objectStore(STORE); let result, error;
        const r = store.get(key);
        r.onsuccess = () => { try { if (!r.result) throw new Error('This device visit was removed.'); result = fn(r.result); store.put({ ...result, key }); } catch (e) { error=e; t.abort(); } };
        t.oncomplete = () => ok(result); t.onabort = () => fail(error || t.error); t.onerror = () => fail(t.error);
      });
    },
    async update(key, patch) { return this.mutate(key, old => ({ ...old, ...patch, key, updated: new Date().toISOString() })); },
    async put(visit) { return tx('readwrite', s => s.put(visit)); },
    async clear() { return tx('readwrite', s => s.clear()); },
    toDataUrl, shrink,
    day(value) { const at = typeof value === 'string' ? value : value.at; return /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : new Date(Date.parse(at)+7*3600000).toISOString().slice(0,10); },
    async add({ place, name, kind, y, x, stars, words, note, files, at }) {
      const photos = [];
      for (const f of [...(files || [])].slice(0, 4)) photos.push(await shrink(f));
      const visit = { uid: crypto.randomUUID(), place, name, kind, y, x, stars, words: words || [], note: (note || '').slice(0, 600), photos, at: at || new Date().toISOString() };
      return tx('readwrite', s => s.add(visit));
    },
    async remove(key) { return tx('readwrite', s => s.delete(key)); },
    async exportFile() {
      const visits = await this.all();
      const parts=[];let out=[],bytes=0;
      const envelope=values=>new Blob(['{"app":"bkk-co","version":1,"exported":'+JSON.stringify(new Date().toISOString())+',"visits":[',values.join(','),']}'],{type:'application/json'});
      for(const v of visits) {
        const value=JSON.stringify({...v,photos:await Promise.all((v.photos||[]).map(toDataUrl))});
        const size=new Blob([value]).size;
        if(size>14000000)throw new Error('A visit exceeds the backup limit. Export it after reducing its photos.');
        if(out.length && (bytes+size>14000000 || out.length>=1000)){parts.push(envelope(out));out=[];bytes=0}
        out.push(value);bytes+=size+1;
      }
      if(out.length||!parts.length)parts.push(envelope(out));
      return {count:visits.length,parts};
    },
    async importFile(file) {
      if (!file || file.size > 15000000) throw new Error('Backup must be under 15 MB.');
      const data = JSON.parse(await file.text());
      if (data.app !== 'bkk-co' || !Array.isArray(data.visits) || data.visits.length > 1000) throw new Error('Not a PLUB passport file');
      const validId=value=>typeof value==='string' && /^(?:[a-f0-9]{64}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(value);
      const identity=async(v,local=false)=>{
        if(validId(v.backupId))return v.backupId;
        if(validId(v.uid))return v.uid;
        const photos=local?await Promise.all((v.photos||[]).map(toDataUrl)):v.photos||[];
        const bytes=new TextEncoder().encode(JSON.stringify([v.place,v.at,v.stars,v.words,v.note,photos]));
        return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
      };
      const have = new Set(await Promise.all((await this.all()).map(v=>identity(v,true))));
      let n = 0;
      for (const v of data.visits) {
        if (!v || typeof v.place !== 'string' || typeof v.at !== 'string' || !Number.isFinite(Date.parse(v.at))) continue;
        if (!Number.isInteger(v.stars) || v.stars < 0 || v.stars > 5 || typeof v.note !== 'string' || v.note.length > 600 || !Array.isArray(v.words) || v.words.some(w => typeof w !== 'string' || w.length > 40)) throw new Error('Invalid visit in backup.');
        const backupId=await identity(v);if(have.has(backupId))continue;
        const photos = await Promise.all((v.photos || []).slice(0,4).filter(p => typeof p === 'string' && p.length <= 3000000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p)).map(p => fetch(p).then(r => r.blob()).then(b => shrink(b))));
        // Imported files cannot smuggle cloud identities/revisions or arbitrary fields.
        await tx('readwrite', s => s.add({ uid: crypto.randomUUID(), backupId, place:v.place, name:String(v.name || '').slice(0,200), kind:String(v.kind || ''), y:Number(v.y), x:Number(v.x), stars:v.stars, words:v.words, note:v.note, at:v.at, photos }));
        have.add(backupId); n++;
      }
      return n;
    },
  };

  root.Passport = Passport;
})(window);
