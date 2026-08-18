import { Replicache } from 'replicache';
import { mutators } from './mutators';

// Configuración del cliente de Replicache (versión más reciente)
export function createReplicacheClient(workspaceId: string, userID: string) {
  return new Replicache({
    name: `pm-saas-${workspaceId}`,
    mutators,
    
    // URLs de tu backend para sincronizar
    pushURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/sync/push`,
    pullURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/sync/pull`,
    
    // Cada cuánto tiempo intentar sincronizar con el servidor (en ms)
    pushDelay: 100, 
  });
}