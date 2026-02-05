import './globals.css'

export const metadata = {
  title: 'Rimas MVP - Master Station',
  description: 'Estación de batalla de freestyle profesional',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
