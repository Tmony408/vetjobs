import { DEFAULTS } from "./config.js";

const $ = (id) => document.getElementById(id);
const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));

function show(signedIn, user) {
  $("signedOut").classList.toggle("hide", signedIn);
  $("signedIn").classList.toggle("hide", !signedIn);
  if (signedIn && user) $("who").textContent = user.email || user.name || "your account";
}

async function init() {
  const s = await send({ type: "SESSION" });
  show(!!s?.user, s?.user);
  const cfg = await chrome.storage.local.get(["API_BASE"]);
  $("apiBase").value = cfg.API_BASE || DEFAULTS.API_BASE;
}

$("signIn").onclick = async () => {
  $("err").textContent = "";
  const email = $("email").value.trim(), password = $("password").value;
  if (!email || !password) { $("err").textContent = "Enter email and password."; return; }
  $("signIn").textContent = "Signing in…"; $("signIn").disabled = true;
  const r = await send({ type: "SIGN_IN", email, password });
  $("signIn").textContent = "Sign in"; $("signIn").disabled = false;
  if (!r?.ok) { $("err").textContent = r?.error || "Sign-in failed."; return; }
  show(true, r.user);
};

$("signOut").onclick = async () => { await send({ type: "SIGN_OUT" }); show(false); };

$("refresh").onclick = async () => {
  $("err2").textContent = "Refreshing…";
  const r = await send({ type: "PROFILE", force: true });
  $("err2").textContent = r?.ok ? "Profile updated." : (r?.error || "Failed.");
};

$("fill").onclick = async () => {
  $("err2").textContent = "";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    window.close(); // let the page panel take over
  } catch (e) {
    $("err2").textContent = "Can't run on this page.";
  }
};

$("saveCfg").onclick = async () => {
  await chrome.storage.local.set({ API_BASE: $("apiBase").value.trim() || DEFAULTS.API_BASE });
  $("err2").textContent = "Saved.";
};

init();
