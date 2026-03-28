export const CANDIDATE_KINDS = [
  'entity',
  'relation',
  'capture_part',
  'capture_segment',
  'attachment',
  'inbox_item',
] as const;

export type CandidateKind = (typeof CANDIDATE_KINDS)[number];
