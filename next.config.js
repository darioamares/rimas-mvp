/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // 1. ESTO ES CLAVE: Desactiva mapas de fuente para ahorrar mucha RAM
  productionBrowserSourceMaps: false, 
  eslint: {
    // 2. Ignora cualquier queja de estilo
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 3. Ignora errores de tipos
    ignoreBuildErrors: true,
  },
  images: {
    // 4. No pierdas tiempo optimizando imágenes
    unoptimized: true,
  },
  experimental: {
    // 5. Fuerza bruta: usa menos procesos paralelos para no explotar la memoria
    webpackBuildWorker: false,
  },
}

module.exports = nextConfig
