(() => {
 const root=document.querySelector('#audiovisual');
 const video=root.querySelector('video'), source=video.querySelector('source');
 const cover=root.querySelector('#motion-cover'), image=root.querySelector('img');
 const stage=root.querySelector('.motion-stage'), rows=[...root.querySelectorAll('[data-motion]')];
 const error=root.querySelector('#motion-error');
 const items=[
  ['explorar','explorar','Explorar antes de existir','De la planta al recorrido.','Serra Residencial al atardecer.'],
  ['despues','despues-del-clic','Después del clic','Cuando la web responde como un comercial.','Una persona explora Serra Residencial en su portátil.'],
  ['mas-alla','mas-alla-del-3d','Más allá del 3D','Precio, disponibilidad y contexto.','Presentación de viviendas y sus características.'],
  ['30-segundos','prospectus-30s','Prospectus en 30 segundos','La experiencia completa, comprimida.','La marca Prospectus en un entorno arquitectónico.']
 ];
 let active=0, timer, revision=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function select(index) {
  if(index===active)return;
  active=index; revision++; clearTimeout(timer);
  video.pause(); video.removeAttribute('src'); source.removeAttribute('src'); video.load();
  video.controls=false; stage.classList.remove('playing'); cover.removeAttribute('tabindex'); error.hidden=true;
  rows.forEach((row,i)=>row.setAttribute('aria-pressed',String(i===index)));
  root.classList.add('changing');
  timer=setTimeout(()=>{
   const item=items[index];
   image.src='assets/motion/'+item[0]+'.png'; image.alt=item[2]+'. '+item[4];
   cover.setAttribute('aria-label','Reproducir '+item[2]); video.setAttribute('aria-label',item[2]);
   root.querySelector('#motion-count').textContent='0'+(index+1)+' / 04';
   root.querySelector('#motion-title').textContent=item[2];
   root.querySelector('#motion-description').textContent=item[3];
   root.classList.remove('changing');
  },reduced.matches?0:150);
 }
 async function play() {
  const token=++revision; error.hidden=true; video.pause();
  const src='videos/'+items[active][1]+'.mp4';
  if(source.getAttribute('src')!==src){ source.src=src; video.load(); }
  video.currentTime=0; video.controls=true;
  try { await video.play(); if(token!==revision)return; stage.classList.add('playing'); cover.tabIndex=-1; video.focus({preventScroll:true}); }
  catch(e) { if(token!==revision)return; video.controls=false; error.hidden=false; }
 }
 cover.addEventListener('click',play);
 rows.forEach((row,i)=>{
  row.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&matchMedia('(hover: hover)').matches)select(i);});
  row.addEventListener('click',e=>{
   const touch=e.pointerType==='touch'||matchMedia('(hover: none)').matches;
   if(i!==active)select(i); else if(!touch)play();
  });
 });
 video.addEventListener('ended',()=>{stage.classList.remove('playing');cover.removeAttribute('tabindex');video.controls=false;});
 // Original PNGs are preloaded lazily near the section; videos remain on demand.
 new IntersectionObserver((entries,observer)=>{
  if(!entries.some(e=>e.isIntersecting))return;
  items.slice(1).forEach(item=>{const img=new Image();img.src='assets/motion/'+item[0]+'.png';});
  observer.disconnect();
 },{rootMargin:'300px'}).observe(root);
})();
