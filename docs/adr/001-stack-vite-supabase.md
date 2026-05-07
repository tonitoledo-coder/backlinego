# ADR-001 — Stack tecnológico: Vite + React + Supabase

| Campo | Valor |
|---|---|
| **Estado** | Aceptada |
| **Fecha** | 6 de mayo de 2026 |
| **Decisor** | Toni Toledo |
| **Producto** | BacklineGo |
| **Hub** | tresdetres (3d3) |
| **Supersede a** | — |
| **Reemplazada por** | — |

## Contexto

BacklineGo nace como aplicación construida sobre la plataforma low-code **Base44**. Se exporta el código fuente el cinco de mayo de dos mil veintiséis para iniciar la migración a infraestructura propia bajo el hub **tresdetres (3d3)**, en cumplimiento del ADR-003 del hub *(backend como única fuente de verdad)* y del ADR-007 del hub *(aislamiento total entre productos para garantizar exit-readiness)*.

El código exportado consiste en:

- Frontend completo en **Vite + React** con veintidós páginas funcionales, componentes de UI separados (KYC, disputas, SOS, settings, bulletin), hooks reutilizables y configuración de Tailwind ya aplicada.
- Siete funciones backend escritas en **TypeScript sobre Deno**: `stripeCheckout`, `stripeWebhook`, `notifySosOwners`, `reviewReminder`, `expireSosRequests`, `reminder24h`, `deactivateOtherLegalDocs`. Todas usan el SDK de Base44 para acceder al modelo de datos.
- Ocho entidades de modelo: `UserProfile`, `Equipment`, `Booking`, `Review`, `Dispute`, `SosRequest`, `BulletinPost`, `BulletinReply`.

La pregunta arquitectónica es: **¿qué stack adoptamos para reemplazar Base44 manteniendo viable el calendario de migración?**

## Decisión

Se adopta el siguiente stack:

| Capa | Tecnología | Hosting |
|---|---|---|
| Frontend SPA | Vite + React (existente, sin reescritura) | Coolify en Hetzner CX33 |
| Backend de datos | Supabase Postgres + RLS + Auth | Supabase Cloud (Frankfurt) |
| Backend de lógica | Supabase Edge Functions (Deno) | Supabase Cloud |
| Almacenamiento de archivos | Supabase Storage | Supabase Cloud |
| Capa BFF intermedia | **No existe** | — |

El frontend habla **directamente** con Supabase a través del SDK oficial `@supabase/supabase-js`. La seguridad se garantiza por RLS en base de datos y por el aislamiento de la `service_role` key dentro de las Edge Functions (que actúan como backend privilegiado para operaciones que no pueden ejecutarse desde el cliente: webhooks de Stripe, cobros con Connect, mutaciones administrativas).

## Alternativas consideradas

### A) Reescritura completa con Next.js o Remix

- **Pros:** server components, server actions, mejor SEO out-of-the-box, BFF integrado, ecosistema más rico para apps híbridas SSR/SPA.
- **Contras:** descarte del trabajo realizado en Base44 (veintidós páginas, componentes, layouts). Estimación realista de coste: entre cuatro y seis semanas de desarrollo a tiempo completo solo para alcanzar paridad funcional con el código actual. Para un único desarrollador con experiencia técnica práctica limitada, el riesgo de bloqueo es alto.
- **Veredicto:** rechazada por coste de oportunidad y riesgo de calendario. La migración a infraestructura propia debe completarse antes de que el plan Builder de Base44 venza, no en cuatro a seis semanas adicionales.

### B) BFF intermedio en Node.js o Deno

Mantener Vite + React en frontend y crear un servicio backend separado (Express, Hono, Fastify) que sirva como capa intermedia entre frontend y Supabase.

- **Pros:** flexibilidad máxima para lógica de negocio compleja, posibilidad de agregar caché, tareas programadas, websockets propios.
- **Contras:** un servicio adicional que mantener, desplegar, monitorizar y securizar. Duplica esfuerzo de auth (cookies/JWT propios encima de los de Supabase). Para un equipo de una persona, es deuda operativa innecesaria. Las Edge Functions de Supabase cubren los mismos casos de uso sin servicio extra.
- **Veredicto:** rechazada por sobrecarga operativa. Se reservan las Edge Functions para los casos que realmente lo requieren.

