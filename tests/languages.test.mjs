import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLanguage } from '../scripts/build-languages.mjs';

for (const language of ['en', 'it']) {
    test(`${language}/index.html está generado a partir de la versión actual de index.html`, () => {
        const expected = buildLanguage(language);
        const actual = readFileSync(new URL(`../${language}/index.html`, import.meta.url), 'utf8');
        assert.ok(actual === expected, `Ejecuta npm run build:languages tras editar index.html o translations.js`);
    });
    test(`${language}/index.html tiene canonical, hreflang y schema propios`, () => {
        const html = readFileSync(new URL(`../${language}/index.html`, import.meta.url), 'utf8');
        assert.match(html, new RegExp(`<link rel="canonical" href="https://prospectus3d.com/${language}/">`));
        assert.match(html, /hreflang="x-default" href="https:\/\/prospectus3d.com\/"/);
        assert.match(html, new RegExp(`"inLanguage":"${language}"`));
        assert.doesNotMatch(html, /(?:src|href|poster|data-src)="(?:assets|videos)\//);
        assert.match(html, /<option>En planificación<\/option>|value="En planificación"/);
    });
}
