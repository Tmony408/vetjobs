// Live job ingestion. Runs SERVER-SIDE (in the Next /api/jobs route), so there
// are no CORS issues and API keys stay hidden. ~20 sources, run in parallel.
//
//  • No-key public APIs            → work immediately.
//  • Company ATS boards (no key)   → real postings from named companies (curate the lists).
//  • Key-gated aggregators         → set keys on the WEB service env to turn them on.
//      ADZUNA covers NIGERIA. JOOBLE covers NIGERIA. (Both have free keys.)
//
// Everything is normalised to one shape and scored by verifyJob.

import { verifyJob } from "./verify.js";

const MAX_AGE_DAYS = 14;

function stripHtml(s = "") {
  return s.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}
function daysSince(ts) {
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
}
async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "VetJobs/1.0", Accept: "application/json", ...(opts.headers || {}) }, method: opts.method || "GET", body: opts.body });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}
const titleCase = (s) => (s || "").charAt(0).toUpperCase() + (s || "").slice(1);

/* ---------------- No-key public APIs ---------------- */
async function fromArbeitnow() {
  const json = await fetchJson("https://www.arbeitnow.com/api/job-board-api");
  return (json?.data || []).map((j, i) => { const desc = stripHtml(j.description || "").slice(0, 600);
    return { id: "an_" + (j.slug || i), title: j.title || "Untitled role", company: j.company_name || "Unknown", loc: j.remote ? "Remote" : j.location || "—", pay: "—", type: (j.job_types && j.job_types[0]) || (j.remote ? "Remote" : "Full-time"), days: j.created_at ? daysSince(j.created_at * 1000) : 3, email: "", url: j.url || "", desc, text: desc, companyKnown: null, sourceTrust: 12, source: "arbeitnow", tags: (j.tags || []).slice(0, 4) }; });
}
async function fromRemotive() {
  const json = await fetchJson("https://remotive.com/api/remote-jobs?limit=100");
  return (json?.jobs || []).map((j, i) => { const desc = stripHtml(j.description || "").slice(0, 600);
    return { id: "rm_" + (j.id || i), title: j.title || "Untitled role", company: j.company_name || "Unknown", loc: j.candidate_required_location || "Remote", pay: j.salary || "—", type: j.job_type || "Full-time", days: j.publication_date ? daysSince(new Date(j.publication_date).getTime()) : 5, email: "", url: j.url || "", desc, text: desc, companyKnown: null, sourceTrust: 12, source: "remotive", tags: (j.tags || []).slice(0, 4) }; });
}
async function fromJobicy() {
  const json = await fetchJson("https://jobicy.com/api/v2/remote-jobs?count=50");
  return (json?.jobs || []).map((j, i) => { const desc = stripHtml(j.jobExcerpt || "").slice(0, 600); const type = Array.isArray(j.jobType) ? j.jobType[0] : j.jobType || "Full-time"; const tags = j.jobIndustry ? (Array.isArray(j.jobIndustry) ? j.jobIndustry : [j.jobIndustry]) : [];
    return { id: "jb_" + (j.id || i), title: j.jobTitle || "Untitled role", company: j.companyName || "Unknown", loc: j.jobGeo || "Remote", pay: "—", type, days: j.pubDate ? daysSince(new Date(j.pubDate).getTime()) : 5, email: "", url: j.url || "", desc, text: desc, companyKnown: null, sourceTrust: 11, source: "jobicy", tags: tags.slice(0, 4) }; });
}
async function fromRemoteOK() {
  const arr = await fetchJson("https://remoteok.com/api");
  const list = Array.isArray(arr) ? arr.filter((x) => x && x.position) : [];
  return list.map((j, i) => { const desc = stripHtml(j.description || "").slice(0, 600);
    return { id: "rok_" + (j.id || i), title: j.position || "Untitled role", company: j.company || "Unknown", loc: j.location || "Remote", pay: j.salary_min ? `$${j.salary_min}+` : "—", type: "Remote", days: j.date ? daysSince(new Date(j.date).getTime()) : 7, email: "", url: j.url || j.apply_url || "", desc, text: desc, companyKnown: null, sourceTrust: 11, source: "remoteok", tags: (j.tags || []).slice(0, 4) }; });
}
async function fromHimalayas() {
  const json = await fetchJson("https://himalayas.app/jobs/api?limit=50");
  return (json?.jobs || []).map((j, i) => { const desc = stripHtml(j.excerpt || j.description || "").slice(0, 600);
    return { id: "him_" + (j.guid || i), title: j.title || "Untitled role", company: j.companyName || "Unknown", loc: (j.locationRestrictions && j.locationRestrictions[0]) || "Remote", pay: "—", type: "Remote", days: j.pubDate ? daysSince(j.pubDate * 1000) : 7, email: "", url: j.applicationLink || j.url || "", desc, text: desc, companyKnown: null, sourceTrust: 11, source: "himalayas", tags: (j.categories || []).slice(0, 4) }; });
}
async function fromTheMuse() {
  const json = await fetchJson("https://www.themuse.com/api/public/jobs?page=1");
  return (json?.results || []).map((j, i) => { const desc = stripHtml(j.contents || "").slice(0, 600);
    return { id: "muse_" + (j.id || i), title: j.name || "Untitled role", company: j.company?.name || "Unknown", loc: (j.locations && j.locations[0] && j.locations[0].name) || "—", pay: "—", type: j.type || "Full-time", days: j.publication_date ? daysSince(new Date(j.publication_date).getTime()) : 7, email: "", url: j.refs?.landing_page || "", desc, text: desc, companyKnown: null, sourceTrust: 11, source: "themuse", tags: (j.categories || []).map((c) => c.name).slice(0, 4) }; });
}
async function fromWorkingNomads() {
  const json = await fetchJson("https://www.workingnomads.com/api/exposed_jobs/");
  const list = Array.isArray(json) ? json : json?.jobs || [];
  return list.slice(0, 80).map((j, i) => { const desc = stripHtml(j.description || "").slice(0, 600);
    return { id: "wn_" + (j.id || i), title: j.title || "Untitled role", company: j.company_name || "Unknown", loc: j.location || "Remote", pay: "—", type: j.category_name || "Remote", days: j.pub_date ? daysSince(new Date(j.pub_date).getTime()) : 7, email: "", url: j.url || "", desc, text: desc, companyKnown: null, sourceTrust: 11, source: "workingnomads", tags: j.tags ? String(j.tags).split(",").slice(0, 4) : [] }; });
}

