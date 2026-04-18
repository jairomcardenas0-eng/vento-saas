<template>
  <div class="rounded-[24px] border border-zinc-200 bg-white shadow-sm p-5 dark:border-zinc-800 dark:bg-zinc-950">
    <div class="mb-5">
      <h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-100">Dirección</h3>
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Selecciona la ubicación exacta de tu negocio para activar las zonas de entrega y cálculo de distancias.</p>
    </div>

    <!-- Cascading Selects -->
    <div class="grid gap-3 mb-4">
      <div class="grid sm:grid-cols-2 gap-3">
        <!-- Country -->
        <select
          v-model="internalData.countryCode"
          class="w-full rounded-[14px] border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[15px] font-medium outline-none transition focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-100"
          @change="onCountryChange"
        >
          <option value="">- País -</option>
          <option v-for="country in countries" :key="country.isoCode" :value="country.isoCode">
            {{ country.name }}
          </option>
        </select>

        <!-- State -->
        <select
          v-model="internalData.stateCode"
          :disabled="!internalData.countryCode"
          class="w-full rounded-[14px] border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[15px] font-medium outline-none transition focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-100"
          @change="onStateChange"
        >
          <option value="">- Estado/Provincia -</option>
          <option v-for="state in states" :key="state.isoCode" :value="state.isoCode">
            {{ state.name }}
          </option>
        </select>
      </div>

      <!-- City -->
      <select
        v-model="internalData.city"
        :disabled="!internalData.stateCode"
        class="w-full rounded-[14px] border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[15px] font-medium outline-none transition focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-100"
        @change="onCityChange"
      >
        <option value="">- Municipio/Localidad -</option>
        <option v-for="city in cities" :key="city.name" :value="city.name">
          {{ city.name }}
        </option>
      </select>
    </div>

    <!-- Address Details -->
    <div class="mb-6">
      <textarea
        v-model="internalData.details"
        rows="3"
        placeholder="Calle, número, barrio..."
        class="w-full resize-none rounded-[16px] border border-zinc-200 bg-zinc-50 p-4 text-[15px] outline-none transition focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-100"
        @input="emitUpdate"
      ></textarea>
    </div>

    <!-- Map -->
    <client-only>
      <div v-if="mapReady && LMap && LTileLayer && LMarker">
        <h4 class="mb-3 text-[15px] font-bold text-zinc-900 dark:text-zinc-100">Fija la posición exacta</h4>
        <div class="overflow-hidden rounded-xl border border-zinc-200 shadow-md dark:border-zinc-800 relative z-0">
          <component
            :is="LMap"
            ref="mapView"
            v-model:zoom="zoom"
            :center="center"
            style="height: 300px; width: 100%"
            :use-global-leaflet="false"
          >
            <component
              :is="LTileLayer"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              layer-type="base"
              name="OpenStreetMap"
              attribution="&copy; OpenStreetMap contributors"
            ></component>
            <component
              :is="LMarker"
              :lat-lng="markerPosition"
              draggable
              @update:lat-lng="onMarkerDrag"
            ></component>
          </component>
        </div>
        <p class="mt-3 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          Coordenadas: {{ markerPosition[0].toFixed(6) }}, {{ markerPosition[1].toFixed(6) }}
        </p>
      </div>
    </client-only>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, shallowRef } from 'vue'
import { Country, State, City } from 'country-state-city'
import 'leaflet/dist/leaflet.css'

// Vue Leaflet imports need to be dynamic or under client-only to avoid SSR issues with 'window'
const props = defineProps<{
  modelValue: {
    countryCode: string
    stateCode: string
    city: string
    details: string
    lat: number
    lng: number
  }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
}>()

const internalData = ref({ ...props.modelValue })
const LMap = shallowRef()
const LTileLayer = shallowRef()
const LMarker = shallowRef()

const countries = ref(Country.getAllCountries())

const states = computed(() => {
  return internalData.value.countryCode
    ? State.getStatesOfCountry(internalData.value.countryCode)
    : []
})

const cities = computed(() => {
  return internalData.value.countryCode && internalData.value.stateCode
    ? City.getCitiesOfState(internalData.value.countryCode, internalData.value.stateCode)
    : []
})

const mapReady = ref(false)
const zoom = ref(2)
const center = ref<[number, number]>([23.6345, -102.5528]) // Default Mexico approx
const markerPosition = ref<[number, number]>([23.6345, -102.5528])

