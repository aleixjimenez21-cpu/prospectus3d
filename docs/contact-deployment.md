# Formulario de Prospectus 3D

## Estado verificado el 16 de octubre de 2026

- Web y repositorio identificados: `https://prospectus3d.com/`, `aleixjimenez21-cpu/prospectus3d`, GitHub Pages desde `main` en `/`.
- SEO publicado en `0aac402`: solo la descripción SEO cambia a «para promotoras e inmobiliarias», con sus traducciones. Se añaden canonical, datos de organización/sitio, robots.txt y sitemap.xml. No se ha solicitado rastreo desde Search Console.
- Proyecto gratuito creado en la organización elegida por el propietario: **Prospectus 3D**, `qiqampmzdikwvaaernik`, región `eu-west-1`.
- Migraciones aplicadas; ambas funciones desplegadas y sus cinco secretos configurados. Una petición incompleta devuelve HTTP 400. La nueva interfaz aún NO está activada en la portada; existe temporalmente `contact-check.html` con `noindex` para probarla en el dominio real.
- Verificado en Supabase: persistencia y prohibición de lectura/escritura/RPC para visitantes. El primer registro sintético de almacenamiento se eliminó tras la prueba integral, sin enviarlo por email. Se conserva como referencia la solicitud real claramente identificada como prueba técnica.
- 12 pruebas del servidor, 1 prueba integrada sobre PostgreSQL/PGlite con persistencia en disco y 4 pruebas de navegador pasadas. CAPTCHA, correo y respuestas del backend están simulados en las pruebas de navegador; esto NO acredita recepción de correo real.
- Resend: dominio `prospectus3d.com` verificado, región Irlanda, envío con TLS obligatorio, clave limitada a envío y a ese dominio guardada en Supabase. Remitente `solicitudes@prospectus3d.com`. Los tres registros DNS exigidos por Resend se comprobaron contra los servidores autoritativos de GoDaddy; no se cambiaron los nameservers ni los registros de la web.
- Sitekey de Turnstile recibida del propietario e incorporada a la configuración pública; Secret Key guardada en Supabase. Desafío real validado desde `prospectus3d.com`.
- Reintentos: `pg_cron` y `pg_net` habilitados, credencial en Vault, trabajo `prospectus-contact-notifications` cada minuto; ejecución HTTP 200 `{"ok":true}` comprobada.
- Prueba integral real: solicitud `e4ae1a3f-9cde-431c-9995-eb2759497397`, persistida y enviada en un intento. Resend `01a144e0-fccf-7a11-b19d-db6980a0d46d` confirma `Delivered` a `prospectus3d.es@gmail.com` el 16/10/2026 a las 15:22 (Europe/Madrid). No se ha inspeccionado la bandeja de Gmail; la entrega la confirma el proveedor.
- Controles reales: token inválido HTTP 400, origen ajeno HTTP 403, worker sin credencial HTTP 401; sin nuevas filas ni correos. Repetición del UUID en la operación de base de datos devuelve `duplicate: true`, conservando una única solicitud y un único envío.
- Esta rama retira la página temporal de prueba y activa el formulario en la portada al publicarse. Falta la comprobación posterior al despliegue y confirmar con el propietario en qué carpeta de Gmail aparece el aviso.
- Pendiente favicon: falta el logo original. No se ha creado un sustituto.

## Flujo

El navegador envía los datos a `contact` tras completar Turnstile. El servidor valida tamaño, tipos, longitudes, email, teléfono, viviendas, estado e idioma, comprueba el origen y verifica el token con Cloudflare (incluidos hostname y acción `contact`). Un campo trampa añade otra señal antispam.

