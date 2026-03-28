import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('task 2 backfill migration', () => {
  it('repairs orphaned segments and subtype rows before replaying constraints', () => {
    const migration = readFileSync(
      new URL('../../../../../infra/migrations/004_task2_integrity_backfill.sql', import.meta.url),
      'utf8',
    );

    const deleteOrphansIndex = migration.indexOf('DELETE FROM capture_segments');
    const notNullIndex = migration.indexOf('ALTER TABLE capture_segments\n  ALTER COLUMN capture_id SET NOT NULL;');

    expect(deleteOrphansIndex).toBeGreaterThan(-1);
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
      const orphanCleanupIndex = migration.indexOf(`DELETE FROM ${table}\n  WHERE entity_id NOT IN (SELECT id FROM entities);`);
      const fkIndex = migration.indexOf(`ADD CONSTRAINT ${fkName} FOREIGN KEY (entity_id, kind)`);

      expect(orphanCleanupIndex).toBeGreaterThan(-1);
      expect(fkIndex).toBeGreaterThan(orphanCleanupIndex);
    }
  });
});
