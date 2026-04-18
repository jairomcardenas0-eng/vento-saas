import { defineStore } from 'pinia'
import { defaultTheme } from '~/app/data/defaults'

export interface ThemeConfig {
  primary: string
  bg: string
  cardBg: string
  text: string
  productTitleColor: string
  textMuted: string
  headerBg: string
  catNoteColor: string
  detailBg: string
  detailNameColor: string
  detailPriceColor: string
  detailDescColor: string
  btnCartBg: string
  btnCartText: string
  btnWaBg: string
  btnWaText: string
  offerBadgeBg: string
  offerBadgeText: string
  timerBadgeBg: string
  timerBadgeText: string
  bannerBg: string
  bannerText: string
  cardStyle: 'flat' | 'shadow' | 'glass-premium' | 'holographic'
}

const DEFAULT_THEME: ThemeConfig = {
  ...defaultTheme(),
  text: defaultTheme().headerText,
  textMuted: defaultTheme().descColor,
}

export const useAppearanceStore = defineStore('appearance', {
  state: () => ({
    theme: { ...DEFAULT_THEME } as ThemeConfig,
    loading: false,
    syncStatus: 'IDLE' as 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR',
  }),
  actions: {
    async fetchAppearanceConfig(storeId: string) {
      const backend = useSupabaseBackend()
      this.loading = true
      try {
        const catalog = await backend.getCatalogById(storeId)
        if (catalog) {
          this.theme = {
            ...DEFAULT_THEME,
            ...catalog.theme,
            text: catalog.theme.headerText,
            textMuted: catalog.theme.descColor,
          }
        }
      } finally {
        this.loading = false
      }
    },
    async saveAppearanceConfig(storeId: string) {
      const backend = useSupabaseBackend()
      this.syncStatus = 'SYNCING'
      try {
        await backend.updateTheme(storeId, this.theme)
        this.syncStatus = 'SUCCESS'
        setTimeout(() => { this.syncStatus = 'IDLE' }, 2000)
      } catch {
        this.syncStatus = 'ERROR'
      }
    },
  },
})
