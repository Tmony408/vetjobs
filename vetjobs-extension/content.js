// Injected into the active tab when the user clicks "Fill this page".
// Scans the form, fills known fields from the profile, asks the API to answer
// free-text questions, highlights everything, shows a review panel, then submits
// only when the user confirms.
(() => {
  if (window.__vjInjected) { window.__vjStart && window.__vjStart(); return; }
  window.__vjInjected = true;

  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));

  // ---- field label resolution ----
  function labelFor(el) {
    // 1) <label for="id">
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l && l.innerText.trim()) return l.innerText.trim();
    }
    // 2) wrapping <label>
    const wrap = el.closest("label");
    if (wrap && wrap.innerText.trim()) return wrap.innerText.trim();
    // 3) aria-label / aria-labelledby
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
    const lb = el.getAttribute("aria-labelledby");
    if (lb) { const n = document.getElementById(lb); if (n) return n.innerText.trim(); }
    // 4) a preceding label-ish element in the same field group
    const grp = el.closest("div,section,fieldset,li,p");
    if (grp) {
      const cand = grp.querySelector("label,legend,.label,strong,span");
      if (cand && cand.innerText.trim() && !cand.contains(el)) return cand.innerText.trim();
    }
    // 5) placeholder / name
    return (el.placeholder || el.name || "").trim();
  }

  // ---- classify a label into a known profile field, or null (=> AI) ----
  const PROFILE = [
    [/\b(full|first and last)?\s*name\b/i, "name"],
    [/\b(e-?mail)\b/i, "email"],
    [/\b(phone|mobile|tel|whatsapp|contact number)\b/i, "phone"],
    [/\b(location|city|where.*based|country|address)\b/i, "location"],
    [/\blinkedin\b/i, "linkedin"],
    [/\b(portfolio|website|github|personal site)\b/i, "portfolio"],
  ];
  function profileKey(label) {
    for (const [re, k] of PROFILE) if (re.test(label)) return k;
    return null;
  }

  function fillable(el) {
    if (el.disabled || el.readOnly || el.type === "hidden") return false;
    if (el.offsetParent === null) return false; // not visible
    if (["password", "file", "checkbox", "radio", "submit", "button"].includes(el.type)) return false;
    if (el.value && el.value.trim()) return false; // don't overwrite what's there
    return true;
  }

  function setValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.style.outline = "2px solid #2cbd78";
    el.style.transition = "outline .3s";
  }

  function toast(text, color = "#15915a") {
    let t = document.getElementById("vj-toast");
    if (!t) { t = document.createElement("div"); t.id = "vj-toast"; document.body.appendChild(t); }
    t.textContent = text;
    Object.assign(t.style, { position: "fixed", top: "16px", right: "16px", zIndex: 2147483647,
      background: color, color: "#fff", padding: "10px 14px", borderRadius: "10px",
      font: "14px/1.3 system-ui, sans-serif", boxShadow: "0 6px 24px rgba(0,0,0,.2)" });
  }

  // ---- review + submit panel ----
  function panel(filled, review, formEl) {
    document.getElementById("vj-panel")?.remove();
    const p = document.createElement("div");
    p.id = "vj-panel";
    Object.assign(p.style, { position: "fixed", bottom: "18px", right: "18px", width: "320px",
      maxHeight: "70vh", overflow: "auto", zIndex: 2147483647, background: "#fff", color: "#0f172a",
      borderRadius: "14px", boxShadow: "0 12px 40px rgba(0,0,0,.25)", font: "13px/1.4 system-ui, sans-serif",
      border: "1px solid #e5e7eb" });
    const rows = (items, head, ok) => items.length ? `
      <div style="padding:8px 14px;font-weight:600;color:${ok ? "#15915a" : "#b45309"}">${head}</div>
      ${items.map((i) => `<div style="padding:4px 14px;color:#334155"><b>${i.label}</b><br>${i.value || "<i>— needs your input —</i>"}</div>`).join("")}` : "";
    p.innerHTML = `
      <div style="padding:14px;background:#15915a;color:#fff;font-weight:700;border-radius:14px 14px 0 0">VetJobs · Review & submit</div>
      ${rows(filled, `Filled ${filled.length} field${filled.length === 1 ? "" : "s"}`, true)}
      ${rows(review, `${review.length} need${review.length === 1 ? "s" : ""} your review`, false)}
      <div style="padding:12px 14px;display:flex;gap:8px;border-top:1px solid #eee">
        <button id="vj-submit" style="flex:1;background:#15915a;color:#fff;border:0;border-radius:9px;padding:10px;font-weight:600;cursor:pointer">${formEl ? "Submit application" : "No submit button found"}</button>
        <button id="vj-close" style="background:#f1f5f9;border:0;border-radius:9px;padding:10px;cursor:pointer">Close</button>
      </div>
      <div style="padding:0 14px 12px;color:#94a3b8">Check the highlighted fields before submitting.</div>`;
    document.body.appendChild(p);
    p.querySelector("#vj-close").onclick = () => p.remove();
    const sub = p.querySelector("#vj-submit");
    if (!formEl) sub.disabled = true;
    else sub.onclick = () => {
      if (review.length && !confirm(`${review.length} field(s) still need your input. Submit anyway?`)) return;
      const btn = formEl.querySelector('button[type="submit"], input[type="submit"]') ||
        [...formEl.querySelectorAll("button")].find((b) => /apply|submit|send/i.test(b.innerText));
      p.remove();
      if (btn) btn.click(); else formEl.requestSubmit ? formEl.requestSubmit() : formEl.submit();
    };
  }

  async function start() {
    toast("VetJobs: reading the form…");
    const prof = await send({ type: "PROFILE" });
    if (!prof?.ok) { toast(prof?.error || "Sign in via the VetJobs popup first.", "#dc2626"); return; }
    const { profile, role, cvText, answers } = prof.data;

    const form =
      document.querySelector("form") ||
      document.querySelector('[role="form"]') ||
      null;
    const scope = form || document;
    const els = [...scope.querySelectorAll("input, textarea")].filter(fillable);

    const filled = [];
    const questions = []; // { el, label }
    for (const el of els) {
      const label = labelFor(el);
      if (!label) continue;
      const key = profileKey(label);
      if (key && profile[key]) { setValue(el, profile[key]); filled.push({ label, value: profile[key] }); }
      else if (el.tagName === "TEXTAREA" || el.type === "text" || el.type === "") { questions.push({ el, label }); }
    }

    const review = [];
    if (questions.length) {
      toast(`VetJobs: writing ${questions.length} answer${questions.length === 1 ? "" : "s"}…`);
      const res = await send({
        type: "ANSWER_BATCH",
        body: { questions: questions.map((q) => q.label), profile, role, cvText, answers, length: "short" },
      });
      if (res?.ok) {
        const byQ = {};
        for (const r of res.data.results) byQ[r.question] = r;
        for (const q of questions) {
          const a = byQ[q.label];
          if (a && a.answer && !a.needsReview) { setValue(q.el, a.answer); filled.push({ label: q.label, value: a.answer }); }
          else { q.el.style.outline = "2px solid #f59e0b"; review.push({ label: q.label, value: a?.answer || "" }); }
        }
      } else {
        toast(res?.error || "Couldn't reach the answer service.", "#dc2626");
      }
    }

    toast(`VetJobs: filled ${filled.length} field${filled.length === 1 ? "" : "s"}.`);
    panel(filled, review, form);
  }

  window.__vjStart = start;
  start();
})();
