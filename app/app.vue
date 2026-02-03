<script setup lang="ts">
const { settings } = useSettings();
useFavicon(); // Initialize favicon watching

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - ${settings.value?.businessName || 'OpenStock'}` : settings.value?.businessName || 'OpenStock';
  }
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Toast notification system -->
    <ClientOnly>
      <UiToastContainer />
    </ClientOnly>
  </div>
</template>

<style>
/* Global print styles */
@media print {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: white !important;
    color: #000 !important;
  }

  /* Hide non-print elements */
  [data-no-print],
  .no-print {
    display: none !important;
  }

  /* Ensure tables print properly */
  table {
    page-break-inside: avoid;
  }

  tr {
    page-break-inside: avoid;
  }

  /* Page setup */
  @page {
    size: A4;
    margin: 0.5in;
  }
}
</style>
