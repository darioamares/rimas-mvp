import { Inter } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "../context/AuthContext"; // Importar el contexto

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Rimas MVP",
  description: "Plataforma de Freestyle",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </body>
    </html>
  );
}
