import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) return null;
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          if (!isValid) return null;
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
    // ✅ CORREGIDO: Siempre consultar la BD para obtener el rol actualizado
    async jwt({ token, user }) {
      // En login inicial: asignar datos del usuario
      if (user && user.id) {
        token.sub = user.id.toString();
        token.email = user.email;
        token.name = user.name;
      }

      // ✅ CLAVE: Siempre consultar la BD para obtener el rol actualizado
      // Esto asegura que si el rol cambia en la BD, el token se actualice
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: { 
              id: true, 
              email: true, 
              name: true, 
              role: true 
            }
          });
          if (dbUser) {
            token.role = dbUser.role || "user";
            token.email = dbUser.email;
            token.name = dbUser.name;
          }
        } catch (error) {
          console.error("⚠️ [AUTH] Error al refrescar datos del usuario:", error);
          // Mantener el rol anterior si hay error
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).email = token.email;
        (session.user as any).name = token.name;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
};

const nextAuth = NextAuth(authConfig);
export const { handlers, auth, signIn, signOut }: any = nextAuth;