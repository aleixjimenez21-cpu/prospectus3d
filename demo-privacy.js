(() => {
    const frame = document.getElementById('demoIframe');
    const overlay = document.getElementById('demoOverlay');
    const activate = document.getElementById('demo-activate');
    const deactivate = document.getElementById('demo-deactivate');
    if (!frame || !overlay || !activate || !deactivate) return;
    if (typeof IS_REAL_HOST !== 'undefined' && !IS_REAL_HOST) return;

    activate.hidden = false;
    activate.addEventListener('click', () => {
        // No contact with the external host before the visitor requests the demo.
        frame.src = frame.dataset.src;
        overlay.hidden = true;
        deactivate.hidden = false;
        frame.focus();
    });
    deactivate.addEventListener('click', () => {
        frame.removeAttribute('src');
        overlay.hidden = false;
        deactivate.hidden = true;
        activate.focus({ preventScroll: true });
    });
})();
