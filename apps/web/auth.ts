import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth } = NextAuth({
  // ✅ CORREGIDO: Estas propiedades DEBEN estar al nivel raíz, fuera de "providers"
  trustHost: true, 
  url: process.env.AUTH_URL || process.env.NEXTAUTH_URL,

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log(" [AUTH] Intentando login con:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ [AUTH] Credenciales faltantes");
          return null;
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
          
          if (!user) {
            console.log(" [AUTH] Usuario NO encontrado en la BD:", credentials.email);
            return null;
          }
          
          console.log("✅ [AUTH] Usuario encontrado:", user.email);
          
          if (!user.password) {
            console.log("❌ [AUTH] El usuario no tiene contraseña guardada");
            return null;
          }
          
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          
          console.log("🔑 [AUTH] ¿Contraseña válida?:", isValid);
          
          if (!isValid) {
            console.log("❌ [AUTH] La contraseña no coincide con el hash");
            return null;
          }
          
          console.log("🎉 [AUTH] Login exitoso para:", user.email);
          
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || "Usuario",
            role: user.role || "user"
          };
        } catch (error) {
          console.error("💥 [AUTH] Error crítico en authorize:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.id) {
        token.sub = user.id.toString();
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Permite redirecciones relativas o a la URL base configurada
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
});