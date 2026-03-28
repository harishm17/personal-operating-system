import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('task 2 backfill migration', () => {
  it('repairs orphaned segments and subtype rows before replaying constraints', () => {
    const migration = readFileSync(
      new URL('../../../../../infra/migrations/004_task2_integrity_backfill.sql', import.meta.url),
      'utf8',
    );

    const segmentRepairIndex = migration.indexOf('SET capture_id = part.capture_id');
    const segmentDistinctIndex = migration.indexOf('segment.capture_id IS DISTINCT FROM part.capture_id');
    const deleteOrphansIndex = migration.indexOf('DELETE FROM capture_segments');
    const notNullIndex = migration.indexOf(`ALTER TABLE capture_segments
  ALTER COLUMN capture_id SET NOT NULL;`);

    expect(segmentRepairIndex).toBeGreaterThan(-1);
    expect(segmentDistinctIndex).toBeGreaterThan(segmentRepairIndex);
    expect(deleteOrphansIndex).toBeGreaterThan(segmentDistinctIndex);
    expect(notNullIndex).toBeGreaterThan(deleteOrphansIndex);

    for (const [table, fkName] of [
      ['actors', 'actors_entity_kind_fk'],
      ['contexts', 'contexts_entity_kind_fk'],
      ['work_items', 'work_items_entity_kind_fk'],
      ['events', 'events_entity_kind_fk'],
      ['resources', 'resources_entity_kind_fk'],
      ['memory_items', 'memory_items_entity_kind_fk'],
      ['rules', 'rules_entity_kind_fk'],
    ] as const) {
      const orphanCleanupIndex = migration.indexOf(`DELETE FROM ${table}
  WHERE entity_id NOT IN (SELECT id FROM entities);`);
      const fkIndex = migration.indexOf(`ADD CONSTRAINT ${fkName} FOREIGN KEY (entity_id, kind)`);

      expect(orphanCleanupIndex).toBeGreaterThan(-1);
      expect(fkIndex).toBeGreaterThan(orphanCleanupIndex);
    }
  });
});
