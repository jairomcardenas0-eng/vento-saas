# PROMPT V500 ULTRA MEGA AGRESIVO - UPGRADE TOTAL DE APP (SIN CAMBIAR IDENTIDAD VISUAL)

## Instrucción principal (obligatoria)
Actúa como un equipo élite compuesto por:
- Principal Software Architect
- Staff Frontend Engineer (Nuxt 3 + TS)
- Staff Backend Engineer (Supabase)
- Product Designer orientado a UX de producción
- QA Lead + Performance Engineer + Accessibility Specialist

Tu meta es ejecutar un **upgrade integral, quirúrgico y de máxima calidad** sobre esta app, en una sola corrida, para dejarla por encima de la competencia en robustez, experiencia y percepción profesional.

## Principio rector
No quiero un rediseño.  
Quiero una app que mantenga su esencia visual, pero se sienta como un producto con años de madurez.

---

## Contexto técnico
- Stack: Nuxt 3 + TypeScript + Pinia + Supabase + Tailwind
- Core paths:
  - `app/layouts/admin.vue`
  - `app/pages/admin/*.vue`
  - `app/components/storefront/StorefrontMenuBase.vue`
  - `app/stores/*.ts`
  - `app/composables/useSupabaseBackend.ts`
- Objetivo principal: **calidad de producto premium sin romper funcionamiento actual**

---

## Restricciones absolutas (NO negociables)
1. No cambiar identidad visual base:
   - Mantener paleta, tono visual, branding, estructura general de pantallas.
   - Prohibido rediseño completo.
2. No romper lógica funcional existente.
3. Solo modificar lógica cuando:
   - exista bug real,
   - haya edge case crítico,
   - haya deuda técnica con riesgo alto,
   - o la mejora reduzca errores/riesgo de forma objetiva.
4. Todo el producto admin/storefront debe quedar en español profesional y consistente.
5. Cero regresiones de negocio.
6. No hacks rápidos ni “parches frágiles”.

---

## Modo de ejecución
Trabaja en modo:
- **Quality First**
- **No Regression**
- **Mobile-First Hardening**
- **Consistency Enforcement**

Toma decisiones autónomas y fuertes, siempre dentro de las restricciones.

---

## Meta de resultado (qué significa “quedar mejor que la competencia”)
La app final debe:
1. Verse sólida en móvil sin ningún desborde.
2. Tener consistencia real en copy, spacing, jerarquía y comportamiento.
3. Mostrar estados claros (loading/empty/error/success) en todos los módulos críticos.
4. No mostrar mezclas idiomáticas ni textos ambiguos.
5. Sentirse rápida, estable y confiable en uso real.
6. Pasar validaciones técnicas sin degradar arquitectura.

---

## Plan operativo obligatorio (seguir exactamente este orden)

### FASE 0 - Inventario y baseline
1. Recorre todo `app/pages/admin` y `app/layouts/admin.vue`.
2. Genera inventario de:
   - componentes/páginas críticas,
   - puntos de ruptura responsive,
   - textos mixtos EN/ES,
   - estados faltantes o confusos,
   - riesgos de regresión.
3. Define una matriz de prioridad:
   - P0: rompe UX o negocio
   - P1: deteriora calidad percibida
   - P2: deuda técnica/mejora incremental

### FASE 1 - Hardening móvil agresivo (P0)
Objetivo: cero contenido fuera del marco derecho.

Aplicar en layout y módulos críticos:
- `referrals`, `team`, `share`, `coupons`, `checkout`, `pickup`, `delivery`.

Acciones mínimas:
1. Blindaje anti-overflow:
   - `min-w-0`, `max-w-full`, `overflow-x-hidden` donde corresponda.
   - eliminar anchuras rígidas peligrosas.
2. Contenedores largos:
   - URLs, slugs, correos, códigos: truncado o corte controlado (`break-all`, `truncate`) sin romper UI.
3. Tablas:
   - nunca dejar tabla rígida en móvil;
   - usar patrón seguro: tarjetas en móvil + tabla desktop o scroll controlado únicamente cuando sea imprescindible.
4. Botones/acciones:
   - asegurar usabilidad táctil y layout estable en viewport estrecho.

### FASE 2 - Consistencia idiomática total (P0/P1)
1. Eliminar inglés residual en UI visible.
2. Unificar glosario oficial:
   - Checkout -> Pedido / Pedido y visibilidad
   - Delivery -> Entrega / Entrega a domicilio
   - Pickup -> Recogida
   - Viewer -> Lector
   - Save -> Guardar
   - Status -> Estado
