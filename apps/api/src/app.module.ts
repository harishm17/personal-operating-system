import { Module } from '@nestjs/common';
import { CaptureController } from './modules/capture/capture.controller';
import { CaptureEventService } from './modules/capture/capture-event.service';
import { CaptureReadService } from './modules/capture/capture-read.service';
import { CaptureService } from './modules/capture/capture.service';
import { CaptureSessionService } from './modules/capture/capture-session.service';
import { DbModule } from './modules/db/db.module';
import { HealthController } from './modules/health/health.controller';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [DbModule, JobsModule],
  controllers: [HealthController, CaptureController],
  providers: [
    CaptureService,
    CaptureSessionService,
    CaptureEventService,
    CaptureReadService,
  ],
})
export class AppModule {}
