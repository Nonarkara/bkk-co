// One user action, one short camera transition. Hidden/reduced-motion pages snap.
(() => {
  function bind(map) {
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    const options=o=>({...o,duration:reduce.matches||document.hidden||o?.animate===false?0:Math.min(240,Math.max(0,Number.isFinite(o?.duration)?o.duration:220)),essential:false});
    const originals={};
    for(const name of ['flyTo','easeTo']) {
      originals[name]=map[name];
      map[name]=function(view,event){return originals[name].call(this,options(view),event)};
    }
    originals.fitBounds=map.fitBounds;
    map.fitBounds=function(bounds,view,event){return originals.fitBounds.call(this,bounds,options(view),event)};
    const stop=()=>{map.stop();window.StreetWorld?.pause()};
    reduce.addEventListener('change',stop);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
    return {options,stop};
  }
  globalThis.MapMotion={bind};
})();
