import vm from'node:vm';import{readFile}from'node:fs/promises';import assert from'node:assert/strict';
process.env.TZ='America/New_York';const noop=()=>{};
const context=vm.createContext({AbortSignal,queueMicrotask:fn=>fn(),map:{isStyleLoaded:()=>false},window:{},$:()=>({addEventListener:noop}),document:{addEventListener:noop},fetch:()=>new Promise(()=>{}),plub:()=>'',esc:s=>String(s??''),fmt:s=>String(s),console});
vm.runInContext(await readFile(new URL('../public/passport.js',import.meta.url),'utf8'),context);context.Passport=context.window.Passport;
vm.runInContext(await readFile(new URL('../public/views.js',import.meta.url),'utf8'),context);
for(const at of['2026-11-03','2026-11-02T20:30:00Z']){const html=context.window.momentHtml({key:1,at,stars:0,words:[],note:'',photos:[]});assert.match(html,/3 Nov 2026/);assert.match(html,/Not rated yet/);assert.doesNotMatch(html,/0 of 5/)}
console.log('Date-only and legacy instant both display3Nov in a New York browser; an ungiven score says Not rated yet.');