/* ---------------- Company ATS boards (no key) — real, trusted postings ---------------- */
const GREENHOUSE_COMPANIES = ["gitlab", "coinbase", "robinhood", "brex", "doximity"];
const LEVER_COMPANIES = ["netlify", "plaid", "ramp"];
async function greenhouse(slug) {
  const json = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  return (json?.jobs || []).map((j) => { const desc = stripHtml(j.content || "").slice(0, 600);
    return { id: "gh_" + slug + "_" + j.id, title: j.title || "Untitled role", company: titleCase(slug), loc: (j.location && j.location.name) || "—", pay: "—", type: "Full-time", days: j.updated_at ? daysSince(new Date(j.updated_at).getTime()) : 7, email: "", url: j.absolute_url || "", desc, text: desc, companyKnown: true, sourceTrust: 15, source: "greenhouse:" + slug, tags: [] }; });
}
async function lever(slug) {
  const arr = await fetchJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  return (Array.isArray(arr) ? arr : []).map((j) => { const desc = stripHtml(j.descriptionPlain || j.description || "").slice(0, 600);
    return { id: "lv_" + slug + "_" + j.id, title: j.text || "Untitled role", company: titleCase(slug), loc: (j.categories && j.categories.location) || "—", pay: "—", type: (j.categories && j.categories.commitment) || "Full-time", days: j.createdAt ? daysSince(j.createdAt) : 7, email: "", url: j.hostedUrl || "", desc, text: desc, companyKnown: true, sourceTrust: 15, source: "lever:" + slug, tags: j.categories && j.categories.team ? [j.categories.team] : [] }; });
}

