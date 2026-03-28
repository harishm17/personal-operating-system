import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.module';
import { JobsService } from '../jobs/jobs.service';
import { CaptureEventService } from './capture-event.service';
import { CaptureSessionService } from './capture-session.service';
import { CreateCaptureDto } from './dto/create-capture.dto';

@Injectable()
export class CaptureService {
  constructor(
    private readonly dbService: DbService,
    private readonly captureSessionService: CaptureSessionService,
    private readonly captureEventService: CaptureEventService,
    private readonly jobsService: JobsService,
  ) {}

  async createCapture(dto: CreateCaptureDto) {
    const capture = this.dbService.insertCapture(dto);
    const inboxItem = this.dbService.insertInboxItem({
      captureId: capture.id,
      itemType: 'capture_review',
      title: 'New capture received',
    });

    await this.captureSessionService.recordCreate(capture.id, dto.channel);
    await this.captureEventService.append(capture.id, 'capture_received', {
      channel: dto.channel,
      sourceType: dto.sourceType,
      contentText: dto.contentText,
      clientRequestId: dto.clientRequestId,
      metadata: dto.metadata ?? {},
    });
    await this.jobsService.publish('process-capture', { captureId: capture.id });

    return { capture, inboxItem };
  }
}
