document.addEventListener("DOMContentLoaded", function () {
  // --- small helpers ---
  function getCookie(name) {
    const row = document.cookie.split("; ").find(r => r.startsWith(name + "="));
    return row ? decodeURIComponent(row.split("=")[1]) : "";
  }
  const csrftoken = getCookie("csrftoken");

  const mount = document.getElementById("questionMount");
  const nextButton = document.getElementById("nextQuestionBtn");
  const currentNumEl = document.getElementById("currentQuestionNumber");
  const totalCountEl = document.getElementById("totalQuestionsCount");

  let position = 0; // zero-based
  let totalQuestions = parseInt(totalCountEl?.textContent || "0", 10) || 0;
  let isLast = false;

  // ---- rendering ----
  function renderMedia(mi) {
    // mi: {source_type, title, file_url, url_from_library, type_from_library, embed_code}
    if (mi.source_type === "embed" && mi.embed_code) {
      return `<div class="media-embed">${mi.embed_code}</div>`;
    }
    const url = mi.file_url || mi.url_from_library;
    if (!url) return "";
    const lower = url.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".gif")) {
      return `
        <div class="media-image-wrapper">
          <img src="${url}" alt="${mi.title || ""}" class="toggle-expand-image" style="cursor:zoom-in;">
        </div>`;
    }
    if (lower.endsWith(".mp4")) {
      return `<video controls class="media-video-wrapper"><source src="${url}" type="video/mp4"></video>`;
    }
    if (lower.endsWith(".mp3")) {
      return `<audio controls><source src="${url}" type="audio/mpeg"></audio>`;
    }
    if (lower.endsWith(".pdf")) {
      return `<iframe src="${url}" class="toggle-expand-pdf" allowfullscreen style="width:100%;height:600px;cursor:zoom-in;"></iframe>`;
    }
    return `<p><strong>View file:</strong> <a href="${url}" target="_blank">${mi.title || url}</a></p>`;
  }

  function renderAnswers(question) {
    const type = question.question_type;
    if (type === "EssayQuestion") {
      return `
        <textarea name="answer" class="essay-response" rows="5" cols="60" placeholder="Type your answer here..."></textarea>
        <br><button class="submit-question-btn">Submit Answer</button>
      `;
    }
    if (type === "FITBQuestion") {
      return `
        <input type="text" name="answer" class="fitb-response" placeholder="Type your answer here...">
        <br><button class="submit-question-btn">Submit Answer</button>
      `;
    }
    if (question.answers && question.answers.length) {
      const isMR = question.allows_multiple || type === "MRQuestion";
      const inputs = question.answers.map(a => `
        <div class="quiz-answer-item">
          <label>
            <input type="${isMR ? "checkbox" : "radio"}" name="answer" value="${a.id}">
            ${a.text}
          </label>
        </div>`).join("");
      return `<div class="quiz-answers-container">${inputs}</div><button class="submit-question-btn">Submit Answer</button>`;
    }
    return `<p><em>No answer options available for this question.</em></p>`;
  }

  function renderQuestion(qjson, meta) {
    const mediaHTML = qjson.media_items && qjson.media_items.length
      ? `<div class="question-media margin-bottom-5">${qjson.media_items.map(renderMedia).join("")}</div>` : "";

    const essayPrompts = (qjson.essay_prompts || []).length
      ? `<ul class="essay-prompts">${qjson.essay_prompts.map((p, i) => `<li><strong>Prompt ${i+1}:</strong> ${p.prompt_text}</li>`).join("")}</ul>` : "";

    const html = `
      <div class="quiz-question"
           data-question-id="${qjson.id}"
           data-question-type="${qjson.question_type}"
           data-has-media="${qjson.has_media ? "true" : "false"}">

        <div class="quiz-question-title margin-bottom-5">
          <h4>${qjson.content}</h4>
        </div>

        ${mediaHTML}
        ${essayPrompts}
        ${renderAnswers(qjson)}

        <div class="question-feedback" aria-live="polite"></div>
      </div>
    `;
    mount.innerHTML = html;

    // update header counts
    if (currentNumEl) currentNumEl.textContent = String(meta.display_index);
    if (totalCountEl) totalCountEl.textContent = String(meta.total);
    totalQuestions = meta.total;
    isLast = meta.is_last;

    // show/hide question references button based on media
    updateReferencesButton();

    // bind submit
    const btn = mount.querySelector(".submit-question-btn");
    if (btn) {
      btn.addEventListener("click", () => submitCurrentAnswer(btn));
    }

    // optional: reattach image/pdf togglers
    bindExpanders();
  }

  function bindExpanders() {
    // images
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
    // pdf
    document.querySelectorAll('.toggle-expand-pdf').forEach(iframe => {
      iframe.addEventListener('click', function () {
        const expanded = iframe.classList.toggle('expanded');
        if (expanded) {
          iframe.style.height = "800px";
          iframe.style.cursor = "zoom-out";
        } else {
          iframe.style.height = "300px";
          iframe.style.cursor = "zoom-in";
        }
      });
    });
  }

  function setFeedback(html) {
    const box = mount.querySelector(".question-feedback");
    if (box) box.innerHTML = html;
  }

  function collectAnswer() {
    const root = mount.querySelector(".quiz-question");
    const qType = root?.dataset.questionType;

    if (qType === "EssayQuestion" || qType === "FITBQuestion") {
      const el = root.querySelector("textarea[name='answer'], input[name='answer']");
      return { qType, answer: (el?.value || "").trim() };
    }
    // MR
    const checks = [...mount.querySelectorAll("input[name='answer'][type='checkbox']:checked")];
    if (checks.length) return { qType: "MRQuestion", answer: checks.map(i => i.value) };
    // MC/TF
    const sel = mount.querySelector("input[name='answer'][type='radio']:checked");
    return { qType, answer: sel ? sel.value : null };
  }

  async function submitCurrentAnswer(btnEl) {
    if (btnEl.disabled) return;

    const qRoot = mount.querySelector(".quiz-question");
    const qId = qRoot?.dataset.questionId;
    const { qType, answer } = collectAnswer();

    if (qType !== "EssayQuestion" && (answer == null || (Array.isArray(answer) && !answer.length))) {
      alert("Please select/enter an answer before submitting.");
      return;
    }

    btnEl.disabled = true;

    try {
      // you can switch this to your 'submit_question_ajax/<quiz_id>/' if you prefer MR strict equality
      const res = await fetch(window.submitQuestionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken
        },
        body: JSON.stringify({
          lesson_id: window.lessonId,
          question_id: qId,
          answer: answer,
          question_type: qType
        }),
      });
      const data = await res.json();

      if (window.revealAnswers === true) {
        if (data.is_correct === true) {
          setFeedback(`<p class="correct-feedback">✔ Correct!</p>`);
        } else if (data.is_correct === false) {
          setFeedback(`<p class="incorrect-feedback">✘ Incorrect. Correct answer: ${(data.correct_answers || []).join(", ")}</p>`);
        } else {
          setFeedback(`<p class="neutral-feedback">✔ Answer submitted.</p>`);
        }
      } else {
        setFeedback(`<p class="neutral-feedback">✔ Answer submitted.</p>`);
      }
    } catch (e) {
      console.error("❌ Failed to submit answer", e);
      alert("Failed to submit answer. Try again.");
      btnEl.disabled = false;
      return;
    }
  }

  // ---- navigation ----
  async function loadQuestion(pos) {
    const url = window.fetchQuestionUrl(pos);
    const res = await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" }});
    if (!res.ok) throw new Error("Failed to load question JSON");
    const data = await res.json();
    renderQuestion(data.question, data.meta);
    tuneNextButton(data.meta.is_last);
  }

  function tuneNextButton(last) {
    if (!nextButton) return;
    nextButton.textContent = last ? "Finish" : "Next Question";
    nextButton.onclick = async () => {
      if (last) {
        await showFinal();
      } else {
        try {
          await loadQuestion(position + 1);
          position += 1;
        } catch (e) {
          console.error(e);
          alert("Failed to load next question.");
        }
      }
    };
  }

  async function showFinal() {
    try {
      const res = await fetch(`${window.getScoreUrl}?session_id=${encodeURIComponent(window.lessonSessionId)}`);
      if (!res.ok) throw new Error("score");
      const data = await res.json();

      const gradeContainer = document.createElement("div");
      gradeContainer.innerHTML = `
        <h4>Quiz Complete!</h4>
        <p>You got ${data.correct_answers} out of ${data.total_answered} correct.</p>
        <p>Your Score: ${data.score_percent}%</p>
      `;

      if (data.pending_review === true) {
        gradeContainer.innerHTML += `<div class="quiz-pending">📝 This quiz contains open responses and is pending manual review.</div>`;
      } else if (data.passed) {
        gradeContainer.innerHTML += `<div class="quiz-success">${data.success_text}</div>`;
        // optional: mark complete
        try {
          await fetch("/course_player/mark-lesson-complete/", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
            body: JSON.stringify({ lesson_id: window.lessonId }),
          });
        } catch (_) {}
      } else {
        gradeContainer.innerHTML += `<div class="quiz-fail">${data.fail_text}</div>`;
      }

      gradeContainer.style.marginTop = "20px";
      (document.querySelector(".question-navigation") || mount).appendChild(gradeContainer);

      nextButton.disabled = true;
      nextButton.textContent = "Quiz Complete";
    } catch (e) {
      console.error("Failed to fetch quiz score:", e);
      alert("Failed to load final score.");
    }
  }

  function updateReferencesButton() {
    const q = mount.querySelector(".quiz-question");
    const referencesBtn = document.getElementById("toggleReferencesBtn");
    if (!referencesBtn || !q) return;

    const hasMedia = q.dataset.hasMedia === "true";
    referencesBtn.style.display = hasMedia ? "inline-flex" : "none";
  }

  // ---- boot ----
  (async function init() {
    try {
      position = 0;
      await loadQuestion(position);
    } catch (e) {
      console.error(e);
      alert("Failed to load quiz.");
    }
  })();
});
