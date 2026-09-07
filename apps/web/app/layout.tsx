import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gestion de tareas",
  description: "Gestiona tus tareas con estilo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" style={{ overflow: "hidden", height: "100dvh" }}>
      <body 
        className={`${inter.className} bg-[#0b0f19] text-gray-100 antialiased overflow-hidden`}
        style={{ height: "100dvh", margin: 0, padding: 0 }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}