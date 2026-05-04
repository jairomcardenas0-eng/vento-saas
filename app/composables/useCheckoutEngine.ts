import type { CatalogOperationalSettings } from '~/types/catalog'
import type { CartItem } from '~/stores/cart'

interface DeliveryInfo {
  name: string
  address: string
  method: string
  paymentMethod?: string
  zoneName?: string
  couponCode?: string
  discountTotal?: number
  deliveryFee?: number
}

export const useCheckoutEngine = () => {
  const encodeOrderToWhatsApp = (
    items: CartItem[],
    storeSettings: CatalogOperationalSettings & { whatsappNumber?: string },
    deliveryInfo: DeliveryInfo,
    totalAmountSum: number,
  ) => {
    let orderText = `*🔥 NUEVO PEDIDO* - ${storeSettings.businessName}\n\n`
    orderText += `*Cliente:* ${deliveryInfo.name.trim() || 'No especificado'}\n`
    orderText += `*Modalidad:* ${deliveryInfo.method}\n`
    if (deliveryInfo.zoneName) {
      orderText += `*Zona:* ${deliveryInfo.zoneName}\n`
    }
    if (deliveryInfo.paymentMethod) {
      orderText += `*Pago:* ${deliveryInfo.paymentMethod}\n`
    }

    if (deliveryInfo.method === 'Delivery') {
      orderText += `*Direccion:* ${deliveryInfo.address.trim() || 'No especificada'}\n`
    }

    orderText += '\n*🛒 DETALLE DE LA ORDEN:*\n'

    items.forEach((item) => {
      const unitPrice = Number(item.finalUnitPrice ?? 0)
      orderText += `\n🔹 ${item.quantity}x *${item.productName}* ($${unitPrice.toFixed(2)})`
      if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
        orderText += `\n    ${item.modifiers.map(modifier => modifier.optionName).join(', ')}`
      }
      const note = item.instructions ? String(item.instructions).trim() : ''
      if (note) {
        orderText += `\n   _Nota: ${note}_`
      }
    })

    if ((deliveryInfo.discountTotal || 0) > 0) {
      orderText += `\n*Descuento:* -$${Number(deliveryInfo.discountTotal || 0).toFixed(2)}`
    }
    if ((deliveryInfo.deliveryFee || 0) > 0) {
      orderText += `\n*Envio:* $${Number(deliveryInfo.deliveryFee || 0).toFixed(2)}`
    }
    if (deliveryInfo.couponCode) {
      orderText += `\n*Cupon:* ${deliveryInfo.couponCode}`
    }

    orderText += `\n\n*💰 TOTAL A PAGAR:* $${totalAmountSum.toFixed(2)}`

    const phone = (storeSettings.whatsappNumber || '').replace(/[^0-9]/g, '')
    return `https://wa.me/${phone}?text=${encodeURIComponent(orderText)}`
  }

  return { encodeOrderToWhatsApp }
}
