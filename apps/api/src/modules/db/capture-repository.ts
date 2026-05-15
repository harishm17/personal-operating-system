import { captureEvents, captureSessions, captures, inboxItems } from '@assistant/db';
import { and, asc, eq } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import { CAPTURE_CHANNELS, CreateCaptureDto } from '../capture/dto/create-capture.dto';
import { DB_CONNECTION } from './db.constants';
import type {
  CaptureEventRecord,
  CaptureRepository,
  CaptureRecord,
  CaptureSessionRecord,
  CaptureWriteResult,
  DbConnection,
  InboxItemRecord,
  InsertCaptureEventInput,
  InsertCaptureSessionInput,
  InsertInboxItemInput,
} from './db.types';

type CaptureRow = typeof captures.$inferSelect;
type InboxItemRow = typeof inboxItems.$inferSelect;
type CaptureSessionRow = typeof captureSessions.$inferSelect;
type CaptureEventRow = typeof captureEvents.$inferSelect;

@Injectable()
export class PostgresCaptureRepository implements CaptureRepository {
  constructor(@Inject(DB_CONNECTION) private readonly connection: DbConnection) {}

  async insertCapture(dto: CreateCaptureDto): Promise<CaptureWriteResult> {
    const [capture] = await this.connection.db
      .insert(captures)
      .values({
        channel: dto.channel,
        sourceType: dto.sourceType,
        contentText: dto.contentText,
        clientRequestId: dto.clientRequestId,
        metadata: dto.metadata ?? {},
      })
      .onConflictDoNothing({ target: captures.clientRequestId })
      .returning();

    if (capture) {
      return { capture: this.toCaptureRecord(capture), created: true };
    }

    return {
      capture: await this.loadCaptureByClientRequestId(dto.clientRequestId),
      created: false,
    };
  }

  async findCaptureById(captureId: string): Promise<CaptureRecord | undefined> {
    const [capture] = await this.connection.db
      .select()
      .from(captures)
      .where(eq(captures.id, captureId))
      .limit(1);

    return capture ? this.toCaptureRecord(capture) : undefined;
  }

  async findCaptureByClientRequestId(clientRequestId: string): Promise<CaptureRecord | undefined> {
    const [capture] = await this.connection.db
      .select()
      .from(captures)
      .where(eq(captures.clientRequestId, clientRequestId))
      .orderBy(asc(captures.createdAt))
      .limit(1);

    return capture ? this.toCaptureRecord(capture) : undefined;
  }

