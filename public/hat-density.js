// Optional catalogue-density instrument. Geometry is an aggregate grid, never a venue location.
(function(root){
  const pip=(x,y,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside}return inside};
  function geometry(bounds,zoom,H){
    const [west,south,east,north]=bounds,lat=(south+north)/2,lng=(west+east)/2,mx=111320*Math.cos(lat*Math.PI/180),my=111320;
    const bucket=Math.round(zoom*2)/2,mpp=156543.03392*Math.cos(lat*Math.PI/180)/2**bucket;
    const width=(east-west)*mx,height=(north-south)*my,target=Math.max(44*mpp,width/38,height/30),local=[-width*.7,-height*.7,width*.7,height*.7];
    let patch,scale,cx,cy;
    // A bounding rectangle alone does not prove an irregular patch covers the view.
    for(let level=2;level<=5;level++){
      patch=H.patch(level);scale=target/patch.hatSpan;cx=(patch.minX+patch.maxX)/2;cy=(patch.minY+patch.maxY)/2;
      if(patch.width*scale<width*1.4||patch.height*scale<height*1.4)continue;
      let covered=true;
      for(let ix=0;ix<=8&&covered;ix++)for(let iy=0;iy<=8;iy++){
        const x=local[0]+(local[2]-local[0])*ix/8,y=local[1]+(local[3]-local[1])*iy/8;
        if(!patch.hats.some(h=>pip(x/scale+cx,y/scale+cy,h.ring))){covered=false;break}
      }
      if(covered)break;
      if(level===5)throw new Error('Tile patch does not cover this view.');
    }
    const rings=[],boxes=[];
    for(const h of patch.hats){
      const raw=h.ring.map(([x,y])=>[(x-cx)*scale,(y-cy)*scale]),xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]);
      if(Math.max(...xs)<local[0]||Math.min(...xs)>local[2]||Math.max(...ys)<local[1]||Math.min(...ys)>local[3])continue;
      const ring=raw.map(([x,y])=>[lng+x/mx,lat+y/my]);rings.push(ring);boxes.push([Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))]);
    }
    return{key:[bucket,lng,lat,width,height].join('|'),bounds:[lng+local[0]/mx,lat+local[1]/my,lng+local[2]/mx,lat+local[3]/my],bucket,rings,boxes,areaKm2:patch.hatArea*scale*scale/1e6};
  }
  function covers(g,bounds,zoom){return !!g&&g.bucket===Math.round(zoom*2)/2&&bounds[0]>g.bounds[0]&&bounds[1]>g.bounds[1]&&bounds[2]<g.bounds[2]&&bounds[3]<g.bounds[3]}
  function tally(g,places){
    const counts=new Uint32Array(g.rings.length),members=Array.from({length:g.rings.length},()=>[]),size=Math.max(g.boxes[0]?.[2]-g.boxes[0]?.[0],1e-8),bins=new Map();
    for(let i=0;i<g.boxes.length;i++){const [w,s,e,n]=g.boxes[i];for(let x=Math.floor(w/size);x<=Math.floor(e/size);x++)for(let y=Math.floor(s/size);y<=Math.floor(n/size);y++){const k=x+','+y;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i)}}
    for(const p of places){for(const i of bins.get(Math.floor(p.x/size)+','+Math.floor(p.y/size))||[]){const [w,s,e,n]=g.boxes[i];if(p.x>=w&&p.x<=e&&p.y>=s&&p.y<=n&&pip(p.x,p.y,g.rings[i])){counts[i]++;members[i].push(p.id);break}}}
    g.placeIDs=members;
    return counts;
  }
  function featureCollection(g,counts){return{type:'FeatureCollection',features:g.rings.flatMap((ring,i)=>{if(!counts[i])return [];let signed=0;for(let j=0,k=ring.length-1;j<ring.length;k=j++)signed+=ring[k][0]*ring[j][1]-ring[j][0]*ring[k][1];const outer=signed<0?[...ring].reverse():ring;return [{type:'Feature',geometry:{type:'Polygon',coordinates:[[...outer,outer[0]]]},properties:{n:counts[i],perKm2:Math.round(counts[i]/g.areaKm2),tile:i,patch:g.key}}]})}}
  root.HatDensity={geometry,covers,tally,featureCollection,pip};if(typeof module!=='undefined')module.exports=root.HatDensity;
})(typeof window!=='undefined'?window:globalThis);
