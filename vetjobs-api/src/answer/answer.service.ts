import { Injectable } from '@nestjs/common';

export interface AnswerInput {
  question: string;
  // Optional context — the more we pass, the better the answer.
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    portfolio?: string;
  };
  role?: { title?: string; skills?: string };
  cvText?: string;
  // Saved answer-bank: prior answers the user wrote (exp, notice, salary, etc.).
  answers?: Record<string, string>;
  job?: { title?: string; company?: string; description?: string };
  // 'short' for one-line form fields, 'long' for paragraph questions.
  length?: 'short' | 'long';
}

export interface AnswerResult {
  answer: string;
  source: 'ai' | 'bank' | 'profile';
  // true when the model lacked the facts and the user should review/fill it.
  needsReview: boolean;
}

// Common form fields we can answer directly from the profile without an LLM.
const PROFILE_PATTERNS: Array<{ re: RegExp; key: keyof NonNullable<AnswerInput['profile']> }> = [
  { re: /\b(full|first and last)?\s*name\b/i, key: 'name' },
  { re: /\b(e-?mail)\b/i, key: 'email' },
  { re: /\b(phone|mobile|tel|whatsapp|contact number)\b/i, key: 'phone' },
  { re: /\b(location|city|where.*based|country|address)\b/i, key: 'location' },
  { re: /\blinkedin\b/i, key: 'linkedin' },
  { re: /\b(portfolio|website|github|personal site)\b/i, key: 'portfolio' },
];

// Answer-bank keys → the kinds of questions they cover.
const BANK_PATTERNS: Array<{ re: RegExp; key: string }> = [
  { re: /\b(years? of experience|how (long|many years))\b/i, key: 'exp' },
  { re: /\b(notice period|when can you start|availability|start date)\b/i, key: 'notice' },
  { re: /\b(work authoriz\w*|authoriz\w*|right to work|visa|sponsorship|eligible to work)\b/i, key: 'auth' },
  { re: /\b(salary|compensation|pay expectation|expected (salary|pay))\b/i, key: 'salary' },
  { re: /\b(relocat\w*|willing to move)\b/i, key: 'relocate' },
  { re: /\b(how did you hear|referr?al source|where did you find)\b/i, key: 'heard' },
];

@Injectable()
export class AnswerService {
  async answer(input: AnswerInput): Promise<AnswerResult> {
    const q = (input.question || '').trim();
    if (!q) return { answer: '', source: 'bank', needsReview: true };

    // 1) Direct profile fields — exact, no guessing.
    for (const p of PROFILE_PATTERNS) {
      if (p.re.test(q)) {
        const val = input.profile?.[p.key];
        if (val) return { answer: String(val), source: 'profile', needsReview: false };
      }
    }

    // 2) Saved answer-bank — the user's own prior answers.
    for (const b of BANK_PATTERNS) {
      if (b.re.test(q)) {
        const val = input.answers?.[b.key];
        if (val) return { answer: String(val), source: 'bank', needsReview: false };
      }
    }

    // 3) Anything else → let the model draft it from the CV + context.
    const key = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    if (key) {
      try {
        const out = await this.viaLLM(input, key);
        if (out) return out;
      } catch {
        // fall through
      }
    }

    // 4) No LLM and nothing saved → flag for the user.
    return { answer: '', source: 'bank', needsReview: true };
  }

  private async viaLLM(input: AnswerInput, key: string): Promise<AnswerResult | null> {
    const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const wantShort = input.length === 'short';

    const sys = [
      'You are filling out a job application AS the candidate, in first person.',
      'Use ONLY facts present in the CV, profile, and saved answers provided.',
      'Never invent employers, dates, degrees, numbers, or credentials that are not given.',
      'If the question asks for a fact you genuinely cannot determine from the context',
      '(e.g. a specific salary figure, a visa status, an exact date), reply with the single',
      'token NEEDS_USER_INPUT and nothing else.',
      wantShort
        ? 'Otherwise answer in one short sentence or phrase suitable for a small form field.'
        : 'Otherwise answer in a concise, specific paragraph (max ~120 words).',
      'Plain text only. No markdown, no preamble, no quotes around the answer.',
    ].join(' ');

    const ctx = `QUESTION:
${input.question}

CANDIDATE PROFILE:
Name: ${input.profile?.name || ''}
Location: ${input.profile?.location || ''}
LinkedIn: ${input.profile?.linkedin || ''}
Portfolio: ${input.profile?.portfolio || ''}
Target role: ${input.role?.title || ''}
Skills: ${input.role?.skills || ''}

SAVED ANSWERS (the candidate's own words; reuse where relevant):
${Object.entries(input.answers || {})
  .filter(([, v]) => v)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '(none)'}

CV TEXT:
${(input.cvText || '').slice(0, 4000) || '(none provided)'}

${input.job ? `JOB: ${input.job.title || ''} at ${input.job.company || ''}\n${(input.job.description || '').slice(0, 1200)}` : ''}`;

    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: ctx },
        ],
        temperature: 0.4,
      }),
    });
    if (!r.ok) throw new Error('LLM request failed: ' + r.status);
    const json: any = await r.json();
    const text = (json.choices?.[0]?.message?.content || '').trim();
    if (!text) return null;
    if (/^NEEDS_USER_INPUT\b/i.test(text)) {
      return { answer: '', source: 'ai', needsReview: true };
    }
    return { answer: text, source: 'ai', needsReview: false };
  }
}
