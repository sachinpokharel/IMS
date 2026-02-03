export const useFavicon = () => {
  const { settings } = useSettings();

  const updateFavicon = (faviconUrl: string) => {
    if (!import.meta.client) return;

    try {
      // Find and remove existing favicon links
      const existingLink = document.querySelector('link[rel="icon"]');
      if (existingLink) {
        existingLink.remove();
      }

      // Create and append new favicon link
      const link = document.createElement('link');
      link.rel = 'icon';
      
      // Detect if it's a data URL or file path
      if (faviconUrl.startsWith('data:')) {
        link.type = 'image/x-icon';
      } else if (faviconUrl.endsWith('.svg')) {
        link.type = 'image/svg+xml';
      } else if (faviconUrl.endsWith('.png')) {
        link.type = 'image/png';
      } else if (faviconUrl.endsWith('.ico')) {
        link.type = 'image/x-icon';
      }
      
      link.href = faviconUrl;
      document.head.appendChild(link);
    } catch (e) {
      console.error('Failed to update favicon:', e);
    }
  };

  // Watch for changes in favicon settings
  watch(
    () => settings.value?.company.favicon,
    (newFavicon) => {
      if (newFavicon && newFavicon.trim()) {
        updateFavicon(newFavicon);
      }
    },
    { immediate: true }
  );

  return {
    updateFavicon,
  };
};
