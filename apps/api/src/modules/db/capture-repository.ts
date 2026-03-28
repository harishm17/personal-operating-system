import { captureEvents, captureSessions, captures, inboxItems } from '@assistant/db';
import { and, asc, eq } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { CreateCaptureDto } from '../capture/dto/create-capture.dto';
import { DB_CONNECTION } from './db.constants';
import type {
  CaptureEventRecord,
  CaptureRepository,
  CaptureRecord,
  CaptureSessionRecord,
  DbConnection,
  InboxItemRecord,
  InsertCaptureEventInput,
  InsertCaptureSessionInput,
  InsertInboxItemInput,
} from './db.types';

@Injectable()
export class PostgresCaptureRepository implements CaptureRepository {
  constructor(@Inject(DB_CONNECTION) private readonly connection: DbConnection) {}

  async insertCapture(dto: CreateCaptureDto): Promise<CaptureRecord> {
    const [capture] = await this.connection.db
      .insert(captures)
      .values({
        channel: dto.channel,
        sourceType: dto.sourceType,
        contentText: dto.contentText,
        clientRequestId: dto.clientRequestId,
        metadata: dto.metadata ?? {},
      })
      .returning();

    return capture;
  }

  async findCaptureById(captureId: string): Promise<CaptureRecord | undefined> {
    const [capture] = await this.connection.db
      .select()
      .from(captures)
      .where(eq(captures.id, captureId))
      .limit(1);

    return capture;
  }

  async findCaptureByClientRequestId(clientRequestId: string): Promise<CaptureRecord | undefined> {
    const [capture] = await this.connection.db
      .select()
      .from(captures)
      .where(eq(captures.clientRequestId, clientRequestId))
      .orderBy(asc(captures.createdAt))
      .limit(1);

    return capture;
  }

  async findInboxItemByCaptureId(captureId: string): Promise<InboxItemRecord | undefined> {
    const [inboxItem] = await this.connection.db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.captureId, captureId))
      .orderBy(asc(inboxItems.createdAt))
      .limit(1);

    return inboxItem;
  }

  async findOrCreateInboxItem(input: InsertInboxItemInput): Promise<InboxItemRecord> {
    const existingInboxItem = await this.findInboxItemByCaptureId(input.captureId);
    if (existingInboxItem) {
      return existingInboxItem;
    }

    const [inboxItem] = await this.connection.db
      .insert(inboxItems)
      .values({
        captureId: input.captureId,
        itemType: input.itemType,
        title: input.title,
        payloadJson: input.payloadJson ?? {},
      })
      .returning();

    return inboxItem;
  }

  async findCaptureSessionBySessionKey(
    sessionKey: string,
  ): Promise<CaptureSessionRecord | undefined> {
    const [captureSession] = await this.connection.db
      .select()
      .from(captureSessions)
      .where(eq(captureSessions.sessionKey, sessionKey))
      .orderBy(asc(captureSessions.startedAt))
      .limit(1);

    return captureSession;
  }

  async findOrCreateCaptureSession(
    input: InsertCaptureSessionInput,
  ): Promise<CaptureSessionRecord> {
    const [existingCaptureSession] = await this.connection.db
      .select()
      .from(captureSessions)
      .where(
        and(
          eq(captureSessions.captureId, input.captureId),
          eq(captureSessions.sessionKey, input.sessionKey),
        ),
      )
      .orderBy(asc(captureSessions.startedAt))
      .limit(1);

    if (existingCaptureSession) {
      return existingCaptureSession;
    }

    const [captureSession] = await this.connection.db
      .insert(captureSessions)
      .values({
        captureId: input.captureId,
        sessionKey: input.sessionKey,
        metadata: input.metadata ?? {},
      })
      .returning();

    return captureSession;
  }

  async findCaptureEventByCaptureIdAndKind(
    captureId: string,
    kind: string,
  ): Promise<CaptureEventRecord | undefined> {
    const [captureEvent] = await this.connection.db
      .select()
      .from(captureEvents)
      .where(
        and(eq(captureEvents.captureId, captureId), eq(captureEvents.kind, kind)),
      )
      .orderBy(asc(captureEvents.createdAt))
      .limit(1);

    return captureEvent;
  }

  async findOrCreateCaptureEvent(input: InsertCaptureEventInput): Promise<CaptureEventRecord> {
    const existingCaptureEvent = await this.findCaptureEventByCaptureIdAndKind(
      input.captureId,
      input.kind,
    );
    if (existingCaptureEvent) {
      return existingCaptureEvent;
    }

    const [captureEvent] = await this.connection.db
      .insert(captureEvents)
      .values({
        captureId: input.captureId,
        captureSessionId: input.captureSessionId ?? null,
        kind: input.kind,
        payloadJson: input.payloadJson ?? {},
      })
      .returning();

    return captureEvent;
  }

  async updateCaptureEventSession(
    captureEventId: string,
    captureSessionId: string,
  ): Promise<CaptureEventRecord | undefined> {
    const [captureEvent] = await this.connection.db
      .update(captureEvents)
      .set({ captureSessionId })
      .where(eq(captureEvents.id, captureEventId))
      .returning();

    return captureEvent;
  }

  async listInboxItemsByCaptureId(captureId: string): Promise<InboxItemRecord[]> {
    return this.connection.db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.captureId, captureId))
      .orderBy(asc(inboxItems.createdAt));
  }

  async listCaptureSessionsByCaptureId(captureId: string): Promise<CaptureSessionRecord[]> {
    return this.connection.db
      .select()
      .from(captureSessions)
      .where(eq(captureSessions.captureId, captureId))
      .orderBy(asc(captureSessions.startedAt));
  }

  async listCaptureEventsByCaptureId(captureId: string): Promise<CaptureEventRecord[]> {
    return this.connection.db
      .select()
      .from(captureEvents)
      .where(eq(captureEvents.captureId, captureId))
      .orderBy(asc(captureEvents.createdAt));
  }
}
