import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

export interface PublishedJob {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  publishedAt: Date;
}

@Injectable()
export class JobsService {
  private readonly publishedJobs: PublishedJob[] = [];

  async publish(name: string, payload: Record<string, unknown>) {
    const job: PublishedJob = {
      id: randomUUID(),
      name,
      payload,
      publishedAt: new Date(),
    };

    this.publishedJobs.push(job);

    return job;
  }

  getPublishedJobs() {
    return [...this.publishedJobs];
  }
}
