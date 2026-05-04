import type {
  BusinessDaySchedule,
  CatalogCategory,
  CatalogCoupon,
  CatalogOperationalSettings,
  CatalogProduct,
  CatalogRecord,
  CatalogReview,
  CatalogThemeSettings,
  DeliveryZone,
  UserProfile,
} from '~/types/catalog'

const generateId = (prefix: string): string => {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${time}-${rand}`
}

const defaultScheduleRanges = () => ([{ start: '09:00', end: '18:00' }])

export const defaultWeeklySchedule = (): BusinessDaySchedule[] => ([
  { dayKey: 'monday', label: 'Lunes', enabled: true, ranges: defaultScheduleRanges() },
  { dayKey: 'tuesday', label: 'Martes', enabled: true, ranges: defaultScheduleRanges() },
  { dayKey: 'wednesday', label: 'Miércoles', enabled: true, ranges: defaultScheduleRanges() },
  { dayKey: 'thursday', label: 'Jueves', enabled: true, ranges: defaultScheduleRanges() },
  { dayKey: 'friday', label: 'Viernes', enabled: true, ranges: [{ start: '09:00', end: '15:00' }, { start: '18:00', end: '23:00' }] },
  { dayKey: 'saturday', label: 'Sábado', enabled: true, ranges: [{ start: '10:00', end: '15:00' }, { start: '18:00', end: '23:30' }] },
  { dayKey: 'sunday', label: 'Domingo', enabled: false, ranges: defaultScheduleRanges() },
])

export const createDeliveryZone = (): DeliveryZone => ({
  id: generateId('zone'),
  name: '',
  price: 0,
  minOrder: 0,
  estimatedMinutes: 45,
})

export const createCouponDraft = (): CatalogCoupon => ({
  id: generateId('coupon'),
  name: '',
  code: '',
  discountType: 'percentage',
  discountValue: 10,
  minimumOrder: 0,
  usageLimit: null,
  usedCount: 0,
  startsAt: null,
  expiresAt: null,
  visiblePublicly: false,
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const defaultTheme = (): CatalogThemeSettings => ({
  primary: '#ff5e00',
  bg: '#111111',
  bgType: 'color',
  bgImage: '',
  headerBg: '#000000',
  headerText: '#ffffff',
  cardBg: '#1a1a1a',
  cardStyle: 'shadow',
  priceColor: '#ff5e00',
  descColor: '#888888',
  productTitleColor: '#ffffff',
  catNoteColor: '#888888',
  offerBadgeBg: '#ff3b30',
  offerBadgeText: '#ffffff',
  timerBadgeBg: '#222222',
  timerBadgeText: '#ffffff',
  priceOldColor: '#9ca3af',
  tagBg: '#ff5e00',
  tagText: '#ffffff',
  searchInputBg: '#222222',
  searchInputBorder: '#333333',
  qtyBg: '#333333',
  qtyMinusBg: '#555555',
  detailBg: '#111111',
  detailNameColor: '#ffffff',
  detailDescColor: '#bbbbbb',
  detailPriceColor: '#ff5e00',
  btnCartBg: '#ff5e00',
  btnCartText: '#ffffff',
  btnWaBg: '#25d366',
  btnWaText: '#ffffff',
  bannerEnabled: true,
  bannerText: 'Pedidos directos por WhatsApp con catálogo premium.',
  bannerMode: 'loop',
  bannerSticky: true,
  bannerBg: '#111111',
  bannerTextColor: '#ffffff',
})

// NOTE: defaultTheme() and defaultSettings() both define color palettes.
// This is intentional while two UI layers (catalog theme vs storefront) coexist.
// TODO: unify both color systems into a single source of truth to avoid divergence.
export const defaultSettings = (name = 'Nueva Tienda', slug = 'nueva-tienda'): CatalogOperationalSettings => ({
  businessName: name,
  businessType: ['Restaurante'],
  tagline: 'Catálogo digital premium listo para vender',
  logoUrl: '',
  coverImage: '',
  storefrontLayout: 'classic',
  storeTopBarHtml: '<span>Envíos rápidos, ofertas activas y pedidos directos por WhatsApp.</span>',
  storeHeaderName: name,
  storeShowPremiumBadge: true,
  storeHeroTag: 'Tienda destacada',
  storeHeroTitle: `Compra en ${name}`,
  storeHeroDescription: `Explora productos, guarda favoritos y envía tu pedido en segundos desde ${name}.`,
  storeHeroButtonText: 'Ver productos',
  storeHeroBackgroundImage: '',
  storeFooterText: `Gracias por comprar en ${name}.`,
  storeIcon: 'shopping-bag',
  appIconUrl: '',
  storeBgColor: '#f8fafc',
  storeCardBgColor: '#ffffff',
  storeCartBgColor: '#0f172a',
  storeTextPrimaryColor: '#0f172a',
  storeTextSecondaryColor: '#64748b',
  storeCartTextColor: '#ffffff',
  storeToastFrom: '#3b82f6',
  storeToastTo: '#2563eb',
  timezone: 'UTC',
  address: {
    countryCode: '',
    stateCode: '',
    city: '',
    details: '',
    lat: 0,
    lng: 0,
  },
  instagram: '',
  facebook: '',
  website: '',
  ogTitle: `${name} | Catálogo Digital`,
  ogDescription: `Explora ${name} y haz tu pedido en segundos.`,
  ogImageUrl: '',
  phone: '',
  whatsapp: '',
  currency: 'MXN',
  scheduleMode: 'always',
  weeklySchedule: defaultWeeklySchedule(),
  cartEnabled: true,
  whatsappEnabled: true,
  callEnabled: true,
  productCarouselEnabled: true,
  productCarouselSeconds: 4,
  checkoutNameEnabled: true,
  checkoutNameReq: 'required',
  checkoutAddressEnabled: true,
  checkoutAddressReq: 'optional',
  checkoutPaymentEnabled: true,
  checkoutPaymentReq: 'optional',
  deliveryEnabled: true,
  deliveryPaused: false,
  deliveryFeeType: 'flat',
  deliveryFlatFee: 39,
  deliveryMinimumOrder: 149,
  deliveryZones: [],
  riderInstructions: '',
  pickupEnabled: true,
  pickupPoint: 'Mostrador principal',
  pickupInstructions: 'Presenta tu nombre en caja para retirar tu pedido.',
  pickupEtaMinutes: 20,
  closed: false,
  closedMessage: 'Ahora mismo no estamos recibiendo pedidos.<br>Vuelve pronto.',
  closedTextSizeLarge: 32,
  closedTextSizeSmall: 17,
  closedTextColor: '#ffffff',
  closedBgType: 'color',
  closedBgColor: '#20130f',
  closedBgImage: '',
  closedTextBox: true,
  closedTextBoxColor: '#000000',
  closedTextBoxOpacity: 65,
  closedShowMenuBtn: true,
  closedMenuBtnBg: '#bf4c22',
  closedMenuBtnText: '#ffffff',
  closedShowWhatsapp: true,
  closedShowCall: true,
  reviewsEnabled: true,
  reviewModeration: true,
  adminReplyName: name,
  qrDotColor: '#20130f',
  qrBgColor: '#fff7f2',
  qrDotType: 'rounded',
  qrCornerType: 'extra-rounded',
  qrLogoUrl: '',
})

export const defaultCategories = (): CatalogCategory[] => []

export const defaultProducts = (): CatalogProduct[] => []

export const createCatalogRecord = (
  ownerUid: string,
  slug: string,
  name: string,
): CatalogRecord => ({
  id: slug,
  slug,
  ownerUid,
  status: 'published',
  planTier: 'free',
  isBanned: false,
  createdAt: new Date().toISOString(),
  ratingAverage: 0,
  ratingApprovedCount: 0,
  theme: defaultTheme(),
  settings: defaultSettings(name, slug),
  categories: defaultCategories(),
  products: defaultProducts(),
  reviews: [],
  orders: [],
})

export const demoUser = (): UserProfile => ({
  uid: 'demo-owner',
  email: 'demo@catalogo.com',
  displayName: 'Demo Owner',
  defaultCatalogId: 'brasa-house',
  systemRole: 'merchant',
  createdAt: new Date().toISOString(),
})

export const demoCatalog = (): CatalogRecord => {
  const catalog = createCatalogRecord('demo-owner', 'brasa-house', 'Brasa House')
  catalog.settings.phone = '525512345678'
  catalog.settings.whatsapp = '525512345678'
  catalog.settings.businessType = ['Hamburguesería']
  catalog.settings.tagline = 'Menú visual para delivery, pickup y ventas directas.'
  return catalog
}
