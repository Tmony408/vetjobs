import { Injectable } from '@nestjs/common';
import { buildCoverLetter, LetterInput } from './letter.builder';

@Injectable()
export class CoverLetterService {
  async generate(input: LetterInput): Promise<{ letter: string; source: 'ai' | 'builtin' }> {
    // Works with ANY OpenAI-compatible provider. Set LLM_API_KEY + LLM_BASE_URL.
    // Free options: Groq (https://api.groq.com/openai/v1), OpenRouter, etc.
    const key = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    if (key) {
      try {
        const letter = await this.viaLLM(input, key);
        if (letter) return { letter, source: 'ai' };
      } catch {
        // fall through to the built-in generator
      }
    }
    return { letter: buildCoverLetter(input), source: 'builtin' };
  }

  private async viaLLM(input: LetterInput, key: string): Promise<string> {
    const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const sys =
      'You are an expert career writer. Write a concise, specific, professional cover letter ' +
      '(about 200-260 words). Ground every claim in the candidate CV provided. No clichés, no ' +
      'placeholders, no markdown. Plain text only.';
    const user = `Write a cover letter for this application.

CANDIDATE:
Name: ${input.profile?.name || ''}
Target role: ${input.role?.title || ''}
Skills: ${input.role?.skills || ''}
CV text:
${(input.cvText || '').slice(0, 4000)}

JOB:
Title: ${input.job?.title || ''}
Company: ${input.job?.company || ''}
Description:
${(input.job?.description || '').slice(0, 2000)}`;

    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        temperature: 0.6,
      }),
    });
    if (!r.ok) throw new Error('LLM request failed: ' + r.status);
    const json: any = await r.json();
    return json.choices?.[0]?.message?.content?.trim() || '';
  }
}
