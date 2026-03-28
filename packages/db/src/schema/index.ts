export * from './actors';
export * from './attachments';
export * from './candidate-entities';
export * from './capture-events';
export * from './capture-parts';
export * from './capture-segments';
export * from './capture-sessions';
export * from './captures';
export * from './contexts';
export * from './entities';
export * from './entity-events';
export * from './entity-relations';
export * from './events';
export * from './inbox-items';
export * from './memory-items';
export * from './resources';
export * from './rules';
export * from './work-items';

import { actors } from './actors';
import { attachments } from './attachments';
import { candidateEntities } from './candidate-entities';
import { captureEvents } from './capture-events';
import { captureParts } from './capture-parts';
import { captureSegments } from './capture-segments';
import { captureSessions } from './capture-sessions';
import { captures } from './captures';
import { contexts } from './contexts';
import { entities } from './entities';
import { entityEvents } from './entity-events';
import { entityRelations } from './entity-relations';
import { events } from './events';
import { inboxItems } from './inbox-items';
import { memoryItems } from './memory-items';
import { resources } from './resources';
import { rules } from './rules';
import { workItems } from './work-items';

export const dbSchema = {
  actors,
  attachments,
  candidateEntities,
  captureEvents,
  captureParts,
  captureSegments,
  captureSessions,
  captures,
  contexts,
  entities,
  entityEvents,
  entityRelations,
  events,
  inboxItems,
  memoryItems,
  resources,
  rules,
  workItems,
};
