import type { EntityKind } from '../entities/entity-kind';
import { ENTITY_KINDS } from '../entities/entity-kind';
import type { EntityKindSubtype, EntitySubtypeForKind } from '../entities/entity-subtypes';

export const CANDIDATE_KINDS = ENTITY_KINDS;

export type CandidateKind = EntityKind;
export type CandidateSubtypeForKind<K extends CandidateKind> = EntitySubtypeForKind<K>;
export type CandidateKindSubtype<K extends CandidateKind = CandidateKind> = EntityKindSubtype<K>;
