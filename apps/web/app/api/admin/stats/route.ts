import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    // Métricas básicas
    const [totalUsers, totalWorkspaces, totalOrganizations, totalTasks, totalSpaces] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.organization.count(),
      prisma.task.count(),
      prisma.space.count()
    ]);

    // Tareas por estado
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      _count: true
    });

    const statusMap: any = { todo: 0, in_progress: 0, done: 0 };
    tasksByStatus.forEach(item => {
      if (item.status === 'in_progress') statusMap.in_progress = item._count;
      else if (item.status === 'done') statusMap.done = item._count;
      else statusMap.todo = item._count;
    });

    // Tareas por prioridad
    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
      _count: true
    });

    const priorityMap: any = { low: 0, medium: 0, high: 0, urgent: 0 };
    tasksByPriority.forEach(item => {
      const priority = item.priority || 'medium';
      if (priorityMap[priority] !== undefined) {
        priorityMap[priority] = item._count;
      }
    });

    // Tiempo promedio de finalización (en horas)
    const completedTasks = await prisma.task.findMany({
      where: {
        status: 'done',
        completedAt: { not: null }
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    });

    let averageCompletionTime = 0;
    if (completedTasks.length > 0) {
      const totalHours = completedTasks.reduce((sum, task) => {
        if (task.completedAt) {
          const hours = (task.completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);
      averageCompletionTime = totalHours / completedTasks.length;
    }

    // Tasa de completitud
    const completionRate = totalTasks > 0 ? Math.round((statusMap.done / totalTasks) * 100) : 0;

    // Tareas últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [tasksCreatedLast30Days, tasksCompletedLast30Days] = await Promise.all([
      prisma.task.count({
        where: { createdAt: { gte: thirtyDaysAgo } }
      }),
      prisma.task.count({
        where: {
          status: 'done',
          completedAt: { gte: thirtyDaysAgo }
        }
      })
    ]);

    // Actividad reciente (últimas 10 actividades)
    const recentActivity = await prisma.activity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    return NextResponse.json({
      totalUsers,
      totalWorkspaces,
      totalOrganizations,
      totalTasks,
      totalSpaces,
      tasksByStatus: statusMap,
      tasksByPriority: priorityMap,
      averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
      completionRate,
      tasksCreatedLast30Days,
      tasksCompletedLast30Days,
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        description: `${a.action} ${a.entityType}`,
        user: a.user.name || a.user.email,
        time: new Date(a.createdAt).toLocaleString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))
    });
  } catch (error) {
    console.error("Error en /api/admin/stats:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}