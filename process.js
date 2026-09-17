(() => {
  const section = document.querySelector('#el-proceso');
  if (!section || !('IntersectionObserver' in window)) return;
  const steps = [...section.querySelectorAll('.process-step')];
  const mobile = window.matchMedia('(max-width:768px)');
  const reduced = window.matchMedia('(prefers-reduced-motion:reduce)');
  let observer;
  const setup = () => {
    observer?.disconnect();
    if (reduced.matches) {
      section.classList.remove('process-enhanced');
      steps.forEach(step => step.classList.add('is-visible'));
      return;
    }
    section.classList.add('process-enhanced');
    steps.forEach((step, index) => step.style.setProperty('--delay', mobile.matches ? '0s' : `${index * .4}s`));
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const reveal = mobile.matches ? [entry.target] : steps;
        reveal.forEach(step => step.classList.add('is-visible'));
        observer.unobserve(entry.target);
      });
    }, { threshold: .15 });
    (mobile.matches ? steps : [section.querySelector('.process-steps')]).forEach(el => observer.observe(el));
  };
  setup();
  mobile.addEventListener('change', setup);
  reduced.addEventListener('change', setup);
})();
