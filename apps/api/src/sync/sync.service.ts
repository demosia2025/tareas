import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '../prisma';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  private normalizePriority(priority: any): string {
    if (typeof priority === 'string') return priority;
    if (priority === 0) return 'low';
    if (priority === 1 || priority === 2) return 'medium';
    if (priority === 3) return 'high';
    if (priority === 4) return 'urgent';
    return 'medium';
  }

  private toDate(value: any): Date {
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const numValue = Number(value);
      if (!isNaN(numValue)) return new Date(numValue);
    }
    return new Date();
  }

  private async getValidCreatorId(workspaceId: string): Promise<string> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'demo@project-saas.com' },
          { email: 'demo@example.com' },
        ],
      },
    });

    if (user) return user.id;

    const newUser = await prisma.user.create({
      data: { email: 'demo@project-saas.com', name: 'Demo User' },
    });
    this.logger.log(`✅ Usuario demo creado: ${newUser.id}`);
    return newUser.id;
  }

  private async getValidProjectId(workspaceId: string): Promise<string> {
    let project = await prisma.project.findFirst({ where: { workspaceId } });
    if (!project) {
      project = await prisma.project.create({
        data: { workspaceId, name: 'Demo Project', key: 'DEMO' },
      });
      this.logger.log(`✅ Proyecto demo creado: ${project.id}`);
    }
    return project.id;
  }

  private async getRealWorkspaceId(workspaceSlugOrId: string): Promise<string | null> {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceSlugOrId)) {
      return workspaceSlugOrId;
    }
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlugOrId } });
    return workspace?.id || null;
  }

  async processPush(mutations: any[], clientGroupID: string, workspaceSlug: string) {
    this.logger.log(`🔄 Procesando ${mutations.length} mutaciones...`);

    const realWorkspaceId = await this.getRealWorkspaceId(workspaceSlug);
    if (!realWorkspaceId) {
      this.logger.error(`❌ Workspace '${workspaceSlug}' no existe en la BD`);
      return { success: false };
    }

    const validCreatorId = await this.getValidCreatorId(realWorkspaceId);
    const validProjectId = await this.getValidProjectId(realWorkspaceId);

    let maxMutationId = 0;

    for (const mutation of mutations) {
      const { id, name, args } = mutation;
      if (id > maxMutationId) maxMutationId = id;

      try {
        switch (name) {
          // ==================== TASKS ====================
          case 'createTask': {
            const safeTitle = (args.title && args.title.trim() !== '') ? args.title : `Tarea ${args.identifier || Date.now()}`;
            await prisma.task.upsert({
              where: { id: args.id },
              update: {
                title: safeTitle,
                status: args.status || 'todo',
                priority: this.normalizePriority(args.priority ?? 2),
                dueDate: args.dueDate ? new Date(args.dueDate) : null,
                customAttributes: args.customAttributes || {},
                updatedAt: this.toDate(args.updatedAt),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                projectId: validProjectId,
                identifier: args.identifier || `TASK-${Date.now()}`,
                title: safeTitle,
                status: args.status || 'todo',
                priority: this.normalizePriority(args.priority ?? 2),
                dueDate: args.dueDate ? new Date(args.dueDate) : null,
                creatorId: validCreatorId,
                customAttributes: args.customAttributes || {},
                createdAt: this.toDate(args.createdAt),
                updatedAt: this.toDate(args.updatedAt),
              },
            });
            this.logger.log(`✅ Tarea creada: ${args.identifier || args.id}`);
            break;
          }

          case 'updateTask': {
            const safeTitle = (args.title && args.title.trim() !== '') ? args.title : undefined;
            await prisma.task.upsert({
              where: { id: args.id },
              update: {
                ...(safeTitle && { title: safeTitle }),
                ...(args.status && { status: args.status }),
                ...(args.priority !== undefined && { priority: this.normalizePriority(args.priority) }),
                ...(args.dueDate !== undefined && { dueDate: args.dueDate ? new Date(args.dueDate) : null }),
                ...(args.customAttributes !== undefined && { customAttributes: args.customAttributes }),
                updatedAt: new Date(),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                projectId: validProjectId,
                identifier: args.identifier || `TASK-${Date.now()}`,
                title: safeTitle || 'Tarea sin título',
                status: args.status || 'todo',
                priority: this.normalizePriority(args.priority ?? 2),
                dueDate: args.dueDate ? new Date(args.dueDate) : null,
                creatorId: validCreatorId,
                customAttributes: args.customAttributes || {},
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
            this.logger.log(`✏️ Tarea actualizada: ${args.id}`);
            break;
          }

          case 'deleteTask':
            try {
              await prisma.task.delete({ where: { id: args.id } });
              this.logger.log(`🗑️ Tarea eliminada: ${args.id}`);
            } catch (e) {
              this.logger.warn(`⚠️ Tarea no encontrada: ${args.id}`);
            }
            break;

          // ==================== SPACES (NUEVO) ====================
          case 'createSpace': {
            const slug = (args.name || 'space').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            await prisma.space.upsert({
              where: { id: args.id },
              update: {
                name: args.name,
                description: args.description,
                icon: args.icon,
                color: args.color,
                position: args.position || 0,
                updatedAt: new Date(),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                name: args.name || 'Nuevo Espacio',
                slug,
                description: args.description || null,
                icon: args.icon || null,
                color: args.color || '#8b5cf6',
                position: args.position || 0,
              },
            });
            this.logger.log(`✅ Space creado: ${args.name}`);
            break;
          }

          case 'updateSpace':
            await prisma.space.upsert({
              where: { id: args.id },
              update: {
                ...(args.name && { name: args.name }),
                ...(args.description !== undefined && { description: args.description }),
                ...(args.icon !== undefined && { icon: args.icon }),
                ...(args.color !== undefined && { color: args.color }),
                ...(args.position !== undefined && { position: args.position }),
                updatedAt: new Date(),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                name: args.name || 'Space',
                slug: args.slug || 'space',
              },
            });
            this.logger.log(`✏️ Space actualizado: ${args.id}`);
            break;

          case 'deleteSpace':
            try {
              await prisma.space.delete({ where: { id: args.id } });
              this.logger.log(`🗑️ Space eliminado: ${args.id}`);
            } catch (e) {
              this.logger.warn(`⚠️ Space no encontrado: ${args.id}`);
            }
            break;

          // ==================== FOLDERS (NUEVO) ====================
          case 'createFolder': {
            await prisma.folder.upsert({
              where: { id: args.id },
              update: {
                name: args.name,
                description: args.description,
                icon: args.icon,
                color: args.color,
                position: args.position || 0,
                updatedAt: new Date(),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                spaceId: args.spaceId || null,
                name: args.name || 'Nueva Carpeta',
                description: args.description || null,
                icon: args.icon || null,
                color: args.color || null,
                position: args.position || 0,
              },
            });
            this.logger.log(`✅ Folder creado: ${args.name}`);
            break;
          }

          case 'updateFolder':
            await prisma.folder.upsert({
              where: { id: args.id },
              update: {
                ...(args.name && { name: args.name }),
                ...(args.description !== undefined && { description: args.description }),
                ...(args.icon !== undefined && { icon: args.icon }),
                ...(args.color !== undefined && { color: args.color }),
                ...(args.position !== undefined && { position: args.position }),
                updatedAt: new Date(),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                spaceId: args.spaceId || null,
                name: args.name || 'Folder',
              },
            });
            this.logger.log(`✏️ Folder actualizado: ${args.id}`);
            break;

          case 'deleteFolder':
            try {
              await prisma.folder.delete({ where: { id: args.id } });
              this.logger.log(`🗑️ Folder eliminado: ${args.id}`);
            } catch (e) {
              this.logger.warn(`⚠️ Folder no encontrado: ${args.id}`);
            }
            break;

          // ==================== LISTS (NUEVO) ====================
          case 'createList': {
            await prisma.list.upsert({
              where: { id: args.id },
              update: {
                name: args.name,
                description: args.description,
                icon: args.icon,
                color: args.color,
                view: args.view || 'list',
                position: args.position || 0,
                updatedAt: new Date(),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                spaceId: args.spaceId || null,
                folderId: args.folderId || null,
                name: args.name || 'Nueva Lista',
                description: args.description || null,
                icon: args.icon || null,
                color: args.color || null,
                view: args.view || 'list',
                position: args.position || 0,
              },
            });
            this.logger.log(`✅ List creada: ${args.name}`);
            break;
          }

          case 'updateList':
            await prisma.list.upsert({
              where: { id: args.id },
              update: {
                ...(args.name && { name: args.name }),
                ...(args.description !== undefined && { description: args.description }),
                ...(args.icon !== undefined && { icon: args.icon }),
                ...(args.color !== undefined && { color: args.color }),
                ...(args.view !== undefined && { view: args.view }),
                ...(args.position !== undefined && { position: args.position }),
                updatedAt: new Date(),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                spaceId: args.spaceId || null,
                folderId: args.folderId || null,
                name: args.name || 'List',
                view: args.view || 'list',
              },
            });
            this.logger.log(`✏️ List actualizada: ${args.id}`);
            break;

          case 'deleteList':
            try {
              await prisma.list.delete({ where: { id: args.id } });
              this.logger.log(`🗑️ List eliminada: ${args.id}`);
            } catch (e) {
              this.logger.warn(`⚠️ List no encontrada: ${args.id}`);
            }
            break;

          // ==================== COMMENTS ====================
          case 'createComment':
            await prisma.comment.upsert({
              where: { id: args.id },
              update: {
                body: args.body,
                creatorId: validCreatorId,
                createdAt: new Date(args.createdAt),
              },
              create: {
                id: args.id,
                taskId: args.taskId,
                body: args.body,
                creatorId: validCreatorId,
                createdAt: new Date(args.createdAt),
              },
            });
            this.logger.log(`💬 Comentario procesado en tarea: ${args.taskId}`);
            break;

          case 'deleteComment':
            try {
              await prisma.comment.delete({ where: { id: args.id } });
              this.logger.log(`🗑️ Comentario eliminado: ${args.id}`);
            } catch (e) {
              this.logger.warn(`⚠️ Comentario no encontrado: ${args.id}`);
            }
            break;

          // ==================== CUSTOM FIELDS ====================
          case 'createCustomField':
            await prisma.customField.upsert({
              where: { id: args.id },
              update: {
                name: args.name,
                type: args.type,
                options: args.options || null,
                required: args.required || false,
                position: args.position || 0,
                updatedAt: new Date(),
              },
              create: {
                id: args.id,
                workspaceId: realWorkspaceId,
                name: args.name,
                type: args.type,
                options: args.options || null,
                required: args.required || false,
                position: args.position || 0,
              },
            });
            this.logger.log(`✅ Campo personalizado creado: ${args.name}`);
            break;

          case 'updateCustomField':
            await prisma.customField.update({
              where: { id: args.id },
              data: {
                ...(args.name && { name: args.name }),
                ...(args.type && { type: args.type }),
                ...(args.options && { options: args.options }),
                ...(args.required !== undefined && { required: args.required }),
                updatedAt: new Date(),
              },
            });
            this.logger.log(`️ Campo personalizado actualizado: ${args.id}`);
            break;

          case 'deleteCustomField':
            try {
              await prisma.customField.delete({ where: { id: args.id } });
              this.logger.log(`🗑️ Campo personalizado eliminado: ${args.id}`);
            } catch (e) {
              this.logger.warn(`⚠️ Campo no encontrado: ${args.id}`);
            }
            break;

          // ==================== ACTIVITIES (NUEVO) ====================
          case 'createActivity':
            await prisma.activity.create({
              data: {
                id: args.id,
                workspaceId: realWorkspaceId,
                userId: validCreatorId,
                taskId: args.taskId || null,
                action: args.action,
                entityType: args.entityType,
                entityId: args.entityId,
                changes: args.changes || null,
                metadata: args.metadata || null,
              },
            });
            this.logger.log(`📊 Actividad registrada: ${args.action}`);
            break;
        }
      } catch (error: any) {
        this.logger.error(`❌ Error en mutación ${name}: ${error.message}`);
      }
    }

    if (maxMutationId > 0) {
      await prisma.syncState.upsert({
        where: { workspaceId_clientGroupId: { workspaceId: realWorkspaceId, clientGroupId: clientGroupID } },
        update: { lastMutationId: BigInt(maxMutationId), updatedAt: new Date() },
        create: { workspaceId: realWorkspaceId, clientGroupId: clientGroupID, lastMutationId: BigInt(maxMutationId) },
      });
      this.logger.log(`💾 Sync state actualizado: lastMutationID = ${maxMutationId}`);
    }

    return { success: true };
  }

  async processPull(lastMutationID: number, clientGroupID: string, workspaceSlug: string, clientCookie: string) {
    try {
      const realWorkspaceId = await this.getRealWorkspaceId(workspaceSlug);
      if (!realWorkspaceId) {
        return { lastMutationIDChanges: {}, cookie: "init", patch: [] };
      }

      const syncState = await prisma.syncState.findUnique({
        where: { workspaceId_clientGroupId: { workspaceId: realWorkspaceId, clientGroupId: clientGroupID } },
      });

      const serverLastMutationId = syncState ? Number(syncState.lastMutationId) : 0;

      // Obtener todos los datos jerárquicos
      const spaces = await prisma.space.findMany({ 
        where: { workspaceId: realWorkspaceId },
        include: {
          folders: {
            include: {
              lists: true
            }
          },
          lists: true,
          tasks: { take: 50 }
        },
        orderBy: { position: 'asc' }
      });

      const folders = await prisma.folder.findMany({ 
        where: { workspaceId: realWorkspaceId },
        include: { lists: true },
        orderBy: { position: 'asc' }
      });

      const lists = await prisma.list.findMany({ 
        where: { workspaceId: realWorkspaceId },
        include: { tasks: { take: 50 } },
        orderBy: { position: 'asc' }
      });

      const tasks = await prisma.task.findMany({ 
        where: { workspaceId: realWorkspaceId },
        include: {
          children: true,
          comments: {
            include: {
              creator: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      const customFields = await prisma.customField.findMany({ 
        where: { workspaceId: realWorkspaceId } 
      });

      const comments = await prisma.comment.findMany({ 
        where: { task: { workspaceId: realWorkspaceId } },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      const activities = await prisma.activity.findMany({
        where: { workspaceId: realWorkspaceId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Calcular timestamp máximo
      const allTimestamps = [
        ...spaces.map(s => s.updatedAt.getTime()),
        ...folders.map(f => f.updatedAt.getTime()),
        ...lists.map(l => l.updatedAt.getTime()),
        ...tasks.map(t => t.updatedAt.getTime()),
        ...comments.map(c => c.createdAt.getTime()),
        ...activities.map(a => a.createdAt.getTime()),
        serverLastMutationId
      ];
      const maxVersionTimestamp = Math.max(...allTimestamps, 0);
      
      const currentCookie = maxVersionTimestamp > 0 ? `v-${maxVersionTimestamp}` : "init";

      if (clientCookie === currentCookie) {
        return { lastMutationIDChanges: {}, cookie: currentCookie, patch: [] };
      }

      const patch: any[] = [{ op: 'clear' }];

      // Enviar spaces
      for (const space of spaces) {
        patch.push({
          op: 'put',
          key: `space/${space.id}`,
          value: {
            id: space.id,
            workspaceId: space.workspaceId,
            name: space.name,
            slug: space.slug,
            description: space.description,
            icon: space.icon,
            color: space.color,
            position: space.position,
            updatedAt: space.updatedAt.getTime(),
          },
        });
      }

      // Enviar folders
      for (const folder of folders) {
        patch.push({
          op: 'put',
          key: `folder/${folder.id}`,
          value: {
            id: folder.id,
            workspaceId: folder.workspaceId,
            spaceId: folder.spaceId,
            name: folder.name,
            description: folder.description,
            icon: folder.icon,
            color: folder.color,
            position: folder.position,
            updatedAt: folder.updatedAt.getTime(),
          },
        });
      }

      // Enviar lists
      for (const list of lists) {
        patch.push({
          op: 'put',
          key: `list/${list.id}`,
          value: {
            id: list.id,
            workspaceId: list.workspaceId,
            spaceId: list.spaceId,
            folderId: list.folderId,
            name: list.name,
            description: list.description,
            icon: list.icon,
            color: list.color,
            view: list.view,
            position: list.position,
            updatedAt: list.updatedAt.getTime(),
          },
        });
      }

      // Enviar tasks
      for (const task of tasks) {
        patch.push({
          op: 'put',
          key: `task/${task.id}`,
          value: {
            id: task.id,
            identifier: task.identifier,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate ? task.dueDate.getTime() : null,
            startDate: task.startDate ? task.startDate.getTime() : null,
            spaceId: task.spaceId,
            listId: task.listId,
            parentId: task.parentId,
            assigneeId: task.assigneeId,
            creatorId: task.creatorId,
            customAttributes: task.customAttributes,
            tags: task.tags,
            position: task.position,
            kanbanColumn: task.kanbanColumn,
            calendarStart: task.calendarStart ? task.calendarStart.getTime() : null,
            calendarEnd: task.calendarEnd ? task.calendarEnd.getTime() : null,
            createdAt: task.createdAt.getTime(),
            updatedAt: task.updatedAt.getTime(),
          },
        });
      }

      // Enviar custom fields
      for (const field of customFields) {
        patch.push({
          op: 'put',
          key: `custom-field/${field.id}`,
          value: {
            id: field.id,
            workspaceId: field.workspaceId,
            name: field.name,
            type: field.type,
            options: field.options,
            required: field.required,
            position: field.position,
          },
        });
      }

      // Enviar comments con creator
      for (const comment of comments) {
        patch.push({
          op: 'put',
          key: `comment/${comment.id}`,
          value: {
            id: comment.id,
            taskId: comment.taskId,
            body: comment.body,
            creatorId: comment.creatorId,
            creator: comment.creator,
            createdAt: comment.createdAt.getTime(),
          },
        });
      }

      // Enviar activities
      for (const activity of activities) {
        patch.push({
          op: 'put',
          key: `activity/${activity.id}`,
          value: {
            id: activity.id,
            workspaceId: activity.workspaceId,
            userId: activity.userId,
            taskId: activity.taskId,
            action: activity.action,
            entityType: activity.entityType,
            entityId: activity.entityId,
            changes: activity.changes,
            metadata: activity.metadata,
            user: activity.user,
            createdAt: activity.createdAt.getTime(),
          },
        });
      }

      return {
        lastMutationIDChanges: { [clientGroupID]: serverLastMutationId },
        cookie: currentCookie,
        patch,
      };
    } catch (error: any) {
      this.logger.error(`❌ Pull error: ${error.message}`);
      return { lastMutationIDChanges: {}, cookie: "error", patch: [] };
    }
  }
}