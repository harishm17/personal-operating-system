import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [DbModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
