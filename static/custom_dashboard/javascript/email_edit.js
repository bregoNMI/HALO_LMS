// ===== helpers
const $ = (s) => document.querySelector(s);
function getCookie(name){const v=document.cookie.match('(^|;)\\s*'+name+'\\s*=\\s*([^;]+)');return v? v.pop() : '';}

const EMAIL_KEYS = JSON.parse(document.getElementById("email-keys").textContent);      // {key: label}
const ALLOWED_VARS_MAP = JSON.parse(document.getElementById("allowed-vars-map").textContent); // {key: [vars]}

let currentKey = document.getElementById("emailEditor").dataset.key;

// ===== sidebar render (unchanged)
const list = $("#templateList");
for (const [key, label] of Object.entries(EMAIL_KEYS)) {
  const btn = document.createElement("button");
  btn.className = "template-item" + (key === currentKey ? " active" : "");
  btn.dataset.key = key;
  btn.textContent = label;
  list.appendChild(btn);
}

// ===== interactions (unchanged)
list.addEventListener("click", (e) => {
  const btn = e.target.closest(".template-item");
  if (!btn) return;
  document.querySelectorAll(".template-item").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  currentKey = btn.dataset.key;
  $("#emailEditor").dataset.key = currentKey;
  $("#templateTitle").textContent = EMAIL_KEYS[currentKey] || currentKey;
  setAllowedVars(currentKey);
  loadTemplate(currentKey);
});

document.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  const target = tab.dataset.tab;
  $("#htmlPanel").classList.toggle("hidden", target !== "html");
  $("#textPanel").classList.toggle("hidden", target !== "text");
});

$("#tplLocale").addEventListener("change", () => loadTemplate(currentKey));
$("#previewBtn").addEventListener("click", previewTemplate);
$("#saveBtn").addEventListener("click", saveTemplate);
$("#testBtn").addEventListener("click", sendTest);

function setAllowedVars(key){
  const vars = (ALLOWED_VARS_MAP[key] || []).map(v => `<code>${v}</code>`).join(", ");
  $("#allowedVars").innerHTML = vars || "<em>None</em>";
}

async function loadTemplate(key){
  const locale = $("#tplLocale").value;
  const r = await fetch(`/admin/templates/emails/${key}/?locale=${encodeURIComponent(locale)}`, { credentials: "same-origin" });
  const data = await r.json();
  $("#templateTitle").textContent = EMAIL_KEYS[key] || key;
  $("#tplSubject").value = data.subject_template || "";
  $("#tplHtml").value = data.html_template || "";
  $("#tplText").value = data.text_template || "";
  $("#previewArea").classList.add("hidden");

  // Optional banner if these are defaults (not yet saved)
  const defaultBanner = document.getElementById("defaultBanner");
  if (defaultBanner) defaultBanner.classList.toggle("hidden", !data.is_default);
}

async function previewTemplate(){
  const key = currentKey;
  const locale = $("#tplLocale").value;
  const body = new URLSearchParams({
    locale,
    subject_template: $("#tplSubject").value,
    html_template: $("#tplHtml").value,
    text_template: $("#tplText").value,
  });
  const r = await fetch(`/admin/templates/emails/${key}/preview/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-CSRFToken": getCookie('csrftoken') },
    credentials: "same-origin",
    body
  });
  if (!r.ok) { alert(await r.text() || "Preview failed"); return; }
  const data = await r.json();
  $("#previewSubject").textContent = data.subject || "";
  $("#previewText").textContent = data.text || "";
  const iframe = $("#previewHtml");
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(data.html || "<p>(no HTML)</p>"); doc.close();
  $("#previewArea").classList.remove("hidden");
}

async function saveTemplate(){
  const key = currentKey;
  const locale = $("#tplLocale").value;
  const body = new URLSearchParams({
    locale,
    subject_template: $("#tplSubject").value,
    html_template: $("#tplHtml").value,
    text_template: $("#tplText").value,
  });
  const r = await fetch(`/admin/templates/emails/${key}/save/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-CSRFToken": getCookie('csrftoken') },
    credentials: "same-origin",
    body
  });
  if (!r.ok) { alert(await r.text() || "Save failed"); return; }
  alert("Saved!");
  // After save, you could re-load to clear the default banner:
  loadTemplate(key);
}

async function sendTest(){
  const params = new URLSearchParams({ key: currentKey, locale: $("#tplLocale").value });
  const r = await fetch(`/admin/templates/emails/test/?${params.toString()}`, { credentials: "same-origin" });
  const data = await r.json().catch(()=>null);
  if (!r.ok || !data?.queued) { alert("Test send failed"); return; }
  alert(`Queued test email (${currentKey}). Task: ${data.task_id}`);
}

// initial load
setAllowedVars(currentKey);
loadTemplate(currentKey);