# PROMPT PARA ANÁLISIS COMPLETO DE APLICACIÓN NUXT.JS + SUPABASE

## CONTEXTO DEL PROYECTO

**Tipo de aplicación:** SaaS de e-commerce con catálogos múltiples
**Stack tecnológico:**
- Nuxt.js 4.4.2 (Vue 3.5.33, Nitro 2.13.3, Vite 7.3.2)
- Supabase como backend (autenticación, base de datos, storage)
- Pinia para state management
- TailwindCSS para estilos
- TypeScript

**Directorio raíz:** `C:\Users\USUARIO\Desktop\Plantilla copia\plantilla-copia-completa\app-saas-core`

**Credenciales configuradas en `.env`:**
```
NUXT_PUBLIC_SUPABASE_URL=https://eydolnzvwkqwoubbgvjc.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZG9sbnp2d2txd291YmJndmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTk5NzgsImV4cCI6MjA5MjA3NTk3OH0.FpFCbPNyLs4KWKpvPAlPE1--X8WCA1_0ifrVJrM0icQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZG9sbnp2d2txd291YmJndmpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5OTk3OCwiZXhwIjoyMDkyMDc1OTc4fQ.ccxm24PGz8CGgecnXF1PkASYBo_LervEyvmtkKR_WEk
```

**URL local de desarrollo:** http://localhost:3001 (puerto 3000 estaba ocupado)

---

## PROBLEMAS DETECTADOS

### 1. TIMEOUTS EN CARGA DE DATOS
**Síntoma:** Las secciones del panel de administración tardan mucho en cargar y muestran el error:
```
[referrals] Error cargando datos: Error: La carga tardó demasiado. Intenta de nuevo.
```

**Archivos afectados:**
- `app/pages/admin/referrals.vue` — timeout de 5 segundos
- `app/pages/admin/catalog.vue` — timeout de 5 segundos
- `app/plugins/supabase.client.ts` — timeout global de 5 segundos

**Cambios recientes:**
- Reduje timeouts de 15-18s a 5s para dar feedback más rápido
- Agregué spinners animados a los estados de carga
- Pero el problema persiste: Supabase no responde dentro del timeout

### 2. BOTÓN "CREAR CATÁLOGO" NO RESPONDE
**Síntoma:** Al hacer clic en "Sí, crear catálogo" en el modal de confirmación, no hacía nada visualmente.

**Causa identificada:**
- `catalogStore.createCatalog()` no ponía `loading = true`
- El botón tenía `:disabled="catalogStore.loading"` pero siempre era `false`
- Si fallaba, el error se mostraba fuera del modal donde el usuario no lo veía

**Cambios recientes:**
- Agregué `loading = true/false` en `stores/catalogs.ts`
- Agregué `confirmError` para mostrar errores dentro del modal
- Ahora el botón muestra "Creando..." y se deshabilita

### 3. CONTRASTE EN MODAL DE CONFIRMACIÓN
**Síntoma:** En el modal de confirmación, "Nombre" y "URL pública" no se veían (texto gris sobre fondo gris).

**Causa:** Fondo `#f4f4f5` y texto sin color explícito.

**Cambio:** Cambié a fondo blanco con borde y texto negro.

---

## ESTRUCTURA DEL PROYECTO

### Archivos clave para analizar Supabase:

**Configuración de Supabase:**
- `app/plugins/supabase.client.ts` — Inicialización del cliente Supabase
- `nuxt.config.ts` — Runtime config para Supabase keys

**Backend composable:**
- `app/composables/useSupabaseBackend.ts` — Orquestador de todas las llamadas a Supabase
- `app/composables/backend/catalog.ts` — Lógica específica de catálogos
- `app/composables/backend/auth.ts` — Lógica de autenticación
- `app/composables/backend/commerce.ts` — Lógica de comercio (pedidos, reseñas, cupones)
- `app/composables/backend/analytics.ts` — Lógica de analytics
- `app/composables/backend/operations.ts` — Lógica operacional

**Stores (Pinia):**
- `app/stores/auth.ts` — Gestión de sesión y usuario
- `app/stores/catalogs.ts` — Gestión de catálogos
- `app/stores/orders.ts` — Gestión de pedidos
- `app/stores/reviews.ts` — Gestión de reseñas

