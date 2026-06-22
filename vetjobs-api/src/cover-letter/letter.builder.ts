// Application-grade cover-letter generator (used when no LLM key is configured).
// Mines the CV text + job description so the output is grounded in real detail.

export interface Profile {
  name?: string; email?: string; phone?: string; location?: string; linkedin?: string;
}
export interface RoleInfo { title?: string; skills?: string; }
export interface JobInfo { title?: string; company?: string; description?: string; location?: string; }
export interface LetterInput { profile?: Profile; role?: RoleInfo; job?: JobInfo; cvText?: string; }

const STOP = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'will', 'that', 'this', 'have', 'from',
  'they', 'their', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'as', 'is', 'be', 'we', 'or', 'it', 'by',
  'role', 'team', 'work', 'job',
]);

function words(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function matchedSkills(role: RoleInfo, job: JobInfo, cvText: string): string[] {
  const declared = (role?.skills || '').split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  const jobWords = new Set(words(job?.description || ''));
  const inJob = declared.filter((s) => jobWords.has(s.toLowerCase()));
  const ranked = [...inJob, ...declared.filter((s) => !inJob.includes(s))];
  return [...new Set(ranked)].slice(0, 4);
}

function yearsOfExperience(cvText: string): string | null {
  const m = (cvText || '').match(/(\d{1,2})\s*\+?\s*years?/i);
  return m ? `${m[1]}+ years` : null;
}

const ACTION = /^(built|led|shipped|launched|improved|increased|reduced|designed|developed|created|delivered|managed|grew|scaled|automated|implemented|drove|cut|boosted|raised|founded|optimi[sz]ed)/i;
function achievement(cvText: string): string | null {
  const sentences = (cvText || '').split(/(?<=[.!?])\s+/).map((s) => s.trim().replace(/[.!?]+$/, ''));
  const ok = (s: string) => s.length > 20 && s.length < 220;
  // Prefer an action-verb sentence with a number (a real accomplishment)…
  let pick = sentences.find((s) => ACTION.test(s) && /\d/.test(s) && ok(s));
  // …then any hard metric, but skip "X years of experience" self-descriptions…
  if (!pick) pick = sentences.find((s) => /\d+\s*(%|percent|k\b|,\d{3})/i.test(s) && !/years? (of )?experience/i.test(s) && ok(s));
  // …then any action-verb sentence.
  if (!pick) pick = sentences.find((s) => ACTION.test(s) && ok(s));
  return pick ? pick.replace(/\s+/g, ' ') : null;
}

function firstSentence(s: string): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const m = t.match(/^.*?[.!?]/);
  return (m ? m[0] : t).slice(0, 200).replace(/[.!?]$/, '');
}

export function buildCoverLetter(input: LetterInput): string {
  const profile = input.profile || {};
  const role = input.role || {};
  const job = input.job || {};
  const cvText = input.cvText || '';

  const company = job.company || 'your company';
  const title = job.title || role.title || 'this role';
  const skills = matchedSkills(role, job, cvText);
  const skillPhrase = skills.length
    ? skills.slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' and $1')
    : role.title || 'the required areas';
  const years = yearsOfExperience(cvText);
  const win = achievement(cvText);

  const header = [
    profile.name,
    [profile.email, profile.phone].filter(Boolean).join(' · '),
    [profile.location, profile.linkedin].filter(Boolean).join(' · '),
  ].filter(Boolean).join('\n');

  const p1 =
    `I am writing to apply for the ${title} position at ${company}. ` +
    `${years ? `With ${years} of experience` : 'As a practitioner'} in ${skillPhrase}, ` +
    `I'm keen to bring that strength to ${company}.`;

  const p2 = win
    ? `In my recent work I ${win.charAt(0).toLowerCase() + win.slice(1)}. ` +
      `That experience maps directly to what this position calls for, and I'm confident I can contribute from day one.`
    : `My background has given me hands-on strength in ${skillPhrase}, the core of what this position calls for, and I move quickly from learning a system to delivering in it.`;

  const p3 =
    `What draws me to ${company} is the chance to do work that matters alongside a strong team. ` +
    `I'm reliable, detail-oriented, and I care about outcomes, not just tasks.`;

  const p4 =
    `I would welcome the chance to discuss how my experience in ${skillPhrase} can support your team. ` +
    `Thank you for your time and consideration.`;

  return [
    header ? header + '\n' : '',
    `Dear Hiring Manager at ${company},`,
    p1, p2, p3, p4,
    `Sincerely,\n${profile.name || 'Applicant'}`,
  ].filter(Boolean).join('\n\n');
}
