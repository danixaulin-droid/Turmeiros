import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",

  // ✅ melhora MUITO o offline no App Router
  cacheStartUrl: true,
  cacheOnFrontendNav: true,

  // ✅ App Router offline fallback
  fallbacks: {
    document: "/~offline",
  },

  // ✅ faz o SW assumir controle sem precisar “reabrir”
  extendDefaultRuntimeCaching: true,

  workboxOptions: {
    clientsClaim: true,
    skipWaiting: true,

    // ✅ pré-cache de rotas principais (app shell)
    additionalManifestEntries: [
      { url: "/", revision: null },
      { url: "/day/new", revision: null },
      { url: "/week", revision: null },
      { url: "/settings", revision: null },
      { url: "/~offline", revision: null },
    ],

    runtimeCaching: [
      // ✅ NEXT STATIC (essencial)
      {
        urlPattern: /^\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      // ✅ NEXT DATA (quando existir)
      {
        urlPattern: /^\/_next\/data\/.*\/.*\.json$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-data",
          expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      // ✅ Assets do /public
      {
        urlPattern: /^\/(icons\/.*|manifest\.json|favicon\.ico).*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "public-assets",
          expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      // ✅ Navegação: melhor estratégia pra app offline é StaleWhileRevalidate
      // (evita cair no offline quando o cache já existe)
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      // ✅ Fonts externas
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 16, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      // ✅ Fontes locais
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: { maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      // ✅ Imagens
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: { maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      // ✅ CSS
      {
        urlPattern: /\.(?:css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-style-assets",
          expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

export default pwaConfig(nextConfig);
