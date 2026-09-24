(() => {
    'use strict';
    const supported = ['es', 'it', 'en'];
    const storageKey = 'prospectus_language';
    const dictionary = window.PROSPECTUS_TRANSLATIONS || {};
    const queryLanguage = new URL(location.href).searchParams.get('lang');
    let savedLanguage;
    try { savedLanguage = localStorage.getItem(storageKey); } catch (_) { /* Storage can be disabled. */ }
    let language = supported.includes(queryLanguage) ? queryLanguage : supported.includes(savedLanguage) ? savedLanguage : 'es';
    const textNodes = [];
    const attributes = [];
    const translate = text => language === 'es' ? text : dictionary[text]?.[language] || text;
    window.ProspectusLanguage = { t: translate, get language() { return language; } };

    // Keep entered form data, event listeners, media and active UI states intact.
    document.querySelectorAll('#lead-stage option').forEach(option => {
        if (!option.hasAttribute('value')) option.value = option.textContent;
    });
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (node.parentElement?.closest('script, style, [data-language-picker]')) return NodeFilter.FILTER_REJECT;
            return dictionary[node.textContent.trim()] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });
    while (walker.nextNode()) textNodes.push([walker.currentNode, walker.currentNode.textContent]);
    document.querySelectorAll('[aria-label], [alt], [title], [placeholder], optgroup[label], meta[name="description"]').forEach(element => {
        for (const name of ['aria-label', 'alt', 'title', 'placeholder', 'label', 'content']) {
            const value = element.getAttribute(name);
            if (value && dictionary[value]) attributes.push([element, name, value]);
        }
    });
    const localLinks = [...document.querySelectorAll('a[href]')].filter(link => {
        const href = link.getAttribute('href');
        return href && !href.startsWith('#') && !/^(?:[a-z]+:|\/\/)/i.test(href);
    });
    const whatsapp = [...document.querySelectorAll('a[href^="https://wa.me/"]')];
    const pickers = [...document.querySelectorAll('[data-language-picker]')];

    function apply() {
        document.documentElement.lang = language;
        for (const [node, original] of textNodes) {
            if (!node.isConnected) continue;
            const text = original.replace(original.trim(), translate(original.trim()));
            // Italian elisions join the following inline link without an extra space.
            node.textContent = language === 'it' ? text.replace(/’\s+$/, '’') : text;
        }
        for (const [element, name, value] of attributes) element.setAttribute(name, translate(value));
        // Query parameters preserve the selection even when localStorage is unavailable.
        localLinks.forEach(link => {
            const url = new URL(link.href);
            url.searchParams.set('lang', language);
            link.href = url.href;
        });
        whatsapp.forEach(link => {
            const url = new URL(link.href);
            url.searchParams.set('text', translate('Hola, me gustaría conocer mejor Prospectus.'));
            link.href = url.href;
        });
        pickers.forEach(picker => { picker.value = language; picker.hidden = false; });
        window.dispatchEvent(new CustomEvent('prospectus:languagechange', { detail: { language } }));
    }
    pickers.forEach(picker => picker.addEventListener('change', () => {
        if (!supported.includes(picker.value)) return;
        language = picker.value;
        try { localStorage.setItem(storageKey, language); } catch (_) { /* URL fallback remains available. */ }
        const url = new URL(location.href);
        url.searchParams.set('lang', language);
        history.replaceState(history.state, '', url);
        apply();
    }));
    if (supported.includes(queryLanguage)) {
        try { localStorage.setItem(storageKey, language); } catch (_) { /* Optional preference only. */ }
    }
    apply();
})();