onMounted(async () => {
  const [{ LMap: LeafletMap, LTileLayer: LeafletTileLayer, LMarker: LeafletMarker }, L] = await Promise.all([
    import('@vue-leaflet/vue-leaflet'),
    import('leaflet'),
  ])

  // Fix default Leaflet marker icons not loading correctly in Nuxt/Vite
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })

  LMap.value = LeafletMap
  LTileLayer.value = LeafletTileLayer
  LMarker.value = LeafletMarker

  if (internalData.value.lat && internalData.value.lng) {
    center.value = [internalData.value.lat, internalData.value.lng]
    markerPosition.value = [internalData.value.lat, internalData.value.lng]
    zoom.value = 15
  }
  mapReady.value = true
})

const emitUpdate = () => {
  emit('update:modelValue', { ...internalData.value })
}

const updateMapFromLocation = (lat?: string | number, lng?: string | number, newZoom = 5) => {
  if (lat && lng) {
    const parsedLat = Number(lat)
    const parsedLng = Number(lng)
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      center.value = [parsedLat, parsedLng]
      markerPosition.value = [parsedLat, parsedLng]
      internalData.value.lat = parsedLat
      internalData.value.lng = parsedLng
      zoom.value = newZoom
      emitUpdate()
    }
  }
}

const geocodeLocation = async (query: string, zoomLevel = 10) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
    const data = await response.json()
    if (data && data[0]) {
      const lat = Number(data[0].lat)
      const lon = Number(data[0].lon)
      if (!isNaN(lat) && !isNaN(lon)) {
        updateMapFromLocation(lat, lon, zoomLevel)
        return true
      }
    }
  } catch (err) {
    console.error('Geocoding error:', err)
  }
  return false
}

const onCountryChange = async () => {
  internalData.value.stateCode = ''
  internalData.value.city = ''
  const c = Country.getCountryByCode(internalData.value.countryCode)
  if (c && c.latitude && c.longitude) {
    updateMapFromLocation(c.latitude, c.longitude, 5)
  } else if (c) {
    // Fallback to geocoding if library has no coordinates
    await geocodeLocation(c.name, 5)
  } else {
    emitUpdate()
  }
}

const onStateChange = async () => {
  internalData.value.city = ''
  const s = State.getStateByCodeAndCountry(internalData.value.stateCode, internalData.value.countryCode)
  if (s && s.latitude && s.longitude) {
    updateMapFromLocation(s.latitude, s.longitude, 7)
  } else if (s) {
    // Fallback to geocoding with country context
    const c = Country.getCountryByCode(internalData.value.countryCode)
    const query = c ? `${s.name}, ${c.name}` : s.name
    await geocodeLocation(query, 7)
  } else {
    emitUpdate()
  }
}

const onCityChange = async () => {
  const matchedCity = cities.value.find((c) => c.name === internalData.value.city)
  if (matchedCity && matchedCity.latitude && matchedCity.longitude) {
    updateMapFromLocation(matchedCity.latitude, matchedCity.longitude, 10)
  } else if (matchedCity) {
    // Fallback to geocoding with full address context
    const s = State.getStateByCodeAndCountry(internalData.value.stateCode, internalData.value.countryCode)
    const c = Country.getCountryByCode(internalData.value.countryCode)
    const query = c ? `${matchedCity.name}, ${s?.name}, ${c.name}` : `${matchedCity.name}, ${s?.name}`
    await geocodeLocation(query, 10)
  } else {
    emitUpdate()
  }
}

const onMarkerDrag = (event: any) => {
  const { lat, lng } = event
  markerPosition.value = [lat, lng]
  internalData.value.lat = lat
  internalData.value.lng = lng
  emitUpdate()
}

// Watchers for incoming external changes if needed
watch(() => props.modelValue, (newVal) => {
  // Solo updateamos si hay un desfase significativo para evitar loops
  if (
    newVal.countryCode !== internalData.value.countryCode ||
    newVal.stateCode !== internalData.value.stateCode ||
    newVal.city !== internalData.value.city ||
    newVal.details !== internalData.value.details ||
    newVal.lat !== internalData.value.lat ||
    newVal.lng !== internalData.value.lng
  ) {
    internalData.value = { ...newVal }
  }
}, { deep: true })
</script>

<style>
/* Solucion rápida si Leaflet se esconde bajo otros elementos */
.leaflet-container {
  z-index: 10 !important;
}
</style>
