import { Inject, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.module';

@Injectable()
export class CaptureReadService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  getCapture(captureId: string) {
    return this.dbService.findCaptureById(captureId) ?? null;
  }

  listInboxItemsForCapture(captureId: string) {
    return this.dbService.listInboxItemsByCaptureId(captureId);
  }

  listCaptureSessions(captureId: string) {
    return this.dbService.listCaptureSessionsByCaptureId(captureId);
  }
}
