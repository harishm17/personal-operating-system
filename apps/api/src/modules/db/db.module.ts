import { randomUUID } from 'node:crypto';
import { Injectable, Module } from '@nestjs/common';
import { CreateCaptureDto } from '../capture/dto/create-capture.dto';

type JsonMap = Record<string, unknown>;

export interface CaptureRecord {
  id: string;
  channel: CreateCaptureDto['channel'];
  sourceType: string;
  contentText: string;
  clientRequestId: string;
  status: 'received';
  metadata: JsonMap;
  createdAt: Date;
}

export interface InboxItemRecord {
  id: string;
  captureId: string;
  itemType: string;
  status: 'open';
  title: string;
  payloadJson: JsonMap;
  createdAt: Date;
}

export interface CaptureSessionRecord {
  id: string;
  captureId: string;
  sessionKey: string;
  status: 'active';
  metadata: JsonMap;
  startedAt: Date;
  endedAt: Date | null;
}

export interface CaptureEventRecord {
  id: string;
  captureId: string;
  captureSessionId: string | null;
  kind: string;
  payloadJson: JsonMap;
  createdAt: Date;
}

interface InsertInboxItemInput {
  captureId: string;
  itemType: string;
  title: string;
  payloadJson?: JsonMap;
}

interface InsertCaptureSessionInput {
  captureId: string;
  sessionKey: string;
  metadata?: JsonMap;
}

interface InsertCaptureEventInput {
  captureId: string;
  captureSessionId?: string | null;
  kind: string;
  payloadJson?: JsonMap;
}

@Injectable()
export class DbService {
  private readonly captures: CaptureRecord[] = [];
  private readonly inboxItems: InboxItemRecord[] = [];
  private readonly captureSessions: CaptureSessionRecord[] = [];
  private readonly captureEvents: CaptureEventRecord[] = [];

  insertCapture(dto: CreateCaptureDto): CaptureRecord {
    const capture: CaptureRecord = {
      id: randomUUID(),
      channel: dto.channel,
      sourceType: dto.sourceType,
      contentText: dto.contentText,
      clientRequestId: dto.clientRequestId,
      status: 'received',
      metadata: dto.metadata ?? {},
      createdAt: new Date(),
    };

    this.captures.push(capture);

    return capture;
  }

  insertInboxItem(input: InsertInboxItemInput): InboxItemRecord {
    const inboxItem: InboxItemRecord = {
      id: randomUUID(),
      captureId: input.captureId,
      itemType: input.itemType,
      status: 'open',
      title: input.title,
      payloadJson: input.payloadJson ?? {},
      createdAt: new Date(),
    };

    this.inboxItems.push(inboxItem);

    return inboxItem;
  }

  insertCaptureSession(input: InsertCaptureSessionInput): CaptureSessionRecord {
    const captureSession: CaptureSessionRecord = {
      id: randomUUID(),
      captureId: input.captureId,
      sessionKey: input.sessionKey,
      status: 'active',
      metadata: input.metadata ?? {},
      startedAt: new Date(),
      endedAt: null,
    };

    this.captureSessions.push(captureSession);

    return captureSession;
  }

  insertCaptureEvent(input: InsertCaptureEventInput): CaptureEventRecord {
    const captureEvent: CaptureEventRecord = {
      id: randomUUID(),
      captureId: input.captureId,
      captureSessionId: input.captureSessionId ?? null,
      kind: input.kind,
      payloadJson: input.payloadJson ?? {},
      createdAt: new Date(),
    };

    this.captureEvents.push(captureEvent);

    return captureEvent;
  }

  findCaptureById(captureId: string) {
    return this.captures.find((capture) => capture.id === captureId);
  }

  findCaptureByClientRequestId(clientRequestId: string) {
    return this.captures.find((capture) => capture.clientRequestId === clientRequestId);
  }

  findInboxItemByCaptureId(captureId: string) {
    return this.inboxItems.find((inboxItem) => inboxItem.captureId === captureId);
  }

  listInboxItemsByCaptureId(captureId: string) {
    return this.inboxItems.filter((inboxItem) => inboxItem.captureId === captureId);
  }

  listCaptureSessionsByCaptureId(captureId: string) {
    return this.captureSessions.filter((captureSession) => captureSession.captureId === captureId);
  }

  listCaptureEventsByCaptureId(captureId: string) {
    return this.captureEvents.filter((captureEvent) => captureEvent.captureId === captureId);
  }
}

@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