**Páginas de admin:**
- `app/pages/admin/referrals.vue` — Referidos
- `app/pages/admin/catalog.vue` — Catálogo (categorías, productos)
- `app/pages/admin/team.vue` — Equipo
- `app/pages/admin/orders.vue` — Pedidos
- `app/pages/admin/coupons.vue` — Cupones
- `app/pages/admin/reviews.vue` — Reseñas

**Onboarding:**
- `app/pages/onboarding/create-catalog.vue` — Creación de catálogo

---

## INSTRUCCIONES DE ANÁLISIS

### 1. VERIFICAR CONECTIVIDAD CON SUPABASE
Analiza:
- ¿Las credenciales en `.env` están siendo leídas correctamente por Nuxt?
- ¿El cliente Supabase se inicializa correctamente en `supabase.client.ts`?
- ¿Hay alguna configuración faltante en `nuxt.config.ts`?
- ¿El proyecto de Supabase (`eydolnzvwkqwoubbgvjc.supabase.co`) está activo y accesible?

**Posibles causas:**
- El proyecto de Supabase está pausado
- Las credenciales expiraron
- Hay problemas de red/firewall
- La configuración de RLS (Row Level Security) bloquea las consultas
- Las tablas requeridas no existen en la base de datos

### 2. ANALIZAR CONSULTAS A SUPABASE
Revisa cada llamada a Supabase en:
- `useSupabaseBackend.ts`
- `backend/catalog.ts` (especialmente `createCatalog`, `getAdminBootstrap`)
- `backend/auth.ts`

Busca:
- Consultas ineficientes (N+1 queries, falta de indexes)
- Selects que traen demasiados datos sin necesidad
- Falta de manejo de errores
- Timeouts que son demasiado cortos para las operaciones reales

### 3. VERIFICAR ESTRUCTURA DE BASE DE DATOS
El código espera estas tablas (según los selects):
- `catalogs`
- `user_profiles`
- `categories`
- `products`
- `reviews`
- `orders`
- `catalog_access`
- `product_variant_groups`
- `product_variant_options`
- `inventory_items`
- `catalog_plans`
- `catalog_plan_history`
- `coupons`

Verifica:
- ¿Existen todas estas tablas en el proyecto de Supabase?
- ¿Tienen las columnas correctas según las queries?
- ¿Hay indexes en las columnas usadas en WHERE/ORDER BY?
- ¿Las políticas RLS permiten las operaciones necesarias?

### 4. ANALIZAR MANEJO DE ERRORES
Revisa:
- ¿Todos los try/catch están capturando errores correctamente?
- ¿Los mensajes de error son útiles para debugging?
- ¿Hay errores silenciosos (console.error sin throw)?
- ¿El usuario recibe feedback adecuado cuando algo falla?

### 5. VERIFICAR ESTADOS DE CARGA
Asegúrate que:
- Cada operación async tiene un estado `loading` correspondiente
- Los estados de carga se muestran visualmente (spinners, skeletons)
- Los timeouts son razonables (no muy cortos, no muy largos)
- Los botones se deshabilitan durante operaciones críticas

### 6. PERFORMANCE GENERAL
Analiza:
- ¿Hay componentes que re-renderizan innecesariamente?
- ¿Hay watchers que disparan muchas veces?
- ¿Hay memory leaks (event listeners no limpiados)?
- ¿Las imágenes se cargan lazy correctamente?
- ¿El bundle size es razonable?

---

## TABLAS ESPERADAS EN SUPABASE

Basado en el código, estas son las tablas mínimas requeridas:

### catalogs
- id (uuid, primary key)
- slug (text, unique)
- owner_uid (text/uuid, foreign key to user_profiles.uid)
- status (text)
- plan_tier (text)
- is_banned (boolean)
- created_at (timestamp)
- rating_average (numeric)
- rating_approved_count (integer)
- theme (jsonb)
- settings (jsonb)

### user_profiles
- uid (text/uuid, primary key)
- email (text)
- display_name (text)
- default_catalog_id (text/uuid, foreign key to catalogs.id)
- system_role (text)
- created_at (timestamp)

### categories
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- name (text)
- slug (text)
- sort_order (integer)
- ... (otras columnas según el select)

### products
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- name (text)
- slug (text)
- is_active (boolean)
- sort_order (integer)
- ... (otras columnas según el select)