3. Homogeneizar tono:
   - profesional, claro, corto, accionable.
4. Alinear labels, placeholders, toasts, errores y empty states.

### FASE 3 - Estados UX y claridad operativa (P0/P1)
Cada pantalla crítica debe tener estados explícitos:
- loading
- empty
- error
- ready

Reglas:
1. Nunca pantalla en blanco sin explicación.
2. Si depende de catálogo activo:
   - mostrar fallback claro y guía de siguiente acción.
3. Mensajes de error:
   - legibles para negocio, no solo técnicos.

### FASE 4 - Robustez de lógica (P1)
1. Mantener reglas de negocio actuales.
2. Corregir únicamente lógica con evidencia de bug/riesgo.
3. Reforzar:
   - validaciones de entrada,
   - coherencia de estado,
   - sincronización store/backend.
4. Evitar side effects ocultos y duplicidad de fuentes de verdad.

### FASE 5 - Calidad de código (P1/P2)
1. Tipado estricto.
2. Evitar `any` salvo necesidad justificada.
3. Reducir complejidad accidental.
4. Mantener componentes legibles y de responsabilidad clara.
5. No sobreingeniería.

### FASE 6 - Performance percibida (P1)
Sin rediseñar ni romper:
1. Reducir bloqueos visuales en carga.
2. Evitar renders innecesarios en vistas pesadas.
3. Garantizar experiencia estable en móvil gama media.
4. No introducir librerías pesadas si no es necesario.

### FASE 7 - Accesibilidad y usabilidad (P1)
1. Etiquetas/aria en controles clave.
2. Contrastes razonables en textos funcionales.
3. Tamaño táctil mínimo en botones críticos.
4. Focus visible y navegación clara en formularios.

### FASE 8 - Verificación de producción (obligatoria)
1. Ejecutar checks/lint/build.
2. Probar manualmente:
   - `/admin`
   - `/admin/share`
   - `/admin/coupons`
   - `/admin/referrals`
   - `/admin/team`
   - `/admin/delivery`
   - `/admin/pickup`
   - `/admin/checkout`
3. Confirmar evidencia de:
   - cero overflow horizontal móvil,
   - cero mezcla EN/ES en UI,
   - cero regresión funcional crítica.

---

## Libertad técnica (cómo decidir)
Tienes libertad completa para:
- reestructurar markup de vistas conflictivas,
- mover bloques para robustez responsive,
- consolidar copy/labels en forma consistente,
- reforzar estados y validaciones,
- mejorar arquitectura local si reduce riesgo.

Siempre que:
- no cambies identidad visual base,
- no rompas lógica de negocio,
- no añadas complejidad innecesaria,
- y demuestres mejora tangible.

---

## Criterios de aceptación estrictos

### 1) Responsive
- Ninguna vista admin se sale del marco derecho en móvil.
- No hay scroll horizontal accidental en módulos críticos.
- Elementos largos no rompen layout.

### 2) Idioma
- 100% español consistente en UI.
- No spanglish en labels de negocio.

### 3) UX
- Estados loading/empty/error/ready definidos y claros.
- Flujo admin entendible sin fricción innecesaria.

### 4) Estabilidad
- No hay regresiones críticas.
- Guardado y navegación entre módulos permanecen estables.

### 5) Código
- Sin nuevos errores de lint/diagnóstico.
- Tipado sólido y mantenimiento razonable.

---

## Entregables obligatorios al finalizar
1. Resumen ejecutivo de mejoras (qué cambió y por qué).
2. Lista de archivos tocados con justificación por archivo.
3. Riesgos detectados y mitigaciones aplicadas.
4. Evidencia de validaciones:
   - build/lint,
   - pruebas manuales por ruta crítica,
   - checks de responsive/idioma.
5. Lista corta de mejoras futuras (solo alto impacto real).

---

## Política de calidad (obligatoria)
No aceptes “más o menos bien”.
No aceptes “compila y ya”.
No aceptes soluciones frágiles.

Debes entregar una app:
- estable en producción,
- consistente para negocio,
- impecable en móvil,
- profesional en percepción.

Si detectas ambigüedad, decide con criterio de producto maduro y registra la decisión.

---

## Instrucción final
Ejecuta todo lo anterior en una sola iteración completa, priorizando impacto real, cero regresión y acabado premium.  
No te detengas en micro-optimizaciones irrelevantes: maximiza resultado de negocio y calidad percibida.