Una transacción guarda la solicitud, aplica límites de 3 envíos por email/hora y 100 globales/hora y crea el estado pendiente de notificación. Las tablas tienen RLS, sin permisos para `anon`/`authenticated`; solo las funciones con la credencial de servidor pueden acceder. El aviso informativo `rls_enabled_no_policy` es intencionado: no hay políticas públicas porque ningún cliente debe usar estas tablas. [Referencia de Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

El email se envía exclusivamente a **prospectus3d.es@gmail.com** mediante Resend, desde un remitente verificado del dominio de Prospectus. El email del visitante solo se usa como `reply_to`. El cuerpo es texto plano. Ningún destinatario ni remitente del cuerpo HTTP controla el envío.

El UUID de la petición y la huella HMAC de sus datos evitan duplicados al reintentar. El límite por correo usa HMAC, sin guardar la IP del visitante. Los contadores vencidos se eliminan al aceptar solicitudes nuevas. Turnstile y el límite global complementan el límite por email; CORS y el campo trampa no se consideran autenticación.

Si falla el correo, la solicitud permanece guardada. `contact-notifications` reclama trabajos con bloqueo temporal, reintenta con espera creciente y usa una clave estable de idempotencia de Resend. Se detiene tras 8 intentos o 23 horas para no reintentar fuera de la ventana de idempotencia del proveedor. Las filas `needs_attention` requieren revisión manual. `sent` significa que Resend aceptó el envío, no que Gmail lo entregó en la bandeja de entrada.

## Configuración reproducible

1. **Resend:** crear/usar la cuenta de Prospectus, elegir el plan gratuito, añadir el dominio o un subdominio de envío y publicar en GoDaddy exactamente los registros que muestre Resend. No cambiar los nameservers ni sobrescribir MX/SPF existentes. Esperar a que Resend indique dominio verificado. Crear una clave limitada al envío y al dominio correspondiente. Un remitente posible es `solicitudes@prospectus3d.com`; se debe confirmar en la configuración real. No usar Gmail como remitente de Resend.
2. **Cloudflare Turnstile:** widget para `prospectus3d.com` y `www.prospectus3d.com`, modo Managed. Guardar la clave pública en `contact-config.js` y la secreta en Supabase. No hace falta trasladar el DNS a Cloudflare.
3. **Supabase Edge Function Secrets:** añadir las variables de `supabase/functions/.env.example`. Generar dos valores aleatorios independientes de al menos 32 caracteres para `CONTACT_HASH_SECRET` y `CONTACT_WORKER_SECRET`. Las credenciales `SUPABASE_*` ya las aporta Supabase. No incluir claves privadas en HTML, JS público, Git, URLs o mensajes.
4. **Reintentos:** habilitar `pg_cron` y `pg_net`. Crear en Vault `prospectus_contact_worker_url` con la URL de `contact-notifications` y `prospectus_contact_worker_secret` con el mismo valor de `CONTACT_WORKER_SECRET`. Ejecutar `supabase/schedule-notifications.sql`. Comprobar tanto la ejecución del cron como el HTTP 200 devuelto por el worker, no solo que el cron se haya creado.
5. **Prueba integral:** completar una solicitud claramente marcada como prueba con Turnstile real desde un origen autorizado. Comprobar la fila persistente y su ID, el ID de envío de Resend y el evento de entrega; confirmar la recepción en Gmail (incluido spam). Probar que un envío inválido no crea filas ni envía email. Repetir el mismo UUID con un token nuevo y confirmar que no duplica filas ni avisos.
6. **Publicación:** solo después de la prueba anterior, completar la configuración pública, integrar esta rama en `main`, esperar al despliegue de Pages y repetir una prueba desde el dominio real. La configuración pública contiene únicamente el endpoint y la sitekey de Turnstile.

## Desarrollo y verificación

Se necesita Node.js 22+, Deno 2 y Chrome para las pruebas. No hay dependencias de producción en el navegador ni SDKs adicionales en las funciones.

```sh
npm ci
npm test
deno check supabase/functions/contact/index.ts supabase/functions/contact-notifications/index.ts
```

Para otros equipos se puede configurar un Chromium de Playwright en vez del canal Chrome en `playwright.config.mjs`.

CLI Supabase comprobada: 2.121.0. Antes de ejecutar comandos con otra versión, consultar su ayuda. En un proyecto ya vinculado, `supabase db push --dry-run` permite revisar migraciones pendientes; `supabase functions deploy contact contact-notifications --use-api --project-ref qiqampmzdikwvaaernik` publica las funciones. El archivo `config.toml` desactiva la validación JWT de usuario porque `contact` usa Turnstile y el worker exige su propio bearer secreto. No añadir una clave de servicio al cliente.

## Operación

Revisar `contact_requests` en el panel de Supabase. Para incidencias de correo, filtrar `notification_status = 'needs_attention'` y consultar el registro de Resend antes de reenviar manualmente. No reabrir automáticamente solicitudes antiguas, porque el proveedor ya puede haber descartado su clave de idempotencia.

La eliminación de una solicitud por motivos de privacidad debe incluir, cuando proceda, su copia en el buzón de correo y los registros del proveedor. La información de privacidad refleja los proveedores y el funcionamiento técnico; no certifica cumplimiento jurídico.

## Favicon e indexación

Solicitar el logo original. Reutilizarlo para un PNG/ICO cuadrado sin rediseñarlo, con URL estable y tamaño suficiente (por ejemplo, 192 × 192). Añadir `rel="icon"` a la página principal y `logo` a los datos de organización una vez exista el recurso real. Comprobar HTTP 200, MIME correcto y acceso de Googlebot/Googlebot-Image. Solicitar rastreo en Search Console si hay acceso. Google decide el snippet y cuándo actualizar el favicon; no hay garantía de plazo o de que lo muestre. [Requisitos de Google](https://developers.google.com/search/docs/appearance/favicon-in-search).

## Referencias técnicas

- [Secretos de Supabase](https://supabase.com/docs/guides/functions/secrets)
- [Funciones programadas](https://supabase.com/docs/guides/functions/schedule-functions)
- [Validación de Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Idempotencia de Resend](https://resend.com/docs/dashboard/emails/idempotency-keys)
