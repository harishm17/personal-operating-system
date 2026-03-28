import { createDb } from '@assistant/db';
import { Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { PostgresCaptureRepository } from './capture-repository';
import { CAPTURE_REPOSITORY, DB_CONNECTION } from './db.constants';
import type { DbConnection } from './db.types';

@Injectable()
class DbConnectionLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DB_CONNECTION) private readonly connection: DbConnection) {}

  async onApplicationShutdown() {
    await this.connection.pool.end();
  }
}

const dbConnectionProvider = {
  provide: DB_CONNECTION,
  useFactory: (): DbConnection => createDb(),
};

const captureRepositoryProvider = {
  provide: CAPTURE_REPOSITORY,
  useExisting: PostgresCaptureRepository,
};

@Module({
  providers: [
    dbConnectionProvider,
    PostgresCaptureRepository,
    captureRepositoryProvider,
    DbConnectionLifecycle,
  ],
  exports: [DB_CONNECTION, CAPTURE_REPOSITORY],
})
export class DbModule {}