  async findInboxItemByCaptureId(captureId: string): Promise<InboxItemRecord | undefined> {
    const [inboxItem] = await this.connection.db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.captureId, captureId))
      .orderBy(asc(inboxItems.createdAt))
      .limit(1);

    return inboxItem ? this.toInboxItemRecord(inboxItem) : undefined;
  }

  async findOrCreateInboxItem(input: InsertInboxItemInput): Promise<InboxItemRecord> {
    const [inboxItem] = await this.connection.db
      .insert(inboxItems)
      .values({
        captureId: input.captureId,
        itemType: input.itemType,
        title: input.title,
        payloadJson: input.payloadJson ?? {},
      })
      .onConflictDoNothing({ target: [inboxItems.captureId, inboxItems.itemType] })
      .returning();

    if (inboxItem) {
      return this.toInboxItemRecord(inboxItem);
    }

    const existingInboxItem = await this.findInboxItemByCaptureIdAndItemType(
      input.captureId,
      input.itemType,
    );
    if (!existingInboxItem) {
      throw new Error(`Expected inbox item for capture ${input.captureId} and type ${input.itemType}`);
    }

    return existingInboxItem;
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

    return captureSession ? this.toCaptureSessionRecord(captureSession) : undefined;
  }

  async findOrCreateCaptureSession(
    input: InsertCaptureSessionInput,
  ): Promise<CaptureSessionRecord> {
    const [captureSession] = await this.connection.db
      .insert(captureSessions)
      .values({
        captureId: input.captureId,
        sessionKey: input.sessionKey,
        metadata: input.metadata ?? {},
      })
      .onConflictDoNothing({ target: [captureSessions.captureId, captureSessions.sessionKey] })
      .returning();

    if (captureSession) {
      return this.toCaptureSessionRecord(captureSession);
    }

    const existingCaptureSession = await this.findCaptureSessionByCaptureIdAndSessionKey(
      input.captureId,
      input.sessionKey,
    );
    if (!existingCaptureSession) {
      throw new Error(
        `Expected capture session for capture ${input.captureId} and key ${input.sessionKey}`,
      );
    }

    return existingCaptureSession;
  }

  async findCaptureEventByCaptureIdAndKind(
    captureId: string,
    kind: string,
  ): Promise<CaptureEventRecord | undefined> {
    const [captureEvent] = await this.connection.db
      .select()
      .from(captureEvents)
      .where(and(eq(captureEvents.captureId, captureId), eq(captureEvents.kind, kind)))
      .orderBy(asc(captureEvents.createdAt))
      .limit(1);

    return captureEvent ? this.toCaptureEventRecord(captureEvent) : undefined;
  }

  async findOrCreateCaptureEvent(input: InsertCaptureEventInput): Promise<CaptureEventRecord> {
    const [captureEvent] = await this.connection.db
      .insert(captureEvents)
      .values({
        captureId: input.captureId,
        captureSessionId: input.captureSessionId ?? null,
        kind: input.kind,
        payloadJson: input.payloadJson ?? {},
      })
      .onConflictDoNothing({ target: [captureEvents.captureId, captureEvents.kind] })
      .returning();

    if (captureEvent) {
      return this.toCaptureEventRecord(captureEvent);
    }

    const existingCaptureEvent = await this.findCaptureEventByCaptureIdAndKind(
      input.captureId,
      input.kind,
    );
    if (!existingCaptureEvent) {
      throw new Error(`Expected capture event for capture ${input.captureId} and kind ${input.kind}`);
    }

    return existingCaptureEvent;
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

    return captureEvent ? this.toCaptureEventRecord(captureEvent) : undefined;
  }

  async listInboxItemsByCaptureId(captureId: string): Promise<InboxItemRecord[]> {
    const rows = await this.connection.db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.captureId, captureId))
      .orderBy(asc(inboxItems.createdAt));

    return rows.map((row) => this.toInboxItemRecord(row));
  }

  async listCaptureSessionsByCaptureId(captureId: string): Promise<CaptureSessionRecord[]> {
    const rows = await this.connection.db
      .select()
      .from(captureSessions)
      .where(eq(captureSessions.captureId, captureId))
      .orderBy(asc(captureSessions.startedAt));

    return rows.map((row) => this.toCaptureSessionRecord(row));
  }

  async listCaptureEventsByCaptureId(captureId: string): Promise<CaptureEventRecord[]> {
    const rows = await this.connection.db
      .select()
      .from(captureEvents)
      .where(eq(captureEvents.captureId, captureId))
      .orderBy(asc(captureEvents.createdAt));

    return rows.map((row) => this.toCaptureEventRecord(row));
  }

  private async loadCaptureByClientRequestId(clientRequestId: string): Promise<CaptureRecord> {
    const capture = await this.findCaptureByClientRequestId(clientRequestId);
    if (!capture) {
      throw new Error(`Expected capture for clientRequestId ${clientRequestId}`);
    }

    return capture;
  }

  private async findInboxItemByCaptureIdAndItemType(
    captureId: string,
    itemType: string,
  ): Promise<InboxItemRecord | undefined> {
    const [inboxItem] = await this.connection.db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.captureId, captureId), eq(inboxItems.itemType, itemType)))
      .orderBy(asc(inboxItems.createdAt))
      .limit(1);

    return inboxItem ? this.toInboxItemRecord(inboxItem) : undefined;
  }

  private async findCaptureSessionByCaptureIdAndSessionKey(
    captureId: string,
    sessionKey: string,
  ): Promise<CaptureSessionRecord | undefined> {
    const [captureSession] = await this.connection.db
      .select()
      .from(captureSessions)
      .where(
        and(
          eq(captureSessions.captureId, captureId),
          eq(captureSessions.sessionKey, sessionKey),
        ),
      )
      .orderBy(asc(captureSessions.startedAt))
      .limit(1);

    return captureSession ? this.toCaptureSessionRecord(captureSession) : undefined;
  }

  private toCaptureRecord(row: CaptureRow): CaptureRecord {
    return {
      ...row,
      channel: this.toCaptureChannel(row.channel),
      metadata: this.toJsonMap(row.metadata),
    };
  }

  private toInboxItemRecord(row: InboxItemRow): InboxItemRecord {
    return {
      ...row,
      payloadJson: this.toJsonMap(row.payloadJson),
    };
  }

  private toCaptureSessionRecord(row: CaptureSessionRow): CaptureSessionRecord {
    return {
      ...row,
      metadata: this.toJsonMap(row.metadata),
    };
  }

  private toCaptureEventRecord(row: CaptureEventRow): CaptureEventRecord {
    return {
      ...row,
      payloadJson: this.toJsonMap(row.payloadJson),
    };
  }

  private toCaptureChannel(channel: string): CaptureRecord['channel'] {
    if (CAPTURE_CHANNELS.includes(channel as CaptureRecord['channel'])) {
      return channel as CaptureRecord['channel'];
    }

    throw new Error(`Unsupported persisted capture channel: ${channel}`);
  }

  private toJsonMap(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    throw new Error('Expected JSON object from capture persistence');
  }
}
