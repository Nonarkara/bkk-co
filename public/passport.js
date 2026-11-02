// Passport: visits, impressions and photos, kept on this device only (IndexedDB).
// ponytail: no account, no server copy. Export/import is the backup. Sync can come with the app.
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
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
  }

  const toDataUrl = blob => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });

  const Passport = {
    async all() { return (await tx('readonly', s => s.getAll())) || []; },
    async forPlace(id) { return (await tx('readonly', s => s.index('place').getAll(id))) || []; },
    async add({ place, name, kind, y, x, stars, words, note, files }) {
      const photos = [];
      for (const f of [...(files || [])].slice(0, 4)) photos.push(await shrink(f));
      const visit = { place, name, kind, y, x, stars, words: words || [], note: (note || '').slice(0, 600), photos, at: new Date().toISOString() };
      return tx('readwrite', s => s.add(visit));
    },
    async remove(key) { return tx('readwrite', s => s.delete(key)); },
    async exportFile() {
      const visits = await this.all();
      const out = [];
      for (const v of visits) out.push({ ...v, photos: await Promise.all(v.photos.map(toDataUrl)) });
      const blob = new Blob([JSON.stringify({ app: 'bkk-co', version: 1, exported: new Date().toISOString(), visits: out })], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `plub-passport-${new Date().toISOString().slice(0, 10)}.json` });
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return visits.length;
    },
    async importFile(file) {
      const data = JSON.parse(await file.text());
      if (data.app !== 'bkk-co' || !Array.isArray(data.visits)) throw new Error('Not a PLUB passport file');
      const have = new Set((await this.all()).map(v => v.place + v.at));
      let n = 0;
      for (const v of data.visits) {
        if (typeof v.place !== 'string' || typeof v.at !== 'string' || have.has(v.place + v.at)) continue;
        const photos = await Promise.all((v.photos || []).filter(p => /^data:image\//.test(p)).map(p => fetch(p).then(r => r.blob())));
        const { key, ...rest } = v;
        await tx('readwrite', s => s.add({ ...rest, photos }));
        have.add(v.place + v.at); n++;
      }
      return n;
    },
  };

  root.Passport = Passport;
})(window);
