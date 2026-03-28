import { Inject, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.module';

@Injectable()
export class CaptureEventService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async append(
    captureId: string,
    kind: string,
    payload: Record<string, unknown>,
    captureSessionId?: string,
  ) {
    return this.dbService.insertCaptureEvent({
      captureId,
      captureSessionId,
      kind,
      payloadJson: payload,
    });
  }

  listByCaptureId(captureId: string) {
    return this.dbService.listCaptureEventsByCaptureId(captureId);
  }
}
