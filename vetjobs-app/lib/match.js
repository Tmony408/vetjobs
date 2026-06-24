// Pure helpers shared by Auto-Apply and Stats.
// INTEGRATION POINT: replace keyword matching with embeddings, and genLetter
// with a real LLM call over the full CV text + job description.

const STOP = new Set(["the", "and", "for", "with", "developer", "engineer", "manager", "officer", "remote", "senior", "junior", "specialist", "lead", "staff", "sr", "jr"]);

export function roleKeywords(role) {
  return [...(role.title || "").split(/[\s,/]+/), ...(role.skills || "").split(/[\s,]+/)]
    .map((s) => s.toLowerCase().trim())
    .filter((s) => s.length > 2 && !STOP.has(s));
}

// Job-family taxonomy: a role matches a job if they share a family — so a "Software
// Engineer" role matches backend / frontend / full-stack / web developer jobs, a
// "Product Designer" matches UI/UX / graphic designer, etc. — even without the exact title.
const CATEGORIES = {
  software: ["software", "developer", "dev", "engineer", "programmer", "frontend", "front-end", "front end", "backend", "back-end", "back end", "full stack", "full-stack", "fullstack", "web developer", "web dev", "react", "angular", "vue", "node", "javascript", "typescript", "python", "java", "golang", "php", "ruby", "mobile", "android", "ios", "flutter", "devops", "sre", "qa", "sdet", "cloud"],
  design: ["designer", "ui", "ux", "graphic", "product design", "figma", "visual", "motion", "brand design"],
  data: ["data analyst", "data scientist", "data engineer", "data", "analytics", "machine learning", "ml", "artificial intelligence", "ai", "business intelligence", "bi", "sql", "etl"],
  product: ["product manager", "product owner", "program manager", "scrum", "product"],
  marketing: ["marketing", "seo", "content", "social media", "growth", "brand", "community", "copywriter", "content writer"],
  sales: ["sales", "business development", "account executive", "account manager", "bdr", "sdr", "partnerships"],
  support: ["customer support", "customer success", "customer service", "support", "help desk", "technical support"],
  finance: ["finance", "accountant", "accounting", "bookkeeper", "financial", "auditor", "payroll"],
  writing: ["writer", "editor", "copywriter", "technical writer", "content writer", "journalist"],
  people: ["recruiter", "human resources", "hr", "talent", "people ops", "people operations"],
  operations: ["operations", "project manager", "logistics", "supply chain", "admin", "virtual assistant"],
};

function categoriesOf(text) {
  const t = " " + (text || "").toLowerCase().replace(/[\/,]/g, " ").replace(/\s+/g, " ") + " ";
  const hit = (k) => (k.length <= 3 ? t.includes(" " + k + " ") : t.includes(k)); // short tokens need word boundaries
  const cats = new Set();
  for (const [cat, kws] of Object.entries(CATEGORIES)) if (kws.some(hit)) cats.add(cat);
  return cats;
}

export function matchRoleToJob(job, roles) {
  const jobText = ((job.title || "") + " " + (job.desc || "") + " " + (job.text || "")).toLowerCase();
  const jobCats = categoriesOf((job.title || "") + " " + (job.desc || ""));
  for (const r of roles) {
    if (!r.title) continue;
    // 1) same job family (e.g. "Software Engineer" role ↔ "Backend Developer" job)
    const roleCats = categoriesOf((r.title || "") + " " + (r.skills || ""));
    for (const c of roleCats) if (jobCats.has(c)) return r;
    // 2) direct keyword / skill overlap as a fallback
    if (roleKeywords(r).some((k) => jobText.includes(k))) return r;
  }
  return null;
}

export function genLetter(company, title, roleTitle, applicantName) {
  return `Dear Hiring Manager at ${company},

I'm applying for the ${title} role. As a ${roleTitle || "candidate"}, I'm confident my skills and experience make me a strong fit for your team.

I admire ${company}'s work and would bring focus, reliability and a track record of delivering. I'd welcome the chance to discuss how I can contribute.

Best regards,
${applicantName || "Applicant"}`;
}

export function filledForm(personal, answers, role, job) {
  const why = `Because ${job.company}'s work on ${job.desc ? job.desc.split(".")[0].toLowerCase() : "this area"} fits my ${role.title || "background"} and skills.`;
  return [
    ["Full name", personal.name || "—"], ["Email", personal.email || "—"], ["Phone", personal.phone || "—"],
    ["Location", personal.loc || "—"], ["LinkedIn", personal.linkedin || "—"], ["Portfolio", personal.portfolio || "—"],
    ["CV attached", role.cvName || "—"], ["Years of experience", answers.exp || "—"],
    ["Work authorization", answers.auth || "—"], ["Salary expectation", answers.salary || "—"],
    ["Notice period", answers.notice || "—"], ["Open to relocation", answers.relocate || "—"],
    ["How did you hear", answers.heard || "VetJobs"], ["Why this role?", why],
    ["EEO / demographics", "Decline to self-identify (optional)"],
  ];
}

// Sample analytics history so the dashboard looks alive in demos.
export const DEMO_HISTORY = [
  { company: "Paystack", title: "Frontend Developer", role: "Frontend Developer", cvName: "CV_Frontend.pdf", daysAgo: 1, status: "Interview" },
  { company: "Flutterwave", title: "Product Designer", role: "Product Designer", cvName: "CV_Design.pdf", daysAgo: 2, status: "Viewed" },
  { company: "Google", title: "Junior UI/UX Designer", role: "Product Designer", cvName: "CV_Design.pdf", daysAgo: 3, status: "Applied" },
  { company: "Andela", title: "Data Analyst", role: "Data Analyst", cvName: "CV_Data.pdf", daysAgo: 5, status: "Rejected" },
  { company: "Amazon", title: "Senior UI/UX Designer", role: "Product Designer", cvName: "CV_Design.pdf", daysAgo: 7, status: "Offer" },
  { company: "Moniepoint", title: "Frontend Developer", role: "Frontend Developer", cvName: "CV_Frontend.pdf", daysAgo: 9, status: "Viewed" },
  { company: "Kuda", title: "Frontend Engineer", role: "Frontend Developer", cvName: "CV_Frontend.pdf", daysAgo: 12, status: "Applied" },
  { company: "Twitter", title: "UX Designer", role: "Product Designer", cvName: "CV_Design.pdf", daysAgo: 15, status: "Interview" },
  { company: "Bujeti", title: "Data Analyst", role: "Data Analyst", cvName: "CV_Data.pdf", daysAgo: 19, status: "Applied" },
  { company: "Airbnb", title: "Graphic Designer", role: "Product Designer", cvName: "CV_Design.pdf", daysAgo: 24, status: "Rejected" },
  { company: "Stripe", title: "Frontend Developer", role: "Frontend Developer", cvName: "CV_Frontend.pdf", daysAgo: 29, status: "Viewed" },
  { company: "Interswitch", title: "Data Analyst", role: "Data Analyst", cvName: "CV_Data.pdf", daysAgo: 34, status: "Applied" },
];

export const STATUS_COLORS = { Applied: "#15915a", Viewed: "#5cc28d", Interview: "#0f9d58", Offer: "#e0944f", Rejected: "#d64141" };
export const STATUS_ORDER = ["Applied", "Viewed", "Interview", "Offer", "Rejected"];
