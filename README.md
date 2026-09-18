# Prospectus 3D

Web comercial de **Prospectus 3D** — convertimos los planos de una promoción inmobiliaria en un **showroom 3D interactivo** que la promotora integra en su propia web (recorrido por edificio, plantas y viviendas, comparador, precios y disponibilidad).

- **Web:** una sola página (`index.html`), autocontenida (HTML + CSS + JS, sin frameworks).
- **Demo real:** https://serraresidencial.netlify.app/
- **Contacto:** prospectus3d.es@gmail.com · Tarragona, España

## Estructura

- `index.html` — la web completa, lista para desplegar.
- `videos/` — VSL (`Prospectus_VSL_Product_Film_v2.mp4`) y los 4 clips de "En movimiento", cada uno con su póster `.jpg`.

## Despliegue

Es un sitio **estático**. Basta subir `index.html` + la carpeta `videos/` a cualquier hosting estático (GitHub Pages, Netlify, Vercel) o al dominio **prospectus3d.com**.

Los vídeos se sirven por ruta local (`videos/*.mp4`); no hace falta configuración adicional.

---

© 2026 Prospectus 3D · prospectus3d.com

## Información legal

Las páginas `aviso-legal.html`, `privacidad.html` y `cookies.html` utilizan `legal.css` y están enlazadas desde el pie y el formulario. Por petición del usuario se han retirado los campos de identificación sin datos y los avisos de borrador. Se mantienen el nombre comercial y los contactos existentes. Esto no acredita cumplimiento legal ni sustituye la identificación del titular cuando resulte exigible. Las páginas conservan `noindex`.

El formulario mantiene el envío mediante el programa de correo del visitante; no hay un backend que reciba los datos. No se ha añadido una casilla de consentimiento genérica: la información de privacidad está visible junto al envío.

La demo externa se carga automáticamente dentro de un iframe con `loading="lazy"` y `referrerpolicy="no-referrer"`. Se conserva la alternativa para abrirla en otra pestaña si JavaScript está desactivado o el entorno no permite incrustarla. Las políticas explican la conexión automática con Netlify y la preferencia funcional `serra_tutorial_completed` (localStorage), identificada en el código de la demo. Si cambia la demo, revisar de nuevo esta información.

Validación local: carga automática sin clic a 1440 y 390 px, alternativa sin JavaScript y ausencia de referencias al anterior mecanismo de activación en los textos legales. La demo externa se sustituye por una respuesta controlada en la prueba del mecanismo de carga.
