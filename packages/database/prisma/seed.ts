import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n')

  // 1. Crear usuario Super Admin
  console.log('👤 Creando usuario Super Admin...')
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@projects-saas.com' },
    update: { password: hashedPassword, role: 'super_admin' },
    create: {
      email: 'superadmin@projects-saas.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'super_admin',
    },
  })
  console.log(`   ✅ ${superAdmin.email} (contraseña: admin123)`)

  // 2. Crear usuario demo
  console.log('👤 Creando usuario demo...')
  const demoPassword = await bcrypt.hash('demo123', 10)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@project-saas.com' },
    update: { password: demoPassword, role: 'user' },
    create: {
      email: 'demo@project-saas.com',
      name: 'Demo User',
      password: demoPassword,
      role: 'user',
    },
  })
  console.log(`   ✅ ${demoUser.email} (contraseña: demo123)`)

  // 3. Crear Workspace principal
  console.log('🏢 Creando workspace principal...')
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'system-admin' },
    update: {},
    create: {
      name: 'System Administration',
      slug: 'system-admin',
      plan: 'enterprise',
      color: '#06b6d4',
    },
  })
  console.log(`   ✅ ${workspace.name}`)

  // 4. Crear membresías
  console.log('🔗 Creando membresías...')
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: superAdmin.id } },
    update: { role: 'owner' },
    create: { workspaceId: workspace.id, userId: superAdmin.id, role: 'owner' },
  })
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: demoUser.id } },
    update: { role: 'member' },
    create: { workspaceId: workspace.id, userId: demoUser.id, role: 'member' },
  })
  console.log(`   ✅ Miembros vinculados al workspace`)

  // 5. Crear Space de ejemplo
  console.log('📁 Creando Space de ejemplo...')
  const space = await prisma.space.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'general' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'General',
      slug: 'general',
      description: 'Espacio general del workspace',
      icon: '🌐',
      color: '#8b5cf6',
      position: 0,
    },
  })
  console.log(`   ✅ ${space.name}`)

  // 6. Crear Folder de ejemplo (usando findFirst + create para evitar errores de unique)
  console.log('📂 Creando Folder de ejemplo...')
  let folder = await prisma.folder.findFirst({
    where: { workspaceId: workspace.id, name: 'Proyectos Activos' }
  })
  if (!folder) {
    folder = await prisma.folder.create({
      data: {
        workspaceId: workspace.id,
        spaceId: space.id,
        name: 'Proyectos Activos',
        description: 'Carpetas de proyectos en curso',
        icon: '📁',
        color: '#10b981',
        position: 0,
      },
    })
  }
  console.log(`   ✅ ${folder.name}`)

  // 7. Crear List de ejemplo
  console.log('📋 Creando List de ejemplo...')
  let list = await prisma.list.findFirst({
    where: { workspaceId: workspace.id, name: 'Tareas Pendientes' }
  })
  if (!list) {
    list = await prisma.list.create({
      data: {
        workspaceId: workspace.id,
        spaceId: space.id,
        folderId: folder.id,
        name: 'Tareas Pendientes',
        description: 'Lista de tareas por hacer',
        icon: '✅',
        color: '#f59e0b',
        view: 'kanban',
        position: 0,
      },
    })
  }
  console.log(`   ✅ ${list.name}`)

  // 8. Crear Proyecto de ejemplo
  console.log('🎯 Creando Proyecto de ejemplo...')
  let project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: 'PSK' }
  })
  if (!project) {
    project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Project SaaS Kanban',
        key: 'PSK',
        description: 'Proyecto principal',
        color: '#06b6d4',
        icon: '🚀',
      },
    })
  }
  console.log(`   ✅ ${project.name}`)

  // 9. Crear Tareas de ejemplo
  console.log('📌 Creando tareas de ejemplo...')
  const task1 = await prisma.task.upsert({
    where: { identifier: 'PSK-1' },
    update: {},
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      spaceId: space.id,
      listId: list.id,
      identifier: 'PSK-1',
      title: 'Bienvenido a Project SaaS',
      description: 'Esta es tu primera tarea. ¡Explora todas las funcionalidades!',
      status: 'todo',
      priority: 'high',
      creatorId: superAdmin.id,
      assigneeId: superAdmin.id,
      position: 0,
    },
  })
  console.log(`   ✅ ${task1.identifier}: ${task1.title}`)

  const task2 = await prisma.task.upsert({
    where: { identifier: 'PSK-2' },
    update: {},
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      spaceId: space.id,
      listId: list.id,
      identifier: 'PSK-2',
      title: 'Configurar tu perfil',
      description: 'Actualiza tu nombre, foto y preferencias',
      status: 'in_progress',
      priority: 'medium',
      creatorId: superAdmin.id,
      assigneeId: superAdmin.id,
      position: 1,
    },
  })
  console.log(`   ✅ ${task2.identifier}: ${task2.title}`)

  const task3 = await prisma.task.upsert({
    where: { identifier: 'PSK-3' },
    update: {},
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      spaceId: space.id,
      listId: list.id,
      identifier: 'PSK-3',
      title: 'Invitar a tu equipo',
      description: 'Agrega miembros a tu workspace para colaborar',
      status: 'done',
      priority: 'low',
      creatorId: superAdmin.id,
      completedAt: new Date(),
      position: 2,
    },
  })
  console.log(`   ✅ ${task3.identifier}: ${task3.title}`)

  // 10. Crear comentario de ejemplo
  console.log('💬 Creando comentario de ejemplo...')
  const existingComment = await prisma.comment.findFirst({
    where: { taskId: task1.id, body: { contains: 'Bienvenido' } }
  })
  if (!existingComment) {
    await prisma.comment.create({
      data: {
        taskId: task1.id,
        creatorId: superAdmin.id,
        body: '¡Bienvenido! Este es un comentario de ejemplo. Ahora verás mi nombre en lugar del ID.',
      },
    })
    console.log(`   ✅ Comentario en ${task1.identifier}`)
  }

  // 11. Crear Campo Personalizado de ejemplo
  console.log('🎨 Creando campo personalizado...')
  let customField = await prisma.customField.findFirst({
    where: { workspaceId: workspace.id, name: 'Prioridad Cliente' }
  })
  if (!customField) {
    customField = await prisma.customField.create({
      data: {
        workspaceId: workspace.id,
        name: 'Prioridad Cliente',
        type: 'select',
        options: ['Alta', 'Media', 'Baja'],
        required: false,
        position: 0,
        color: '#ec4899',
      },
    })
  }
  console.log(`   ✅ Campo "${customField.name}"`)

  console.log('\n✨ ¡Seed completado exitosamente!\n')
  console.log('📋 Credenciales para iniciar sesión:')
  console.log('   Super Admin: superadmin@projects-saas.com / admin123')
  console.log('   Demo User:   demo@project-saas.com / demo123')
  console.log('\n🚀 Ahora puedes acceder a http://localhost:3000/login\n')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })