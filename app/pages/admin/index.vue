<template>
  <div v-if="catalog" class="admin-grid">
    <AdminStatCard eyebrow="Ventas del mes" :value="money(ordersStore.monthSales, catalog.settings.currency)" description="Total facturado en pedidos este mes" />
    <AdminStatCard eyebrow="Productos activos" :value="catalogStore.activeProducts.length" :description="`De ${catalog.products.length} productos en tu catálogo`" />
    <AdminStatCard eyebrow="Satisfacción" :value="`${reviewsStore.positivityPercent}%`" :description="`Promedio de ${reviewsStore.averageApprovedRating.toFixed(1)} estrellas en reseñas`" />
    <AdminStatCard eyebrow="Pedidos nuevos" :value="ordersStore.byStatus('new').length" :description="`${reviewsStore.pending.length} reseñas pendientes de revisión`" />

    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Accesos rápidos" title="¿A dónde quieres ir?" description="Accede directamente a las secciones más utilizadas de tu panel." />
      <div class="quick-links">
        <NuxtLink to="/admin/orders" class="quick-link">Ver pedidos</NuxtLink>
        <NuxtLink to="/admin/reviews" class="quick-link">Revisar reseñas</NuxtLink>
        <NuxtLink to="/admin/catalog" class="quick-link">Gestionar catálogo</NuxtLink>
        <NuxtLink to="/admin/settings" class="quick-link">Ir a ajustes</NuxtLink>
      </div>
    </section>

    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Vista previa" title="Cómo lo ven tus clientes" description="Revisión rápida de tu catálogo tal como lo ve el público en este momento.">
        <template #actions>
          <NuxtLink :to="`/b/${catalog.slug}`" class="ghost-btn small">Abrir en nueva pestaña</NuxtLink>
        </template>
      </UiSectionHeader>
      <div class="admin-preview-frame">
        <iframe :src="`/b/${catalog.slug}`" title="Catalog preview" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { money } from '~/utils/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const ordersStore = useOrdersStore()
const reviewsStore = useReviewsStore()
const catalog = computed(() => catalogStore.activeCatalog)

watch(catalog, (value) => {
  if (!value) {
    return
  }

  ordersStore.startRealtime(value.id)
  reviewsStore.startRealtime(value.id)
}, { immediate: true })

onBeforeUnmount(() => {
  ordersStore.stopRealtime()
  reviewsStore.stopRealtime()
})
</script>
