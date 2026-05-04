<template>
  <div class="space-y-8">
    <!-- Top Configuration Header -->
    <div class="grid gap-5 lg:grid-cols-2">
      <!-- Card Categories -->
      <div class="rounded-[30px] border border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/90">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">ARQUITECTURA</p>
            <h3 class="m-0 text-2xl text-zinc-900 dark:text-zinc-100">Categorías</h3>
            <p class="section-copy mt-2 text-sm">Sidebar de clasificación para render rápido y orden editorial.</p>
          </div>
          <button class="solid-btn small !min-h-[40px] !rounded-full bg-zinc-900 px-5 text-white dark:bg-zinc-100 dark:text-zinc-900" @click="openCategoryEditor()">Nueva</button>
        </div>
      </div>
      
      <!-- Card Products -->
      <div class="rounded-[30px] border border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/90">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="eyebrow">CONTROL DEL CATÁLOGO</p>
            <h3 class="m-0 text-2xl text-zinc-900 dark:text-zinc-100">Productos y variantes</h3>
            <p class="section-copy mt-2 text-sm">CRUD asíncrono con storage delegado y variantes.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="ghost-btn small !min-h-[40px] !rounded-full border border-zinc-200 dark:border-zinc-700" @click="refreshCatalog">Recargar</button>
            <button class="solid-btn small !min-h-[40px] !rounded-full bg-zinc-900 px-5 text-white dark:bg-zinc-100 dark:text-zinc-900" @click="openProductEditor()">Nuevo producto</button>
          </div>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3">
           <input v-model="search" placeholder="Nombre, descripcion o categoria..." class="flex-1 rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-100" />
           <select v-model="selectedCategoryId" class="rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900 sm:w-48 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-100">
             <option value="">Categoría activa (Todas)</option>
             <option v-for="c in catalogEngine.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
           </select>
        </div>
      </div>
    </div>

    <!-- Inline status (no bloquea la pantalla) -->
    <div
      v-if="(catalogEngine.loadingEngine && !catalogEngine.categories.length) || loadError"
      class="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm"
      :class="loadError
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
        : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300'"
    >
      <span class="flex items-center gap-2">
        <svg v-if="!loadError" class="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ loadError || 'Actualizando catálogo desde la base de datos...' }}
      </span>
      <button v-if="loadError" class="solid-btn" @click="refreshCatalog">Reintentar</button>
    </div>

    <!-- Inline Catalog View -->
    <div class="space-y-12 pb-10">
      <div v-for="category in filteredCatalog" :key="category.id" class="space-y-5">
        
        <!-- Category Header -->
        <div class="flex items-end justify-between border-b-2 border-zinc-100 pb-3 dark:border-zinc-800/50">
          <div>
            <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{{ category.name }}</h3>
            <p v-if="category.description" class="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">{{ category.description }}</p>
          </div>
          <div class="flex gap-2">
            <button class="ghost-btn small !rounded-full px-4 text-xs font-semibold" @click="openCategoryEditor(category)">Editar</button>
            <button class="ghost-btn small !rounded-full px-4 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" @click="removeCategory(category)">Eliminar cat.</button>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-if="category.items.length === 0" class="rounded-[20px] border border-dashed border-zinc-200 bg-zinc-50 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
           No hay productos registrados en esta categoría.
        </div>
        
        <!-- Productos -->
        <div v-else class="space-y-2">
          <article
            v-for="product in category.items"
            :key="product.id"
            class="group flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-white px-3 py-3 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div class="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#fafafa,#e4e4e7)] dark:bg-[linear-gradient(135deg,#27272a,#09090b)]">
              <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" class="h-full w-full object-cover" />
              <div v-else class="flex h-full items-center justify-center text-[11px] text-zinc-400">Sin foto</div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h4 class="truncate text-[15px] font-bold text-zinc-900 dark:text-zinc-100">{{ product.name }}</h4>
                  <p class="mt-1 line-clamp-2 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">{{ product.description || 'Sin descripción detallada' }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <span v-if="product.hasPromo && product.promoPrice !== null" class="block text-[11px] font-semibold text-orange-600 line-through opacity-70">{{ money(product.basePrice) }}</span>
                  <span class="block text-[15px] font-black tracking-tight" :class="product.hasPromo ? 'text-orange-600' : 'text-zinc-900 dark:text-zinc-100'">
                    {{ money(product.hasPromo ? (product.promoPrice || 0) : product.basePrice) }}
                  </span>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap gap-2">
                  <span class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" :class="product.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'">
                    {{ product.isActive ? 'Visible' : 'Oculto' }}
                  </span>
                  <span v-if="product.hasPromo" class="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                    Promo
                  </span>
                </div>

                <div class="flex gap-2">
                  <button class="ghost-btn small !min-h-[34px] !rounded-xl !px-3 text-xs font-semibold" @click="openProductEditor(product)">Editar</button>
                  <button class="ghost-btn small !min-h-[34px] !rounded-xl !px-3 text-xs font-semibold !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-950/30" @click="removeProduct(product)">Eliminar</button>
                </div>
              </div>
            </div>
          </article>
        </div>
        
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="drawerOpen" class="fixed inset-0 z-[60] bg-black/50" @click.self="closeDrawer">
        <div class="fixed inset-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto w-full max-w-full sm:max-w-2xl overflow-y-auto border-l border-zinc-200 bg-white p-5 shadow-[0_30px_90px_rgba(16,12,10,0.28)] ring-1 ring-black/10 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <p class="eyebrow">{{ drawerMode === 'product' ? 'Producto' : 'Categoria' }}</p>
              <h3 class="m-0 text-2xl text-zinc-900 dark:text-zinc-100">{{ drawerMode === 'product' ? (productDraft.id ? 'Editar producto' : 'Nuevo producto') : (categoryDraft.id ? 'Editar categoria' : 'Nueva categoria') }}</h3>
              <p class="section-copy mt-2 text-sm">
                {{ drawerMode === 'product' ? 'Editor de producto con carga de imagen y gestión de variantes.' : 'Editor de clasificación para controlar el orden del catálogo.' }}
              </p>
            </div>
            <button class="ghost-btn small !min-h-[40px]" @click="closeDrawer">Cerrar</button>
          </div>

          <form v-if="drawerMode === 'category'" class="space-y-5" @submit.prevent="saveCategory">
            <label class="block">
              <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Nombre</span>
              <input v-model="categoryDraft.name" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" required />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Comentario</span>
              <input v-model="categoryDraft.description" placeholder="Opcional" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Orden</span>
              <input v-model.number="categoryDraft.sortOrder" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" min="1" type="number" />
            </label>
            <button class="solid-btn w-full" :disabled="savingCategory">
              {{ savingCategory ? 'Guardando...' : 'Guardar categoria' }}
            </button>
          </form>

          <form v-else class="space-y-6" @submit.prevent="saveProduct">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block sm:col-span-2">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Nombre *</span>
                <input v-model="productDraft.name" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" required />
              </label>
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Categoría *</span>
                <select v-model="productDraft.categoryId" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" required>
                  <option value="" disabled>Selecciona una categoría</option>
                  <option v-for="category in catalogEngine.categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Orden en categoría</span>
                <input v-model.number="productDraft.sortOrder" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" min="1" type="number" />
                <p class="mt-1 text-xs text-zinc-400">Número menor = aparece primero en la categoría</p>
              </label>
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Precio base *</span>
                <input v-model.number="productDraft.basePrice" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" min="0" step="0.01" type="number" />
              </label>
              <label class="block sm:col-span-2">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Descripción</span>
                <textarea v-model="productDraft.description" class="min-h-[120px] w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" />
              </label>
            </div>

            <!-- Imágenes (hasta 3) -->
            <div class="rounded-[24px] border border-dashed border-zinc-300 bg-white/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
              <p class="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Imágenes del producto</p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div v-for="(_, imgIdx) in [0, 1, 2]" :key="imgIdx" class="flex flex-col gap-2">
                  <p class="text-xs text-zinc-400">Imagen {{ imgIdx + 1 }}<span v-if="imgIdx === 0" class="text-zinc-500"> (principal)</span></p>
                  <div class="overflow-hidden rounded-[16px] border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                    <img v-if="productDraft.imageUrls[imgIdx]" :src="productDraft.imageUrls[imgIdx]!" class="h-40 sm:h-28 w-full object-cover" />
                    <div v-else class="flex h-40 sm:h-28 items-center justify-center text-xs text-zinc-400">Sin imagen</div>
                  </div>
                  <div class="grid grid-cols-2 gap-1.5">
                    <label :for="`cam-${imgIdx}`" class="flex cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-zinc-200 bg-white py-2.5 text-[11px] font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Cámara
                    </label>
                    <label :for="`gal-${imgIdx}`" class="flex cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-zinc-200 bg-white py-2.5 text-[11px] font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Galería
                    </label>
                    <input :id="`cam-${imgIdx}`" type="file" accept="image/*" capture="environment" class="hidden" @change="handleMultiImageSelection(imgIdx, $event)" />
                    <input :id="`gal-${imgIdx}`" type="file" accept="image/*" class="hidden" @change="handleMultiImageSelection(imgIdx, $event)" />
                  </div>
                  <button v-if="productDraft.imageUrls[imgIdx]" type="button" class="ghost-btn small !min-h-[32px] !text-[11px] text-red-500 hover:bg-red-50" @click="clearMultiImage(imgIdx)">
                    Quitar
                  </button>
                </div>
              </div>
            </div>

            <!-- Carrusel de imágenes -->
            <div class="rounded-[22px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 space-y-3">
              <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Carrusel de imágenes</p>
              <p class="text-xs text-zinc-400">
                Activa el carrusel desde aquí mismo al crear/editar el producto.
              </p>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="flex items-center gap-3 rounded-[16px] border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                  <input
                    v-model="productDraft.carouselEnabled"
                    type="checkbox"
                    class="h-4 w-4 rounded border-zinc-300"
                    :disabled="availableImageCount < 2"
                  />
                  <span class="text-sm text-zinc-900 dark:text-zinc-100">Activar carrusel</span>
                </label>
                <label class="block">
                  <span class="mb-2 block text-xs text-zinc-500">Intervalo (segundos)</span>
                  <select
                    v-model.number="productDraft.carouselIntervalSeconds"
                    class="w-full rounded-[16px] border border-zinc-200 bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    :disabled="!productDraft.carouselEnabled || availableImageCount < 2"
                  >
                    <option :value="1">1</option>
                    <option :value="2">2</option>
                    <option :value="3">3</option>
                    <option :value="4">4</option>
                    <option :value="5">5</option>
                  </select>
                </label>
              </div>
              <p v-if="availableImageCount < 2" class="text-xs text-amber-600 dark:text-amber-400">
                Si hay una sola imagen, el carrusel no se puede activar. Agrega 2 o más imágenes para habilitarlo.
              </p>
            </div>

            <!-- Estado y promo -->
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                <input v-model="productDraft.isActive" type="checkbox" class="h-4 w-4 rounded border-zinc-300" />
                <span class="text-sm text-zinc-900 dark:text-zinc-100">Producto activo (visible en menú)</span>
              </label>
              <label class="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                <input v-model="productDraft.hasPromo" type="checkbox" class="h-4 w-4 rounded border-zinc-300" />
                <span class="text-sm text-zinc-900 dark:text-zinc-100">Tiene precio rebajado</span>
              </label>
              <label v-if="productDraft.hasPromo" class="block sm:col-span-2">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Precio rebajado</span>
                <input v-model.number="productDraft.promoPrice" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" min="0" step="0.01" type="number" />
              </label>
            </div>

            <!-- Etiqueta Promocional -->
            <div class="rounded-[22px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 space-y-3">
              <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Etiqueta promocional</p>
              <p class="text-xs text-zinc-400">Opcional. Funciona aunque el producto no tenga rebaja.</p>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-xs text-zinc-500">Texto de la etiqueta</span>
                  <input v-model="productDraft.offerLabel" placeholder="Ej: Oferta, Promo, Imperdible" class="w-full rounded-[16px] border border-zinc-200 bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
                </label>
                <label class="block">
                  <span class="mb-2 block text-xs text-zinc-500">Posición de la etiqueta</span>
                  <select v-model="productDraft.offerLabelPosition" class="w-full rounded-[16px] border border-zinc-200 bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                    <option value="image">Encima de la imagen</option>
                    <option value="price">Junto al precio</option>
                  </select>
                </label>
              </div>
            </div>

            <!-- Temporizador -->
            <div class="rounded-[22px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 space-y-3">
              <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Temporizador de oferta</p>
              <p class="text-xs text-zinc-400">El temporizador inicia al guardar. Si está vacío, no se muestra.</p>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-xs text-zinc-500">Horas de duración</span>
                  <input v-model.number="productDraft.timerHours" placeholder="Ej: 24" class="w-full rounded-[16px] border border-zinc-200 bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" min="1" type="number" />
                </label>
                <label class="block">
                  <span class="mb-2 block text-xs text-zinc-500">Posición del temporizador</span>
                  <select v-model="productDraft.timerPosition" class="w-full rounded-[16px] border border-zinc-200 bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                    <option value="image-right">Sobre la imagen (derecha)</option>
                    <option value="price-below">Debajo del precio</option>
                  </select>
                </label>
              </div>
              <div class="flex flex-wrap gap-4">
                <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input v-model="productDraft.timerShowMinutes" type="checkbox" class="h-4 w-4 rounded" />
                  Mostrar minutos
                </label>
                <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input v-model="productDraft.timerShowSeconds" type="checkbox" class="h-4 w-4 rounded" :disabled="!productDraft.timerShowMinutes" />
                  Mostrar segundos
                </label>
                <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input v-model="productDraft.timerLinkSale" type="checkbox" class="h-4 w-4 rounded" />
                  Al terminar, quitar rebaja
                </label>
              </div>
            </div>

            <!-- Variant groups -->
            <section class="space-y-4 rounded-[24px] border border-zinc-200 bg-white/80 p-4 ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900/80">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="m-0 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Grupos de variantes</p>
                  <p class="section-copy mt-1 text-sm">Tamaños, extras, niveles y reglas del producto.</p>
                </div>
                <button class="solid-btn small !min-h-[38px]" type="button" @click="addVariantGroup">Agregar grupo</button>
              </div>

              <div v-if="!productDraft.variants.length" class="rounded-[18px] border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No hay grupos todavía.
              </div>

              <div v-for="(group, groupIndex) in productDraft.variants" :key="group.id" class="space-y-4 rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <label class="block">
                    <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Nombre del grupo</span>
                    <input v-model="group.groupName" class="w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" />
                  </label>
                  <label class="block">
                    <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Tipo</span>
                    <select v-model="group.type" class="w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-zinc-100">
                      <option value="single">Selección única</option>
                      <option value="multiple">Selección múltiple</option>
                    </select>
                  </label>
                  <div class="flex items-end">
                    <button class="ghost-btn small !min-h-[42px]" type="button" @click="removeVariantGroup(groupIndex)">Eliminar grupo</button>
                  </div>
                </div>

                <div class="space-y-3">
                  <div v-for="(option, optionIndex) in group.options" :key="option.id" class="grid gap-3 rounded-[18px] border border-zinc-200 bg-white px-3 py-3 sm:grid-cols-[minmax(0,1fr)_160px_auto_auto] sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
                    <label class="block">
                      <span class="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Opción</span>
                      <input v-model="option.name" class="w-full rounded-[14px] border border-zinc-200 bg-zinc-50 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" />
                    </label>
                    <label class="block">
                      <span class="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Delta precio</span>
                      <input v-model.number="option.priceDelta" class="w-full rounded-[14px] border border-zinc-200 bg-zinc-50 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-zinc-100" step="0.01" type="number" />
                    </label>
                    <label class="flex items-center gap-2 rounded-[14px] border border-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                      <input v-model="option.isRequired" type="checkbox" class="h-4 w-4 rounded border-zinc-300" />
                      Requerido
                    </label>
                    <button class="ghost-btn small !min-h-[38px]" type="button" @click="removeVariantOption(groupIndex, optionIndex)">Borrar</button>
                  </div>
                </div>

                <button class="ghost-btn small !min-h-[38px]" type="button" @click="addVariantOption(groupIndex)">Agregar opción</button>
              </div>
            </section>

            <button class="solid-btn w-full" :disabled="savingProduct || uploadingImage">
              {{ savingProduct ? 'Guardando...' : 'Guardar producto' }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { money } from '~/utils/catalog'
import type { CategoryItem, ProductItem } from '~/stores/catalog'
import { createEmptyCategory, createEmptyProduct, createEmptyVariantGroup, createEmptyVariantOption, useCatalogEngineStore } from '~/stores/catalog'

definePageMeta({ layout: 'admin' })

const ownerCatalogStore = useCatalogStore()
const catalogEngine = useCatalogEngineStore()
const storageEngine = useStorageEngine()

const activeCatalog = computed(() => ownerCatalogStore.activeCatalog)
const activeStoreId = computed(() => activeCatalog.value?.id || '')
const selectedCategoryId = ref('')
const search = ref('')
const drawerOpen = ref(false)
const drawerMode = ref<'product' | 'category'>('product')
const savingProduct = ref(false)
const savingCategory = ref(false)
const uploadingImage = ref(false)
const uploadProgress = ref(0)

const productDraft = ref<ProductItem>(createEmptyProduct())
const categoryDraft = ref<CategoryItem>(createEmptyCategory())
const previousImageUrl = ref<string | null>(null)
const loadError = ref('')

type MappedCatalogCategory = CategoryItem & {
  items: ProductItem[]
}

const filteredCatalog = computed(() => {
  const needle = search.value.trim().toLowerCase()

  return catalogEngine.mappedCatalog
    .filter((category: MappedCatalogCategory) => !selectedCategoryId.value || category.id === selectedCategoryId.value)
    .map((category: MappedCatalogCategory) => {
      const items = category.items.filter((product: ProductItem) => {
        const matchesSearch = !needle || [product.name, product.description].join(' ').toLowerCase().includes(needle)
        return matchesSearch
      })
      return { ...category, items }
    })
    .filter((category: MappedCatalogCategory) => category.items.length > 0 || !needle)
})

const categoryName = (categoryId: string) =>
  catalogEngine.categories.find(category => category.id === categoryId)?.name || 'Sin categoria'

const productsForCategory = (categoryId: string) =>
  catalogEngine.products.filter(product => product.categoryId === categoryId)

const refreshCatalog = async () => {
  if (!activeStoreId.value) {
    return
  }

  loadError.value = ''

  // Timeout de seguridad: evita dejar la pantalla esperando indefinidamente.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('La conexión tardó demasiado. Revisa tu internet e intenta de nuevo.')), 20000),
  )

  try {
    await Promise.race([
      catalogEngine.hydrateCatalog(activeStoreId.value),
      timeout,
    ])

    if (!selectedCategoryId.value && catalogEngine.categories[0]) {
      selectedCategoryId.value = catalogEngine.categories[0].id
    }
  } catch (error) {
    loadError.value = error instanceof Error
      ? error.message
      : 'No pudimos sincronizar el catálogo. Intenta nuevamente.'
  }
}

watch(activeStoreId, async (storeId) => {
  if (!storeId) {
    return
  }

  await refreshCatalog()
}, { immediate: true })

const openCategoryEditor = (category?: CategoryItem) => {
  drawerMode.value = 'category'
  drawerOpen.value = true
  categoryDraft.value = category
    ? JSON.parse(JSON.stringify(category))
    : createEmptyCategory(catalogEngine.categories.length + 1)
}

const nextSortOrderForCategory = (categoryId: string) => {
  if (!categoryId) return 1
  const count = catalogEngine.products.filter(p => p.categoryId === categoryId).length
  return count + 1
}

const openProductEditor = (product?: ProductItem) => {
  drawerMode.value = 'product'
  drawerOpen.value = true
  previousImageUrl.value = product?.imageUrl || null
  if (product) {
    productDraft.value = JSON.parse(JSON.stringify(product))
  } else {
    const categoryId = selectedCategoryId.value || catalogEngine.categories[0]?.id || ''
    const empty = createEmptyProduct(categoryId)
    empty.sortOrder = nextSortOrderForCategory(categoryId)
    productDraft.value = empty
  }
}

// Auto-update sortOrder when category changes (only for new products)
watch(() => productDraft.value.categoryId, (newCategoryId) => {
  if (!productDraft.value.id && newCategoryId) {
    productDraft.value.sortOrder = nextSortOrderForCategory(newCategoryId)
  }
})

// Lock body scroll when drawer is open
watch(drawerOpen, (isOpen) => {
  if (import.meta.client) {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
})

const closeDrawer = () => {
  drawerOpen.value = false
  uploadingImage.value = false
  uploadProgress.value = 0
}

const availableImageCount = computed(() =>
  (productDraft.value.imageUrls || []).filter(Boolean).length,
)

const addVariantGroup = () => {
  productDraft.value.variants.push(createEmptyVariantGroup())
}

const removeVariantGroup = (groupIndex: number) => {
  productDraft.value.variants.splice(groupIndex, 1)
}

const addVariantOption = (groupIndex: number) => {
  productDraft.value.variants[groupIndex]?.options.push(createEmptyVariantOption())
}

const removeVariantOption = (groupIndex: number, optionIndex: number) => {
  productDraft.value.variants[groupIndex]?.options.splice(optionIndex, 1)
}

const handleFileSelection = async (event: Event) => {
  if (!activeStoreId.value) {
    return
  }

  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  uploadingImage.value = true
  uploadProgress.value = 0

  try {
    productDraft.value.imageUrl = await storageEngine.uploadProductImage(activeStoreId.value, file, (progress) => {
      uploadProgress.value = progress
    })
  } finally {
    uploadingImage.value = false
    target.value = ''
  }
}

const handleMultiImageSelection = async (imgIdx: number, event: Event) => {
  if (!activeStoreId.value) return

  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadingImage.value = true
  uploadProgress.value = 0

  try {
    const url = await storageEngine.uploadProductImage(activeStoreId.value, file, (progress) => {
      uploadProgress.value = progress
    })
    const urls = [...productDraft.value.imageUrls] as (string | null)[]
    urls[imgIdx] = url
    productDraft.value.imageUrls = urls
    // La primera imagen también es la portada principal
    if (imgIdx === 0) productDraft.value.imageUrl = url
  } finally {
    uploadingImage.value = false
    target.value = ''
  }
}

const clearMultiImage = async (imgIdx: number) => {
  const url = productDraft.value.imageUrls[imgIdx]
  if (url) {
    await storageEngine.deleteProductImage(url)
  }
  const urls = [...productDraft.value.imageUrls] as (string | null)[]
  urls[imgIdx] = null
  productDraft.value.imageUrls = urls
  if (imgIdx === 0) productDraft.value.imageUrl = null
  if (availableImageCount.value < 2) {
    productDraft.value.carouselEnabled = false
  }
}


const removeImage = async () => {
  if (productDraft.value.imageUrl) {
    await storageEngine.deleteProductImage(productDraft.value.imageUrl)
  }
  productDraft.value.imageUrl = null
}

const saveCategory = async () => {
  if (!activeStoreId.value) {
    return
  }

  savingCategory.value = true
  try {
    const targetId = categoryDraft.value.id || undefined
    const resolvedId = await catalogEngine.upsertCategory(activeStoreId.value, categoryDraft.value, targetId)
    selectedCategoryId.value = resolvedId
    closeDrawer()
  } finally {
    savingCategory.value = false
  }
}

const normalizedVariants = () =>
  productDraft.value.variants
    .map(group => ({
      ...group,
      groupName: group.groupName.trim(),
      options: group.options
        .filter(option => option.name.trim())
        .map(option => ({
          ...option,
          name: option.name.trim(),
          priceDelta: Number(option.priceDelta || 0),
        })),
    }))
    .filter(group => group.groupName && group.options.length)

const saveProduct = async () => {
  if (!activeStoreId.value) {
    return
  }

  savingProduct.value = true
  try {
    const targetId = productDraft.value.id || undefined
    await catalogEngine.upsertProduct(activeStoreId.value, {
      ...productDraft.value,
      name: productDraft.value.name.trim(),
      description: productDraft.value.description.trim(),
      basePrice: Number(productDraft.value.basePrice || 0),
      promoPrice: productDraft.value.hasPromo ? Number(productDraft.value.promoPrice || 0) : null,
      variants: normalizedVariants(),
    }, targetId)

    if (previousImageUrl.value && previousImageUrl.value !== productDraft.value.imageUrl) {
      await storageEngine.deleteProductImage(previousImageUrl.value)
    }

    closeDrawer()
  } finally {
    savingProduct.value = false
  }
}

const removeProduct = async (product: ProductItem) => {
  if (!activeStoreId.value) {
    return
  }

  if (!window.confirm(`¿Eliminar "${product.name}" del catálogo?`)) {
    return
  }

  await catalogEngine.deleteProduct(activeStoreId.value, product.id)
  if (product.imageUrl) {
    await storageEngine.deleteProductImage(product.imageUrl)
  }
}

const removeCategory = async (category: CategoryItem) => {
  if (!activeStoreId.value) {
    return
  }

  if (!window.confirm(`Eliminar la categoria "${category.name}"?`)) {
    return
  }

  await catalogEngine.deleteCategory(activeStoreId.value, category.id)
  if (selectedCategoryId.value === category.id) {
    selectedCategoryId.value = catalogEngine.categories[0]?.id || ''
  }
}
</script>
