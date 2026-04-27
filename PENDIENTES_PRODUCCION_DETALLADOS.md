# Pendientes detallados para llevar Vento a produccion nacional

Fecha: 2026-04-25

Este archivo no repite la auditoria inicial. Organiza lo que todavia falta por hacer despues de las iteraciones cerradas y lo ordena por impacto real para una plataforma que aspire a operar miles de negocios en Cuba.

## Estado actual resumido

Ya quedaron bastante mejor resueltos:

- marketplace server-side con busqueda base;
- storefront publico con payload unico y fallback local;
- admin bootstrap minimo;
- pedidos y resenas paginados con realtime incremental;
- validacion server basica para pedidos y resenas publicas;
- permisos iniciales de equipo;
- modularizacion completa de `app/composables/useSupabaseBackend.ts`.

Lo que sigue no es cosmetico. Es lo que separa un MVP fuerte de una plataforma nacional.

## Prioridad 1: integridad operativa real

### 1. Inventario profesional

Todavia falta:

- mover variantes desde JSON a tablas relacionales (`product_variants`, `variant_options`, `inventory_items`);
- soportar stock por variante;
- soportar stock por sucursal o punto de entrega;
- bloquear venta de items sin disponibilidad real;
- registrar movimientos de inventario;
- reservar stock al crear pedido y liberarlo si se cancela;
- alertas de bajo inventario en admin.

Impacto:

- sin esto la app sirve para menu/catalogo, pero no para retail serio ni control confiable de disponibilidad.

### 2. Estados de pedido mas completos

Todavia falta:

- historial de cambios de estado (`order_status_history`);
- eventos del pedido (`order_events`);
- timestamps operativos por estado;
- notas internas del equipo por pedido;
- asignacion de responsable;
- SLA de preparacion y entrega;
- cancelaciones con motivo estructurado.

Impacto:

- hoy hay flujo de pedidos, pero no trazabilidad operativa completa.

### 3. Planes y autorizacion manual

Todavia falta:

- tabla de suscripciones o autorizaciones manuales por negocio;
- estados de plan (`trial`, `active`, `paused`, `blocked`, `expired`);
- fecha de activacion, vencimiento y observaciones administrativas;
- soporte para comprobante o referencia manual externa si luego la necesitas;
- reglas para que solo el panel master habilite funciones premium;
- historial de cambios de plan por negocio;
- arquitectura para pagos externos futuros sin mezclarlos ahora en la app.

Impacto:

- sin esta capa no puedes operar de forma ordenada la activacion manual de negocios a escala.

## Prioridad 2: seguridad y abuso

### 4. Rate limit serio fuera de memoria

Todavia falta:

- mover rate limits desde memoria local a edge/WAF/Redis;
- proteger `login`, `register`, `orders/create`, `reviews/create`, `analytics/collect`;
- agregar limites por IP, fingerprint y catalogo;
- enfriar ataques de spam y scraping.

Impacto:

- la proteccion actual sirve como base local, no como defensa nacional.

### 5. Validacion server mas dura

Todavia falta:

- validar payloads con schemas formales;
- validar limites de longitud en todos los endpoints mutables;
- endurecer validacion de cupones complejos;
- validar zonas de entrega, horarios y disponibilidad;
- sanitizar inputs de campos visibles al publico.

Impacto:

- reduce pedidos corruptos, reviews basura y errores de datos.

### 6. Observabilidad y respuesta a incidentes

Todavia falta:

- Sentry o equivalente;
- persistencia o agregacion central de logs por request;
- correlation ids;
- metricas de error por endpoint y por catalogo;
- dashboards de uptime y latencia;
- alertas operativas.

Impacto:

- sin observabilidad no puedes detectar ni corregir fallos nacionales a tiempo.

## Prioridad 3: arquitectura de escalado

### 7. CI/CD y calidad automatizada

Todavia falta:

- pipeline de build y test en CI;
- validacion de lint y typecheck;
- despliegue automatizado por entorno;
- smoke tests post-deploy;
- rollback claro.

Impacto:

- ahora la build pasa local, pero falta la disciplina de entrega continua.

### 8. Jobs y colas

Todavia falta:

- colas para tareas pesadas;
- recalculos agregados fuera del request;
- limpieza de analytics;
- reproceso de imagenes y thumbnails;
- notificaciones programadas;
- tareas periodicas de salud.

Impacto:

- evita cargar requests interactivos con trabajo costoso.

### 9. Cache y edge strategy

Todavia falta:

