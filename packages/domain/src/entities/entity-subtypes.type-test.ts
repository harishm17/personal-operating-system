import type { EntityKindSubtype } from './entity-subtypes';

const contextDocument: EntityKindSubtype = {
  kind: 'context',
  subtype: 'document',
};

const resourceDocument: EntityKindSubtype = {
  kind: 'resource',
  subtype: 'document',
};

// This should fail at compile time if the union stops discriminating.
// @ts-expect-error
const invalidPair: EntityKindSubtype = {
  kind: 'actor',
  subtype: 'deadline',
};

void contextDocument;
void resourceDocument;
void invalidPair;
