export const ENTITY_KINDS = [
  'actor',
  'context',
  'work_item',
  'event',
  'resource',
  'memory',
  'rule',
] as const;

export type EntityKind = (typeof ENTITY_KINDS)[number];
