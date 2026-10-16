# Revisión de inyección SQL — 16 de octubre de 2026

## Resultado y alcance

No se encontró una vía de inyección SQL en el formulario de Prospectus 3D revisado. Se revisaron el código cliente, la validación del servidor, las tres funciones PostgreSQL y los permisos reales del proyecto desplegado. Esto es una revisión acotada de la versión actual, no una garantía de seguridad absoluta ni una auditoría de la infraestructura interna de los proveedores.

| Entrada | Tratamiento |
| --- | --- |
| Nombre, empresa y mensaje | Texto con límites de longitud y caracteres de control; JSON como datos a una función SQL fija. |
| Email y teléfono | Validación de formato en servidor; parámetros de datos en SQL. |
| Número de viviendas | Entero con intervalo permitido; conversión y restricción también en PostgreSQL. |
| Estado e idioma | Valores permitidos explícitos; restricciones en servidor y base de datos. |
| UUID de solicitud | UUID validado en servidor y tipado en PostgreSQL. |
| Campo trampa y token Turnstile | El campo trampa debe estar vacío; el token se verifica con Cloudflare antes de acceder a la base de datos. |
| Selectores de idioma y experiencia | Seleccionan recursos o textos locales; no forman consultas SQL. |

Las consultas no concatenan texto del visitante ni ejecutan SQL dinámico. Las funciones usan `security invoker` y `search_path` vacío. Los roles públicos `anon` y `authenticated` no tienen lectura, escritura ni ejecución de las tres funciones; ambas tablas tienen RLS. Las claves privadas permanecen en el servidor.

## Evidencia de producción

- El contenido de la función Edge `contact` y su módulo compartido coincide con el código local probado.
- Los cuerpos de `accept_contact_request`, `claim_contact_notifications` y `finish_contact_notification` coinciden con la migración probada. Huellas MD5 usadas solamente para comparación de contenido: `8ac3a04404664cb231c346f601cf625f`, `4c1383405a87a80ed6393ff4752b5f22`, `e126c49e62ce7627abf2b40a670de9cf`.
- Se comprobaron los permisos de ambas tablas y de las tres funciones con consultas de solo lectura.
- El asesor de seguridad de Supabase devuelve únicamente dos avisos informativos de RLS sin políticas. Es intencionado: no se permite acceso público a estas tablas.
- No se ejecutaron payloads destructivos contra producción ni se enviaron emails de ataque.

## Pruebas reproducibles

`npm run test:server` ejecuta 14 pruebas. Incluye 12 combinaciones de texto con aspecto SQL en nombre, empresa y mensaje; claves JSON adicionales no pueden elegir tablas ni consultas. Verifica formatos estructurados, objetos en lugar de valores escalares y rechazo del token inválido antes de acceder a datos. Los servicios externos se simulan.

`npm run test:database` ejecuta 3 pruebas integradas sobre PostgreSQL/PGlite. Usa la migración real en una base aislada. Incluye 30 combinaciones de payloads en las cinco columnas de texto, que permanecen literales al insertar, reclamar y finalizar notificaciones. Una tabla testigo conserva su contenido. Otros 54 casos comprueban rechazo de expresiones SQL en UUID, entero, enumeraciones y hashes, sin escrituras parciales. También se prueban permisos, límites, idempotencia, reintentos y persistencia al reabrir el almacenamiento.

Los apóstrofos legítimos, como en `O'Connor`, se conservan. No se usa una lista negra de palabras SQL como sustituto de separar datos y consultas. [Referencia: OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).

## Demo externa de Serra

Se revisó el código público de la demo incrustada, sus campos de contacto, asistente, filtros y calculadora, y el visor 360 enlazado. En las rutas inspeccionadas no se encontró un envío de estos campos a una base SQL: el asistente y la calculadora funcionan en el navegador. El formulario de contacto de la demo simula una confirmación y no envía ni almacena solicitudes; es distinto del formulario principal de Prospectus, cuya persistencia y entrega de correo sí se probaron.

El acceso al repositorio externo permite lectura, pero no publicación. Esta revisión de SQL no certifica otros tipos de vulnerabilidades del sitio externo ni servicios no visibles en su código público.
