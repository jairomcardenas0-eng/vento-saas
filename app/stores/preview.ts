import { defineStore } from 'pinia'
import type { CatalogOperationalSettings, CatalogThemeSettings } from '~/types/catalog'

export const usePreviewStore = defineStore('preview', {
  state: () => ({
    open: false,
    settingsOverride: null as Partial<CatalogOperationalSettings> | null,
    themeOverride: null as Partial<CatalogThemeSettings> | null,
  }),
  actions: {
    setSettings(override: Partial<CatalogOperationalSettings> | null) {
      this.settingsOverride = override
    },
    setTheme(override: Partial<CatalogThemeSettings> | null) {
      this.themeOverride = override
    },
    openPreview() {
      this.open = true
    },
    closePreview() {
      this.open = false
    },
  },
})
