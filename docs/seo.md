# SEO de prospectus3d.com

Estado del SEO técnico y pasos pendientes que requieren acceso a cuentas externas.

## Hecho en el código

| Punto | Estado |
|---|---|
| `robots.txt` | Permite todos los bots y declara el sitemap. No bloquea nada. |
| `sitemap.xml` | Portada con `lastmod` e imágenes. Las páginas legales y la 404 quedan fuera porque son `noindex`. |
| `noindex` | Solo en las páginas legales y en `404.html`, a propósito. La portada es `index, follow`. |
| Canonical | `https://prospectus3d.com/` en la portada. |
| Título | «Showroom 3D interactivo para obra nueva \| Prospectus 3D» (55 caracteres; servicio + marca). Traducido a EN/IT. |
| Meta description | 159 caracteres con servicios y llamada a la acción. Traducida a EN/IT. |
| H1 y jerarquía | Un solo H1 en cada página; H2 por sección y H3 dentro. |
| Texto alternativo | Todas las imágenes con contenido lo tienen; las decorativas usan `alt=""`. |
| Schema (JSON-LD) | `WebSite`, `Organization` + `ProfessionalService`, `Service`, `WebPage` y `FAQPage` con las 6 preguntas visibles. |
| Open Graph / Twitter | Título, descripción e imagen `assets/og-image.jpg` (1200×630). |
| Enlaces internos | Pie con enlaces a demo, proceso, FAQ y contacto; páginas legales y 404 enlazan a `/`. |
| Enlaces rotos | Revisados los anclajes, los recursos locales y los enlaces externos. Añadida `404.html` con enlaces de vuelta. |
| Imágenes | PNG → WebP: de 20,5 MB a 1,3 MB, sin pérdida visible. `width`/`height` para evitar saltos (CLS). |
| Core Web Vitals | Precarga con prioridad alta de la imagen del hero (candidata a LCP). Los vídeos ya usan `preload="none"`. |
| Móvil | Revisado a 390 px y 1440 px. |
| URLs | Rutas cortas y legibles (`/aviso-legal.html`, etc.). No se cambian para no romper enlaces existentes. |

## Pendiente: requiere tus cuentas

### 1. Google Search Console (prioridad máxima)
1. Entra en https://search.google.com/search-console y añade una propiedad de **dominio** `prospectus3d.com`.
2. Copia el registro TXT que te da Google y créalo en el DNS del dominio (en el proveedor donde lo compraste).
3. Una vez verificado: **Sitemaps** → envía `https://prospectus3d.com/sitemap.xml`.
4. **Inspección de URLs** → `https://prospectus3d.com/` → «Solicitar indexación».
5. Repite lo mismo en **Bing Webmaster Tools** (puede importar la propiedad desde Search Console en un clic). Bing alimenta también a ChatGPT y Copilot.

### 2. HTTPS forzado
En GitHub → repositorio → Settings → Pages, comprueba que **Enforce HTTPS** está marcado. Así `http://` redirige siempre a `https://`.

### 3. Analítica
No se ha instalado nada porque hace falta una cuenta y una decisión legal:
- **Recomendado: Cloudflare Web Analytics.** Es gratis, no usa cookies, no necesita banner y ya usáis Cloudflare para Turnstile. Crea el sitio en Cloudflare → Analytics & Logs → Web Analytics y pasa el *token*. Se añade una sola etiqueta `<script>` antes de `</body>` y una línea en `privacidad.html` y `cookies.html`.
- **Google Analytics 4** usa cookies: en España exige banner de consentimiento previo y actualizar la política de cookies. Más trabajo y menos datos fiables si la gente rechaza.

### 4. Perfil de Empresa en Google (Google Business Profile)
1. https://business.google.com → crear perfil «Prospectus 3D».
2. Categoría principal: **Servicio de visualización arquitectónica** (o «Diseñador gráfico» si no aparece). Categoría secundaria relacionada con marketing inmobiliario.
3. Marca **«Ofrezco servicios a domicilio / en la zona del cliente»** y oculta la dirección si no hay oficina abierta al público. Zona de servicio: provincia de Tarragona, Barcelona, Cataluña y España.
4. Web: `https://prospectus3d.com/`. Teléfono, horario, logo, 10+ fotos o renders y un vídeo.
5. Añade cada servicio con su descripción: showroom 3D interactivo, tour virtual 360º, infografía 3D, selector de plantas y viviendas, integración web.
6. Pide reseñas a los primeros clientes en cuanto entregues un proyecto.

### 5. Redes en el schema
Cuando quieras, pasa las URL exactas de Instagram y LinkedIn y se añaden como `sameAs` en el JSON-LD. Así Google relaciona los perfiles con la marca.

## Contenido: lo que la gente busca

Hoy la web habla en términos de producto («showroom digital», «experiencia interactiva»). Las promotoras suelen buscar con otras palabras. Valida estas candidatas con **Google Keyword Planner** (gratis con una cuenta de Ads) y, al cabo de 4–6 semanas, con el informe **Rendimiento** de Search Console:

- infografía 3D obra nueva / infografías 3D promociones
- tour virtual 360 obra nueva / tour virtual inmobiliario
- maqueta virtual promoción inmobiliaria
- showroom virtual inmobiliario / sala de ventas virtual
- configurador de viviendas 3D / selector de viviendas web
- marketing para promotoras inmobiliarias / cómo vender sobre plano

Con una sola página solo puedes posicionar bien un par de términos. El siguiente salto es crear **páginas dedicadas** (`/tour-virtual-360`, `/infografia-3d-obra-nueva`, `/casos/serra-residencial`), cada una con su H1, título, descripción y schema, y enlazadas desde la portada. Un caso de estudio de Serra Residencial con antes/después es el contenido con más probabilidades de atraer enlaces.

## Estrategia de backlinks

Ordenada por impacto / esfuerzo:

1. **Crédito en cada showroom entregado.** Un enlace discreto «Showroom 3D por Prospectus» en cada demo y en cada web de promotora que integre el visor. Es el enlace más relevante posible y crece con cada cliente. Empieza por `serraresidencial.netlify.app`.
2. **Perfiles propios.** Google Business Profile, LinkedIn (página de empresa), Instagram (enlace en bio), Bing Places, Behance o ArtStation con los renders.
3. **Directorios de empresa serios.** Cylex, Infobel, Páginas Amarillas, Kompass y Sortlist o Clutch (agencias). Usa siempre el mismo nombre, teléfono y web (NAP).
4. **Ecosistema local y universitario.** Cambra de Comerç de Reus y de Tarragona, programas de emprendimiento de la URV, viveros de empresas. Suelen tener fichas de socios y startups con enlace.
5. **Sector inmobiliario.** Asociaciones de promotores (APCE Catalunya y sus equivalentes), blogs y newsletters de marketing inmobiliario. Ofrece un artículo invitado: «Cómo vender obra nueva sobre plano con un showroom 3D».
6. **Prensa local.** Una startup de la zona que digitaliza la venta de obra nueva es noticia para medios comarcales y provinciales. Prepara una nota corta con imágenes de la demo.

Evita comprar enlaces o paquetes de directorios masivos: Google los ignora o penaliza.
