import { Module } from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CoverLetterController } from './cover-letter.controller';

@Module({
  providers: [CoverLetterService],
  controllers: [CoverLetterController],
})
export class CoverLetterModule {}