### C) Stack actual reformulado: Vite + Supabase + Edge Functions (decisión adoptada)

- **Pros:** aprovecha todo el frontend existente. Las funciones Deno actuales migran casi línea a línea a Edge Functions porque comparten runtime. Sin servicios intermedios. Sin nuevo stack que aprender. Coste cero de migración del frontend en el día uno.
- **Contras:** se hereda la deuda técnica del frontend Base44 (acoplamiento al SDK de Base44, decisiones de estructura de páginas que pueden no ser óptimas). La migración del SDK Base44 al cliente Supabase debe hacerse de forma gradual, página a página.

## Consecuencias

### Positivas

- **Calendario realista:** la migración de infraestructura se completa en días, no en semanas.
- **Aislamiento total cumplido (ADR-007 hub):** el producto vive en su propio proyecto Supabase, su propia app Coolify, su propio repo. Transferible en bloque sin tocar el resto del hub.
- **Backend como única fuente de verdad (ADR-003 hub):** Supabase es el contrato. RLS aplica reglas de negocio donde los datos viven. El frontend no puede saltarse las reglas.
- **Ahorro operativo:** un único proveedor de backend (Supabase). Sin servicios intermedios que monitorizar.
- **Continuidad funcional:** las páginas existentes siguen funcionando con Base44 hasta que se migran una a una al cliente Supabase. Sin big bang.

### Negativas

- **Deuda técnica heredada:** el frontend mantiene patrones e importaciones del SDK de Base44 hasta que se complete la migración página a página. Cada página debe refactorizarse explícitamente.
- **Acoplamiento al SDK de Supabase:** un cambio de proveedor de base de datos en el futuro requiere reemplazar todas las llamadas al SDK. Mitigado parcialmente con un pequeño wrapper en `src/lib/supabase.js`.
- **Sin SSR ni SEO server-side:** la SPA pura limita el indexado del catálogo público de equipos por motores de búsqueda. Si el SEO se vuelve crítico, se evaluará añadir una capa estática prerrenderizada (Astro, o Next.js solo para páginas públicas) sin reemplazar el resto.

### Riesgos a vigilar

- **Cuotas de Supabase Cloud:** el tier gratuito tiene límites de Edge Function invocations, ancho de banda y almacenamiento. Hay que medir consumo desde el primer mes y planificar upgrade al plan Pro antes de saturar.
- **Vendor lock-in con Supabase:** mitigado por usar Postgres estándar (la base de datos es portable a cualquier hosting Postgres) y RLS estándar (reglas SQL portables). Auth y Edge Functions sí son específicos de Supabase.
- **Migración página a página:** existe el riesgo de quedarse a medias y mantener indefinidamente código Base44 conviviendo con código Supabase. Mitigación: marcar cada página migrada en el roadmap de Notion y poner fecha límite explícita para retirar el SDK de Base44 (objetivo: T+treinta días desde el primer deploy).

## Notas de implementación

- El cliente Supabase se inicializa en `src/lib/supabase.js` con la `anon key` expuesta vía variable de entorno `VITE_SUPABASE_ANON_KEY`. La `service_role` key **nunca** entra al frontend bajo ninguna circunstancia.
- Las siete funciones Deno actuales se migran a Edge Functions una por una. Primera prioridad: `stripeWebhook` (idempotencia crítica) y `stripeCheckout` (incluye lógica de Connect ya iniciada). El resto, según prioridad de funcionalidad.
- El despliegue del frontend se realiza en Coolify con build estático (`npm run build` → `dist/`) servido por Caddy o Nginx. Subdominio inicial de staging: `backlinego.tresdetres.club`. Dominio de producción: `backline-go.com` (registrado en Dinahosting).
- Se mantiene Base44 operativo en paralelo durante la migración para no interrumpir a usuarios actuales (si los hay). El cierre definitivo de la cuenta Base44 se ejecutará tras validar que todas las funciones críticas operan exclusivamente sobre la nueva infraestructura.

## Referencias

- ADR-003 del hub 3d3 — Backend como única fuente de verdad.
- ADR-006 del hub 3d3 — Repo en GitHub bajo organización separable (pendiente de aplicar al repo `tonitoledo-coder/backlinego`).
- ADR-007 del hub 3d3 — Aislamiento total entre productos para exit-readiness.
- Roadmap Pre-Lanzamiento BacklineGo (Notion).
