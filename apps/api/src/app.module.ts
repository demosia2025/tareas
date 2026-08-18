import { Module } from '@nestjs/common';
import { SyncModule } from './sync/sync.module';
import { DemoController } from './demo/demo.controller';

@Module({
  imports: [SyncModule],
  controllers: [DemoController],
})
export class AppModule {}