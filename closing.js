(() => {
    const closing = document.getElementById('hablemos');
    const floating = document.getElementById('whatsapp-float');
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
    // Keep the floating shortcut clear of mobile content and the final contact actions.
    const content = [...document.querySelectorAll('main p, main h1, main h2, main h3, main a, main button, main input, main select, main textarea, main label, main video, main iframe')];
    let queued = false;
    function updateFloating() {
        queued = false;
        const mobile = innerWidth <= 768;
        const size = mobile ? 52 : 56;
        const right = mobile ? 16 : 28;
        const bottom = parseFloat(getComputedStyle(floating).bottom);
        const area = { left: innerWidth - right - size - 6, right: innerWidth - right + 6, top: innerHeight - bottom - size - 6, bottom: innerHeight - bottom + 6 };
        const overlap = rect => rect.width > 0 && rect.height > 0 && rect.left < area.right && rect.right > area.left && rect.top < area.bottom && rect.bottom > area.top;
        const finalVisible = closing.getBoundingClientRect().top < innerHeight && document.getElementById('closing-footer').getBoundingClientRect().bottom > 0;
        const collision = mobile && content.some(el => {
            if (!overlap(el.getBoundingClientRect())) return false;
            if (el.matches('p,h1,h2,h3,label')) {
                const range = document.createRange();
                range.selectNodeContents(el);
                return [...range.getClientRects()].some(overlap);
            }
            return true;
        });
        // Do not remove a keyboard-focused shortcut until focus leaves it.
        floating.hidden = document.activeElement !== floating && (finalVisible || collision || document.getElementById('menu-toggle').getAttribute('aria-expanded') === 'true');
    }
    function schedule() { if (!queued) { queued = true; requestAnimationFrame(updateFloating); } }
    addEventListener('scroll', schedule, { passive:true });
    addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    new MutationObserver(schedule).observe(document.getElementById('menu-toggle'), { attributes:true, attributeFilter:['aria-expanded'] });
    updateFloating();
})();
