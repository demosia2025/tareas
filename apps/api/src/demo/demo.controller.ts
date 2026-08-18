import { Controller, Get } from '@nestjs/common';
import { prisma } from '../prisma';

@Controller('api')
export class DemoController {
  @Get('demo-ids')
  async getDemoIds() {
    // 1. Buscar o crear el workspace demo
    let workspace = await prisma.workspace.findUnique({
      where: { slug: 'demo-workspace' },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: crypto.randomUUID(),
          name: 'Demo Workspace',
          slug: 'demo-workspace',
          plan: 'free',
        },
      });
    }

    // 2. Buscar o crear el proyecto demo
    let project = await prisma.project.findFirst({
      where: { workspaceId: workspace.id, key: 'DEMO' },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId: workspace.id,
          name: 'Demo Project',
          key: 'DEMO',
        },
      });
    }

    // 3. Buscar o crear el usuario demo
    let user = await prisma.user.findUnique({
      where: { email: 'demo@example.com' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: 'demo@example.com',
          name: 'Demo User',
        },
      });
    }

    // 4. Retornar SOLO los UUIDs reales
    return {
      workspaceId: workspace.id,
      projectId: project.id,
      creatorId: user.id,
    };
  }
}