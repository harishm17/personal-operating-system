import { Inject, Injectable } from '@nestjs/common';
import { CAPTURE_REPOSITORY } from '../db/db.constants';
import type { CaptureRepository } from '../db/db.types';

@Injectable()
export class CaptureReadService {
  constructor(
    @Inject(CAPTURE_REPOSITORY)
    private readonly captureRepository: CaptureRepository,
  ) {}

  async getCapture(captureId: string) {
    return (await this.captureRepository.findCaptureById(captureId)) ?? null;
  }

  async listInboxItemsForCapture(captureId: string) {
    return this.captureRepository.listInboxItemsByCaptureId(captureId);
  }

  async listCaptureSessions(captureId: string) {
    return this.captureRepository.listCaptureSessionsByCaptureId(captureId);
  }
}
