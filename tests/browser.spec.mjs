import { test, expect } from '@playwright/test';
const endpoint = 'https://testproject.supabase.co/functions/v1/contact';
async function prepare(page, { configured = true, outcome = 'success', language = 'es' } = {}) {
    const sent = [];
    await page.route('**/videos/**', route => route.abort());
    await page.route('https://serraresidencial.netlify.app/**', route => route.fulfill({ contentType: 'text/html', body: '<p>External demo omitted in tests</p>' }));
    await page.route('**/contact-config.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.PROSPECTUS_CONTACT_CONFIG=${JSON.stringify(configured ? { endpoint, turnstileSiteKey: 'TEST_ONLY' } : { endpoint: '', turnstileSiteKey: '' })}` }));
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => route.fulfill({ contentType: 'text/javascript', body: `window.turnstile={render:(container,options)=>{window.testChallenge=options;options.callback('TEST_ONLY');container.textContent='Verificación simulada';return 'test-widget'},reset:()=>window.testChallenge.callback('TEST_ONLY')};` }));
    await page.route(endpoint, async route => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST' } });
        const payload = route.request().postDataJSON(); sent.push(payload);
        await new Promise(resolve => setTimeout(resolve, 80));
        const status = outcome === 'success' ? 201 : 503;
        await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(outcome === 'success' ? { ok: true, request_id: payload.request_id } : { error: 'storage_unavailable' }) });
    });
    await page.goto(`/?lang=${language}`);
    await page.locator('#lead-name').fill('Persona de prueba');
    await page.locator('#lead-company').fill('Empresa de prueba');
    await page.locator('#lead-email').fill('qa@example.com');
    await page.locator('#lead-phone').fill('+34 600 000 000');
    await page.locator('#lead-homes').fill('24');
    await page.locator('#lead-stage').selectOption('En planificación');
    await page.locator('#lead-message').fill('Prueba local sin envío real');
    return sent;
}
test('unconfigured backend has honest fallback and never claims receipt', async ({ page }) => {
    const sent = await prepare(page, { configured: false });
    await page.locator('.lead-submit').click();
    await expect(page.locator('#lead-status')).toContainText('no está disponible');
    await expect(page.locator('#lead-email')).toHaveValue('qa@example.com');
    expect(sent).toHaveLength(0);
});
test('success clears form after acknowledgement and uses stable field values in Italian', async ({ page }) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const sent = await prepare(page, { language: 'it' });
    await page.locator('.lead-submit').click();
    await expect(page.locator('#lead-status')).toContainText('Richiesta ricevuta');
    await expect(page.locator('#lead-email')).toHaveValue('');
    expect(sent).toHaveLength(1); expect(sent[0].language).toBe('it'); expect(sent[0].stage).toBe('En planificación');
    expect(errors).toEqual([]);
});
test('failure preserves fields and retries with the same id; changed data gets a new id', async ({ page }) => {
    const sent = await prepare(page, { outcome: 'failure', language: 'en' });
    await page.locator('.lead-submit').click();
    await expect(page.locator('#lead-status')).toContainText('could not confirm');
    await expect(page.locator('#lead-email')).toHaveValue('qa@example.com');
    await page.locator('.lead-submit').click();
    await expect(page.locator('.lead-submit')).toBeEnabled();
    expect(sent).toHaveLength(2); expect(sent[0].request_id).toBe(sent[1].request_id);
    await page.locator('#lead-message').fill('Changed details');
    await page.locator('.lead-submit').click(); await expect(page.locator('.lead-submit')).toBeEnabled();
    expect(sent).toHaveLength(3); expect(sent[2].request_id).not.toBe(sent[1].request_id);
});
test('mobile form fits the viewport and exposes status and email fallback', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page, { outcome: 'failure' });
    await page.locator('.lead-submit').click();
    await expect(page.locator('#lead-status')).toContainText('No hemos podido');
    const size = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
    await expect(page.locator('.contact-fallback a')).toHaveAttribute('href', 'mailto:prospectus3d.es@gmail.com');
    await page.locator('#lead-status').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/contact-mobile.png' });
});
