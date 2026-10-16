(() => {
    'use strict';
    const form = document.getElementById('leadForm');
    if (!form) return;
    const config = window.PROSPECTUS_CONTACT_CONFIG || {};
    const submit = form.querySelector('[type="submit"]');
    const status = document.getElementById('lead-status');
    const container = document.getElementById('lead-verification');
    let token = '', widget, loading = false, sending = false, script;
    let requestId = crypto.randomUUID(), lastPayload = '', statusKey = '', statusState = '';
    const t = text => window.ProspectusLanguage?.t(text) || text;
    const configured = /^https:\/\/[a-z0-9]+\.supabase\.co\/functions\/v1\/contact$/.test(config.endpoint || '') && Boolean(config.turnstileSiteKey);
    function show(key, state = 'error') {
        statusKey = key; statusState = state;
        status.textContent = t(key); status.dataset.state = state;
    }
    window.addEventListener('prospectus:languagechange', () => {
        if (statusKey) show(statusKey, statusState);
        submit.textContent = t(sending ? 'Enviando…' : 'Solicitar demo');
    });
    function initialiseChallenge() {
        if (!configured || widget !== undefined || loading) return;
        loading = true;
        const render = () => {
            loading = false;
            widget = window.turnstile.render(container, {
                sitekey: config.turnstileSiteKey, action: 'contact', theme: 'dark', size: 'flexible',
                language: window.ProspectusLanguage?.language || 'es',
                callback(value) { token = value; },
                'expired-callback'() { token = ''; },
                'error-callback'() { token = ''; show('No se ha podido completar la verificación. Reintenta o escríbenos por correo.'); },
            });
        };
        if (window.turnstile) { render(); return; }
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = render;
        script.onerror = () => { loading = false; script.remove(); show('No se ha podido completar la verificación. Reintenta o escríbenos por correo.'); };
        document.head.appendChild(script);
    }
    form.addEventListener('focusin', initialiseChallenge);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending || !form.reportValidity()) return;
        if (!configured) { show('El formulario no está disponible ahora. Escríbenos a prospectus3d.es@gmail.com.'); return; }
        initialiseChallenge();
        if (!token) { show('Completa la verificación de seguridad antes de enviar.'); return; }
        const data = new FormData(form);
        const values = {
            name: String(data.get('name') || '').trim(), company: String(data.get('company') || '').trim(),
            email: String(data.get('email') || '').trim(), phone: String(data.get('phone') || '').trim(),
            homes: Number(data.get('homes')), stage: String(data.get('stage') || ''),
            message: String(data.get('message') || '').trim(), language: window.ProspectusLanguage?.language || 'es',
            website: String(data.get('website') || ''),
        };
        const fingerprint = JSON.stringify(values);
        if (lastPayload && fingerprint !== lastPayload) requestId = crypto.randomUUID();
        lastPayload = fingerprint;
        sending = true; submit.disabled = true; form.setAttribute('aria-busy', 'true');
        submit.textContent = t('Enviando…'); show('Estamos enviando tu solicitud…', 'pending');
        try {
            const response = await fetch(config.endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, request_id: requestId, token }),
                signal: AbortSignal.timeout(60000), credentials: 'omit', referrerPolicy: 'no-referrer',
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.ok !== true || result.request_id !== requestId) {
                const messages = {
                    rate_limited: 'Has enviado varias solicitudes. Espera una hora o escríbenos por correo.',
                    verification_failed: 'La verificación ha caducado. Complétala de nuevo y reintenta.',
                    invalid_fields: 'Revisa los datos del formulario y vuelve a intentarlo.',
                };
                show(messages[result.error] || 'No hemos podido confirmar el envío. Conservamos los datos en el formulario para que puedas reintentar.');
                return;
            }
            form.reset(); requestId = crypto.randomUUID(); lastPayload = '';
            show('Solicitud recibida. Gracias, nos pondremos en contacto contigo.', 'success');
        } catch {
            show('No hemos podido confirmar el envío. Conservamos los datos en el formulario para que puedas reintentar.');
        } finally {
            sending = false; submit.disabled = false; form.removeAttribute('aria-busy'); submit.textContent = t('Solicitar demo');
            token = '';
            if (widget !== undefined) window.turnstile?.reset(widget);
        }
    });
})();
