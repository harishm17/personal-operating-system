export const RELATION_KINDS = [
  'contains',
  'references',
  'derived_from',
  'assigned_to',
  'belongs_to',
  'triggers',
  'supports',
  'duplicates',
  'blocks',
  'follows',
] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];
