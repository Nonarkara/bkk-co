import assert from 'node:assert/strict';import{createRequire}from'node:module';import{readFileSync}from'node:fs';import vm from'node:vm';
const{isOpen}=createRequire(import.meta.url)('../public/hours.js');
// Same instant: Tuesday10am Bangkok, Monday10pm New York. Device timezone is irrelevant.
const instant=new Date('2026-11-03T03:00:00Z');
assert.equal(isOpen('Tu 09:00-11:00',instant),true);assert.equal(isOpen('Mo 09:00-11:00',instant),false);
for(const s of['25:00-27:00','09:70-18:00','24:00-08:00','08:00-18:99','08:00-18:00-extra','PH off','sunrise-sunset'])assert.equal(isOpen(s,instant),null,s);
assert.equal(isOpen('08:00-24:00',new Date('2026-11-03T16:59:00Z')),true);
assert.equal(isOpen('Fr 18:00-02:00',new Date('2026-11-06T18:00:00Z')),true);
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const start=source.indexOf('const nextAt ='),end=source.indexOf('\n};',start)+3;
const fixed=Date.parse('2026-11-06T18:00:00Z');class Clock extends Date{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return fixed}}
const result=vm.runInNewContext(source.slice(start,end)+'; nextAt(20,0,true).toISOString()',{Date:Clock});
assert.equal(result,'2026-11-09T13:00:00.000Z');
console.log('Bangkok hours and next weekday mood time pass across visitor timezones; invalid clocks stay unknown.');

const views=readFileSync(new URL('../public/views.js',import.meta.url),'utf8');const hs=views.indexOf('function planHop('),he=views.indexOf('\nasync function openHop',hs);
let tested;
vm.runInNewContext(views.slice(hs,he)+'; planHop({x:0,y:0})',{Date:Clock,state:{places:[{k:'cafe',flags:0,idx:80,hours:'Fr 10:00-12:00',x:0,y:0}]},F:{CHAIN:32},venueHours:p=>p.hours,window:{isOpen:(s,at)=>{tested=at.toISOString();return false}},near:()=>0,crossesRiver:()=>false});
assert.equal(tested,'2026-11-07T04:00:00.000Z','hop checks11am on theBangkokday');
