import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  // GET /api/jobs -> { jobs: [...] } (live + seeded, each verified)
  @Get()
  async list() {
    const jobs = await this.jobs.getJobs();
    return { jobs };
  }
}
