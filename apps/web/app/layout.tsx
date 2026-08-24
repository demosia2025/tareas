import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project SaaS Kanban",
  description: "Gestiona tus tareas con estilo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-[#0b0f19] text-gray-100 min-h-screen flex flex-col antialiased overflow-x-hidden`}>
        <Providers>
          <main className="flex-1 flex flex-col w-full overflow-y-auto">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}