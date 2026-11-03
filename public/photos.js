// In-page photo viewing works for private blob: and public JPEG data: images.
// Browsers intentionally block top-level data: navigation; never rely on a new tab.
(() => {
 const viewer=document.createElement('dialog');viewer.className='photo-viewer';viewer.setAttribute('aria-label','Visit photo');
 const close=document.createElement('button');close.type='button';close.textContent='Close photo';
 const image=document.createElement('img');image.alt='';viewer.append(close,image);document.body.append(viewer);
 let trigger;
 close.onclick=()=>viewer.close();
 viewer.addEventListener('close',()=>{image.removeAttribute('src');if(trigger?.isConnected)trigger.focus();trigger=null});
 document.addEventListener('click',e=>{
  const link=e.target.closest('.thumbs a');if(!link)return;
  const thumb=link.querySelector('img');if(!thumb)return;
  const src=thumb.getAttribute('src');if(!src?.startsWith('blob:')&&!src?.startsWith('data:image/jpeg;base64,'))return;
  e.preventDefault();trigger=link;image.src=src;image.alt=thumb.alt||'Visit photo';viewer.showModal();close.focus();
 });
 // Retain only URLs referenced by the current sheet or open viewer.
 const prune=()=>{
  if(!window.visitPhotoUrls)return;
  const used=new Set([...document.querySelectorAll('#sheet:not([hidden]) img,.photo-viewer[open] img')].map(i=>i.src));
  for(const link of document.querySelectorAll('#sheet:not([hidden]) a[download]'))used.add(link.href);
  for(let i=visitPhotoUrls.length-1;i>=0;i--)if(!used.has(visitPhotoUrls[i])){URL.revokeObjectURL(visitPhotoUrls[i]);visitPhotoUrls.splice(i,1)}
 };
 new MutationObserver(prune).observe(document.querySelector('#sheet'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 viewer.addEventListener('close',prune);
})();
