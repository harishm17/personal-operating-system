import { Inject, Injectable } from '@nestjs/common';
import { CAPTURE_REPOSITORY } from '../db/db.constants';
import type { CaptureRepository } from '../db/db.types';
import { CaptureChannel } from './dto/create-capture.dto';

@Injectable()
export class CaptureSessionService {
  constructor(
    @Inject(CAPTURE_REPOSITORY)
    private readonly captureRepository: CaptureRepository,
  ) {}

  async recordCreate(captureId: string, channel: CaptureChannel) {
    return this.captureRepository.findOrCreateCaptureSession({
      captureId,
      sessionKey: `capture:${channel}:${captureId}`,
      metadata: {
        channel,
        action: 'create',
      },
    });
  }

  async listByCaptureId(captureId: string) {
    return this.captureRepository.listCaptureSessionsByCaptureId(captureId);
  }
}
