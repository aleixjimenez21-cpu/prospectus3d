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

## Información legal (borrador pendiente)

Se han añadido `aviso-legal.html`, `privacidad.html` y `cookies.html`, con estilos en `legal.css` y enlaces desde el pie y el formulario. Antes de publicar esta versión, completar la identificación del titular en el aviso legal, privacidad y resumen del formulario; confirmar domicilio, NIF/CIF y datos registrales cuando correspondan. Validar también las prácticas reales de conservación, proveedores y transferencias del responsable. Después, retirar los avisos de borrador y revisar la indexación de esas páginas.

El formulario mantiene el envío mediante el programa de correo del visitante; no hay un backend que reciba los datos. No se ha añadido una casilla de consentimiento genérica: la información de privacidad está visible junto al envío.

`demo-privacy.js` carga el visor externo solo al pulsar «Activar demo». «Cerrar demo» retira el iframe activo; no borra almacenamiento del origen externo. No se persiste la activación ni se incorporan cookies de analítica/publicidad. La preferencia funcional detectada en el código de la demo es `serra_tutorial_completed` (localStorage). Si cambia la demo, revisar de nuevo esta información.

Validación local: navegación y enlaces legales a 1440, 390 y 320 px; ausencia de solicitudes externas antes de activar la demo; activación, cierre, recarga sin persistencia y alternativa sin JavaScript. La demo externa se sustituye por una respuesta local en la prueba automatizada; sus scripts publicados se han inspeccionado por separado.
