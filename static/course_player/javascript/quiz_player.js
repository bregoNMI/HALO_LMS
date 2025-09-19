document.addEventListener("DOMContentLoaded", function () {
  if (window.__QUIZ_PLAYER_BOOTED__) return;
  window.__QUIZ_PLAYER_BOOTED__ = true;

  const SAVE_URL = window.saveQuizProgressUrl;

  // --- small helpers ---
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
  const csrftoken = getCookie("csrftoken");
  window.csrftoken = getCookie('csrftoken');

  const mount = document.getElementById("questionMount");
  const nextButton = document.getElementById("nextQuestionBtn");
  const currentNumEl = document.getElementById("currentQuestionNumber");
  const totalCountEl = document.getElementById("totalQuestionsCount");

  let position = 0;
  let totalQuestions = parseInt(totalCountEl?.textContent || "0", 10) || 0;
  let isLast = false;

  // -------- media helpers (unchanged from your last message) --------
  function extractEmbedSrc(html) {
    if (!html) return null;
    const m = html.match(/src=["']([^"']+)["']/i);
    return m ? m[1] : null;
  }
  function isImageUrl(u) {
    if (!u) return false;
    const l = u.toLowerCase();
    return l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png") || l.endsWith(".gif") || l.endsWith(".webp");
  }
  function mediaTypeFromUrl(u) {
    if (!u) return "document";
    const l = u.toLowerCase();
    if (isImageUrl(l)) return "image";
    if (l.endsWith(".mp4")) return "video";
    if (l.endsWith(".mp3")) return "audio";
    if (l.endsWith(".pdf")) return "pdf";
    return "document";
  }
  function iconForType(t) {
    switch (t) {
      case "pdf": return "fa-light fa-file-pdf";
      case "audio": return "fa-light fa-volume";
      case "video": return "fa-light fa-film";
      case "image": return "fa-light fa-image";
      case "document": return "fa-light fa-file-doc";
      case "embed": return "fa-light fa-link";
      default: return "fa-light fa-file";
    }
  }
  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function isLikelyHtml(s) { return !!s && /<[^>]+>/.test(s); }
  function isLikelyUrl(s) { return !!s && /^https?:\/\//i.test(s.trim()); }

  // -------- render helpers --------
  function renderMedia(mi) {
    if (mi.source_type === "embed" && isLikelyHtml(mi.embed_code)) {
      return `<div class="media-embed">${mi.embed_code}</div>`;
    }
    const url = mi.file_url || mi.url_from_library || extractEmbedSrc(mi.embed_code);
    if (!url || !isImageUrl(url)) return "";
    return `
      <div class="media-image-wrapper">
        <img src="${url}" alt="${escapeHtml(mi.title || "")}" class="toggle-expand-image" style="cursor:zoom-in;">
      </div>`;
  }

  function splitMedia(mediaItems) {
    const imagesAndEmbedsHTML = [];
    const references = [];

    (mediaItems || []).forEach(mi => {
      if (mi.source_type === "embed" && isLikelyHtml(mi.embed_code)) {
        imagesAndEmbedsHTML.push(renderMedia(mi));
        return;
      }

      const url = mi.file_url || mi.url_from_library || extractEmbedSrc(mi.embed_code);
      const title = mi.title || url || "Embedded content";

      if (isImageUrl(url)) {
        imagesAndEmbedsHTML.push(renderMedia(mi));
        return;
      }

      if (mi.source_type === "embed" && !isLikelyHtml(mi.embed_code) && isLikelyUrl(mi.embed_code)) {
        references.push({ title: mi.embed_code, url: mi.embed_code, type: "embed" });
        return;
      }

      const type = mi.source_type === "embed" && !url ? "embed" : mediaTypeFromUrl(url);
      if (url) references.push({ title, url, type });
    });

    return { imagesAndEmbedsHTML, references };
  }

  function populateReferencesList(refs) {
    const btn = document.getElementById("toggleReferencesBtn");
    const list = btn ? btn.querySelector(".quiz-player-references") : null;
    if (!btn || !list) return;

    if (!refs.length) {
      list.innerHTML = "";
      btn.style.display = "none";
      return;
    }

    list.innerHTML = refs.map(r => {
      const icon = iconForType(r.type);
      if (r.url) {
        return `
          <a href="${r.url}" target="_blank" class="reference-item">
            <div class="reference-item-left">
              <div class="reference-icon pastel-blue"><i class="${icon}"></i></div>
              <div class="reference-text"><h4>${escapeHtml(r.title)}</h4></div>
            </div>
            <div class="reference-item-right"><i class="fa-regular fa-arrow-up-right-from-square"></i></div>
          </a>`;
      }
      return `
        <div class="reference-item disabled" tabindex="-1" aria-disabled="true">
          <div class="reference-item-left">
            <div class="reference-icon pastel-blue"><i class="${icon}"></i></div>
            <div class="reference-text"><h4>${escapeHtml(r.title)}</h4></div>
          </div>
        </div>`;
    }).join("");

    btn.style.display = "inline-flex";
  }

  // Fisher–Yates
  function shuffleArray(arr) {
    const a = arr.slice(); // don't mutate original
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function answersForRender(question) {
    const type = question.question_type;
    const isMR = question.allows_multiple || type === "MRQuestion";
    const isMC = type === "MCQuestion";
    if ((isMC || isMR) && question.randomize_answer_order) {
      return shuffleArray(question.answers || []);
    }
    return question.answers || [];
  }

  function renderAnswers(question) {
    const type = question.question_type;
    const disabledBtn = `<button id="submitQuestionBtn" class="submit-question-btn quiz-player-btn action-button-primary rounded-lg margin-top-8 disabled hidden" disabled>Submit</button>`;
    console.log(question);

    // Multi-prompt essay
    if (type === "EssayQuestion" && (question.essay_prompts || []).length > 0) {
      const promptsHTML = question.essay_prompts.map((p, i) => `
        <div class="essay-prompt-block edit-user-input margin-bottom-9" data-prompt-id="${p.id}">
          <label class="essay-prompt-label"><strong>${i + 1}.</strong> ${p.prompt_text}</label>
          <textarea name="answer" class="essay-response" data-prompt-id="${p.id}" rows="5" cols="60" placeholder="Type your answer here..."></textarea>
        </div>
      `).join("");
      return `<div class="essay-prompts">${promptsHTML}</div>${disabledBtn}`;
    }

    if (type === "EssayQuestion") {
      return `
        <div class="edit-user-input question-answer-container">
          <textarea name="answer" class="essay-response" rows="5" cols="60" placeholder="Type your answer here..." autocomplete="off"></textarea>
        </div>
        <br>${disabledBtn}`;
    }

    if (type === "FITBQuestion") {
      return `
        <div class="edit-user-input question-answer-container">
          <input type="text" name="answer" class="fitb-response" placeholder="Type your answer here..." autocomplete="off">
          <div id="FITBAcceptableAnswers" class="question-answers-subtext hidden"></div>
        </div>
        <br>${disabledBtn}`;
    }

    if (question.answers && question.answers.length) {
      const isMR = question.allows_multiple || type === "MRQuestion";
      const renderList = answersForRender(question);   // <-- shuffle when needed

      console.log('Rendered order:', renderList.map(a => a.id));

      const inputs = renderList.map(a => `
        <div class="quiz-answer-item" data-answer-id="${a.id}">
          <label class="container answer-option ${isMR ? '' : 'custom-radio'}">
            <span>${a.text}</span>
            ${isMR ? `
              <input class="checkbox-option" type="checkbox" name="answer" value="${a.id}">
              <div class="checkmark"></div>
            ` : `
              <input class="radio-option" type="radio" name="answer" value="${a.id}">
              <span class="custom-radio-button"></span>
            `}
          </label>
        </div>`).join("");

      return `<div class="quiz-answers-container">${inputs}</div>${disabledBtn}`;
    }

    return `<p><em>No answer options available for this question.</em></p>`;
  }

  function renderQuestion(qjson, meta) {
    const { imagesAndEmbedsHTML, references } = splitMedia(qjson.media_items);
    const mediaHTML = imagesAndEmbedsHTML.length
      ? `<div class="question-media margin-bottom-5">${imagesAndEmbedsHTML.join("")}</div>` : "";
    
    const essayInstructionsHTML =
    (qjson.question_type === "EssayQuestion" && qjson.essay_instructions && qjson.essay_instructions != '<p><br></p>')
      ? `<div class="assignment-instructions margin-bottom-4">
            <b>Instructions:</b> ${qjson.essay_instructions}
        </div>`
      : "";

    const html = `
      <div class="quiz-question"
          data-question-id="${qjson.id}"
          data-question-type="${qjson.question_type}"
          data-has-media="${qjson.has_media ? "true" : "false"}">

        <div class="quiz-question-title margin-bottom-5">
          <h4>${qjson.content}</h4>
        </div>

        ${essayInstructionsHTML}
        ${mediaHTML}
        
        ${renderAnswers(qjson)}

        <div id="questionFeedback" class="question-feedback hidden" aria-live="polite"></div>
      </div>`;
    mount.innerHTML = html;

    if (currentNumEl) currentNumEl.textContent = String(meta.display_index);
    if (totalCountEl) totalCountEl.textContent = String(meta.total);
    totalQuestions = meta.total;
    isLast = meta.is_last;

    // keep local position & persist to server so we can resume
    position = meta.position;
    saveProgress({ position: meta.position });

    populateReferencesList(references);

    const btn = mount.querySelector(".submit-question-btn");
    if (btn) btn.addEventListener("click", () => submitCurrentAnswer(btn));
    bindExpanders();

    setupSubmitGatekeeping();
    fadeIn('submitQuestionBtn');
    document.getElementById('questionNavigation').classList.add('hidden');;
  }

  function bindExpanders() {
    document.querySelectorAll('.toggle-expand-image').forEach(img => {
      img.addEventListener('click', function () {
        const expanded = img.classList.toggle('expanded');
        if (expanded) {
          img.style.maxWidth = "unset";
          img.style.maxHeight = "unset";
          img.style.cursor = "zoom-out";
        } else {
          img.style.maxWidth = "unset";
          img.style.maxHeight = "10rem";
          img.style.cursor = "zoom-in";
        }
      });
    });
    document.querySelectorAll('.toggle-expand-pdf').forEach(iframe => {
      iframe.addEventListener('click', function () {
        const expanded = iframe.classList.toggle('expanded');
        iframe.style.height = expanded ? "800px" : "300px";
        iframe.style.cursor = expanded ? "zoom-out" : "zoom-in";
      });
    });
  }

  // ----- enable/disable submit gating -----
  function setupSubmitGatekeeping() {
    const root = mount.querySelector(".quiz-question");
    const btn  = root?.querySelector(".submit-question-btn");
    if (!btn) return;

    const requireAllEssayPrompts = true; // flip to false to allow “any one” prompt

    function recompute() {
      let enabled = false;

      const radios = root.querySelectorAll("input[name='answer'][type='radio']");
      const checks = root.querySelectorAll("input[name='answer'][type='checkbox']");
      const promptAreas = root.querySelectorAll('.essay-response[data-prompt-id]');
      const singleText  = root.querySelector("textarea[name='answer']:not([data-prompt-id]), input[name='answer']:not([type='radio']):not([type='checkbox'])");

      if (radios.length) enabled = [...radios].some(r => r.checked);
      if (checks.length) enabled = enabled || [...checks].some(c => c.checked);

      if (promptAreas.length) {
        const vals = [...promptAreas].map(el => (el.value || "").trim().length > 0);
        enabled = requireAllEssayPrompts ? vals.every(Boolean) : vals.some(Boolean);
      } else if (singleText) {
        enabled = enabled || (singleText.value.trim().length > 0);
      }

      btn.disabled = !enabled;
      btn.classList.toggle("disabled", !enabled);
    }

    root.querySelectorAll("input[name='answer'][type='radio'], input[name='answer'][type='checkbox']")
        .forEach(el => el.addEventListener("change", recompute));
    root.querySelectorAll(".essay-response, input[name='answer']:not([type='radio']):not([type='checkbox'])")
        .forEach(el => el.addEventListener("input", recompute));

    recompute();
  }

  function setFeedback(html) {
    const box = mount.querySelector(".question-feedback");
    if (box) box.innerHTML = html;
    fadeIn('questionFeedback');
  }

  function collectAnswer() {
    const root = mount.querySelector(".quiz-question");
    const qType = root?.dataset.questionType;

    // ✅ Multi-prompt essay: collect array of {prompt_id, text}
    if (qType === "EssayQuestion") {
      const promptAreas = [...root.querySelectorAll('.essay-response[data-prompt-id]')];
      if (promptAreas.length > 0) {
        const answers = promptAreas.map(el => ({
          prompt_id: String(el.dataset.promptId),
          text: (el.value || "").trim()
        }));
        return { qType, answer: answers };
      }
      // Fallback: single textarea
      const single = root.querySelector("textarea[name='answer']");
      return { qType, answer: (single?.value || "").trim() };
    }else if (qType === "FITBQuestion") {
      const fields = [...root.querySelectorAll('input[name="answer"], textarea[name="answer"]')];
      const values = fields.map(el => (el.value ?? "").trim());

      // If only one field, return a string; if multiple, return an array
      return { qType, answer: values.length <= 1 ? (values[0] || "") : values };
    }

    // ✅ MR
    const checks = [...mount.querySelectorAll("input[name='answer'][type='checkbox']:checked")];
    if (checks.length) return { qType: "MRQuestion", answer: checks.map(i => i.value) };

    // ✅ MC/TF
    const sel = mount.querySelector("input[name='answer'][type='radio']:checked");
    return { qType, answer: sel ? sel.value : null };
  }

  const STRICT_MARK_ALL = false;
  const DEBUG_QUIZ = true;

  // Find where to place the icon per option (MC/TF radio OR MR checkbox)
  function getIconHost(wrap) {
    // MC/TF: <span class="custom-radio-button">
    let host = wrap.querySelector('.custom-radio-button');
    if (host) return host;

    // MR: <div class="checkmark"></div>
    host = wrap.querySelector('.checkmark');
    if (host) return host;

    // Fallback (shouldn't happen with your markup). Keep HTML intact.
    const label = wrap.querySelector('label');
    const stub  = document.createElement('span');
    stub.className = 'qa-icon-host'; // inert container
    (label || wrap).appendChild(stub);
    return stub;
  }

  // Remove any old icons from a host before adding a new one
  function clearOldIcons(host) {
    host.querySelectorAll('.qa-option-icon').forEach(n => n.remove());
    host.classList.remove('icon-correct','icon-incorrect','icon-neutral');
  }

  // Add FA icon + color class and fade it in (uses your fadeIn helper)
  function addIcon(host, iconClass, colorClass) {
    host.classList.add(colorClass);
    host.classList.remove('custom-radio-button', 'checkmark');

    const i = document.createElement('i');
    i.className = iconClass + ' qa-option-icon hidden';
    host.appendChild(i);

    if (typeof fadeIn === 'function') {
      fadeIn(i);
    } else {
      requestAnimationFrame(() => i.classList.remove('hidden'));
    }
  }

  function applyOptionIcons(byId, correctIds) {
    byId.forEach((wrap, id) => {
      const input   = wrap.querySelector('input[name="answer"]');
      const host    = getIconHost(wrap);

      // Reset JUST our icon, don't touch your native UI classes
      clearOldIcons(host);

      const isCorrect  = correctIds.includes(String(id));
      const isSelected = !!(input && input.checked);

      // Neutral default for non-selected incorrects
      let iconClass  = 'fa-regular fa-circle-xmark';
      let colorClass = 'icon-incorrect';

      if (isCorrect) {
        iconClass  = 'fa-regular fa-circle-check';
        colorClass = 'icon-correct';
      } else if (isSelected) {
        iconClass  = 'fa-regular fa-circle-xmark';
        colorClass = 'icon-incorrect';
      }

      addIcon(host, iconClass, colorClass);
    });
  }

  // Mark correct/incorrect classes AND swap icons
  function markChoicesFeedback(serverType, data) {
    if (!["MCQuestion", "MRQuestion", "TFQuestion"].includes(serverType)) return false;

    const inputs = [...mount.querySelectorAll('.quiz-answer-item input[name="answer"]')];

    // Map id -> wrapper
    const byId = new Map();
    inputs.forEach(input => {
      const wrap = input.closest('.quiz-answer-item');
      if (!wrap) return;
      const id = String(input.value);
      wrap.dataset.answerId = id;
      byId.set(id, wrap);
    });

    const selectedIds = inputs.filter(i => i.checked).map(i => String(i.value));
    // normalize ids to strings
    const correctIds = (data.correct_answer_ids || []).map(String);

    // Clear previous and disable inputs
    byId.forEach(wrap => wrap.classList.remove('qa-correct', 'qa-incorrect'));
    byId.forEach(wrap => wrap.classList.add('answered-question'));
    inputs.forEach(i => i.disabled = true);

    if (STRICT_MARK_ALL) {
      byId.forEach((wrap, id) => {
        if (correctIds.includes(id)) wrap.classList.add('qa-correct');
        else wrap.classList.add('qa-incorrect');
      });
    } else {
      byId.forEach((wrap, id) => {
        const isCorrect  = correctIds.includes(id);
        const isSelected = selectedIds.includes(id);
        if (isCorrect) wrap.classList.add('qa-correct');
        if (isSelected && !isCorrect) wrap.classList.add('qa-incorrect');
        if(isSelected){ wrap.classList.add('selected-answer');}
      });
    }

    // 🔁 Swap FA icons based on correctness/selection
    applyOptionIcons(byId, correctIds);

    if (DEBUG_QUIZ) {
      console.group('[Quiz Debug] Marked');
      console.log('All IDs:', [...byId.keys()]);
      console.log('Selected:', selectedIds);
      console.log('Correct:', correctIds);
      console.groupEnd();
    }
    return true;
  }

  function lockAllQuestionInputs() {
    const root = mount.querySelector(".quiz-question");
    if (!root) return;

    // Lock MC/MR/TF choices
    root.querySelectorAll('.quiz-answer-item input[name="answer"]').forEach(inp => {
      inp.disabled = true;
      const wrap = inp.closest('.quiz-answer-item');
      if (wrap) wrap.classList.add('answered-question');
    });

    // Lock open responses (Essay + FITB)
    root.querySelectorAll('.essay-response, .fitb-response').forEach(el => {
      el.readOnly = true;
      el.setAttribute("aria-readonly", "true");
      el.classList.add("answered-question", "readonly-field");
      el.blur();
    });

    // Hide/freeze the submit button
    const btn = root.querySelector(".submit-question-btn");
    if (btn) {
      btn.disabled = true;
      btn.classList.add("disabled", "hidden");
    }
  }

  // ----- submit -----
  async function submitCurrentAnswer(btnEl) {
    if (btnEl.disabled) return;

    const qRoot = mount.querySelector(".quiz-question");
    const qId = qRoot?.dataset.questionId;
    const { qType, answer } = collectAnswer();
    btnEl.disabled = true;

    try {
      const res = await fetch(window.submitQuestionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
        body: JSON.stringify({ lesson_id: window.lessonId, question_id: qId, answer, position })
      });
      const data = await res.json();

      const serverType = data.question_type || qType;
      const FITBAcceptableAnswers = document.getElementById('FITBAcceptableAnswers');
      console.log(window.revealAnswers);

      if (window.revealAnswers === true) {
        if (["MCQuestion","MRQuestion","TFQuestion"].includes(serverType)) {
          markChoicesFeedback(serverType, data);
          setFeedback(
            data.is_correct === true
              ? `<span class="correct-feedback"><i class="fa-regular fa-circle-check"></i> Correct</span>`
              : `<span class="incorrect-feedback"><i class="fa-regular fa-circle-xmark"></i> Incorrect</span>`
          );
        } else {
          const correctText = (data.correct_answers || []).join(", ");
          if (data.is_correct === true) {
            setFeedback(`<span class="correct-feedback"><i class="fa-regular fa-circle-check"></i> Correct</span>`);
            if (serverType === "FITBQuestion" && FITBAcceptableAnswers) {
              FITBAcceptableAnswers.innerHTML = `<span>Acceptable answers: ${correctText}</span>`;
              fadeIn('FITBAcceptableAnswers');
            }
          } else if (data.is_correct === false) {
            if (serverType === "FITBQuestion" && FITBAcceptableAnswers) {
              setFeedback(`<span class="incorrect-feedback"><i class="fa-regular fa-circle-xmark"></i> Incorrect</span>`);
              FITBAcceptableAnswers.innerHTML = `<span>Acceptable answers: ${correctText}</span>`;
              fadeIn('FITBAcceptableAnswers');
            } else {
              setFeedback(`<span class="incorrect-feedback"><i class="fa-regular fa-circle-xmark"></i> Incorrect. Correct answer: ${correctText}</span>`);
            }
          } else {
            setFeedback(`<span class="neutral-feedback"><i class="fa-regular fa-paper-plane"></i> Answer submitted</span>`);
          }
        }
      } else {
        setFeedback(`<span class="neutral-feedback"><i class="fa-regular fa-paper-plane"></i> Answer submitted</span>`);
      }

      lockAllQuestionInputs();
      // persist current position (even if they don’t click next)
      await saveProgress({ position });

      fadeIn('questionNavigation');
    } catch (e) {
      console.error("❌ Failed to submit answer", e);
      alert("Failed to submit answer. Try again.");
      btnEl.disabled = false;
      btnEl.classList.remove("disabled");
    }
  }

  // ----- navigation -----
  async function loadQuestion(pos) {
    if (typeof window.fetchQuestionUrl !== "function") {
      throw new Error("window.fetchQuestionUrl is not defined");
    }
    const url = window.fetchQuestionUrl(pos);
    const res = await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} at ${url} — ${body}`);
    }
    const data = await res.json();

    totalQuestions = Number(data?.meta?.total) || totalQuestions || 0;
    const serverPos = data?.meta?.position;
    position = (typeof serverPos === "number") ? serverPos : pos;

    renderQuestion(data.question, data.meta);
    tuneNextButton(Boolean(data?.meta?.is_last));
  }

  function tuneNextButton(last) {
    if (!nextButton) return;
    nextButton.textContent = last ? "Finish" : "Next Question";
    nextButton.onclick = async () => {
      if (last) {
        await saveProgress({ position, isFinished: true });
        await showFinalForSession(window.lessonAttemptId); // ← use the attempt id variable
      } else {
        try {
          await loadQuestion(position + 1);
          await saveProgress({ position });
        } catch (e) {
          console.error(e);
          alert("Failed to load next question.");
        }
      }
      document.getElementById('questionNavigation')?.classList.add('hidden');
    };
  }

  async function showFinal() {
    try {
      if (!window.lessonSessionId) {
        throw new Error("[showFinal] Missing window.lessonSessionId");
      }
      const url = `${window.getScoreUrl}?attempt_id=${encodeURIComponent(window.lessonAttemptId)}`;
      const res = await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
      const raw = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw}`);
      const data = JSON.parse(raw);

      const gradeContainer = document.createElement('div');
      gradeContainer.className = 'max-width-1 margin-top-8';
      gradeContainer.id = 'quizResultsContainer';
      gradeContainer.classList.add('hidden', 'quiz-results-container');

      gradeContainer.innerHTML = `
        <div class="quiz-results-header">
          <h4 class="margin-bottom-10">Quiz Results</h4>
        </div>

        <div class="quiz-results-progress-bar-wrap">
          <div class="quiz-results-progress-bar-container">
            <div id="quizResultsProgressBar" class="quiz-results-progress-bar" style="width:0%"></div>
          </div>

          <div id="passingMarker" class="qpb-marker" style="left:0%">
            <div class="qpb-marker-pin"><i class="fa-light fa-map-pin"></i></div>
            <div class="qpb-marker-line"></div>
            <div class="qpb-marker-label">
              <span class="qpb-marker-title">Passing</span>
              <span id="passingPercentLabel">0%</span>
            </div>
            <div class="qpb-marker-leader" aria-hidden="true">
              <svg class="qpb-leader-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
                <polyline class="qpb-leader-poly" points=""></polyline>
              </svg>
            </div>
          </div>

          <div id="userScoreLabel" class="qpb-user-label">0%</div>
        </div>

        <div id="quizResultsBody" class="quiz-results-body margin-top-20 hidden">
          <h4 class="margin-bottom-4">Your Score: <strong>${data.score_percent}%</strong></h4>
        </div>
      `;

      (document.querySelector('.quiz-player-body') || mount).appendChild(gradeContainer);

      // status + actions
      const bodyEl   = gradeContainer.querySelector('#quizResultsBody');
      const iconEl   = document.createElement('div');
      const statusEl = document.createElement('div');
      statusEl.classList.add('quiz-results-subtext');

      const btnRow = document.createElement('div');
      btnRow.id = 'quizButtonsEl';
      btnRow.className = 'quiz-results-actions hidden margin-top-10';

      const makeBtn = ({ label, icon, variant = 'action-button-primary', onClick }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `quiz-player-btn ${variant} rounded-lg`;
        btn.innerHTML = `${label === 'Retry Quiz'
          ? `<i class="${icon}"></i><span>${label}</span>`
          : `<span>${label}</span><i class="${icon}"></i>`}`;
        btn.addEventListener('click', onClick);
        return btn;
      };

      // Retry -> start a NEW attempt (server creates a new LessonSession)
      const retryBtn = makeBtn({
        label: 'Retry Quiz',
        icon: 'fa-light fa-rotate-right',
        variant: 'popup-btn close-popup-btn',
        onClick: () => {
          const url = new URL(window.location.href);
          url.searchParams.set('new_attempt', '1');
          window.location.href = url.toString();
        }
      });

      const nextLessonDomBtn = document.getElementById('nextLessonBtn');
      const nextLessonBtn = nextLessonDomBtn
        ? makeBtn({
            label: 'Next Lesson',
            icon: 'fa-light fa-caret-right',
            onClick: () => nextLessonDomBtn.click()
          })
        : null;
            
      if (data.pending_review === true) {
        statusEl.classList.add('quiz-pending');
        iconEl.className = 'quiz-pending-icon';
        iconEl.innerHTML = `<i class="fa-regular fa-clock"></i>`;
        statusEl.innerHTML = `<span>This quiz contains open responses and is pending manual review. ${nextLessonBtn ? `You may proceed to the next lesson.` : ``}</span>`;
        btnRow.appendChild(retryBtn);
        if (nextLessonBtn) btnRow.appendChild(nextLessonBtn);
      } else if (data.passed) {
        statusEl.classList.add('quiz-success');
        iconEl.className = 'quiz-success-icon';
        iconEl.innerHTML = `<i class="fa-regular fa-circle-check"></i>`;
        statusEl.innerHTML = data.success_text;
        btnRow.appendChild(retryBtn);
        if (nextLessonBtn) btnRow.appendChild(nextLessonBtn);

        try {
          await fetch('/course_player/mark-lesson-complete/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
            body: JSON.stringify({ lesson_id: window.lessonId }),
          });
        } catch (_) {}
      } else {
        statusEl.classList.add('quiz-fail');
        iconEl.className = 'quiz-failed-icon';
        iconEl.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;
        statusEl.innerHTML = data.fail_text;
        btnRow.appendChild(retryBtn);
      }

      bodyEl.append(iconEl, statusEl, btnRow);

      setTimeout(() => { fadeIn('quizResultsBody'); }, 3000);
      setTimeout(() => { fadeIn('quizButtonsEl');  }, 4500);

      document.getElementById('questionMount').classList.add('hidden');
      fadeIn('quizResultsContainer');
      fadeOut('toggleReferencesBtn');

      nextButton.disabled = true;
      nextButton.textContent = 'Finish';

      requestAnimationFrame(() => {
        animateProgressBar(
          gradeContainer,
          Number(data.score_percent),
          Number(data.passing_score)
        );
      });

      // tracking (unchanged)
      const completion_status = data.pending_review ? 'pending' : (data.passed ? 'complete' : 'failed');
      const normalizedProgress = completion_status === 'complete' ? 1 : 0;
      const safeProgress =
        (typeof window.progressMeasure === 'number' && isFinite(window.progressMeasure))
          ? window.progressMeasure
          : normalizedProgress;
      const safeLocation = (typeof window.lessonLocation === 'string') ? window.lessonLocation : '';
      const safeSessionTime = (typeof window.getSessionTime === 'function') ? window.getSessionTime() : 'PT0H0M0S';

      console.log(completion_status);
      try {
        sendTrackingData({
          lesson_id: window.lessonId,
          user_id: window.userId,
          progress: safeProgress,
          lesson_location: safeLocation,
          completion_status,
          session_time: safeSessionTime,
          score: data.score_percent,
        });
      } catch (tErr) {
        console.error('[showFinal] sendTrackingData error:', tErr);
      }
    } catch (e) {
      console.error('Failed to fetch quiz score:', e);
      alert('Failed to load final score.');
      try {
        const safeLocation = (typeof window.lessonLocation === 'string') ? window.lessonLocation : '';
        const safeSessionTime = (typeof window.getSessionTime === 'function') ? window.getSessionTime() : 'PT0H0M0S';
        sendTrackingData({
          lesson_id: window.lessonId,
          user_id: window.userId,
          progress: 0,
          lesson_location: safeLocation,
          completion_status: 'incomplete',
          session_time: safeSessionTime,
          score: 0,
        });
      } catch (_) {}
    }
  }

  async function saveProgress({ position, isFinished = false }) {
    if (!SAVE_URL) { console.warn("no SAVE_URL"); return; }
    await fetch(SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
      credentials: "same-origin",
      body: JSON.stringify({
        session_id: window.lessonAttemptId,     // the stable attempt id
        position,
        total_questions: window.totalQuestions,
        is_finished: isFinished,
      })
    });
  }

  // Call this when you want to show results for a specific attempt id
  async function showFinalForSession(attemptId) {
    window.lessonAttemptId = attemptId;
    reflectEndStateInCounters();
    await showFinal();
  }

  function reflectEndStateInCounters() {
    // Prefer the global totalQuestions; fall back to the DOM label if needed
    const total = Number(totalQuestions || (totalCountEl?.textContent || 0)) || 0;
    if (!total) return;

    // Set “current” to the last question number and keep the total in sync
    if (currentNumEl) currentNumEl.textContent = String(total);
    if (totalCountEl) totalCountEl.textContent = String(total);

    // Make the local nav state look like “end of quiz”
    position = Math.max(0, total - 1);
    isLast = true;
    tuneNextButton(true);           // ensures button says “Finish/Quiz Complete”
    if (nextButton) {
      nextButton.disabled = true;
      nextButton.textContent = 'Finish';
    }
  }

  // beforeunload saver (replace the sendBeacon block)
  window.addEventListener("beforeunload", () => {
    try {
      if (!window.saveQuizProgressUrl || !window.csrftoken) return;
      const payload = {
        session_id: window.lessonAttemptId,
        position,
        total_questions: window.totalQuestions,
        is_finished: false
      };
      fetch(window.saveQuizProgressUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": window.csrftoken },
        credentials: "same-origin",
        keepalive: true,                 // ← key bit for unload
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (_) {}
  });

  function animateProgressBar(containerEl, scorePercentRaw, passingPercentRaw) {
    const barEl          = containerEl.querySelector('#quizResultsProgressBar');
    const userLabelEl    = containerEl.querySelector('#userScoreLabel');
    const markerEl       = containerEl.querySelector('#passingMarker');
    const passingLabelEl = containerEl.querySelector('#passingPercentLabel');

    if (!barEl || !userLabelEl || !markerEl || !passingLabelEl) return;

    // Ensure leader exists (SVG elbow)
    let leaderEl = markerEl.querySelector('.qpb-marker-leader');
    if (!leaderEl) {
      leaderEl = document.createElement('div');
      leaderEl.className = 'qpb-marker-leader';
      leaderEl.innerHTML = `
        <svg class="qpb-leader-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
          <polyline class="qpb-leader-poly" points=""></polyline>
        </svg>`;
      markerEl.appendChild(leaderEl);
    }
    const pinEl   = markerEl.querySelector('.qpb-marker-pin');
    const labelEl = markerEl.querySelector('.qpb-marker-label');
    const poly    = leaderEl.querySelector('.qpb-leader-poly');
    if (!pinEl || !labelEl || !poly) return;

    const scorePercent   = Math.max(0, Math.min(100, Number(scorePercentRaw)   || 0));
    const passingPercent = Math.max(0, Math.min(100, Number(passingPercentRaw) || 0));

    // ---- Passing marker position/label ----
    markerEl.style.left = `${passingPercent}%`;
    passingLabelEl.textContent = `${passingPercent}%`;
    markerEl.removeAttribute('data-edge');
    if (passingPercent < 3) markerEl.setAttribute('data-edge', 'left');
    else if (passingPercent > 97) markerEl.setAttribute('data-edge', 'right');

    // ---- Leader geometry knobs ----
    const gap       = 8;    // space between label text and leader
    const extraLeft = 28;   // start farther to the left
    const rise      = 14;   // vertical rise magnitude for the long diagonal
    const tail      = 12;   // short segment length near the pin (before the tip)
    const tilt      = 3;    // how far ABOVE baseline the short segment sits (makes it angled)
    const lift      = 6;    // raise entire leader above label’s midline
    const flipUp    = true; // true = flip elbow upward (diagonal comes from below-left to above pin)

    // ---- Draw/position leader after layout is ready ----
    const measureAndDrawLeader = () => {
      const mr = markerEl.getBoundingClientRect();
      const pr = pinEl.getBoundingClientRect();
      const lr = labelEl.getBoundingClientRect();

      const pinCenterX = pr.left + pr.width / 2;
      const labelRight = lr.right + gap;

      // distance from label-right+gap to pin center
      const dxToLabel = pinCenterX - labelRight;
      const totalW    = Math.max(0, dxToLabel + extraLeft);

      // Anchor leader to (baseline - lift)
      const baselineY = (lr.top + lr.height / 2) - mr.top - lift;
      leaderEl.style.setProperty('--leader-top',  baselineY + 'px');
      leaderEl.style.setProperty('--leader-w',    totalW + 'px');
      leaderEl.style.setProperty('--leader-rise', Math.max(8, rise) + 'px');

      // If label is to the right of pin (tiny screens), hide the line
      leaderEl.style.opacity = totalW > 6 ? '1' : '0';

      // Build the elbow (two segments): start → corner → pin
      // y coordinates are relative to baseline (0). Negative numbers draw "higher".
      const startY  = flipUp ?  rise :  rise;   // start below baseline (positive) for a nice diagonal
      const cornerX = Math.max(0, totalW - Math.max(4, tail));
      const cornerY = -Math.max(0, tilt);       // short segment sits a bit ABOVE baseline to angle into the pin
      const endY    = 0;                         // pin sits on baseline

      const pts = `0,${startY} ${cornerX},${cornerY} ${totalW},${endY}`;
      poly.setAttribute('points', pts);
    };

    requestAnimationFrame(measureAndDrawLeader);

    // ---- User bar/label animation (keeps your 100% fix) ----
    userLabelEl.textContent = `0%`;
    userLabelEl.style.left = `0%`;
    userLabelEl.removeAttribute('data-edge');

    barEl.setAttribute('data-zero', '1');
    barEl.style.transition = 'none';
    barEl.style.width = '0%';
    void barEl.offsetWidth; // force paint
    barEl.style.transition = 'width 2.5s ease-in-out';

    const animateTo = (scorePercent === 100) ? 99.9 : scorePercent;
    requestAnimationFrame(() => {
      barEl.style.width = `${animateTo}%`;
      userLabelEl.style.transition = 'left 2.5s ease-in-out';
      userLabelEl.style.left = `${animateTo}%`;
      requestAnimationFrame(() => barEl.removeAttribute('data-zero'));
    });

    // Count-up
    const duration = 2500, start = performance.now(), fromVal = 0, toVal = scorePercent;
    (function tick(now){
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      userLabelEl.textContent = `${Math.round(fromVal + (toVal - fromVal) * eased)}%`;
      if (t < 1) requestAnimationFrame(tick);
      else finishEdges();
    })(performance.now());

    // Snap to 100 after anim
    if (scorePercent === 100) {
      barEl.addEventListener('transitionend', function onEnd(e){
        if (e.propertyName !== 'width') return;
        barEl.removeEventListener('transitionend', onEnd);
        barEl.style.transition = 'none';
        barEl.style.width = '100%';
        void barEl.offsetWidth;
        barEl.style.transition = 'width 2.5s ease-in-out';
        userLabelEl.style.transition = 'none';
        userLabelEl.style.left = '100%';
        void userLabelEl.offsetWidth;
        userLabelEl.style.transition = 'left 2.5s ease-in-out';
        finishEdges();
      });
    }

    function finishEdges(){
      userLabelEl.removeAttribute('data-edge');
      if (scorePercent < 3) userLabelEl.setAttribute('data-edge', 'left');
      else if (scorePercent > 97) userLabelEl.setAttribute('data-edge', 'right');
      if (Math.abs(scorePercent - passingPercent) <= 2) userLabelEl.style.bottom = '-2px';
    }

    // Keep the elbow aligned on resize
    const remeasure = () => requestAnimationFrame(measureAndDrawLeader);
    window.addEventListener('resize', remeasure, { passive: true });
  }

  (function stripRetryParamOnce() {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('new_attempt')) {
        url.searchParams.delete('new_attempt');
        history.replaceState(null, '', url.toString());
      }
    } catch (_) {}
  })();

  // ----- boot -----
  (async function init() {
    try {
      const r = window.quizResume || { status: "active", last_position: 0 };
      if (!r.session_id) {
        console.error("[init] Missing attempt id in resume:", r);
        alert("Could not start quiz session. Please refresh.");
        return;
      }

      // stable id for this attempt
      window.lessonAttemptId = r.session_id;
      window.lessonSessionId = r.session_id; // legacy compatibility
      totalQuestions = r.total || totalQuestions;

      console.log(r.status);

      if (r.status === "passed" || r.status === "failed" || r.status === "pending") {
        await showFinalForSession(r.session_id);
        return;
      }

      position = Math.min(Math.max(0, r.last_position || 0), Math.max(0, (totalQuestions - 1)));
      await loadQuestion(position);
      // await saveProgress({ position });
    } catch (e) {
      console.error(e);
      alert("Failed to load quiz.");
    }
  })();

  function fadeOut(container) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container) return;
    container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    container.style.opacity = '0';
    container.style.transform = 'scale(0.9)';
    setTimeout(() => {
      container.classList.add('hidden');
      container.style.opacity = '';
      container.style.transform = '';
      container.style.transition = '';
    }, 500);
  }

  function fadeIn(container) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container) return;
    container.classList.remove('hidden');
    container.style.opacity = '0';
    container.style.transform = 'scale(0.9)';
    container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    requestAnimationFrame(() => {
      container.style.opacity = '1';
      container.style.transform = 'scale(1)';
    });
    setTimeout(() => {
      container.style.opacity = '';
      container.style.transform = '';
      container.style.transition = '';
    }, 500);
  }
});