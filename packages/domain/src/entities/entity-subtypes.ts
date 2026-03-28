import type { EntityKind } from './entity-kind';

export const ENTITY_SUBTYPES = {
  actor: ['person', 'assistant', 'system', 'team', 'service'],
  context: ['workspace', 'project', 'conversation', 'thread', 'document'],
  work_item: ['task', 'bug', 'feature', 'decision', 'note'],
  event: ['message', 'state_change', 'capture', 'observation'],
  resource: ['document', 'link', 'file', 'snippet', 'artifact'],
  memory: ['fact', 'preference', 'summary', 'pattern'],
  rule: ['policy', 'constraint', 'workflow', 'guardrail'],
} as const satisfies Record<EntityKind, readonly string[]>;

export type EntitySubtypeByKind = {
  [K in EntityKind]: (typeof ENTITY_SUBTYPES)[K][number];
};

export type EntitySubtype = EntitySubtypeByKind[EntityKind];
