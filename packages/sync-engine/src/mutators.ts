import type { WriteTransaction } from 'replicache';

export type TaskCreateArgs = {
  id: string;
  workspaceId: string;
  projectId: string;
  identifier: string;
  title: string;
  status: string;
  priority: number;
  creatorId: string;
  dueDate?: number | null;
  customAttributes?: Record<string, any>;
};

export type TaskUpdateArgs = {
  id: string;
  title?: string;
  status?: string;
  priority?: number;
  dueDate?: number | null;
  customAttributes?: Record<string, any>;
};

export type CustomFieldCreateArgs = {
  id: string;
  workspaceId: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  options?: any[];
  required?: boolean;
  position?: number;
};

export type CustomFieldUpdateArgs = {
  id: string;
  name?: string;
  type?: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  options?: any[];
  required?: boolean;
  position?: number;
};

export type CustomFieldDeleteArgs = {
  id: string;
};

export type CommentCreateArgs = {
  id: string;
  taskId: string;
  body: string;
  creatorId: string;
  createdAt: string;
};

export type CommentDeleteArgs = {
  id: string;
};

export const mutators = {
  createTask: async (tx: WriteTransaction, args: TaskCreateArgs) => {
    const key = `task/${args.id}`;
    await tx.set(key, {
      ...args,
      customAttributes: args.customAttributes || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },

  updateTask: async (tx: WriteTransaction, args: TaskUpdateArgs) => {
    const key = `task/${args.id}`;
    const existing = (await tx.get(key)) as Record<string, any> | undefined;
    if (!existing) return;

    await tx.set(key, {
      ...existing,
      ...args,
      customAttributes: args.customAttributes 
        ? { ...existing.customAttributes, ...args.customAttributes } 
        : existing.customAttributes,
      updatedAt: Date.now(),
    });
  },

  deleteTask: async (tx: WriteTransaction, args: { id: string }) => {
    await tx.del(`task/${args.id}`);
  },

  createCustomField: async (tx: WriteTransaction, args: CustomFieldCreateArgs) => {
    const key = `custom-field/${args.id}`;
    await tx.set(key, {
      ...args,
      options: args.options || [],
      required: args.required || false,
      position: args.position || 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },

  updateCustomField: async (tx: WriteTransaction, args: CustomFieldUpdateArgs) => {
    const key = `custom-field/${args.id}`;
    const existing = (await tx.get(key)) as Record<string, any> | undefined;
    if (!existing) return;

    await tx.set(key, {
      ...existing,
      ...args,
      updatedAt: Date.now(),
    });
  },

  deleteCustomField: async (tx: WriteTransaction, args: CustomFieldDeleteArgs) => {
    await tx.del(`custom-field/${args.id}`);
  },

  // ✅ NUEVO: Mutador para crear comentarios
  createComment: async (tx: WriteTransaction, args: CommentCreateArgs) => {
    const key = `comment/${args.id}`;
    await tx.set(key, {
      id: args.id,
      taskId: args.taskId,
      body: args.body,
      creatorId: args.creatorId,
      createdAt: args.createdAt,
    });
  },

  // ✅ NUEVO: Mutador para eliminar comentarios
  deleteComment: async (tx: WriteTransaction, args: CommentDeleteArgs) => {
    await tx.del(`comment/${args.id}`);
  },
};