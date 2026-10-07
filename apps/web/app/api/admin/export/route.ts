import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    // ✅ Ejecutar las 3 consultas necesarias en paralelo
    const [organizations, users, workspaceMembers] = await Promise.all([
      // 1. Organizaciones con toda su jerarquía anidada
      prisma.organization.findMany({
        include: {
          workspaces: {
            include: {
              spaces: {
                include: {
                  folders: {
                    include: {
                      lists: {
                        include: {
                          tasks: {
                            include: {
                              assignee: { select: { id: true, name: true, email: true } },
                              creator: { select: { id: true, name: true, email: true } }
                            }
                          }
                        }
                      }
                    }
                  },
                  lists: {
                    include: {
                      tasks: {
                        include: {
                          assignee: { select: { id: true, name: true, email: true } },
                          creator: { select: { id: true, name: true, email: true } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      // 2. Usuarios del sistema
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      }),
      // 3. Membresías de workspaces
      prisma.workspaceMember.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          workspace: { select: { id: true, name: true } }
        }
      })
    ]);

    // ✅ Estructura del respaldo
    const backupData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      exportedBy: session.user.email,
      data: {
        organizations,
        users,
        workspaceMembers
      }
    };

    return NextResponse.json(backupData);
  } catch (error: any) {
    console.error("Error exporting data:", error);
    return NextResponse.json({ error: error.message || "Error interno al exportar" }, { status: 500 });
  }
}