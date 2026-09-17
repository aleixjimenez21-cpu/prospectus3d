(() => {
 const section = document.querySelector('#beneficios');
 const video = section.querySelector('video');
 const pane = section.querySelector('.experience-window');
 const buttons = [...section.querySelectorAll('[data-feature]')];
 const select = section.querySelector('select');
 const pause = section.querySelector('#experience-pause');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const items = [
  ['building','EXPLORA','Edificio 3D','Descubre la arquitectura y su entorno antes de entrar a explorar cada planta.'],
  ['floors','EXPLORA','Selector de plantas','Recorre el edificio por alturas y localiza las viviendas de cada planta.'],
  ['homes','EXPLORA','Explora las viviendas','Consulta precio, superficie, dormitorios y disponibilidad desde la propia fachada.'],
  ['tour','EXPLORA','Tour 360º','Entra en la vivienda y recorre sus estancias, la terraza y las vistas.'],
  ['compare','DECIDE','Comparador de viviendas','Contrasta precios, superficies y características para elegir con más contexto.'],
  ['finance','DECIDE','Calculadora hipotecaria','Explora una estimación de la cuota ajustando entrada, interés y plazo.'],
  ['assistant','DECIDE','Asistente IA','Pregunta sobre la promoción desde el asistente integrado en la experiencia.'],
  ['catalog','GESTIONA','Panel de viviendas','Consulta el catálogo de la promoción y accede a las fichas y al comparador desde una misma lista.']
 ];
 let active=0, timer, visible=false, paused=reduced.matches;
 const path=(i,ext)=>`assets/features/${items[i][0]}.${ext}`;
 function playback(){
  pause.textContent=paused?'Reproducir':'Pausar';
  pause.setAttribute('aria-label',paused?'Reproducir demostración':'Pausar demostración');
  if(visible&&!paused&&!document.hidden) {
   if(!video.getAttribute('src')) { video.src=path(active,'mp4'); video.load(); }
   video.play().catch(()=>{pause.textContent='Reproducir';paused=true;});
  } else video.pause();
 }
 function change(index){
  if(index===active)return;
  clearTimeout(timer); active=index;
  buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  select.value=String(index); pane.classList.add('changing'); video.pause();
  timer=setTimeout(()=>{
   const item=items[index]; video.removeAttribute('src'); video.poster=path(index,'webp'); video.load();
   video.setAttribute('aria-label',`Demostración: ${item[2]}`);
   section.querySelector('#experience-category').textContent=`${String(index+1).padStart(2,'0')} — ${item[1]}`;
   section.querySelector('#experience-name').textContent=item[2];
   section.querySelector('#experience-description').textContent=item[3];
   pane.classList.remove('changing'); playback();
   // Preload only the next lightweight poster, never eight videos.
   const next=new Image(); next.src=path((index+1)%items.length,'webp');
  },reduced.matches?0:160);
 }
 buttons.forEach((button,i)=>{
  button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')change(i);});
  button.addEventListener('click',()=>change(i));
  button.addEventListener('focus',()=>change(i));
 });
 select.addEventListener('change',()=>change(Number(select.value)));
 pause.addEventListener('click',()=>{paused=!paused;playback();});
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;playback();},{threshold:.1}).observe(section.querySelector('.experience-media'));
 reduced.addEventListener('change',()=>{paused=reduced.matches;playback();});
 document.addEventListener('visibilitychange',playback);
 playback();
})();
