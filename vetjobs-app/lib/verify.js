// VetJobs verification engine — the defensible core.
// Research-informed signals. INTEGRATION POINT: add CAC company lookup,
// email-domain MX check, LinkedIn/Glassdoor cross-reference, salary-vs-market,
// a community-report blocklist, and eventually an NLP/ML classifier.

const SCAM_PHRASES = [
  /processing fee/i, /registration fee/i, /application fee/i, /training fee/i, /medical fee/i,
  /form fee/i, /screening fee/i, /agent fee/i, /shortlisted/i, /congratulations/i, /act fast/i,
  /limited slots?/i, /visa slot/i, /lmia/i, /guaranteed (?:job|placement|employment)/i,
  /no (?:interview|experience needed)/i, /send (?:your )?(?:bvn|atm|account number|card)/i,
];
const FREE_EMAIL = /@(gmail|yahoo|outlook|hotmail|protonmail|ymail|aol)\./i;
const CONTACT_ONLY = /(only )?(whatsapp|telegram)( only| number)?/i;

export function verifyJob({ text = "", email = "", company = "", companyKnown = null, sourceTrust = 0 }) {
  let score = 50;
  const reasons = [];
  const good = [];
  const t = text || "";
  let hits = 0;
  SCAM_PHRASES.forEach((rx) => { if (rx.test(t)) hits++; });

  const noFee =
    /\bno (?:fees?|charges?|payments?|upfront|money)/i.test(t) ||
    /no (?:fee|payment) (?:required|at any stage)/i.test(t);
  if (!noFee && /fee|pay (?:₦|n|ngn)?\s?\d|deposit/i.test(t)) {
    score -= 35;
    reasons.push("Asks for money / a fee before employment — the #1 scam sign.");
  }
  if (noFee) { score += 6; good.push("States clearly that no fees are charged."); }
  if (hits >= 2) { score -= 16; reasons.push("Multiple classic scam phrases detected."); }
  else if (hits === 1) { score -= 7; }

  if (/(bvn|atm|account number|card number|\botp\b)/i.test(t)) {
    score -= 25; reasons.push("Requests sensitive bank details (BVN/ATM/OTP).");
  }
  if (/act fast|limited slots?|urgent|apply now or/i.test(t)) {
    score -= 8; reasons.push("Creates false urgency to rush you.");
  }
  if (/dear (candidate|applicant|sir\/madam|all)/i.test(t)) {
    score -= 6; reasons.push("Generic greeting instead of a real contact.");
  }
  if (/(₦|n)\s?\d{2,3},?\d{3}.{0,10}(weekly|per week|a week|daily)/i.test(t)) {
    score -= 14; reasons.push("Too-good-to-be-true pay.");
  }

  if (email && FREE_EMAIL.test(email)) {
    score -= 18; reasons.push(`Personal email (${email.split("@")[1]}), not a company domain.`);
  } else if (email && /@/.test(email)) {
    score += 12; good.push("Uses a company-domain email.");
    if (company) {
      const dom = email.split("@")[1].split(".")[0].toLowerCase();
      const c = company.toLowerCase().replace(/[^a-z]/g, "");
      if (c.includes(dom) || dom.includes(c.slice(0, 5))) {
        score += 8; good.push("Email domain matches the company.");
      } else {
        score -= 6; reasons.push("Email domain ≠ company name (possible impersonation).");
      }
    }
  }
  if (CONTACT_ONLY.test(t) && !/@/.test(email || "")) {
    score -= 12; reasons.push("Contact only via WhatsApp/Telegram.");
  }

  if (companyKnown === true) { score += 22; good.push("Company verified against business registry (CAC)."); }
  if (companyKnown === false) { score -= 14; reasons.push("Company not found in any registry."); }
  score += Math.min(18, sourceTrust);
  if (sourceTrust >= 12) good.push("Posted by a verified employer / reputable board.");
  if (t.length > 140 && !/fee|pay/i.test(t)) good.push("Detailed, professional posting with no payment ask.");

  score = Math.max(2, Math.min(99, Math.round(score)));
  const level = score >= 70 ? "verified" : score >= 40 ? "caution" : "risk";
  return { score, level, reasons, good };
}
