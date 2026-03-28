import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { CAPTURE_REPOSITORY } from '../db/db.constants';
import type { CaptureRecord, CaptureRepository } from '../db/db.types';
import { JobsService } from '../jobs/jobs.service';
import { CaptureEventService } from './capture-event.service';
import { CaptureSessionService } from './capture-session.service';
import { CAPTURE_CHANNELS, CreateCaptureDto } from './dto/create-capture.dto';

@Injectable()
export class CaptureService {
  constructor(
    @Inject(CAPTURE_REPOSITORY)
    private readonly captureRepository: CaptureRepository,
    @Inject(CaptureSessionService)
    private readonly captureSessionService: CaptureSessionService,
    @Inject(CaptureEventService)
    private readonly captureEventService: CaptureEventService,
    @Inject(JobsService) private readonly jobsService: JobsService,
  ) {}

  async createCapture(dto: CreateCaptureDto) {
    this.validateCreateCaptureDto(dto);

    const { capture, created } = await this.captureRepository.insertCapture(dto);
    if (!created) {
      this.assertSameRequest(capture, dto);
      return this.reconcileReplay(capture);
    }

    const inboxItem = await this.captureRepository.findOrCreateInboxItem({
      captureId: capture.id,
      itemType: 'capture_review',
      title: 'New capture received',
    });

    const captureSession = await this.captureSessionService.recordCreate(capture.id, dto.channel);
    await this.captureEventService.append(
      capture.id,
      'capture_received',
      this.buildCaptureEventPayload(dto),
      captureSession.id,
    );
    await this.jobsService.publish('process-capture', { captureId: capture.id });

    return { capture, inboxItem };
  }

  private async reconcileReplay(existingCapture: CaptureRecord) {
    const capture = existingCapture;
    const inboxItem = await this.captureRepository.findOrCreateInboxItem({
      captureId: capture.id,
      itemType: 'capture_review',
      title: 'New capture received',
    });

    const captureSession = await this.captureSessionService.recordCreate(
      capture.id,
      capture.channel,
    );
    const captureEvent = await this.captureEventService.append(
      capture.id,
      'capture_received',
      this.buildCaptureEventPayload(capture),
      captureSession.id,
    );
    if (captureEvent.captureSessionId !== captureSession.id) {
      await this.captureRepository.updateCaptureEventSession(
        captureEvent.id,
        captureSession.id,
      );
    }

    const existingJob = this.jobsService
      .getPublishedJobs()
      .find((job) => job.name === 'process-capture' && job.payload.captureId === capture.id);
    if (!existingJob) {
      await this.jobsService.publish('process-capture', { captureId: capture.id });
    }

    return { capture, inboxItem };
  }

  private validateCreateCaptureDto(dto: CreateCaptureDto) {
    if (!CAPTURE_CHANNELS.includes(dto.channel)) {
      throw new BadRequestException('channel must be one of: web, chat, browser_extension');
    }

    this.assertNonEmpty(dto.sourceType, 'sourceType');
    this.assertNonEmpty(dto.contentText, 'contentText');
    this.assertNonEmpty(dto.clientRequestId, 'clientRequestId');

    if (!this.isPlainJsonObject(dto.metadata)) {
      throw new BadRequestException('metadata must be a plain JSON object');
    }
  }

  private assertSameRequest(
    capture: {
      channel: string;
      sourceType: string;
      contentText: string;
      clientRequestId: string;
      metadata: Record<string, unknown>;
    },
    dto: CreateCaptureDto,
  ) {
    const fieldsMatch =
      capture.channel === dto.channel &&
      capture.sourceType === dto.sourceType &&
      capture.contentText === dto.contentText &&
      capture.clientRequestId === dto.clientRequestId &&
      this.toComparableJson(capture.metadata) === this.toComparableJson(dto.metadata ?? {});

    if (!fieldsMatch) {
      throw new ConflictException('clientRequestId already exists for a different capture request');
    }
  }

  private buildCaptureEventPayload(
    dto: Pick<
      CreateCaptureDto,
      'channel' | 'sourceType' | 'contentText' | 'clientRequestId' | 'metadata'
    >,
  ) {
    return {
      channel: dto.channel,
      sourceType: dto.sourceType,
      contentText: dto.contentText,
      clientRequestId: dto.clientRequestId,
      metadata: dto.metadata ?? {},
    };
  }

  private assertNonEmpty(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} must be a non-empty string`);
    }
  }

  private isPlainJsonObject(value: unknown): value is Record<string, unknown> {
    if (value === undefined) {
      return true;
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    return Object.getPrototypeOf(value) === Object.prototype;
  }

  private toComparableJson(value: unknown): string {
    return JSON.stringify(this.sortJsonValue(value));
  }

  private sortJsonValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.sortJsonValue(entry));
    }

    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((result, key) => {
          result[key] = this.sortJsonValue((value as Record<string, unknown>)[key]);
          return result;
        }, {});
    }

    return value;
  }
}
