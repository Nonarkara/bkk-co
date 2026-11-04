// Register an enrichment payload without overwriting current catalogue, aliases or hashes.
import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
const root=new URL('../public/data/',import.meta.url),raw=await readFile(new URL('talk-media.json',root)),manifest=JSON.parse(await readFile(new URL('manifest.json',root)));
manifest.sidecars={...manifest.sidecars,'talk-media':{path:'data/talk-media.json',role:'enrichment',bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),note:'Name-search video discovery, not verified branch identity. Not a catalogue; no coordinates or new pins.'}};
await writeFile(new URL('manifest.json',root),JSON.stringify(manifest,null,1)+'\n');
