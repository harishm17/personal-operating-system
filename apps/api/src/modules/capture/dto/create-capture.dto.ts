export const CAPTURE_CHANNELS = ['web', 'chat', 'browser_extension'] as const;

export type CaptureChannel = (typeof CAPTURE_CHANNELS)[number];

export class CreateCaptureDto {
  channel!: CaptureChannel;
  sourceType!: string;
  contentText!: string;
  clientRequestId!: string;
  metadata?: Record<string, unknown>;
}
