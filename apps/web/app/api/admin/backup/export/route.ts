import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "superadmin" && user?.role !== "admin") {
  return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
}

    // Obtener todos los datos de forma segura
    const [users, workspaces, tasks] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      }),
      prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true
        }
      }),
      prisma.task.findMany({
        select: {
          id: true,
          identifier: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true
        }
      })
    ])

    // Intentar obtener organizaciones si existen
   let organizations: any[] = [];    try {
      // @ts-ignore
      organizations = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true
        }
      })
    } catch (e) {
      console.log("️ El modelo Organization no existe, se omite en el backup")
    }

    const backup = {
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.email,
      data: {
        users,
        workspaces,
        organizations,
        tasks
      }
    }

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().split("T")[0]}.json"`
      }
    })
  } catch (error: any) {
    console.error("Error exportando backup:", error)
    return NextResponse.json({ 
      error: `Error al exportar backup: ${error.message}` 
    }, { status: 500 })
  }
}
