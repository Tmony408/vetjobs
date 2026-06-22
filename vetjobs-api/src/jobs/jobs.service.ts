import { Injectable } from '@nestjs/common';
import { verifyJob } from '../verify/verify.engine';

const MAX_AGE_DAYS = 14;

function stripHtml(s = ''): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function daysSince(ts: number): number {
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
}

const SEEDED = [
  {
    id: 'seed_paystack', tags: ['React', 'TypeScript', 'Frontend'],
    title: 'Frontend Developer (React)', company: 'Paystack', loc: 'Lagos / Remote',
    pay: '₦450k–₦650k', type: 'Full-time', days: 1, email: 'careers@paystack.com',
    url: '', companyKnown: true, sourceTrust: 16, source: 'seed',
    desc: 'React + TypeScript engineer for our payments team.',
    text: 'Hiring a frontend developer with strong React and TypeScript skills. Apply via our careers page. No fees, ever.',
  },
  {
    id: 'seed_customs', tags: ['Government', 'Recruitment'],
    title: 'Customs Recruitment 2026 — Apply Now!!', company: 'Federal Recruitment Office',
    loc: 'Abuja', pay: '₦180k', type: 'Govt', days: 0, email: 'ncs.recruitment2026@gmail.com',
    url: '', companyKnown: false, sourceTrust: 0, source: 'seed', desc: '',
    text: 'Congratulations! You have been shortlisted for the Nigeria Customs recruitment. Pay ₦7,500 processing fee to secure your slot. Limited slots, act fast! WhatsApp only.',
  },
  {
    id: 'seed_uk', tags: ['Abroad', 'Care', 'Visa'],
    title: 'UK Care Worker — Visa Sponsored', company: 'EuroCare Agents', loc: 'United Kingdom',
    pay: '£1,800/mo', type: 'Abroad', days: 1, email: 'eurocare.jobs@yahoo.com',
    url: '', companyKnown: false, sourceTrust: 0, source: 'seed', desc: '',
    text: 'Guaranteed UK care worker job with visa sponsorship! Pay ₦450,000 for LMIA and visa slot. 100% guaranteed, no interview. Send your BVN to confirm. Act fast.',
  },
  {
    id: 'seed_flutter', tags: ['Figma', 'UI/UX', 'Design'],
    title: 'Product Designer (UI/UX)', company: 'Flutterwave', loc: 'Lagos / Remote',
    pay: '₦600k–₦900k', type: 'Full-time', days: 2, email: 'careers@flutterwave.com',
    url: '', companyKnown: true, sourceTrust: 15, source: 'seed',
    desc: 'Design flows for global payments.',
    text: 'Product designer skilled in Figma, UI design and user research. Portfolio required. No fees at any stage.',
  },
];

@Injectable()
export class JobsService {
  private async fromArbeitnow(): Promise<any[]> {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch('https://www.arbeitnow.com/api/job-board-api', {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'VetJobs/1.0' },
      });
      clearTimeout(to);
      if (!r.ok) return [];
      const json: any = await r.json();
      return (json.data || []).map((j: any, i: number) => {
        const days = j.created_at ? daysSince(j.created_at * 1000) : 3;
        const desc = stripHtml(j.description || '').slice(0, 600);
        return {
          id: 'an_' + (j.slug || i),
          title: j.title || 'Untitled role',
          company: j.company_name || 'Unknown',
          loc: j.remote ? 'Remote' : j.location || '—',
          pay: '—',
          type: (j.job_types && j.job_types[0]) || (j.remote ? 'Remote' : 'Full-time'),
          days,
          email: '',
          url: j.url || '',
          desc,
          text: desc,
          companyKnown: null,
          sourceTrust: 12,
          source: 'arbeitnow',
          tags: (j.tags || []).slice(0, 4),
        };
      });
    } catch {
      return [];
    }
  }

  async getJobs(): Promise<any[]> {
    let live: any[] = [];
    try {
      live = await this.fromArbeitnow();
    } catch {
      live = [];
    }
    const merged = [...SEEDED, ...live]
      .filter((j) => j.days <= MAX_AGE_DAYS)
      .map((j) => ({ ...j, v: verifyJob(j) }));

    const seen = new Set<string>();
    const deduped = merged.filter((j) => {
      const k = (j.title + '|' + j.company).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    deduped.sort((a, b) => a.days - b.days);
    return deduped.length ? deduped : SEEDED.map((j) => ({ ...j, v: verifyJob(j) }));
  }
}
