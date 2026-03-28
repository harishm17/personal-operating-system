import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.module';
import { JobsService } from '../jobs/jobs.service';
import { CaptureEventService } from './capture-event.service';
import { CaptureSessionService } from './capture-session.service';
import { CAPTURE_CHANNELS, CreateCaptureDto } from './dto/create-capture.dto';

@Injectable()
export class CaptureService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(CaptureSessionService)
    private readonly captureSessionService: CaptureSessionService,
    @Inject(CaptureEventService)
    private readonly captureEventService: CaptureEventService,
    @Inject(JobsService) private readonly jobsService: JobsService,
  ) {}

  async createCapture(dto: CreateCaptureDto) {
    this.validateCreateCaptureDto(dto);

    const existingCapture = this.dbService.findCaptureByClientRequestId(dto.clientRequestId);
    if (existingCapture) {
      const existingInboxItem = this.dbService.findInboxItemByCaptureId(existingCapture.id);
      if (!existingInboxItem) {
        throw new Error(`Missing inbox item for capture ${existingCapture.id}`);
      }

      return {
        capture: existingCapture,
        inboxItem: existingInboxItem,
      };
    }

    const capture = this.dbService.insertCapture(dto);
    const inboxItem = this.dbService.insertInboxItem({
      captureId: capture.id,
      itemType: 'capture_review',
      title: 'New capture received',
    });

    const captureSession = await this.captureSessionService.recordCreate(capture.id, dto.channel);
    await this.captureEventService.append(
      capture.id,
      'capture_received',
      {
        channel: dto.channel,
        sourceType: dto.sourceType,
        contentText: dto.contentText,
        clientRequestId: dto.clientRequestId,
        metadata: dto.metadata ?? {},
      },
      captureSession.id,
    );
    await this.jobsService.publish('process-capture', { captureId: capture.id });

    return { capture, inboxItem };
  }

  private validateCreateCaptureDto(dto: CreateCaptureDto) {
    if (!CAPTURE_CHANNELS.includes(dto.channel)) {
      throw new BadRequestException('channel must be one of: web, chat, browser_extension');
    }

    this.assertNonEmpty(dto.sourceType, 'sourceType');
    this.assertNonEmpty(dto.contentText, 'contentText');
    this.assertNonEmpty(dto.clientRequestId, 'clientRequestId');
  }

  private assertNonEmpty(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} must be a non-empty string`);
    }
  }
}
