import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. Validar la sesión del administrador
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    // ✅ CORREGIDO: Consultar el modelo User para verificar el rol global (superadmin)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== "superadmin") {
      return new NextResponse("Acceso prohibido: Se requiere rol de superadmin", { status: 403 });
    }

    let backupJson: any = null;
    const contentType = request.headers.get("content-type") || "";

    // 2. Extracción híbrida de datos
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("backupFile") as File;
      if (!file) {
        return NextResponse.json({ error: "Archivo no proporcionado" }, { status: 400 });
      }
      const text = await file.text();
      backupJson = JSON.parse(text);
    } else {
      backupJson = await request.json();
    }

    const dataContainer = backupJson.data ? backupJson.data : backupJson;
    const { users, workspaces, workspaceMembers, projects, cycles, tasks } = dataContainer;

    if (!users || !workspaces) {
      return NextResponse.json({ error: "Formato de respaldo inválido" }, { status: 400 });
    }

    // 3. Transacción ordenada para evitar errores de llaves foráneas
    await prisma.$transaction(async (tx: any) => {
      
      // 1️⃣ Usuarios
      for (const u of users) {
        await tx.user.upsert({
          where: { id: u.id },
          update: { name: u.name, email: u.email, password: u.password },
          create: { id: u.id, name: u.name, email: u.email, password: u.password, createdAt: new Date(u.createdAt) },
        });
      }

      // 2️⃣ Workspaces
      for (const ws of workspaces) {
        await tx.workspace.upsert({
          where: { id: ws.id },
          update: { name: ws.name, slug: ws.slug, plan: ws.plan },
          create: { id: ws.id, name: ws.name, slug: ws.slug, plan: ws.plan, createdAt: new Date(ws.createdAt) },
        });
      }

      // 3️⃣ Workspace Members
      if (workspaceMembers) {
        for (const mb of workspaceMembers) {
          await tx.workspaceMember.upsert({
            where: { id: mb.id },
            update: { role: mb.role },
            create: { id: mb.id, userId: mb.userId, workspaceId: mb.workspaceId, role: mb.role },
          });
        }
      }

      // 4️⃣ Proyectos (Necesarios antes de las tareas)
      if (projects) {
        for (const p of projects) {
          await tx.project.upsert({
            where: { id: p.id },
            update: { name: p.name, key: p.key, description: p.description, color: p.color },
            create: { 
              id: p.id, 
              workspaceId: p.workspaceId, 
              name: p.name, 
              key: p.key || "PROJ", 
              description: p.description, 
              color: p.color 
            },
          });
        }
      }

      // 5️⃣ Ciclos / Sprints (Necesarios antes de las tareas si están vinculados)
      if (cycles) {
        for (const c of cycles) {
          await tx.cycle.upsert({
            where: { id: c.id },
            update: { name: c.name, status: c.status },
            create: { 
              id: c.id, 
              projectId: c.projectId, 
              number: c.number || 1, 
              name: c.name, 
              status: c.status || "active" 
            },
          });
        }
      }

      // 6️⃣ Tareas (Con todos los campos relacionales posibles)
      if (tasks) {
        for (const tk of tasks) {
          await tx.task.upsert({
            where: { id: tk.id },
            update: { 
              title: tk.title, 
              description: tk.description, 
              status: tk.status, 
              priority: tk.priority 
            },
            create: {
              id: tk.id,
              workspaceId: tk.workspaceId,
              projectId: tk.projectId,
              cycleId: tk.cycleId || null,
              identifier: tk.identifier || `TASK-${tk.id.slice(0, 4)}`,
              title: tk.title,
              description: tk.description,
              status: tk.status,
              priority: tk.priority || 0,
              creatorId: tk.creatorId,
              assigneeId: tk.assigneeId || null,
              createdAt: new Date(tk.createdAt || Date.now()),
            },
          });
        }
      }
    }, {
      timeout: 15000 // Aumentamos el timeout a 15s por si el volumen de datos es grande
    });

    return NextResponse.json({ message: "Respaldo restaurado exitosamente" }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error en la transacción de restauración:", error);
    return NextResponse.json({ error: "Error al procesar la base de datos", details: error.message }, { status: 500 });
  }
}