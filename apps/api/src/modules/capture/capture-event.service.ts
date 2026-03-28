import { Inject, Injectable } from '@nestjs/common';
import { CAPTURE_REPOSITORY } from '../db/db.constants';
import type { CaptureRepository } from '../db/db.types';

@Injectable()
export class CaptureEventService {
  constructor(
    @Inject(CAPTURE_REPOSITORY)
    private readonly captureRepository: CaptureRepository,
  ) {}

  async append(
    captureId: string,
    kind: string,
    payload: Record<string, unknown>,
    captureSessionId?: string,
  ) {
    return this.captureRepository.findOrCreateCaptureEvent({
      captureId,
      captureSessionId,
      kind,
      payloadJson: payload,
    });
  }

  async listByCaptureId(captureId: string) {
    return this.captureRepository.listCaptureEventsByCaptureId(captureId);
  }
}
