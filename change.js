(() => {
 const root=document.querySelector('#el-cambio'),track=root.querySelector('.change-track');
 const docs=[...root.querySelectorAll('.change-document')],converge=root.querySelector('.change-converge'),brand=root.querySelector('.change-brand');
 const before=root.querySelector('.change-before'),after=root.querySelector('.change-after');
 const desktop=matchMedia('(min-width:901px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const clamp=x=>Math.max(0,Math.min(1,x));
 let scheduled=false;
 root.classList.add('enhanced');
 const reveals=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('seen');reveals.unobserve(entry.target);}}),{threshold:.15});
 docs.forEach(doc=>reveals.observe(doc));
 function draw(){
  scheduled=false;
  if(!desktop.matches||reduced.matches){[...docs,converge,brand,before,after].forEach(e=>e.removeAttribute('style'));return;}
  const rect=track.getBoundingClientRect(),range=track.offsetHeight-(innerHeight-100);
  const p=clamp((85-rect.top)/range),t=p*6;
  root.style.setProperty('--progress',p);
  const labels=['01 — RENDER','02 — PLANO','03 — DISPONIBILIDAD','04 — INFORMACIÓN','CENTRALIZAR','PROSPECTUS'];
  root.querySelector('#change-step').textContent=labels[Math.min(5,Math.round(t))];
  docs.forEach((el,i)=>{
   const enter=clamp((t-i)*2+1),age=clamp(t-i),join=clamp(t-4),fade=clamp((t-4.6)*2.5);
   const x=[-22,22,-17,17][i]*age*(1-join),y=[-9,-3,15,18][i]*age*(1-join);
   el.style.opacity=enter*(1-fade);
   el.style.transform='translate('+x+'%,'+(y+(1-enter)*12)+'%) scale('+(1-.47*age-.08*join)+')';
   el.style.zIndex=i+1;
  });
  converge.style.opacity=clamp((t-3.5)*2)*(1-clamp((t-5.3)*5));
  before.style.opacity=1-clamp((t-4.3)*3);
  after.style.opacity=clamp((t-4.95)*6);
  brand.style.opacity=clamp((t-5.5)*2);
 }
 function queue(){if(!scheduled){scheduled=true;requestAnimationFrame(draw);}}
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);
 desktop.addEventListener('change',queue);reduced.addEventListener('change',queue);queue();
 new IntersectionObserver(([entry])=>converge.classList.toggle('joined',entry.isIntersecting),{threshold:.65}).observe(converge);
 const video=root.querySelector('video'),button=root.querySelector('.change-play');
 let visible=false,paused=reduced.matches;
 function playback(){
  button.textContent=paused?'Reproducir recorrido':'Pausar recorrido';
  if(visible&&!paused&&!document.hidden){
   if(!video.getAttribute('src'))video.src=video.dataset.src;
   video.play().catch(()=>{paused=true;button.textContent='Reproducir recorrido';});
  }else video.pause();
 }
 button.addEventListener('click',()=>{paused=!paused;playback();});
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;root.querySelector('.change-film').classList.toggle('visible',visible);playback();},{threshold:.25}).observe(video);
 reduced.addEventListener('change',()=>{paused=reduced.matches;playback();});
 document.addEventListener('visibilitychange',playback);
})();