/* ---------------- Key-gated aggregators (set keys on the WEB service env) ---------------- */
async function fromAdzuna() { // NOTE: Adzuna does NOT cover Nigeria. Default 'za' (South Africa, nearest); set ADZUNA_COUNTRY for others (gb, us, in…).
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  const country = process.env.ADZUNA_COUNTRY || "za";
  const json = await fetchJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${id}&app_key=${key}&results_per_page=50`);
  return (json?.results || []).map((j, i) => { const desc = stripHtml(j.description || "").slice(0, 600);
    return { id: "adz_" + (j.id || i), title: j.title || "Untitled role", company: (j.company && j.company.display_name) || "Unknown", loc: (j.location && j.location.display_name) || "Nigeria", pay: j.salary_min ? `₦${Math.round(j.salary_min)}` : "—", type: j.contract_time || "Full-time", days: j.created ? daysSince(new Date(j.created).getTime()) : 7, email: "", url: j.redirect_url || "", desc, text: desc, companyKnown: null, sourceTrust: 13, source: "adzuna", tags: [] }; });
}
async function fromJooble() { // covers Nigeria
  const key = process.env.JOOBLE_KEY;
  if (!key) return [];
  const json = await fetchJson(`https://jooble.org/api/${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keywords: "", location: "Nigeria" }) });
  return (json?.jobs || []).map((j, i) => { const desc = stripHtml(j.snippet || "").slice(0, 600);
    return { id: "jl_" + (j.id || i), title: j.title || "Untitled role", company: j.company || "Unknown", loc: j.location || "Nigeria", pay: j.salary || "—", type: j.type || "Full-time", days: j.updated ? daysSince(new Date(j.updated).getTime()) : 7, email: "", url: j.link || "", desc, text: desc, companyKnown: null, sourceTrust: 12, source: "jooble", tags: [] }; });
}
async function fromReed() {
  const key = process.env.REED_KEY;
  if (!key) return [];
  const auth = Buffer.from(key + ":").toString("base64");
  const json = await fetchJson("https://www.reed.co.uk/api/1.0/search?resultsToTake=50", { headers: { Authorization: "Basic " + auth } });
  return (json?.results || []).map((j, i) => ({ id: "rd_" + (j.jobId || i), title: j.jobTitle || "Untitled role", company: j.employerName || "Unknown", loc: j.locationName || "UK", pay: j.minimumSalary ? `£${j.minimumSalary}` : "—", type: "Full-time", days: j.date ? daysSince(new Date(j.date).getTime()) : 7, email: "", url: j.jobUrl || "", desc: stripHtml(j.jobDescription || "").slice(0, 600), text: stripHtml(j.jobDescription || ""), companyKnown: null, sourceTrust: 12, source: "reed", tags: [] }));
}
async function fromFindwork() {
  const key = process.env.FINDWORK_KEY;
  if (!key) return [];
  const json = await fetchJson("https://findwork.dev/api/jobs/", { headers: { Authorization: "Token " + key } });
  return (json?.results || []).map((j, i) => ({ id: "fw_" + (j.id || i), title: j.role || "Untitled role", company: j.company_name || "Unknown", loc: j.location || "Remote", pay: "—", type: j.employment_type || "Full-time", days: j.date_posted ? daysSince(new Date(j.date_posted).getTime()) : 7, email: "", url: j.url || "", desc: stripHtml(j.text || "").slice(0, 600), text: stripHtml(j.text || ""), companyKnown: null, sourceTrust: 12, source: "findwork", tags: (j.keywords || []).slice(0, 4) }));
}

