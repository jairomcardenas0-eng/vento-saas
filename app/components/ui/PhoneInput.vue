<template>
  <div class="phone-input" :class="{ 'is-open': open }">
    <button
      type="button"
      class="phone-country"
      @click="toggle"
    >
      <img :src="flagUrl(selected.code)" :alt="selected.name" class="phone-flag" loading="lazy" />
      <span class="phone-dial">+{{ selected.dial }}</span>
      <svg class="phone-chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <input
      ref="numberRef"
      :value="localNumber"
      type="tel"
      inputmode="tel"
      class="phone-number"
      :placeholder="placeholder"
      @input="onNumberInput(($event.target as HTMLInputElement).value)"
    />

    <div v-if="open" class="phone-overlay" @click.stop="open = false" />

    <div v-if="open" class="phone-menu">
      <div class="phone-search">
        <input
          ref="searchRef"
          v-model="search"
          type="text"
          placeholder="Buscar país..."
          @keydown.escape="open = false"
        />
      </div>
      <div class="phone-list">
        <button
          v-for="country in filtered"
          :key="country.code"
          type="button"
          class="phone-option"
          :class="{ active: country.code === selected.code }"
          @click="pick(country)"
        >
          <img :src="flagUrl(country.code)" :alt="country.name" class="phone-flag" loading="lazy" />
          <span class="phone-option-name">{{ country.name }}</span>
          <span class="phone-option-dial">+{{ country.dial }}</span>
        </button>
        <p v-if="!filtered.length" class="phone-empty">Sin resultados</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { COUNTRY_CODES, type CountryCode } from '~/data/countryCodes'

interface Props {
  modelValue: string
  placeholder?: string
  defaultCountry?: string
}
const props = withDefaults(defineProps<Props>(), {
  placeholder: '555 123 4567',
  defaultCountry: 'MX',
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const search = ref('')
const searchRef = ref<HTMLInputElement | null>(null)
const numberRef = ref<HTMLInputElement | null>(null)

const fallback = computed<CountryCode>(() =>
  COUNTRY_CODES.find(c => c.code === props.defaultCountry) || COUNTRY_CODES[0]!,
)

const parse = (raw: string): { country: CountryCode, number: string } => {
  const clean = (raw || '').replace(/\s+/g, '').replace(/^(\+|00)/, '')
  if (!clean) return { country: fallback.value, number: '' }
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (clean.startsWith(c.dial)) {
      return { country: c, number: clean.slice(c.dial.length) }
    }
  }
  return { country: fallback.value, number: clean }
}

const selected = ref<CountryCode>(parse(props.modelValue).country)
const localNumber = ref<string>(parse(props.modelValue).number)

watch(
  () => props.modelValue,
  (val) => {
    const parsed = parse(val)
    if (parsed.country.code !== selected.value.code) selected.value = parsed.country
    if (parsed.number !== localNumber.value) localNumber.value = parsed.number
  },
)

const emitValue = () => {
  const digits = localNumber.value.replace(/[^\d]/g, '')
  emit('update:modelValue', digits ? `+${selected.value.dial}${digits}` : '')
}

const onNumberInput = (value: string) => {
  localNumber.value = value.replace(/[^\d\s]/g, '')
  emitValue()
}

const pick = (country: CountryCode) => {
  selected.value = country
  open.value = false
  search.value = ''
  emitValue()
  nextTick(() => numberRef.value?.focus())
}

const toggle = async () => {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    searchRef.value?.focus()
  }
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return COUNTRY_CODES
  return COUNTRY_CODES.filter(
    c => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
  )
})

const flagUrl = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`
</script>

<style scoped>
.phone-input {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(161, 161, 170, 0.35);
  background: #fff;
  overflow: visible;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.phone-input:focus-within {
  border-color: #18181b;
  box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.08);
}
.dark .phone-input {
  background: #09090b;
  border-color: rgba(82, 82, 91, 0.55);
}
.dark .phone-input:focus-within {
  border-color: #e4e4e7;
  box-shadow: 0 0 0 3px rgba(228, 228, 231, 0.1);
}

.phone-country {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.75rem;
  background: transparent;
  border: none;
  border-right: 1px solid rgba(161, 161, 170, 0.25);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: #27272a;
  min-width: 92px;
}
.dark .phone-country {
  color: #e4e4e7;
  border-right-color: rgba(82, 82, 91, 0.45);
}
.phone-country:hover { background: rgba(244, 244, 245, 0.7); }
.dark .phone-country:hover { background: rgba(39, 39, 42, 0.6); }

.phone-flag {
  width: 20px;
  height: 15px;
  border-radius: 2px;
  object-fit: cover;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
}
.phone-dial { font-variant-numeric: tabular-nums; }
.phone-chevron { width: 14px; height: 14px; opacity: 0.6; }

.phone-number {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0 0.9rem;
  font-size: 0.95rem;
  color: inherit;
  outline: none;
  min-width: 0;
}

.phone-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: transparent;
}

.phone-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 50;
  border-radius: 18px;
  border: 1px solid rgba(161, 161, 170, 0.3);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(10px);
  max-height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dark .phone-menu {
  background: rgba(9, 9, 11, 0.96);
  border-color: rgba(63, 63, 70, 0.6);
}

.phone-search {
  padding: 0.6rem 0.6rem 0.3rem;
  border-bottom: 1px solid rgba(161, 161, 170, 0.18);
}
.phone-search input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(161, 161, 170, 0.3);
  padding: 0.55rem 0.75rem;
  background: rgba(250, 250, 250, 0.9);
  font-size: 0.88rem;
  outline: none;
}
.dark .phone-search input {
  background: rgba(24, 24, 27, 0.7);
  border-color: rgba(63, 63, 70, 0.6);
  color: #e4e4e7;
}

.phone-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem;
}

.phone-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.88rem;
  color: #27272a;
}
.phone-option:hover { background: rgba(244, 244, 245, 0.9); }
.phone-option.active { background: rgba(24, 24, 27, 0.08); font-weight: 600; }
.dark .phone-option { color: #e4e4e7; }
.dark .phone-option:hover { background: rgba(39, 39, 42, 0.6); }
.dark .phone-option.active { background: rgba(228, 228, 231, 0.12); }

.phone-option-name { flex: 1; }
.phone-option-dial { color: #71717a; font-variant-numeric: tabular-nums; }
.dark .phone-option-dial { color: #a1a1aa; }

.phone-empty {
  text-align: center;
  padding: 1.5rem 0;
  color: #a1a1aa;
  font-size: 0.88rem;
}
</style>
