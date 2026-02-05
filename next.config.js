/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    // Importante: Esto permite que el build se complete aunque haya advertencias de código
    // Es esencial para MVPs rápidos donde el código no está 100% limpio de variables sin usar.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
