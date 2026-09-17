(() => {
  const section = document.querySelector('#preguntas-frecuentes');
  if (!section) return;
  const buttons = [...section.querySelectorAll('.questions-item button')];
  const setOpen = (button, open) => {
    button.setAttribute('aria-expanded', String(open));
    button.closest('.questions-item').classList.toggle('is-open', open);
    section.querySelector(`#${button.getAttribute('aria-controls')}`).inert = !open;
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    buttons.forEach(other => setOpen(other, other === button && open));
  }));
})();
