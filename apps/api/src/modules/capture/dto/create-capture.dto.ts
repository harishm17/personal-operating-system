export type CaptureChannel = 'web' | 'chat' | 'browser_extension';

export class CreateCaptureDto {
  channel!: CaptureChannel;
  sourceType!: string;
  contentText!: string;
  clientRequestId!: string;
  metadata?: Record<string, unknown>;
}
