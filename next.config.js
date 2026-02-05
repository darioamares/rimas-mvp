/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    // Ignora errores de estilo durante el despliegue
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora errores de tipo durante el despliegue
    ignoreBuildErrors: true,
  },
  // Desactivamos la optimización de imágenes para que el build no se cuelgue
  images: {
    unoptimized: true,
  },
  // Desactivamos el minificador SWC si el build se queda "congelado"
  // Esto hace que el proceso sea más simple y directo
  swcMinify: false,
}

module.exports = nextConfig
