import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AnswerService, AnswerInput } from './answer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('answer')
@UseGuards(JwtAuthGuard) // answering application questions requires an account
export class AnswerController {
  constructor(private readonly svc: AnswerService) {}

  // POST /api/answer
  //   { question, profile?, role?, cvText?, answers?, job?, length? }
  //   -> { answer, source, needsReview }
  @Post()
  answer(@Body() body: AnswerInput) {
    return this.svc.answer(body || ({} as AnswerInput));
  }

  // POST /api/answer/batch  { questions: [...], ...sharedContext }
  //   -> { results: [{ question, answer, source, needsReview }] }
  @Post('batch')
  async batch(@Body() body: { questions: string[] } & Omit<AnswerInput, 'question'>) {
    const { questions = [], ...ctx } = body || ({} as any);
    const results = await Promise.all(
      questions.slice(0, 25).map(async (question) => {
        const r = await this.svc.answer({ ...ctx, question });
        return { question, ...r };
      }),
    );
    return { results };
  }
}
