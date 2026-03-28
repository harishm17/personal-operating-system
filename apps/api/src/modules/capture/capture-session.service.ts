import { Inject, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.module';
import { CaptureChannel } from './dto/create-capture.dto';

@Injectable()
export class CaptureSessionService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async recordCreate(captureId: string, channel: CaptureChannel) {
    return this.dbService.insertCaptureSession({
      captureId,
      sessionKey: `capture:${channel}:${captureId}`,
      metadata: {
        channel,
        action: 'create',
      },
    });
  }

  listByCaptureId(captureId: string) {
    return this.dbService.listCaptureSessionsByCaptureId(captureId);
  }
}
