// Genera /en/index.html e /it/index.html a partir de index.html y translations.js.
// Uso: node scripts/build-languages.mjs        (escribe los archivos)
//      node scripts/build-languages.mjs --check (falla si están desactualizados)
// Repite la lógica de language.js para que Google indexe cada idioma con su propia URL.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://prospectus3d.com/';
const LOCALES = { es: 'es_ES', en: 'en_GB', it: 'it_IT' };

export function loadDictionary() {
    const sandbox = { window: {} };
    vm.runInNewContext(readFileSync(join(root, 'translations.js'), 'utf8'), sandbox);
    return sandbox.window.PROSPECTUS_TRANSLATIONS;
}

const isLocal = value => value && !value.startsWith('#') && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(value);
const absolute = value => isLocal(value) ? '/' + value.replace(/^\.\//, '') : value;

export function buildLanguage(language, source = readFileSync(join(root, 'index.html'), 'utf8'), dictionary = loadDictionary()) {
    const t = text => dictionary[text]?.[language] || text;
    const dom = new JSDOM(source);
    const { document, NodeFilter } = dom.window;
    const pageUrl = `${SITE}${language}/`;

    document.documentElement.lang = language;
    document.documentElement.dataset.pageLanguage = language;

    // Los valores del formulario se envían siempre en español (igual que language.js).
    document.querySelectorAll('#lead-stage option').forEach(option => {
        if (!option.hasAttribute('value')) option.value = option.textContent;
    });

    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
        if (node.parentElement?.closest('script, style, [data-language-picker]')) continue;
        const original = node.textContent, key = original.trim();
        if (!key || !dictionary[key]) continue;
        const text = original.replace(key, t(key));
        node.textContent = language === 'it' ? text.replace(/’\s+$/, '’') : text;
    }
    document.querySelectorAll('[aria-label], [alt], [title], [placeholder], optgroup[label], meta[content]').forEach(element => {
        for (const name of ['aria-label', 'alt', 'title', 'placeholder', 'label', 'content']) {
            const value = element.getAttribute(name);
            if (value && dictionary[value]) element.setAttribute(name, t(value));
        }
    });

    // Rutas relativas -> absolutas desde la raíz, porque la página vive en /en/ o /it/.
    for (const [selector, name] of [['[src]', 'src'], ['[href]', 'href'], ['[poster]', 'poster'], ['[data-src]', 'data-src']]) {
        document.querySelectorAll(selector).forEach(element => {
            if (element.closest('[data-language-picker]')) return;
            const value = element.getAttribute(name);
            if (!isLocal(value)) return;
            let next = absolute(value);
            if (name === 'href' && element.tagName === 'A') {
                const url = new URL(next, SITE);
                url.searchParams.set('lang', language);
                next = url.pathname + url.search + url.hash;
            }
            element.setAttribute(name, next);
        });
    }
    document.querySelectorAll('style').forEach(style => {
        style.textContent = style.textContent.replace(/url\((['"]?)(?!data:|https?:|\/)([^'")]+)\1\)/g, (_, quote, path) => `url(${quote}/${path}${quote})`);
    });
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => {
        const url = new URL(link.href);
        url.searchParams.set('text', t('Hola, me gustaría conocer mejor Prospectus.'));
        link.setAttribute('href', url.href);
    });

    // Metadatos propios del idioma.
    document.querySelector('link[rel="canonical"]').setAttribute('href', pageUrl);
    document.querySelector('meta[property="og:url"]').setAttribute('content', pageUrl);
    document.querySelector('meta[property="og:locale"]').setAttribute('content', LOCALES[language]);
    const alternates = Object.entries(LOCALES).filter(([code]) => code !== language).map(([, locale]) => locale);
    document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((meta, index) => meta.setAttribute('content', alternates[index]));

    const ld = document.querySelector('script[type="application/ld+json"]');
    const graph = JSON.parse(ld.textContent)['@graph'];
    const page = graph.find(node => node['@type'] === 'WebPage');
    const faq = graph.find(node => node['@type'] === 'FAQPage');
    const localized = {
        '@context': 'https://schema.org',
        '@graph': [
            { ...page, '@id': `${pageUrl}#webpage`, url: pageUrl, name: t(page.name), description: t(page.description), inLanguage: language },
            {
                ...faq, '@id': `${pageUrl}#faq`, isPartOf: { '@id': `${pageUrl}#webpage` }, inLanguage: language,
                mainEntity: faq.mainEntity.map(item => ({ ...item, name: t(item.name), acceptedAnswer: { ...item.acceptedAnswer, text: t(item.acceptedAnswer.text) } })),
            },
        ],
    };
    ld.textContent = '\n' + JSON.stringify(localized) + '\n';

    return dom.serialize() + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const check = process.argv.includes('--check');
    let stale = false;
    for (const language of ['en', 'it']) {
        const file = join(root, language, 'index.html');
        const html = buildLanguage(language);
        if (check) {
            if (!existsSync(file) || readFileSync(file, 'utf8') !== html) { stale = true; console.error(`${language}/index.html está desactualizado: ejecuta npm run build:languages`); }
        } else {
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, html);
            console.log(`Generado ${language}/index.html`);
        }
    }
    if (stale) process.exit(1);
}
