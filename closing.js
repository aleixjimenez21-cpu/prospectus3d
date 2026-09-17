(() => {
    const closing = document.getElementById('hablemos');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!reduced.matches && 'IntersectionObserver' in window) {
        closing.classList.add('is-prepared');
        const reveal = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                closing.classList.add('is-visible');
                reveal.disconnect();
            }
        }, { threshold: 0.15 });
        reveal.observe(closing);
    }
    closing.querySelector('a[href="#solicitar-demo"]').addEventListener('click', event => {
        event.preventDefault();
        const form = document.getElementById('solicitar-demo');
        const navHeight = document.querySelector('header').getBoundingClientRect().height;
        window.scrollTo({ top: window.scrollY + form.getBoundingClientRect().top - navHeight - 16, behavior: reduced.matches ? 'instant' : 'smooth' });
        history.replaceState(null, '', '#solicitar-demo');
    });
})();
