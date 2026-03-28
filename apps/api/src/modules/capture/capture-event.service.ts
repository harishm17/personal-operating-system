import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.module';

@Injectable()
export class CaptureEventService {
  constructor(private readonly dbService: DbService) {}

  async append(captureId: string, kind: string, payload: Record<string, unknown>) {
    return this.dbService.insertCaptureEvent({
      captureId,
      kind,
      payloadJson: payload,
    });
  }

  listByCaptureId(captureId: string) {
    return this.dbService.listCaptureEventsByCaptureId(captureId);
  }
}
