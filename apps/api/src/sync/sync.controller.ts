import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async handlePush(@Body() body: any) {
    try {
      await this.syncService.processPush(
        body.mutations || [], 
        body.clientGroupID || '', 
        'demo-workspace'
      );
      return { success: true };
    } catch (error) {
      console.error('❌ Push error:', error);
      return { success: true }; // Replicache requiere un estado 200 aunque falle la mutación individual
    }
  }

  @Post('pull')
  @HttpCode(HttpStatus.OK)
  async handlePull(@Body() body: any) {
    try {
      // ✅ Solución al TS2554: Pasamos body.cookie como el 4to argumento requerido
      const result = await this.syncService.processPull(
        body.lastMutationID || 0,
        body.clientGroupID || '',
        'demo-workspace',
        body.cookie || '' 
      );
      
      return result;
    } catch (error) {
      console.error('❌ Pull error:', error);
      return {
        lastMutationIDChanges: {},
        cookie: "",
        patch: [],
      };
    }
  }
}