import './globals.css'
import { AuthContextProvider } from '../context/AuthContext';

export const metadata = {
  title: 'Rimas MVP - Master Station',
  description: 'Estación de batalla de freestyle profesional',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </body>
    </html>
  )
}
