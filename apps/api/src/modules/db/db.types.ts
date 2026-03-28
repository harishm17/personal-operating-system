import type { CreateCaptureDto } from '../capture/dto/create-capture.dto';

export type JsonMap = Record<string, unknown>;
export type DbConnection = ReturnType<(typeof import('@assistant/db'))['createDb']>;

export interface CaptureRecord {
  id: string;
  channel: CreateCaptureDto['channel'];
  sourceType: string;
  contentText: string;
  clientRequestId: string;
  status: string;
  metadata: JsonMap;
  createdAt: Date;
}

export interface CaptureWriteResult {
  capture: CaptureRecord;
  created: boolean;
}

export interface InboxItemRecord {
  id: string;
  captureId: string | null;
  itemType: string;
  status: string;
  title: string;
  payloadJson: JsonMap;
  createdAt: Date;
}

export interface CaptureSessionRecord {
  id: string;
  captureId: string;
  sessionKey: string;
  status: string;
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

export interface InsertInboxItemInput {
  captureId: string;
  itemType: string;
  title: string;
  payloadJson?: JsonMap;
}

export interface InsertCaptureSessionInput {
  captureId: string;
  sessionKey: string;
  metadata?: JsonMap;
}

export interface InsertCaptureEventInput {
  captureId: string;
  captureSessionId?: string | null;
  kind: string;
  payloadJson?: JsonMap;
}

export interface CaptureRepository {
  insertCapture(dto: CreateCaptureDto): Promise<CaptureWriteResult>;
  findCaptureById(captureId: string): Promise<CaptureRecord | undefined>;
  findCaptureByClientRequestId(clientRequestId: string): Promise<CaptureRecord | undefined>;
  findInboxItemByCaptureId(captureId: string): Promise<InboxItemRecord | undefined>;
  findOrCreateInboxItem(input: InsertInboxItemInput): Promise<InboxItemRecord>;
  findCaptureSessionBySessionKey(sessionKey: string): Promise<CaptureSessionRecord | undefined>;
  findOrCreateCaptureSession(input: InsertCaptureSessionInput): Promise<CaptureSessionRecord>;
  findCaptureEventByCaptureIdAndKind(
    captureId: string,
    kind: string,
  ): Promise<CaptureEventRecord | undefined>;
  findOrCreateCaptureEvent(input: InsertCaptureEventInput): Promise<CaptureEventRecord>;
  updateCaptureEventSession(
    captureEventId: string,
    captureSessionId: string,
  ): Promise<CaptureEventRecord | undefined>;
  listInboxItemsByCaptureId(captureId: string): Promise<InboxItemRecord[]>;
  listCaptureSessionsByCaptureId(captureId: string): Promise<CaptureSessionRecord[]>;
  listCaptureEventsByCaptureId(captureId: string): Promise<CaptureEventRecord[]>;
}