async function fromJSearch() { // OpenWeb Ninja direct — Google for Jobs, covers Nigeria
  const key = process.env.JSEARCH_KEY;
  if (!key) return [];
  const q = encodeURIComponent(process.env.JSEARCH_QUERY || "jobs in Nigeria");
  const json = await fetchJson(`https://api.openwebninja.com/jsearch/search-v2?query=${q}&date_posted=month`, { headers: { "x-api-key": key } });
  return (json?.data || []).map((j, i) => {
    const desc = stripHtml(j.job_description || "").slice(0, 600);
    const ts = j.job_posted_at_timestamp ? j.job_posted_at_timestamp * 1000 : j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc).getTime() : Date.now();
    const loc = [j.job_city, j.job_country].filter(Boolean).join(", ") || (j.job_is_remote ? "Remote" : "—");
    return { id: "js_" + (j.job_id || i), title: j.job_title || "Untitled role", company: j.employer_name || "Unknown", loc, pay: "—", type: j.job_employment_type || (j.job_is_remote ? "Remote" : "Full-time"), days: daysSince(ts), email: "", url: j.job_apply_link || "", desc, text: desc, companyKnown: null, sourceTrust: 13, source: "jsearch", tags: [] };
  });
}

/* ---------------- Seeded examples (always included; show the verifier catching scams) ---------------- */
const SEEDED = [
  { id: "seed_paystack", tags: ["React", "TypeScript", "Frontend"], title: "Frontend Developer (React)", company: "Paystack", loc: "Lagos / Remote", pay: "₦450k–₦650k", type: "Full-time", days: 1, email: "careers@paystack.com", url: "", companyKnown: true, sourceTrust: 16, source: "seed", desc: "React + TypeScript engineer for our payments team.", text: "Hiring a frontend developer with strong React and TypeScript skills. Apply via our careers page. No fees, ever." },
  { id: "seed_customs", tags: ["Government", "Recruitment"], title: "Customs Recruitment 2026 — Apply Now!!", company: "Federal Recruitment Office", loc: "Abuja", pay: "₦180k", type: "Govt", days: 0, email: "ncs.recruitment2026@gmail.com", url: "", companyKnown: false, sourceTrust: 0, source: "seed", desc: "", text: "Congratulations! You have been shortlisted for the Nigeria Customs recruitment. Pay ₦7,500 processing fee to secure your slot. Limited slots, act fast! WhatsApp only." },
  { id: "seed_uk", tags: ["Abroad", "Care", "Visa"], title: "UK Care Worker — Visa Sponsored", company: "EuroCare Agents", loc: "United Kingdom", pay: "£1,800/mo", type: "Abroad", days: 1, email: "eurocare.jobs@yahoo.com", url: "", companyKnown: false, sourceTrust: 0, source: "seed", desc: "", text: "Guaranteed UK care worker job with visa sponsorship! Pay ₦450,000 for LMIA and visa slot. 100% guaranteed, no interview. Send your BVN to confirm. Act fast." },
  { id: "seed_flutter", tags: ["Figma", "UI/UX", "Design"], title: "Product Designer (UI/UX)", company: "Flutterwave", loc: "Lagos / Remote", pay: "₦600k–₦900k", type: "Full-time", days: 2, email: "careers@flutterwave.com", url: "", companyKnown: true, sourceTrust: 15, source: "seed", desc: "Design flows for global payments.", text: "Product designer skilled in Figma, UI design and user research. Portfolio required. No fees at any stage." },
];

export async function getJobs() {
  const adapters = [
    fromArbeitnow, fromRemotive, fromJobicy, fromRemoteOK, fromHimalayas, fromTheMuse, fromWorkingNomads,
    ...GREENHOUSE_COMPANIES.map((c) => () => greenhouse(c)),
    ...LEVER_COMPANIES.map((c) => () => lever(c)),
    fromAdzuna, fromJooble, fromReed, fromFindwork, fromJSearch,
  ];
  const results = await Promise.allSettled(adapters.map((fn) => fn()));
  const live = results.flatMap((r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []));

  const merged = [...SEEDED, ...live]
    .filter((j) => j.days <= MAX_AGE_DAYS)
    .map((j) => ({ ...j, v: verifyJob(j) }));

  const seen = new Set();
  const deduped = merged.filter((j) => {
    const k = (j.title + "|" + j.company).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  deduped.sort((a, b) => a.days - b.days);
  return deduped.length ? deduped : SEEDED.map((j) => ({ ...j, v: verifyJob(j) }));
}
