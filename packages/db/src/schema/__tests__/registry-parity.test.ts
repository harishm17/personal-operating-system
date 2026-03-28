import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ENTITY_KINDS,
  ENTITY_SUBTYPES,
  RELATION_KINDS,
  type EntityKind,
} from '@assistant/domain';

function readMigration(name: string) {
  return readFileSync(new URL(`../../../../../infra/migrations/${name}`, import.meta.url), 'utf8');
}

function extractSimpleList(sqlText: string, constraintName: string) {
  const start = sqlText.indexOf(`constraint ${constraintName}`);
  if (start < 0) {
    throw new Error(`Could not find ${constraintName}`);
  }

  const inIndex = sqlText.indexOf('in (', start);
  if (inIndex < 0) {
    throw new Error(`Could not find IN list for ${constraintName}`);
  }

  const closeIndex = sqlText.indexOf(')', inIndex + 4);
  if (closeIndex < 0) {
    throw new Error(`Could not close IN list for ${constraintName}`);
  }

  return sqlText
    .slice(inIndex + 4, closeIndex)
    .split(',')
    .map((value) => value.trim().replace(/^'/, '').replace(/'$/, ''))
    .filter(Boolean);
}

function extractSubtypeList(sqlText: string, kind: EntityKind) {
  const pattern = new RegExp(
    String.raw`kind\s*=\s*'${kind}'\s+and\s+subtype\s+in\s*\(([^\)]*)\)`,
    'i',
  );
  const match = sqlText.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Could not find subtype registry for ${kind}`);
  }

  return match[1]
    .split(',')
    .map((value) => value.trim().replace(/^'/, '').replace(/'$/, ''))
    .filter(Boolean);
}

describe('registry parity', () => {
  it('keeps SQL registry literals aligned with the domain registries', () => {
    const coreSql = readMigration('002_core_entities.sql');
    const pipelineSql = readMigration('003_capture_pipeline.sql');
    const backfillSql = readMigration('004_task2_integrity_backfill.sql');

    for (const sqlText of [coreSql, backfillSql]) {
      expect(extractSimpleList(sqlText, 'entities_kind_registry')).toEqual(ENTITY_KINDS);
      expect(extractSimpleList(sqlText, 'entity_relations_kind_registry')).toEqual(RELATION_KINDS);
    }

    for (const sqlText of [pipelineSql, backfillSql]) {
      expect(extractSimpleList(sqlText, 'candidate_entities_kind_registry')).toEqual(ENTITY_KINDS);
    }

    for (const sqlText of [coreSql, backfillSql, pipelineSql]) {
      for (const kind of ENTITY_KINDS) {
        expect(extractSubtypeList(sqlText, kind)).toEqual(ENTITY_SUBTYPES[kind]);
      }
    }
  });
});
