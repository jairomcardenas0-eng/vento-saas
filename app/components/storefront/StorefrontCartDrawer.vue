<template>
  <Transition
    enter-active-class="transition-all duration-350 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-250 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="open" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
      <Transition
        enter-active-class="transition-transform duration-350 ease-out"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition-transform duration-250 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div v-if="open" class="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[32px] p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-20px_70px_rgba(20,12,10,0.3)]" :style="{ background: drawerBg, color: drawerTextColor }">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.15em] opacity-50">Checkout</p>
              <h3 class="m-0 text-2xl">Carrito y despacho</h3>
              <p class="mt-2 text-sm opacity-70">Resumen vivo, persistencia local y envio a WhatsApp.</p>
            </div>
            <button class="ghost-btn small !min-h-[44px]" @click="$emit('close')">Cerrar</button>
          </div>

          <!-- Items del carrito -->
          <div class="space-y-3">
            <article v-for="item in cartStore.items" :key="item.cartItemId" class="rounded-[22px] border p-4" :style="{ background: cardItemBg, borderColor: cardItemBorder }">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <strong class="block">{{ item.productName }}</strong>
                  <p v-if="item.modifiers.length" class="mt-2 text-sm opacity-70">{{ item.modifiers.map(modifier => modifier.optionName).join(', ') }}</p>
                  <p v-if="item.instructions" class="mt-1 text-sm italic opacity-60">{{ item.instructions }}</p>
                </div>
                <strong>{{ money(item.finalUnitPrice * item.quantity, currency) }}</strong>
              </div>
              <div class="mt-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <button class="ghost-btn small !min-h-[44px] !w-[44px] !rounded-full !p-0" @click="cartStore.updateQuantity(slugKey, item.cartItemId, -1)">-</button>
                  <span class="min-w-8 text-center font-semibold">{{ item.quantity }}</span>
                  <button class="ghost-btn small !min-h-[44px] !w-[44px] !rounded-full !p-0" @click="cartStore.updateQuantity(slugKey, item.cartItemId, 1)">+</button>
                </div>
                <button class="ghost-btn small !min-h-[44px]" @click="cartStore.removeFromCart(slugKey, item.cartItemId)">Quitar</button>
              </div>
            </article>

            <!-- Carrito vacío -->
            <div v-if="cartStore.items.length === 0" class="py-10 text-center opacity-50">
              <p class="text-lg font-semibold">Carrito vacio</p>
              <p class="text-sm mt-1">Agrega productos desde el catalogo.</p>
            </div>
          </div>

          <!-- Formulario de checkout -->
          <form v-if="cartStore.items.length > 0" class="mt-5 space-y-4" @submit.prevent="$emit('submit')">
            <label class="block">
              <span class="mb-2 block text-sm opacity-70">Nombre</span>
              <input v-model="checkoutForm.name" maxlength="80" class="w-full rounded-[18px] border px-4 py-3 focus-visible:outline-none focus-visible:ring-2" :style="{ background: inputBg, borderColor: cardItemBorder, color: drawerTextColor }" />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm opacity-70">Modalidad</span>
              <select v-model="checkoutForm.method" class="w-full rounded-[18px] border px-4 py-3 focus-visible:outline-none focus-visible:ring-2" :style="{ background: inputBg, borderColor: cardItemBorder, color: drawerTextColor }">
                <option value="Delivery" :disabled="!availableDelivery">Delivery</option>
                <option value="Pickup" :disabled="!availablePickup">Pickup</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-2 block text-sm opacity-70">Metodo de pago</span>
              <input v-model="checkoutForm.paymentMethod" maxlength="80" class="w-full rounded-[18px] border px-4 py-3 focus-visible:outline-none focus-visible:ring-2" :style="{ background: inputBg, borderColor: cardItemBorder, color: drawerTextColor }" placeholder="Efectivo, transferencia, etc." />
            </label>
            <label v-if="checkoutForm.method === 'Delivery' && storefront.settings?.deliveryFeeType === 'zones'" class="block">
              <span class="mb-2 block text-sm opacity-70">Zona de entrega</span>
              <select v-model="checkoutForm.zoneId" class="w-full rounded-[18px] border px-4 py-3 focus-visible:outline-none focus-visible:ring-2" :style="{ background: inputBg, borderColor: cardItemBorder, color: drawerTextColor }">
                <option value="">Selecciona una zona</option>
                <option v-for="zone in (storefront.settings?.deliveryZones || [])" :key="zone.id" :value="zone.id">
                  {{ zone.name }} · {{ money(zone.price, currency) }} · {{ zone.estimatedMinutes }} min
                </option>
              </select>
            </label>
            <label v-if="checkoutForm.method === 'Delivery'" class="block">
              <span class="mb-2 block text-sm opacity-70">Direccion</span>
              <textarea v-model="checkoutForm.address" maxlength="180" class="min-h-[90px] w-full rounded-[18px] border px-4 py-3 focus-visible:outline-none focus-visible:ring-2" :style="{ background: inputBg, borderColor: cardItemBorder, color: drawerTextColor }"></textarea>
            </label>
            <div v-if="checkoutForm.method === 'Pickup'" class="rounded-[18px] border p-4 text-sm opacity-80" :style="{ background: inputBg, borderColor: cardItemBorder }">
              <strong class="block" :style="{ color: drawerTextColor }">{{ storefront.settings?.pickupPoint || 'Punto de recogida' }}</strong>
              <p class="mt-2">{{ storefront.settings?.pickupInstructions || '' }}</p>
              <p class="mt-2">Tiempo estimado: {{ storefront.settings?.pickupEtaMinutes || '-' }} min.</p>
            </div>

            <!-- Cupones -->
            <div v-if="visibleCoupons.length" class="rounded-[18px] border p-4" :style="{ background: inputBg, borderColor: cardItemBorder }">
              <div class="flex flex-col gap-3 sm:flex-row">
                <input :value="couponCode" maxlength="40" class="flex-1 rounded-[18px] border px-4 py-3 uppercase focus-visible:outline-none focus-visible:ring-2" :style="{ background: cardItemBg, borderColor: cardItemBorder, color: drawerTextColor }" placeholder="Cupón de descuento" @input="$emit('update:coupon-code', ($event.target as HTMLInputElement).value)" />
                <button class="ghost-btn" type="button" @click="$emit('apply-coupon')">Aplicar</button>
                <button v-if="appliedCoupon" class="ghost-btn" type="button" @click="$emit('remove-coupon')">Quitar</button>
              </div>
              <p v-if="couponMessage" class="mt-3 text-sm opacity-70">{{ couponMessage }}</p>
            </div>

            <!-- Resumen -->
            <div class="rounded-[22px] border p-4" :style="{ background: cardItemBg, borderColor: cardItemBorder }">
              <div class="space-y-2 text-sm opacity-70">
                <div class="flex items-center justify-between gap-3">
                  <span>Subtotal</span>
                  <strong :style="{ color: drawerTextColor }">{{ money(subtotalBeforeDiscount, currency) }}</strong>
                </div>
                <div v-if="discountTotal > 0" class="flex items-center justify-between gap-3">
                  <span>Descuento</span>
                  <strong class="text-emerald-600">-{{ money(discountTotal, currency) }}</strong>
                </div>
                <div v-if="deliveryFee > 0" class="flex items-center justify-between gap-3">
                  <span>Envio</span>
                  <strong :style="{ color: drawerTextColor }">{{ money(deliveryFee, currency) }}</strong>
                </div>
                <div class="flex items-center justify-between gap-3 border-t pt-2" :style="{ borderColor: cardItemBorder }">
                  <span>Total general</span>
                  <strong class="text-2xl" :style="{ color: drawerTextColor }">{{ money(finalTotal, currency) }}</strong>
                </div>
              </div>
            </div>

            <div class="flex gap-3">
              <button class="ghost-btn flex-1 !min-h-[48px]" type="button" @click="cartStore.clearCart(slugKey)">Vaciar</button>
              <button class="solid-btn flex-1 !min-h-[48px]" type="submit" :style="{ background: storefront.theme.btnWaBg, color: storefront.theme.btnWaText }">Enviar por WhatsApp</button>
            </div>
          </form>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { CatalogCoupon, CatalogOperationalSettings } from '~/types/catalog'
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import { money } from '~/utils/catalog'
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
  open: boolean
  storefront: StorefrontPayload
  slugKey: string
  currency: string
  checkoutForm: {
    name: string
    address: string
    method: string
    paymentMethod: string
    zoneId: string
  }
  availableDelivery: boolean
  availablePickup: boolean
  visibleCoupons: CatalogCoupon[]
  couponCode: string
  appliedCoupon: CatalogCoupon | null
  couponMessage: string
  subtotalBeforeDiscount: number
  discountTotal: number
  deliveryFee: number
  finalTotal: number
}>()

defineEmits<{
  close: []
  submit: []
  'apply-coupon': []
  'remove-coupon': []
  'update:coupon-code': [value: string]
}>()

const cartStore = useCartStore()

const isStoreMode = computed(() => props.storefront.settings.storefrontLayout === 'store')
const storeCartBg = computed(() => isStoreMode.value ? props.storefront.settings.storeCartBgColor || '#0f172a' : '#fff9f2')
const storeCartText = computed(() => isStoreMode.value ? props.storefront.settings.storeCartTextColor || '#ffffff' : '#24140f')

const drawerBg = computed(() => isStoreMode.value ? storeCartBg.value : '#fff9f2')
const drawerTextColor = computed(() => isStoreMode.value ? storeCartText.value : '#24140f')
const cardItemBg = computed(() => isStoreMode.value ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)')
const cardItemBorder = computed(() => isStoreMode.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')
const inputBg = computed(() => isStoreMode.value ? 'rgba(255,255,255,0.05)' : '#ffffff')
</script>
