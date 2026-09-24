# Prospectus 3D

Web comercial de **Prospectus 3D** — convertimos los planos de una promoción inmobiliaria en un **showroom 3D interactivo** que la promotora integra en su propia web (recorrido por edificio, plantas y viviendas, comparador, precios y disponibilidad).

- **Web:** landing (`index.html`) y páginas legales, con HTML, CSS y JS sin frameworks.
- **Demo real:** https://serraresidencial.netlify.app/
- **Contacto:** prospectus3d.es@gmail.com · Tarragona, España

## Estructura

- `index.html` — la web completa, lista para desplegar.
- `videos/` — VSL (`Prospectus_VSL_Product_Film_v2.mp4`) y los 4 clips de "En movimiento", cada uno con su póster `.jpg`.

## Despliegue

Es un sitio **estático**. Hay que publicar todos los archivos HTML, CSS y JS, junto con `assets/`, `videos/` y `CNAME` a cualquier hosting estático (GitHub Pages, Netlify, Vercel) o al dominio **prospectus3d.com**.

Los vídeos se sirven por ruta local (`videos/*.mp4`); no hace falta configuración adicional.

---

© 2026 Prospectus 3D · prospectus3d.com

## Información legal

Las páginas `aviso-legal.html`, `privacidad.html` y `cookies.html` utilizan `legal.css` y están enlazadas desde el pie y el formulario. Por petición del usuario se han retirado los campos de identificación sin datos y los avisos de borrador. Se mantienen el nombre comercial y los contactos existentes. Esto no acredita cumplimiento legal ni sustituye la identificación del titular cuando resulte exigible. Las páginas conservan `noindex`.

El formulario mantiene el envío mediante el programa de correo del visitante; no hay un backend que reciba los datos. No se ha añadido una casilla de consentimiento genérica: la información de privacidad está visible junto al envío.

La demo externa se carga automáticamente dentro de un iframe con `loading="lazy"` y `referrerpolicy="no-referrer"`. Se conserva la alternativa para abrirla en otra pestaña si JavaScript está desactivado o el entorno no permite incrustarla. Las políticas explican la conexión automática con Netlify y la preferencia funcional `serra_tutorial_completed` (localStorage), identificada en el código de la demo. Si cambia la demo, revisar de nuevo esta información.

Validación local: carga automática sin clic a 1440 y 390 px, alternativa sin JavaScript y ausencia de referencias al anterior mecanismo de activación en los textos legales. La demo externa se sustituye por una respuesta controlada en la prueba del mecanismo de carga.

## Idiomas

El selector de la cabecera permite elegir español, italiano o inglés sin recargar ni perder los datos del formulario. El idioma por defecto es español. La elección se guarda en `localStorage` (`prospectus_language`); los enlaces internos incluyen `?lang=es`, `?lang=it` o `?lang=en` como alternativa si el almacenamiento está bloqueado. Un idioma válido en la URL prevalece sobre la preferencia guardada.

- `translations.js`: diccionario de textos de origen en español y sus traducciones al inglés y al italiano. Al cambiar un texto de origen, actualizar su entrada.
- `language.js` y `language.css`: selector, traducción de textos y atributos accesibles, enlaces y preferencia. Las cadenas se insertan como texto, sin HTML remoto ni servicios externos de traducción.
- `features.js`, `motion.js` y `change.js`: actualizan sus títulos y controles mediante el evento `prospectus:languagechange`.

También se traducen las páginas legales y los mensajes preparados de correo y WhatsApp. Los vídeos, textos integrados en imágenes y la aplicación externa de Serra conservan su idioma original. Con JavaScript desactivado se muestra la versión española.

Validación: cambio entre los tres idiomas a 1440, 768, 390 y 320 px; textos estáticos y atributos; persistencia y navegación entre páginas; almacenamiento bloqueado; idioma inválido; datos del formulario; selector de funciones y vídeos; FAQ y carga automática de la demo. El generador de correo se comprobó en los tres idiomas sin enviar mensajes.
