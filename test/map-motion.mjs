import assert from'node:assert/strict';import{createRequire}from'node:module';
let reduced=false,hidden=false,change,visibility,paused=0;
globalThis.matchMedia=()=>({get matches(){return reduced},addEventListener(k,fn){change=fn}});globalThis.document={get hidden(){return hidden},addEventListener(k,fn){visibility=fn}};globalThis.window={StreetWorld:{pause(){paused++}}};
createRequire(import.meta.url)('../public/map-motion.js');let received;const map={flyTo(o){received=o;return this},easeTo(o){received=o;return this},fitBounds(b,o){received=o;return this},stop(){paused++}};MapMotion.bind(map);
assert.equal(map.flyTo({center:[100,13],duration:9000}),map);assert.equal(received.duration,240);map.fitBounds([],{duration:0});assert.equal(received.duration,0);map.easeTo({});assert.equal(received.duration,220);reduced=true;map.flyTo({essential:true});assert.equal(received.duration,0);assert.equal(received.essential,false);change();assert.equal(paused,2);reduced=false;hidden=true;map.fitBounds([]);assert.equal(received.duration,0);visibility();assert.equal(paused,4);
console.log('Camera durations bounded; explicit snaps preserved; reduced/hidden pages snap and stop playback.');