### reviews
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- product_id (foreign key to products.id)
- rating (numeric)
- approved (boolean)
- created_at (timestamp)
- ... (otras columnas según el select)

### orders
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- status (text)
- created_at (timestamp)
- ... (otras columnas según el select)

### catalog_access
- catalog_id (foreign key to catalogs.id)
- user_uid (foreign key to user_profiles.uid)
- role (text)
- permissions (jsonb)
- is_owner (boolean)

### product_variant_groups
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- product_id (foreign key to products.id)
- group_name (text)
- selection_type (text)
- required (boolean)
- sort_order (integer)

### product_variant_options
- id (uuid, primary key)
- group_id (foreign key to product_variant_groups.id)
- name (text)
- price_delta (numeric)
- is_required (boolean)
- sort_order (integer)

### inventory_items
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- product_id (foreign key to products.id)
- variant_option_id (foreign key to product_variant_options.id)
- sku (text)
- quantity (integer)
- reserved (integer)
- low_stock_threshold (integer)
- track_stock (boolean)

### catalog_plans
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- plan_type (text)
- status (text)
- activated_at (timestamp)
- expires_at (timestamp)
- payment_reference (text)
- notes (text)

### catalog_plan_history
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- previous_plan (text)
- new_plan (text)
- changed_by (text)
- reason (text)
- created_at (timestamp)

### coupons
- id (uuid, primary key)
- catalog_id (foreign key to catalogs.id)
- ... (otras columnas según el select)

---

## CHECKLIST DE DIAGNÓSTICO

Para cada problema, sigue este checklist:

### Timeout en carga de datos:
- [ ] ¿La URL de Supabase es correcta?
- [ ] ¿El proyecto de Supabase está activo (no pausado)?
- [ ] ¿Las credenciales son válidas y no expiraron?
- [ ] ¿Las tablas existen en la base de datos?
- [ ] ¿Las políticas RLS permiten las consultas?
- [ ] ¿Hay indexes en las columnas consultadas?
- [ ] ¿La query es eficiente (no trae datos innecesarios)?
- [ ] ¿El timeout es razonable para la operación?
- [ ] ¿Hay latencia de red?

### Botón no responde:
- [ ] ¿La función se ejecuta (hay console.log para verificar)?
- [ ] ¿El estado de carga se actualiza correctamente?
- [ ] ¿Hay un try/catch capturando errores?
- [ ] ¿El error se muestra al usuario?
- [ ] ¿La operación async se espera correctamente?

---

## ACCIONES RECOMENDADAS

1. **Prueba de conectividad:**
   - Haz un `curl` o `fetch` directo a la URL de Supabase
   - Verifica que las credenciales funcionan con el cliente Supabase directamente
   - Revisa el dashboard de Supabase para ver el estado del proyecto

2. **Verificación de base de datos:**
   - Lista todas las tablas en el proyecto de Supabase
   - Compara con las tablas esperadas en este documento
   - Verifica que cada tabla tenga las columnas correctas
   - Revisa las políticas RLS

3. **Logging adicional:**
   - Agrega `console.log` antes y después de cada llamada a Supabase
   - Log los parámetros de las queries
   - Log los errores completos (no solo el mensaje)
   - Log el tiempo que tarda cada operación

4. **Testing incremental:**
   - Prueba la conexión más simple posible: `supabase.from('catalogs').select('id')`
   - Si eso falla, el problema es de conectividad
   - Si eso funciona, prueba queries más complejas incrementalmente

---

## ESPERADO DEL ANÁLISIS

Por favor, entrega:

1. **Diagnóstico raíz:** ¿Cuál es la causa exacta de los timeouts y falta de respuesta?
2. **Verificación de Supabase:** ¿El proyecto está configurado correctamente? ¿Falta algo?
3. **Lista de errores encontrados:** Todos los bugs, inconsistencias, y problemas de performance
4. **Solución específica:** Código exacto para arreglar cada problema
5. **Mejoras sugeridas:** Optimizaciones de performance, UX, y código

Sé exhaustivo. Revisa TODO el código base, no solo los archivos mencionados. Busca patrones de errores que se repitan.
Y si ves algún error aparte de este de los que yo te di en la instrucción por favor arreglalos no estés 100% casado con el con este pront y arregla todos los errores que veas porque hay muchos 