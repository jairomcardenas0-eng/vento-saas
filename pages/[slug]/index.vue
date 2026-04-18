<script setup lang="ts">
const route = useRoute()

await navigateTo(`/b/${String(route.params.slug || '')}`, {
  redirectCode: 301,
})
</script>
