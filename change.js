(() => {
 const t=text=>window.ProspectusLanguage?.t(text)||text;
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
  if(!desktop.matches||reduced.matches){root.querySelector('#change-step').textContent=t('01 — RENDER');[...docs,converge,brand,before,after].forEach(e=>e.removeAttribute('style'));return;}
  const rect=track.getBoundingClientRect(),range=track.offsetHeight-(innerHeight-100);
  const p=clamp((85-rect.top)/range),phase=p*6;
  root.style.setProperty('--progress',p);
  const labels=['01 — RENDER','02 — PLANO','03 — DISPONIBILIDAD','04 — INFORMACIÓN','CENTRALIZAR','PROSPECTUS'];
  root.querySelector('#change-step').textContent=t(labels[Math.min(5,Math.round(phase))]);
  docs.forEach((el,i)=>{
   const enter=clamp((phase-i)*2+1),age=clamp(phase-i),join=clamp(phase-4),fade=clamp((phase-4.6)*2.5);
   const x=[-22,22,-17,17][i]*age*(1-join),y=[-9,-3,15,18][i]*age*(1-join);
   el.style.opacity=enter*(1-fade);
   el.style.transform='translate('+x+'%,'+(y+(1-enter)*12)+'%) scale('+(1-.47*age-.08*join)+')';
   el.style.zIndex=i+1;
  });
  converge.style.opacity=clamp((phase-3.5)*2)*(1-clamp((phase-5.3)*5));
  before.style.opacity=1-clamp((phase-4.3)*3);
  after.style.opacity=clamp((phase-4.95)*6);
  brand.style.opacity=clamp((phase-5.5)*2);
 }
 function queue(){if(!scheduled){scheduled=true;requestAnimationFrame(draw);}}
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);
 desktop.addEventListener('change',queue);reduced.addEventListener('change',queue);queue();
 new IntersectionObserver(([entry])=>converge.classList.toggle('joined',entry.isIntersecting),{threshold:.65}).observe(converge);
 const video=root.querySelector('video'),button=root.querySelector('.change-play');
 let visible=false,paused=reduced.matches;
 function label(){button.textContent=t(paused?'Reproducir recorrido':'Pausar recorrido');}
 function playback(){
  label();
  if(visible&&!paused&&!document.hidden){
   if(!video.getAttribute('src'))video.src=video.dataset.src;
   video.play().catch(()=>{paused=true;label();});
  }else video.pause();
 }
 button.addEventListener('click',()=>{paused=!paused;playback();});
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;root.querySelector('.change-film').classList.toggle('visible',visible);playback();},{threshold:.25}).observe(video);
 reduced.addEventListener('change',()=>{paused=reduced.matches;playback();});
 document.addEventListener('visibilitychange',playback);
 window.addEventListener('prospectus:languagechange',()=>{label();queue();});
 label();
})();
