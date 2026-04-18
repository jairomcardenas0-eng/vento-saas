<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-300 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div v-if="open" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[32px] bg-[#fff9f2] p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-20px_70px_rgba(20,12,10,0.3)]">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Checkout</p>
            <h3 class="m-0 text-2xl text-[#24140f]">Carrito y despacho</h3>
            <p class="section-copy mt-2 text-sm">Resumen vivo, persistencia local y envio a WhatsApp.</p>
          </div>
          <button class="ghost-btn small !min-h-[44px]" @click="$emit('close')">Cerrar</button>
        </div>

        <div class="space-y-3">
          <article v-for="item in cartStore.items" :key="item.cartItemId" class="rounded-[22px] border border-black/10 bg-white/85 p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <strong class="block text-[#24140f]">{{ item.productName }}</strong>
                <p v-if="item.modifiers.length" class="mt-2 text-sm text-[#7f5a49]">{{ item.modifiers.map(modifier => modifier.optionName).join(', ') }}</p>
                <p v-if="item.instructions" class="mt-1 text-sm italic text-[#8b624f]">{{ item.instructions }}</p>
              </div>
              <strong class="text-[#24140f]">{{ money(item.finalUnitPrice * item.quantity, currency) }}</strong>
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
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="$emit('submit')">
          <label class="block">
            <span class="mb-2 block text-sm text-[#7f5a49]">Nombre</span>
            <input v-model="checkoutForm.name" maxlength="80" class="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm text-[#7f5a49]">Modalidad</span>
            <select v-model="checkoutForm.method" class="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]">
              <option value="Delivery" :disabled="!availableDelivery">Delivery</option>
              <option value="Pickup" :disabled="!availablePickup">Pickup</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-2 block text-sm text-[#7f5a49]">Metodo de pago</span>
            <input v-model="checkoutForm.paymentMethod" maxlength="80" class="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]" />
          </label>
          <label v-if="checkoutForm.method === 'Delivery' && storefront.settings.deliveryFeeType === 'zones'" class="block">
            <span class="mb-2 block text-sm text-[#7f5a49]">Zona de entrega</span>
            <select v-model="checkoutForm.zoneId" class="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]">
              <option value="">Selecciona una zona</option>
              <option v-for="zone in storefront.settings.deliveryZones" :key="zone.id" :value="zone.id">
                {{ zone.name }} · {{ money(zone.price, currency) }} · {{ zone.estimatedMinutes }} min
              </option>
            </select>
          </label>
          <label v-if="checkoutForm.method === 'Delivery'" class="block">
            <span class="mb-2 block text-sm text-[#7f5a49]">Direccion</span>
            <textarea v-model="checkoutForm.address" maxlength="180" class="min-h-[90px] w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]"></textarea>
          </label>
          <div v-if="checkoutForm.method === 'Pickup'" class="rounded-[18px] border border-black/10 bg-white/75 p-4 text-sm text-[#7f5a49]">
            <strong class="block text-[#24140f]">{{ storefront.settings.pickupPoint }}</strong>
            <p class="mt-2">{{ storefront.settings.pickupInstructions }}</p>
            <p class="mt-2">Tiempo estimado: {{ storefront.settings.pickupEtaMinutes }} min.</p>
          </div>

          <div v-if="visibleCoupons.length" class="rounded-[18px] border border-black/10 bg-white/75 p-4">
            <div class="flex flex-col gap-3 sm:flex-row">
              <input :value="couponCode" maxlength="40" class="flex-1 rounded-[18px] border border-black/10 bg-white px-4 py-3 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]" placeholder="Cupón de descuento" @input="$emit('update:coupon-code', ($event.target as HTMLInputElement).value)" />
              <button class="ghost-btn" type="button" @click="$emit('apply-coupon')">Aplicar</button>
              <button v-if="appliedCoupon" class="ghost-btn" type="button" @click="$emit('remove-coupon')">Quitar</button>
            </div>
            <p v-if="couponMessage" class="mt-3 text-sm text-[#7f5a49]">{{ couponMessage }}</p>
          </div>

          <div class="rounded-[22px] border border-black/10 bg-white/85 p-4">
            <div class="space-y-2 text-sm text-[#7f5a49]">
              <div class="flex items-center justify-between gap-3">
                <span>Subtotal</span>
                <strong class="text-[#24140f]">{{ money(subtotalBeforeDiscount, currency) }}</strong>
              </div>
              <div v-if="discountTotal > 0" class="flex items-center justify-between gap-3">
                <span>Descuento</span>
                <strong class="text-emerald-700">-{{ money(discountTotal, currency) }}</strong>
              </div>
              <div v-if="deliveryFee > 0" class="flex items-center justify-between gap-3">
                <span>Envio</span>
                <strong class="text-[#24140f]">{{ money(deliveryFee, currency) }}</strong>
              </div>
              <div class="flex items-center justify-between gap-3 border-t border-black/10 pt-2">
                <span>Total general</span>
                <strong class="text-2xl text-[#24140f]">{{ money(finalTotal, currency) }}</strong>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button class="ghost-btn flex-1 !min-h-[48px]" type="button" @click="cartStore.clearCart(slugKey)">Vaciar</button>
            <button class="solid-btn flex-1 !min-h-[48px]" type="submit">Enviar por WhatsApp</button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { CatalogCoupon, CatalogOperationalSettings } from '~/types/catalog'
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import { money } from '~/utils/catalog'
import { useCartStore } from '~/stores/cart'

defineProps<{
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
</script>
