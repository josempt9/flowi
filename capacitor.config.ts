import type { CapacitorConfig } from '@capacitor/cli';

// Flowi se empaqueta como un WebView que carga el sitio hospedado (Vercel).
// Así funcionan TODAS las features de servidor (IA, OAuth, auth) sin export estático.
//
// IMPORTANTE: cambia `server.url` por la URL real de tu deploy de Vercel.
// Requiere que el sitio esté desplegado y en línea.
const config: CapacitorConfig = {
  appId: 'com.flowi.app',
  appName: 'Flowi',
  webDir: 'www', // shell de fallback local (ver www/index.html)
  server: {
    url: 'https://flowi-joy7.vercel.app',
    cleartext: false,
  },
};

export default config;
