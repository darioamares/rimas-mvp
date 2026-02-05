/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    // Ignora errores de estilo durante el despliegue
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora errores de tipo (incluso en archivos JS) durante el despliegue
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