- cache HTTP por secciones del marketplace;
- invalidacion selectiva por catalogo;
- CDN para imagenes y assets pesados;
- politicas de revalidacion por tipo de pantalla;
- medicion real de cache hit ratio.

Impacto:

- clave para bajar latencia nacional en trafico alto.

## Prioridad 4: experiencia de negocio

### 10. Onboarding mas fuerte para nuevos negocios

Todavia falta:

- wizard de creacion de tienda por tipo de negocio;
- plantillas por vertical;
- sugerencias de categorias iniciales;
- checklist de publicacion;
- deteccion de configuracion incompleta antes de publicar.

Impacto:

- acelera activacion de miles de negocios nuevos.

### 11. Multi-catalogo y organizacion de cuenta

Todavia falta:

- mejor UX para cuentas con muchas tiendas;
- buscador de catalogos propios;
- agrupacion por negocio/brand;
- duplicacion de catalogos como plantilla;
- configuracion compartida entre sucursales.

Impacto:

- importante para cadenas o dueños con varias tiendas.

### 12. Permisos de equipo mas finos

Todavia falta:

- permisos granulares por accion;
- permisos por modulo y por sucursal;
- expiracion de invitaciones;
- aceptacion formal de invitacion;
- auditoria de cambios por miembro del equipo.

Impacto:

- necesario para equipos operativos reales.

## Prioridad 5: experiencia publica

### 13. PWA y offline real

Todavia falta:

- service worker revisado;
- cache offline de assets criticos;
- fallback de ultimos catalogos vistos mas alla del storefront puntual;
- sincronizacion diferida para eventos ligeros;
- criterios de invalidez de cache.

Impacto:

- muy importante para redes moviles inestables.

### 14. Limpieza completa de textos y encoding

Todavia falta:

- barrido completo de textos visibles con encoding roto;
- unificacion de mensajes de error;
- tono consistente en admin y publico;
- revision de metadatos SEO y social.

Impacto:

- afecta confianza, conversion y calidad percibida.

### 15. Marketplace mas inteligente

Todavia falta:

- ranking mas fino por conversion, actividad y calidad;
- filtros por disponibilidad real;
- filtros por distancia/zona cuando exista ubicacion robusta;
- secciones regionales mas ricas;
- moderacion editorial del feed.

Impacto:

- clave para que la home se sienta viva y relevante a gran escala.

## Prioridad 6: datos y modelo nacional

### 16. Ubicacion y logistica

Todavia falta:

- normalizar provincia, municipio y ciudad;
- zonas de entrega formales;
- costos por zona;
- repartidores;
- tracking de entrega;
- soporte de retiro y despacho con reglas reales.

Impacto:

- imprescindible para comercios que entregan pedidos.

### 17. Auditoria de cambios

Todavia falta:

- tabla `audit_log`;
- actor, accion, payload minimo y timestamp;
- visibilidad en admin master;
- soporte para investigacion de incidentes.

Impacto:

- fundamental para soporte y seguridad.

## Prioridad 7: producto y crecimiento

### 18. Moderacion y soporte master

Todavia falta:

- herramientas para suspender o revisar catalogos;
- panel de fraude/spam;
- motivos de baneo;
- bandeja de incidencias;
- soporte interno con contexto de negocio.

Impacto:

- necesario cuando escale la plataforma.

### 19. Analitica de negocio util

Todavia falta:

- conversion funnel;
- ventas por categoria y producto;
- ticket promedio;
- cohortes de clientes;
- rendimiento por horario;
- metricas accionables por negocio.

Impacto:

- sube el valor real para el dueño del negocio.

## Orden recomendado de las proximas iteraciones

1. Inventario profesional.
2. Planes/autorizacion manual desde panel master.
3. Rate limit real y observabilidad.
4. CI/CD y smoke tests.
5. PWA/offline real.
6. Logistica por zonas.
7. Auditoria de cambios.
8. Limpieza total de textos visibles.

## Criterio de salida para decir que la plataforma esta lista

Se puede hablar de produccion nacional cuando como minimo se cumpla esto:

- alta, login y creacion de catalogo sin errores intermitentes;
- pedidos validos con stock y autorizacion comercial/plan confiable;
- panel admin con permisos y trazabilidad por equipo;
- observabilidad con alertas reales;
- despliegue repetible con CI/CD;
- latencia controlada en pantallas publicas y admin;
- recuperacion razonable ante fallos de red;
- datos de negocio consistentes aun con concurrencia.
