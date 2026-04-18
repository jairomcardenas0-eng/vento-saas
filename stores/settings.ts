import { defineStore } from 'pinia'

export interface SettingsConfig {
  contactPhone: string
  contactWhatsapp: string
  qrUrl: string
  qrDotColor: string
  qrBgColor: string
  qrDotType: 'square' | 'rounded' | 'dots' | 'classy' | 'extra-rounded'
  qrCornerType: 'square' | 'extra-rounded' | 'dot'
  closedIsActive: boolean
  closedMessage: string
  closedTextLarge: number
  closedTextSmall: number
  closedTextColor: string
  closedBgType: 'color' | 'image'
  closedBgColor: string
  closedBgImage: string
  closedBoxEnabled: boolean
  closedBoxColor: string
  closedBoxOpacity: number
  closedShowMenuBtn: boolean
  closedMenuBtnBg: string
  closedMenuBtnText: string
}

const DEFAULT_SETTINGS: SettingsConfig = {
  contactPhone: '',
  contactWhatsapp: '',
  qrUrl: '',
  qrDotColor: '#000000',
  qrBgColor: '#ffffff',
  qrDotType: 'rounded',
  qrCornerType: 'extra-rounded',
  closedIsActive: false,
  closedMessage: 'Estamos cerrados\nVolvemos pronto',
  closedTextLarge: 28,
  closedTextSmall: 16,
  closedTextColor: '#ffffff',
  closedBgType: 'color',
  closedBgColor: '#1a1a1a',
  closedBgImage: '',
  closedBoxEnabled: false,
  closedBoxColor: '#000000',
  closedBoxOpacity: 70,
  closedShowMenuBtn: true,
  closedMenuBtnBg: '#ff5e00',
  closedMenuBtnText: '#ffffff',
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    config: { ...DEFAULT_SETTINGS } as SettingsConfig,
    loading: false,
    syncStatus: 'IDLE' as 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR',
  }),
  actions: {
    async fetchSettingsConfig(storeId: string) {
      const backend = useSupabaseBackend()
      this.loading = true
      try {
        const catalog = await backend.getCatalogById(storeId)
        if (catalog) {
          this.config = {
            ...DEFAULT_SETTINGS,
            contactPhone: catalog.settings.phone,
            contactWhatsapp: catalog.settings.whatsapp,
            qrDotColor: catalog.settings.qrDotColor,
            qrBgColor: catalog.settings.qrBgColor,
            qrDotType: catalog.settings.qrDotType,
            qrCornerType: catalog.settings.qrCornerType,
            closedIsActive: catalog.settings.closed,
            closedMessage: catalog.settings.closedMessage,
            closedTextLarge: catalog.settings.closedTextSizeLarge,
            closedTextSmall: catalog.settings.closedTextSizeSmall,
            closedTextColor: catalog.settings.closedTextColor,
            closedBgType: catalog.settings.closedBgType,
            closedBgColor: catalog.settings.closedBgColor,
            closedBgImage: catalog.settings.closedBgImage,
            closedBoxEnabled: catalog.settings.closedTextBox,
            closedBoxColor: catalog.settings.closedTextBoxColor,
            closedBoxOpacity: catalog.settings.closedTextBoxOpacity,
            closedShowMenuBtn: catalog.settings.closedShowMenuBtn,
            closedMenuBtnBg: catalog.settings.closedMenuBtnBg,
            closedMenuBtnText: catalog.settings.closedMenuBtnText,
          }
        }
      } finally {
        this.loading = false
      }
    },
    async saveSettingsConfig(storeId: string) {
      const backend = useSupabaseBackend()
      this.syncStatus = 'SYNCING'
      try {
        await backend.updateSettings(storeId, {
          phone: this.config.contactPhone,
          whatsapp: this.config.contactWhatsapp,
          qrUrl: this.config.qrUrl,
          qrDotColor: this.config.qrDotColor,
          qrBgColor: this.config.qrBgColor,
          qrDotType: this.config.qrDotType,
          qrCornerType: this.config.qrCornerType,
          closed: this.config.closedIsActive,
          closedMessage: this.config.closedMessage,
          closedTextSizeLarge: this.config.closedTextLarge,
          closedTextSizeSmall: this.config.closedTextSmall,
          closedTextColor: this.config.closedTextColor,
          closedBgType: this.config.closedBgType,
          closedBgColor: this.config.closedBgColor,
          closedBgImage: this.config.closedBgImage,
          closedTextBox: this.config.closedBoxEnabled,
          closedTextBoxColor: this.config.closedBoxColor,
          closedTextBoxOpacity: this.config.closedBoxOpacity,
          closedShowMenuBtn: this.config.closedShowMenuBtn,
          closedMenuBtnBg: this.config.closedMenuBtnBg,
          closedMenuBtnText: this.config.closedMenuBtnText,
        })
        this.syncStatus = 'SUCCESS'
        setTimeout(() => { this.syncStatus = 'IDLE' }, 2000)
      } catch {
        this.syncStatus = 'ERROR'
      }
    },
  },
})
