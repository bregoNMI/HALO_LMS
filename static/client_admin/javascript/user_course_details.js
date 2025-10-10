document.addEventListener('DOMContentLoaded', function() {
    /* Progress Bar Styling */
    const courseProgress = document.getElementById('courseProgress');
    if (courseProgress) {
        /* course_progress comes from the HTML */
        courseProgress.setAttribute('value', course_progress);
    }

    document.querySelectorAll('.radio-option').forEach(radio => {
        radio.addEventListener('change', function () {
            initializeRadioCheckboxes(this);
        });
    });   
});

function initializeRadioCheckboxes(radio) {
    if (radio.checked) {
        const container = radio.closest('.course-content-input');
        
        // Show current target
        if (radio.dataset.target) {
            const targetElement = document.getElementById(radio.dataset.target);
            if (targetElement) {
                targetElement.classList.add('show-toggle-option-details');
            }
        }

        // Hide other targets
        container.querySelectorAll('.radio-option').forEach(other => {
            if (other !== radio && other.dataset.target) {
                const otherTarget = document.getElementById(other.dataset.target);
                if (otherTarget) {
                    otherTarget.classList.remove('show-toggle-option-details');
                }
            }
        });

        // Handle course/lesson logic
        if (radio.value === 'completed' && radio.name === 'course_status') {
            setCourseCompletedTime();
        } else if (radio.value === 'completed' && radio.name === 'lesson_status') {
            setLessonCompletedTime();
        }
    }
}

function setCourseCompletedTime() {
    const completedDateInput = document.getElementById('completed_date');
    const completedTimeInput = document.getElementById('completed_time');

    const now = new Date();

    // Only set date if it's empty
    if (completedDateInput && !completedDateInput.value) {
        if (completedDateInput._flatpickr) {
            completedDateInput._flatpickr.setDate(now);
        } else {
            completedDateInput.value = now.toISOString().split('T')[0];
        }
    }

    // Only set time if it's empty
    if (completedTimeInput && !completedTimeInput.value) {
        if (completedTimeInput._flatpickr) {
            completedTimeInput._flatpickr.setDate(now);
        } else {
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            completedTimeInput.value = `${hours}:${minutes}`;
        }
    }
}

function setLessonCompletedTime() {
    const completedDateInput = document.getElementById('lesson_completed_date');
    const completedTimeInput = document.getElementById('Lesson_completed_time');

    const now = new Date();

    // Only set date if it's empty
    if (completedDateInput && !completedDateInput.value) {
        if (completedDateInput._flatpickr) {
            completedDateInput._flatpickr.setDate(now);
        } else {
            completedDateInput.value = now.toISOString().split('T')[0];
        }
    }

    // Only set time if it's empty
    if (completedTimeInput && !completedTimeInput.value) {
        if (completedTimeInput._flatpickr) {
            completedTimeInput._flatpickr.setDate(now);
        } else {
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            completedTimeInput.value = `${hours}:${minutes}`;
        }
    }
}

function updateCourseProgress(uuid) {
    setDisabledSaveBtns();
    const completed_on_date = document.getElementById('completed_date').value;
    const completed_on_time = document.getElementById('completed_time').value;
    const expires_on_date = document.getElementById('expires_on_date').value;
    const expires_on_time = document.getElementById('expires_on_time').value;
    const due_on_date = document.getElementById('due_on_date').value;
    const due_on_time = document.getElementById('due_on_time').value;
    let progress = parseInt(course_progress, 10);
    let storedProgress = parseInt(stored_progress, 10);
    const wasCompletedBefore = (progress === 100);

    const radioOptions = document.querySelectorAll('#courseActivityContainer .radio-option');
    let selectedValue = null;
    radioOptions.forEach(radio => {
        if (radio.checked) {
            selectedValue = radio.value;
        }
    });

    if (selectedValue === 'completed') {
        if (progress !== 100) {
            storedProgress = progress;  // Save the previous progress before setting to complete
        }
        progress = 100;
    } else if (selectedValue === 'not_completed') {
        if (wasCompletedBefore) {
            // Restore only if course was previously marked as completed
            progress = storedProgress;
        }
    }

    fetch(`/admin/course-progress/${uuid}/edit/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ 
            progress: progress,
            storedProgress: storedProgress,
            completed_on_date: completed_on_date,
            completed_on_time: completed_on_time,
            is_course_completed: selectedValue === 'completed',
            expires_on_date: expires_on_date,
            expires_on_time: expires_on_time,
            due_on_date: due_on_date,
            due_on_time: due_on_time,
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // displayValidationMessage('Course progress updated successfully', true);
            location.reload();
        } else {
            displayValidationMessage('Failed to update course progress', false);
        }
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
    });
}

function resetLessonActivity(){
    setDisabledSaveBtns();
    // Button to reset lesson activity
    const confirmResetLessonActivity = document.getElementById('confirmResetLessonActivity');
    let lessonId = confirmResetLessonActivity.getAttribute('data-lesson-id');
    
    fetch(`/admin/course-progress/lesson/${lessonId}/reset/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({}),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // displayValidationMessage('Course progress updated successfully', true);
            location.reload();
        } else {
            displayValidationMessage('Failed to reset activity.', false);
        }
        removeDisabledSaveBtns();
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
        removeDisabledSaveBtns();
    });
}

function inputLessonData(title, lessonId, type, lessonType){
    const confirmResetLessonActivity = document.getElementById('confirmResetLessonActivity');
    const lessonActivityName = document.getElementById('lessonActivityName');
    const confirmEditLessonActivity = document.getElementById('confirmEditLessonActivity');
    const editLessonType = document.getElementById('editLessonType');
    let lessonTypeTitle;
    if(type == 'reset'){
        lessonActivityName.innerText = title;
        confirmResetLessonActivity.setAttribute('data-lesson-id', lessonId);
    }else if(type == 'edit'){
        confirmEditLessonActivity.setAttribute('data-lesson-id', lessonId);
        fetchLessonData(lessonId);
        if(lessonType == 'SCORM2004'){lessonTypeTitle = 'SCORM 2004'}else if(lessonType == 'SCORM1.2'){lessonTypeTitle = 'SCORM 1.2'}else if(lessonType == 'file'){lessonTypeTitle = 'File'}else if(lessonType == 'quiz'){lessonTypeTitle = 'Quiz'}
        editLessonType.innerText = lessonTypeTitle;
        document.getElementById('editLessonTitle').innerText = title;
    }
}

function fetchLessonData(lessonId){
    const container = document.getElementById('editLessonActivity');
    const notCompletedRadio = container.querySelector('.radio-option[value="not_completed"]');
    const completedRadio = container.querySelector('.radio-option[value="completed"]');
    const currentAttempts = document.getElementById('current_attempts');

    fetch(`/admin/course-progress/lesson/${lessonId}/fetch/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({}),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const editLessonActivityLoading = document.getElementById('editLessonActivityLoading');
            const editLessonActivityLoaded = document.getElementById('editLessonActivityLoaded');
            const lessonData = data.data;

            if (lessonData.completed === true) {
                completedRadio.checked = true;
                initializeRadioCheckboxes(completedRadio);
                document.getElementById('lesson_completed_date').value = lessonData.completed_on_date;
                const formattedTime = formatTimeTo12Hour(lessonData.completed_on_time);
                document.getElementById('Lesson_completed_time').value = formattedTime;
            } else {
                notCompletedRadio.checked = true;
                initializeRadioCheckboxes(notCompletedRadio);
                document.getElementById('lesson_completed_date').value = '';
                document.getElementById('Lesson_completed_time').value = '';
            }

            currentAttempts.value = lessonData.attempts;
            editLessonActivityLoading.classList.add('hidden');
            editLessonActivityLoaded.classList.remove('hidden');
        } else {
            displayValidationMessage('Failed to fetch lesson data.', false);
        }
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
    });
}

function editLessonActivity(){
    setDisabledSaveBtns();
    const completed_on_date = document.getElementById('lesson_completed_date').value;
    const completed_on_time = document.getElementById('Lesson_completed_time').value;
    const confirmEditLessonActivity = document.getElementById('confirmEditLessonActivity');
    let lessonId = confirmEditLessonActivity.getAttribute('data-lesson-id');

    const radioOptions = document.querySelectorAll('#editLessonActivity .radio-option');
    let selectedValue = null;
    radioOptions.forEach(radio => {
        if (radio.checked) {
            selectedValue = radio.value;
        }
    });
    
    fetch(`/admin/course-progress/lesson/${lessonId}/edit/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            completed: selectedValue === 'completed',
            completed_on_date: completed_on_date,
            completed_on_time: completed_on_time,
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            location.reload();
            closePopup('editLessonActivity');
            // displayValidationMessage('Lesson Activity updated successfully.', true);
        } else {
            displayValidationMessage('Failed to reset activity.', false);
        }
        removeDisabledSaveBtns();
    })
    .catch(error => {
        console.log(error);
        displayValidationMessage('Something went wrong, please contact an administrator', false);
        removeDisabledSaveBtns();
    });
}

// Helper function to get CSRF token from cookies
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

function formatTimeTo12Hour(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));

    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function resetEditLessonLoading(){  
    const editLessonActivityLoading = document.getElementById('editLessonActivityLoading');
    const editLessonActivityLoaded = document.getElementById('editLessonActivityLoaded');

    setTimeout(() => {
        editLessonActivityLoading.classList.remove('hidden');
        editLessonActivityLoaded.classList.add('hidden');
    }, 300);
}

window._qaCtx = window._qaCtx || { ulpId: null, attemptId: null };
window._qaCache = window._qaCache || {};

function formatDateHuman(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';

  const day = d.getDate();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const suffix = (n) => {
    if (n >= 11 && n <= 13) return 'th';
    switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
  };
  return `${months[d.getMonth()]} ${day}${suffix(day)}, ${d.getFullYear()}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = (value ?? value === 0) ? String(value) : '—';
}

function setPercent(id, pct) {
  const el = document.getElementById(id);
  const v = (typeof pct === 'number' && isFinite(pct)) ? Math.max(0, Math.min(100, Math.round(pct))) : 0;
  if (el) {
    // most circle-progress web components read `value`; keep attributes too
    el.value = v;
    el.setAttribute('value', v);
    el.setAttribute('max', '100');
    el.setAttribute('text-format', 'percent');
  }
}

function clampPct(n) {
  n = Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Count up a text node like "83%" */
function countUpPercent(id, to, { duration = 900 } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = clampPct(to);

  // Respect reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = `${target}%`;
    return;
  }

  // Cancel any previous animation on this element
  if (el._raf) cancelAnimationFrame(el._raf);
  const start = performance.now();
  const from = 0; // start from 0; change if you want to start from existing value

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const v = Math.round(from + (target - from) * easeOutCubic(t));
    el.textContent = `${v}%`;
    if (t < 1) el._raf = requestAnimationFrame(tick);
  }
  el._raf = requestAnimationFrame(tick);
}

function openQuizAttempts(ulpId) {
    window._qaCtx.ulpId = ulpId;
    window._qaCtx.attemptId = null;

    const listPopup = document.getElementById('quizAttemptsActivity');
    const loading   = listPopup.querySelector('#quizAttemptsActivityLoading');
    const loaded    = listPopup.querySelector('#quizAttemptsActivityLoaded');

    // Show the LIST popup, ensure DETAIL is closed
    closePopup('quizAttemptDetail');
    openPopup('quizAttemptsActivity');

    loading.classList.remove('hidden');
    loaded.classList.add('hidden');

    fetch(`/admin/course-progress/quiz/${ulpId}/fetch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify({}),
    })
    .then(r => r.ok ? r.json() : r.text().then(t => { throw new Error(t); }))
    .then(({ success, data }) => {
        if (!success) throw new Error('Failed to fetch');
        window._qaCache[ulpId] = data;

        const { stats, lesson, quiz_config } = data;

        // Fill header widgets (scoped to LIST popup)
        setPercent('quizAvgProgress', stats.avg_score);
        countUpPercent('qaAvgScore', stats.avg_score);

        setText('qaPassingScore', quiz_config.passing_score != null ? `${quiz_config.passing_score}%` : '—');

        let createdFrom = lesson.created_from || '—';
        if (lesson.created_from === 'Quiz Template' && lesson.selected_quiz_template_name) {
            createdFrom += ` — ${lesson.selected_quiz_template_name}`;
        } else if (lesson.created_from === 'Quiz' && lesson.selected_quiz_name) {
            createdFrom += ` — ${lesson.selected_quiz_name}`;
        }
        setText('qaCreatedFrom', createdFrom);

        const displayTitle = lesson.title || '—';
        setText('qaTitle', displayTitle);

        let formattedQuizType;
        if (quiz_config.quiz_type === 'standard_quiz') formattedQuizType = 'Standard Quiz';
        else if (quiz_config.quiz_type === 'monitored_quiz') formattedQuizType = 'AI Monitored Quiz';
        setText('qaQuizType', formattedQuizType || '—');

        setText('qaLastSession', formatDateHuman(stats.last_session));

        // Render table (scoped to LIST popup)
        renderAttemptsTable(listPopup, ulpId, data);

        loading.classList.add('hidden');
        loaded.classList.remove('hidden');
    })
    .catch(err => {
        console.error(err);
        displayValidationMessage('Something went wrong, please contact an administrator', false);
        loading.classList.add('hidden');
    });
}

function formatScore(pct) {
  return (typeof pct === 'number' && isFinite(pct)) ? `${Math.round(pct)}%` : '—';
}

function statusBadgeHtml(status) {
  switch ((status || '').toLowerCase()) {
    case 'passed':   return '<span class="status course-active pastel-green"> Passed </span>';
    case 'failed':   return '<span class="status course-active pastel-red"> Failed </span>';
    case 'pending':  return '<span class="status course-active pastel-yellow"> Pending Review </span>';
    case 'active':   return '<span class="status course-active pastel-blue"> Active </span>';
    // Gracefully handle any legacy rows that slip through before migration
    case 'completed':  return '<span class="status course-active pastel-green"> Passed </span>';
    case 'abandoned':  return '<span class="status course-active pastel-red"> Failed </span>';
    default:         return `<span class="status course-active pastel-gray"> ${status || '—'} </span>`;
  }
}

function showQASlide(which, ulpId) {
  const list = document.getElementById('qaSlideList');
  const qas  = document.getElementById('qaSlideQAs');
  const quizAttemptsActivity = document.getElementById('quizAttemptsActivity');
  const quizAttemptActivity = document.getElementById('quizAttemptActivity');

  if (!list || !qas) return;
  if (which === 'qas') {
    openQuizAttempts(ulpId);
    quizAttemptActivity.style.display = 'none';
    quizAttemptActivity.querySelector('.popup-content').classList.remove('animate-popup-content');
  } else {
    openQandAs(ulpId); 
    quizAttemptsActivity.style.display = 'none';
    quizAttemptsActivity.querySelector('.popup-content').classList.remove('animate-popup-content');   
  }
}

function qaBackToList(ulpId) {
  showQASlide('list', ulpId);
  // (Optional) Re-render attempts from cache if you want to force-refresh the table here.
}

window._qaCache = window._qaCache || {};

function renderAttemptsTable(listPopup, ulpId, data) {
  const tbody = listPopup.querySelector('#qaAttemptsTableBody');
  if (!tbody) return;

  const attempts = data.attempts || [];
  const quizTitle =
    data.lesson?.selected_quiz_name ||
    data.lesson?.selected_quiz_template_name ||
    data.lesson?.title || 'Quiz';

  if (!attempts.length) {
    tbody.innerHTML = `<tr><td colspan="4">No attempts yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = attempts.map(a => {
    const finished = a.finished_at || a.started_at;
    return `
      <tr class="table-select-option clickable-row"
          onclick="openQandAs(${a.id}, ${ulpId})"
          data-attempt-id="${a.id}">
        <td>
          <div class="course-type-icon pastel-yellow tooltip" style="border-radius: 6px;">
            <i class="fa-regular fa-lightbulb"></i>
          </div>
          <span class="course-name">${quizTitle}</span>
        </td>
        <td>${statusBadgeHtml(a.status)}</td>
        <td>${formatScore(a.score_percent)}</td>
        <td>${formatDateHuman(finished)}</td>
      </tr>`;
  }).join('');
}

// Icons for the sidebar
function questionTypeIcon(type, allowsMultiple){
    const t = (type||'').toUpperCase();
    if (t==='TF')    return '<i class="fa-regular fa-toggle-on"></i>';
    if (t==='FITB')  return '<i class="fa-regular fa-input-text"></i>';
    if (t==='ESSAY') return '<i class="fa-regular fa-pen-to-square"></i>';
    if (t==='MC' && allowsMultiple) return '<i class="fa-regular fa-square-check"></i>';
    return '<i class="fa-regular fa-circle-dot"></i>'; // MC single
}

function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
}

function refIconClass(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'pdf')      return 'fa-light fa-file-pdf';
    if (t === 'audio')    return 'fa-light fa-volume';
    if (t === 'image')    return 'fa-light fa-image';
    if (t === 'video')    return 'fa-light fa-film';
    if (t === 'document') return 'fa-light fa-file-doc';
    return 'fa-light fa-file-lines';
}

function guessTypeFromUrl(url) {
    const ext = (url || '').split('?')[0].split('#')[0].split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['mp3','wav','m4a','aac','ogg'].includes(ext)) return 'audio';
    if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return 'image';
    if (['mp4','mov','mkv','webm'].includes(ext)) return 'video';
    if (['doc','docx','rtf'].includes(ext)) return 'document';
    return '';
}

// --- EXACT markup renderer ---
function renderReferences(refs) {
    const wrap = document.getElementById('qaReferences');
    if (!wrap) return;

    if (!Array.isArray(refs) || refs.length === 0) {
        wrap.classList.add('hidden');
        wrap.innerHTML = '';
        return;
    }

    const itemsHtml = refs.map(r => {
        const url   = r.url || '#';
        const type  = r.type_from_library || guessTypeFromUrl(url);
        const icon  = refIconClass(type);
        const title = (r.title && r.title.trim()) ? r.title : 'Reference';
        const hasDesc = r.description && r.description !== '<p><br></p>';

        return `
        <a href="${url}" target="_blank" class="reference-item">
            <div class="reference-item-left">
            <div class="reference-icon pastel-blue">
                <i class="${icon}"></i>
            </div>
            <div class="reference-text">
                <h4>${escapeHtml(title)}</h4>
                ${hasDesc ? `<span class="popup-header-subtext">${r.description}</span>` : ``}
            </div>
            </div>
            <div class="reference-item-right">
            <i class="fa-regular fa-arrow-up-right-from-square"></i>
            </div>
        </a>
        `;
    }).join('');

    // EXACT structure from your snippet (no extra right chevron, no toggle logic)
    wrap.innerHTML = `
            <button class="date-selection-dropdown date-custom-select quiz-player-label js-bucket">
            <div class="quiz-player-label-left">
                <i class="fa-light fa-book-open-lines"></i>
                <span class="date-select-selected js-bucket-selected">References</span>
                <div class="date-select-items quiz-player-references scrollable-content">
                ${itemsHtml}
                </div>
            </div>
            <div class="date-selection-dropdown-right">
                <i class="fa-regular fa-angle-down"></i>
            </div>
        </button>
    `;

    wrap.classList.remove('hidden');
}

function renderMaterials(materials) {
    const wrap = document.getElementById('qaMaterials');
    if (!wrap) return;

    if (!Array.isArray(materials) || materials.length === 0) {
        wrap.classList.add('hidden');
        wrap.innerHTML = '';
        return;
    }
    console.log(materials[0]);

    if(materials[0].text === '<p><br></p>' || materials[0].text === ''){
        wrap.classList.add('hidden');
        return;
    }

    const lines = materials.map(m => {
        const txt = (m.text || '');
        return `<p class="quiz-player-material-line">${txt}</p>`;
    }).join('');

    // EXACT structure you posted (pen-ruler icon, labels, inner header, angle-down on right)
    wrap.innerHTML = `
        <button class="date-selection-dropdown date-custom-select quiz-player-label js-bucket">
        <div class="quiz-player-label-left">
            <i class="fa-light fa-pen-ruler"></i>
            <span class="date-select-selected js-bucket-selected">Materials</span>
            <div class="date-select-items quiz-player-references scrollable-content" style="overflow: auto;">
            <div class="quiz-player-materials">
                <div class="reference-text quiz-player-materials-header">
                <h4>Exam Materials</h4>
                <span class="popup-header-subtext"><p>Materials you are allowed to access during this quiz.</p></span>
                </div>
                ${lines}
            </div>
            </div>
        </div>
        <div class="quiz-player-label-right">
            <i class="fa-regular fa-angle-down"></i>
        </div>
        </button>
    `;

    wrap.classList.remove('hidden');
}

function setCategory(cat) {
  const wrap = document.getElementById('qaCategoryWrap');
  const text = document.getElementById('qaCategory');
  if (!wrap || !text) return;

  const val = (cat ?? '').toString().trim();
  if (val) {
    text.textContent = val;
    wrap.classList.remove('hidden');
    wrap.style.display = 'flex';
  } else {
    text.textContent = '';
    wrap.classList.add('hidden');
    wrap.style.display = 'none';
  }
}

function openQandAs(attemptId, quizId){
    window._qaCtx = window._qaCtx || {};
    window._qaCtx.attemptId = attemptId;

    closePopup('quizAttemptsActivity');
    openPopup('quizAttemptDetail');

    document.getElementById('attemptDetailsBackBtn').setAttribute('onclick', `qaBackToAttempts('${quizId}')`);

    document.getElementById('qaDetailLoading').classList.remove('hidden');
    document.getElementById('qaDetailBody').classList.add('hidden');

    fetch(`/admin/course-progress/quiz/attempt/${attemptId}/qandas/`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify({}),
    })
    .then(r => r.ok ? r.json() : r.text().then(t => {throw new Error(t)}))
    .then(({success, data})=>{
        if(!success) throw new Error('Failed to fetch Q&As');
        window._qaCtx.attemptData = data;

        const fin = data.attempt.finished_at || data.attempt.started_at;
        document.getElementById('qaDetailHeader').textContent =
        `${data.attempt.lesson_title} • ${formatScore(data.attempt.score_percent)} • ${formatDateHuman(fin)}`;
        document.getElementById('qaMetaStatus').innerHTML = statusBadgeHtml(data.attempt.status);
        document.getElementById('qaMainHeader').classList.remove('hidden');

        // References
        renderReferences(data.references);
        renderMaterials(data.materials);
        initializeDateSelects();
        setCategory(data.category);

        renderSidebar(data.items);
        if (data.items.length){
            selectQuestion(data.items[0].question_id);
        } else {
            document.getElementById('qaQuestionPanel').innerHTML =
            '<div class="empty">No questions found for this attempt.</div>';
        }

        document.getElementById('qaDetailLoading').classList.add('hidden');
        document.getElementById('qaDetailBody').classList.remove('hidden');
    })
    .catch(err=>{
        console.error(err);
        displayValidationMessage('Could not load attempt details. Please try again.', false);
        closePopup('quizAttemptDetail');
        openPopup('quizAttemptsActivity');
    });
}

function qTypeMeta(type, allowsMultiple) {
    const t = (type || '').toUpperCase();

    if (t === 'MC' || t === 'MCQUESTION') {
        if (allowsMultiple) {
        return { icon: '<i class="fa-regular fa-square-check"></i>', color: 'pastel-green', label: 'Multiple Response' };
        }
        return { icon: '<i class="fa-regular fa-check-double"></i>', color: 'pastel-purple', label: 'Multiple Choice' };
    }
    if (t === 'MR' || t === 'MRQUESTION') {
        return { icon: '<i class="fa-regular fa-square-check"></i>', color: 'pastel-green', label: 'Multiple Response' };
    }
    if (t === 'TF' || t === 'TFQUESTION') {
        return { icon: '<i class="fa-solid fa-circle-half-stroke"></i>', color: 'pastel-blue', label: 'True/False' };
    }
    if (t === 'FITB' || t === 'FITBQUESTION') {
        return { icon: '<i class="fa-regular fa-pen-line"></i>', color: 'pastel-pink', label: 'Fill In The Blank' };
    }
    if (t === 'ESSAY' || t === 'ESSAYQUESTION') {
        return { icon: '<i class="fa-regular fa-comment-dots"></i>', color: 'pastel-orange', label: 'Open Response' };
    }
    return { icon: '<i class="fa-regular fa-circle-dot"></i>', color: 'pastel-purple', label: 'Question' };
}

function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[c]));
}

function renderSidebar(items){
  const sidebar = document.getElementById('qaSidebar');
  if (!sidebar) return;

  // container
  sidebar.innerHTML = `
    <div class="quiz-builder-questions-container">
      <div class="quiz-builder-questions-header"><h4>Questions</h4></div>
      <div id="qaQuestionList" class="quiz-builder-questions-wrapper scrollable-content"></div>
    </div>
  `;

  const list = document.getElementById('qaQuestionList');
  if (!items || !items.length) {
    list.innerHTML = `<div class="empty">No questions found.</div>`;
    return;
  }

  const correctHtml   = '<span class="icon-correct status-icon"   title="Correct"><i class="fa-regular fa-circle-check qa-option-icon"></i></span>';
  const incorrectHtml = '<span class="icon-incorrect status-icon" title="Incorrect"><i class="fa-regular fa-circle-xmark qa-option-icon"></i></span>';
  const pendingHtml   = '<span class="icon-pending status-icon"   title="Pending Review"><i class="fa-regular fa-clock"></i></span>';

  const getCorrVal = (q) => {
    if (q.correct === true || q.correct === 'true' || q.correct === 1) return true;
    if (q.correct === false || q.correct === 'false' || q.correct === 0) return false;
    return null;
  };

  // Be tolerant: if q.answered is undefined, infer "answered" from q.response
  const looksAnswered = (q) => {
    if (q.answered === true) return true;
    if (q.answered === false) return false;
    const r = q.response;
    if (r == null) return false;
    if (typeof r === 'string') return r.trim() !== '';
    if (Array.isArray(r)) return r.length > 0;
    if (typeof r === 'object') return Object.keys(r).length > 0;
    return !!r;
  };

  const statusIconFor = (q) => {
    const corrVal = getCorrVal(q);
    if (corrVal === true)  return correctHtml;
    if (corrVal === false) return incorrectHtml;
    // No definitive correctness → show pending if we believe it was answered
    return looksAnswered(q) ? pendingHtml : '';
  };

  list.innerHTML = items.map((q, idx) => {
    const meta  = qTypeMeta(q.type, q.allows_multiple);
    const num   = idx + 1;
    const title = escapeHtml(q.title || '(untitled)');

    const hasMedia = Array.isArray(q.media) && q.media.some(m =>
      (m.display_url && m.display_url.length) || (m.embed_code && m.embed_code.length)
    );

    const mediaHtml = hasMedia
      ? `<div class="question-item-icon pastel-gray tooltip" style="margin:0" data-tooltip="Has Media">
           <span class="tooltiptext" style="left:-30%">Has Media</span>
           <i class="fa-regular fa-folder-image"></i>
         </div>`
      : '';

    return `
      <button class="question-item" data-question-id="${q.question_id}">
        <div class="quiz-builder-question-item">
          <div class="question-item-number">${num}</div>
          <div class="question-item-icon ${meta.color}">${meta.icon}</div>
          <div class="question-item-text"><span title="${title}">${title}</span></div>
          <div class="question-item-meta">
            ${mediaHtml}
            ${statusIconFor(q)}
          </div>
        </div>
      </button>
    `;
  }).join('');

  // Click handler
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.question-item');
    if (!item || !list.contains(item)) return;
    list.querySelectorAll('.question-item.active').forEach(x => x.classList.remove('active'));
    item.classList.add('active');
    const qid = item.getAttribute('data-question-id');
    if (qid) selectQuestion(qid);
  });

  const first = list.querySelector('.question-item');
  if (first) {
    first.classList.add('active');
    const qid = first.getAttribute('data-question-id');
    if (qid) selectQuestion(qid);
  }
}


function selectQuestion(questionId){
  const data = window._qaCtx?.attemptData;
  if (!data) return;

  // Sidebar active state
  document.querySelectorAll('#qaSidebar .qa2p-item').forEach(el=>{
    el.classList.toggle('active', String(el.dataset.qid)===String(questionId));
  });

  const item = data.items.find(x => String(x.question_id) === String(questionId));
  if (!item){
    document.getElementById('qaQuestionPanel').innerHTML = '<div class="empty">Question not found.</div>';
    return;
  }
  renderQuestionDetail(item);
}

// Toggle this if you ever show the Q&A page to non-graders
const IS_GRADER = true;

function renderQuestionDetail(item){
  const panel = document.getElementById('qaQuestionPanel');
  if (!panel) return;

  // Build media and instructions identical to player
  const mediaHTML = qaBuildMediaHTML(item.media);
  const essayInstructionsHTML =
    (item.type === 'ESSAY' && item.essay_instructions && item.essay_instructions !== '<p><br></p>')
      ? `<div class="assignment-instructions margin-bottom-4">
           <b>Instructions:</b> ${item.essay_instructions}
         </div>` : '';

  // Build the answers area exactly like the player does (but read-only)
  let answersHTML = '';
  const t = (item.type || '').toUpperCase();
  if (t === 'FITB') {
    answersHTML = qaBuildFITBHTML(item);
  } else {
    answersHTML = qaBuildOptionsHTML(item);
  }

  const graderHTML = (t === 'ESSAY') ? qaBuildEssayGraderHTML(item) : '';

  // Build the full block
  // (Keep your class names so your existing CSS applies 1:1)
  const html = `
    <div class="quiz-question"
      data-question-id="${item.question_id}"
      data-question-type="${item.type}"
      data-has-media="${Array.isArray(item.media) && item.media.length ? 'true':'false'}">

      <div class="quiz-question-title margin-bottom-5">
        <h4>${escapeHtml(item.prompt || '(no prompt)')}</h4>
      </div>

      ${essayInstructionsHTML}
      ${mediaHTML}

      ${answersHTML}
      ${graderHTML}

      <!-- Feedback area preserved for style consistency; hidden in read-only -->
      <div id="questionFeedback" class="question-feedback hidden" aria-live="polite"></div>
    </div>
  `;

  // header number
  document.getElementById('qaMainOrder').innerText = `Question ${item.order ?? ''}`;

  panel.innerHTML = html;
  if (t === 'ESSAY' && IS_GRADER) bindEssayGraderEvents(item);
}

function qaBuildMediaHTML(mediaArray){
  if (!Array.isArray(mediaArray) || !mediaArray.length) return '';

  const embedParts = [];
  const nonEmbedParts = [];

  const hasIframe = (html) => /<iframe\b[^>]*>[\s\S]*?<\/iframe>/i.test(String(html || '').trim());
  const isLikelyUrl = (s) => /^https?:\/\//i.test(String(s || '').trim());

  for (const m of mediaArray) {
    // EMBED SOURCED ITEMS
    if (m.source_type === 'embed') {
      const code = (m.embed_code || '').trim();
      const url  = m.display_url || '';

      if (code) {
        if (hasIframe(code)) {
          embedParts.push(`<div class="media-embed iframe-embed margin-bottom-5">${code}</div>`);
        } else {
          embedParts.push(`
            <div style="width: 100%;" class="embed-fallback margin-bottom-5">
                <a href="${code}" target="_blank" rel="noopener noreferrer">${code}</a>
            </div>`);
        }
        continue;
      }
      continue; // handled embed path
    }

    // NON-EMBED SOURCED ITEMS (upload/library)
    const url = m.display_url || '';
    if (!url) continue;

    const L = url.toLowerCase();
    const title = escapeHtml(m.title || 'Media');

    if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?|$)/.test(L)) {
      nonEmbedParts.push(`
        <div class="media-thumb question-media-item thumbnail-inner-thumbnail">        
            <a href="${url}" target="_blank" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-arrow-up-right-from-square"></i>
            </a>
            <img src="${url}" alt="${title}" class="media-preview">
        </div>`);
    } else if (/\.(mp4|webm|ogg)(\?|$)/.test(L)) {
      nonEmbedParts.push(`<div class="media-thumb question-media-item thumbnail-inner-thumbnail placeholder-media-item">      
            <a href="${url}" target="_blank" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-arrow-up-right-from-square"></i>
            </a>
            <i class="fa-light fa-film"></i>
        </div>`);
    } else if (/\.(mp3|wav|ogg)(\?|$)/.test(L)) {
      nonEmbedParts.push(`<div class="media-thumb question-media-item thumbnail-inner-thumbnail placeholder-media-item">      
            <a href="${url}" target="_blank" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-arrow-up-right-from-square"></i>
            </a>
            <i class="fa-light fa-volume"></i>
        </div>`);
    } else if (/\.(pdf)(\?|$)/.test(L)) {
      nonEmbedParts.push(`
        <div class="media-thumb question-media-item thumbnail-inner-thumbnail placeholder-media-item">      
            <a href="${url}" target="_blank" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-arrow-up-right-from-square"></i>
            </a>
            <i class="fa-light fa-file-pdf"></i>
        </div>`);
    } else if (/\.(docx)(\?|$)/.test(L)) {
      nonEmbedParts.push(`
        <div class="media-thumb question-media-item thumbnail-inner-thumbnail placeholder-media-item">      
            <a href="${url}" target="_blank" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-arrow-up-right-from-square"></i>
            </a>
            <i class="fa-light fa-file-doc"></i>
        </div>`); 
    } else {
      nonEmbedParts.push(`
        <div class="media-thumb question-media-item thumbnail-inner-thumbnail placeholder-media-item">      
            <a href="${url}" target="_blank" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-arrow-up-right-from-square"></i>
            </a>
            <i class="fa-light fa-file"></i>
        </div>`);
    }
  }

  // Wrap non-embeds once; embeds stay as their own blocks
  const nonEmbedBlock = nonEmbedParts.length
    ? `<div class="question-media margin-bottom-5">${nonEmbedParts.join('')}</div>`
    : '';

  return embedParts.join('') + nonEmbedBlock;
}

// --- helper: MC/MR/TF option list with your same structure ---
function qaBuildOptionsHTML(item){
    const type = (item.type || '').toUpperCase();
    const isMR = (type === 'MR');
    if (!Array.isArray(item.options) || !item.options.length) return '';

    const opts = item.options.map(a => {
        return `
        <div class="quiz-answer-item ${a.selected ? 'selected-answer' : ''} ${a.is_correct ? 'correct' : ''}" data-answer-id="${a.id}">
            <label class="container answer-option" style="cursor: default;">
            <span>${escapeHtml(a.text || '')}</span>
            <div class="answer-item-icons-container">
                ${a.selected ? '<span title="Selected Answer" class="icon-selected"><i class="fa-regular fa-arrow-pointer"></i></span>':''}
                ${a.is_correct ? '<span title="Correct Answer" class="icon-correct"><i class="fa-regular fa-circle-check qa-option-icon"></i></span>' : '<span title="Incorrect Answer" class="icon-incorrect"><i class="fa-regular fa-circle-xmark qa-option-icon"></i></span>'}
                
            </div>
            </label>
        </div>
        `;
    }).join('');

    return `<div class="quiz-answers-container">${opts}</div>`;
}

// --- Build the GRADER controls (multi-prompt or single) ---
function qaBuildEssayGraderHTML(item){
  if (!IS_GRADER) return '';

  const prompts = Array.isArray(item.essay_prompts) ? item.essay_prompts : [];
  const qid = String(item.question_id || '');

  // helper: per-prompt grading controls (kept outside of your display markup classes)
  const renderControls = (nameBase, defaults={}) => {
    const { is_correct=null, score=1, max=1, feedback='' } = defaults;
    return `
      <div class="qa-grade-controls">
        <label class="container answer-option custom-radio">
          <span>Correct</span>
          <input type="radio" name="${nameBase}" value="true" ${is_correct === true ? 'checked' : ''}>
          <span class="custom-radio-button"></span>
        </label>
        <label class="container answer-option custom-radio">
          <span>Incorrect</span>
          <input type="radio" name="${nameBase}" value="false" ${is_correct === false ? 'checked' : ''}>
          <span class="custom-radio-button"></span>
        </label>

        <!-- <div class="grade-points">
          <input type="number" min="0" class="grade-score" placeholder="Score" value="${Number.isFinite(score) ? score : 1}"> /
          <input type="number" min="1" class="grade-max" placeholder="Max" value="${Number.isFinite(max) ? max : 1}">
        </div> -->

        <!-- <input type="text" class="grade-feedback" placeholder="Feedback (optional)" value="${escapeHtml(feedback)}"> -->
      </div>
    `;
  };

  // MULTI-PROMPT: replicate qaBuildEssayHTML blocks & append controls inside each
  if (prompts.length) {
    const rows = prompts.map((p, i) => {
        const pid = String(p.id);
        const nameBase = `g-${qid}-${pid}`;
        const displayBlock = `
            <div class="essay-prompt-block edit-user-input margin-bottom-4" data-prompt-id="${pid}">
            <label class="essay-prompt-label"><strong>${i + 1}.</strong> ${escapeHtml(p.prompt_text || '')}</label>
            <textarea name="answer" class="essay-response" data-prompt-id="${pid}" rows="5" cols="60" readonly>${escapeHtml(p.answer_text || '')}</textarea>
            </div>
        `;
        // If you later store previous grading decisions on p, pass them here:
        const controls = renderControls(nameBase, {
            is_correct: typeof p.grade_is_correct === 'boolean' ? p.grade_is_correct : null,
            score: Number.isFinite(p.grade_score) ? p.grade_score : 1,
            max: Number.isFinite(p.grade_max_points) ? p.grade_max_points : 1,
            feedback: p.grade_feedback || ''
        });

      // Wrap each prompt block + controls in a neutral container so your original classes stay intact
      return `
        <div class="qa-card margin-bottom-9 essay-grade-row" data-prompt-id="${pid}">
          <div class="qa-card-body">
            ${displayBlock}
            ${controls}
          </div>
        </div>
      `;
    }).join('');

    return `
        <div class="qa-card-header">
            <!-- <div class="qa-right">
                <span class="status course-active pastel-yellow">Pending until all prompts graded</span>
            </div> -->
        </div>
        <div class="essay-prompts">${rows}</div>
        <div class="qa-row">
            <button class="quiz-player-btn action-button-primary rounded-lg" id="btnGradeEssay"
                    data-question-id="${qid}">
                Save Grades
            </button>
        </div>
    `;
  }

  // SINGLE-PROMPT: replicate your original viewer container + add one set of controls
  const text = (item.response ?? '').toString();
  return `
    <div class="edit-user-input question-answer-container margin-bottom-4">
        <textarea class="essay-response" rows="5" cols="60" readonly>${escapeHtml(text)}</textarea>
    </div>

    ${renderControls(`g-overall-${qid}`, {
        is_correct: (item.correct === true ? true : item.correct === false ? false : null),
        score: Number.isFinite(item.score_points) ? item.score_points : 1,
        max: Number.isFinite(item.max_points) ? item.max_points : 1,
        feedback: item.feedback || ''
    })}

    <div class="qa-row margin-top-9">
        <button class="quiz-player-btn action-button-primary rounded-lg" id="btnGradeEssay"
                data-question-id="${qid}">
        Save Grade
        </button>
    </div>
  `;
}

async function refreshAttemptAndReselect(attemptId, questionId) {
  if (!attemptId) return;

  // keep the detail popup open
  const detail = document.getElementById('quizAttemptDetail');
  if (detail) {
    detail.querySelector('#qaDetailLoading')?.classList.remove('hidden');
    detail.querySelector('#qaDetailBody')?.classList.add('hidden');
  }

  try {
    const r = await fetch(`/admin/course-progress/quiz/attempt/${attemptId}/qandas/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
      body: JSON.stringify({}),
    });
    const { success, data } = await r.json();
    if (!success) throw new Error('refresh failed');

    // update cache/context
    window._qaCtx.attemptData = data;

    // update header bits (status, score, header line)
    const fin = data.attempt.finished_at || data.attempt.started_at;
    const headerEl = document.getElementById('qaDetailHeader');
    if (headerEl) headerEl.textContent = `${data.attempt.lesson_title} • ${formatScore(data.attempt.score_percent)} • ${formatDateHuman(fin)}`;

    const statusEl = document.getElementById('qaMetaStatus');
    if (statusEl) statusEl.innerHTML = statusBadgeHtml(data.attempt.status);

    // rebuild sidebar and reselect the same question
    renderSidebar(data.items);
    if (questionId) {
      // mark active in the newly rendered list
      const list = document.getElementById('qaQuestionList');
      const btn  = list?.querySelector(`.question-item[data-question-id="${questionId}"]`);
      if (btn) {
        list.querySelectorAll('.question-item.active').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        // (Re)render the detail pane for this question
        selectQuestion(questionId);
        // Nice touch: ensure it’s visible
        btn.scrollIntoView({ block: 'nearest' });
      }
    }

    if (detail) {
      detail.querySelector('#qaDetailLoading')?.classList.add('hidden');
      detail.querySelector('#qaDetailBody')?.classList.remove('hidden');
    }
  } catch (e) {
    console.error(e);
    displayValidationMessage('Could not refresh attempt after grading.', false);
  }
}

function bindEssayGraderEvents(item){
  const btn = document.getElementById('btnGradeEssay');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const attemptId  = window._qaCtx?.attemptId;
    const questionId = item.question_id;
    if (!attemptId || !questionId) return;

    btn.disabled = true;
    const root = document.getElementById('qaQuestionPanel');

    try {
      let result;
      const prompts = Array.isArray(item.essay_prompts) ? item.essay_prompts : [];
      if (prompts.length) {
        // collect only prompts the grader actually marked (partial grading allowed)
        const marks = collectPromptMarks(root, questionId);
        if (!marks.length) {
          displayValidationMessage('Select Correct/Incorrect on at least one prompt.', false);
          btn.disabled = false;
          return;
        }
        result = await gradeEssayMulti(attemptId, questionId, marks);
      } else {
        const overall = collectOverallMark(root, questionId);
        if (!overall) {
          displayValidationMessage('Select Correct or Incorrect.', false);
          btn.disabled = false;
          return;
        }
        result = await gradeEssaySingle(
          attemptId, questionId,
          overall.is_correct, overall.score, overall.max, overall.feedback
        );
      }

      // Update sidebar icon for this question
      const corr = result.is_correct; // true/false/null
      setSidebarStatus(questionId, /* answered */ true, corr);

      // If attempt finalized (no other pending essays), update header status/score
      if (result.attempt && result.attempt.finalized) {
        document.getElementById('qaMetaStatus').innerHTML =
          statusBadgeHtml(result.attempt.status);
        if (typeof result.attempt.score_percent === 'number') {
          // If you show score in header text, refresh that piece too if needed
          // (you already show it when the view loads)
        }
      }

        await refreshAttemptAndReselect(attemptId, questionId);
        showGraderToast('Saved!');
    } catch (e) {
      console.error(e);
      alert('Failed to save grade. Try again.');
    } finally {
      btn.disabled = false;
    }
  });
}

function setSidebarStatus(questionId, answered, corrVal){
  const list = document.getElementById('qaQuestionList');
  if (!list) return;
  const item = list.querySelector(`.question-item[data-question-id="${questionId}"]`);
  if (!item) return;

  const meta = item.querySelector('.question-item-meta');
  if (!meta) return;

  const correctHtml   = '<span class="icon-correct status-icon"   title="Correct"><i class="fa-regular fa-circle-check qa-option-icon"></i></span>';
  const incorrectHtml = '<span class="icon-incorrect status-icon" title="Incorrect"><i class="fa-regular fa-circle-xmark qa-option-icon"></i></span>';
  const pendingHtml   = '<span class="icon-pending status-icon"   title="Pending Review"><i class="fa-regular fa-clock"></i></span>';

  // remove any old status icon (clock/check/x). Leave media icon intact.
  meta.querySelectorAll('.icon-correct,.icon-incorrect,.icon-pending').forEach(n => n.remove());

  let htmlToAdd = '';
  if (answered === false) {
    htmlToAdd = ''; // no badge
  } else if (corrVal === true) {
    htmlToAdd = correctHtml;
  } else if (corrVal === false) {
    htmlToAdd = incorrectHtml;
  } else {
    htmlToAdd = pendingHtml;
  }

  if (htmlToAdd) meta.insertAdjacentHTML('beforeend', htmlToAdd);
}

function collectPromptMarks(root, questionId){
  const rows = [...root.querySelectorAll('.essay-grade-row')];
  const marks = [];
  for (const row of rows) {
    const pid = row.getAttribute('data-prompt-id');
    const choice = row.querySelector(`input[name="g-${questionId}-${pid}"]:checked`);
    if (!choice) continue; // not graded yet -> skip (keeps question pending)
    const is_correct = (choice.value === 'true');
    const score = parseInt(row.querySelector('.grade-score')?.value || '0', 10);
    const max   = parseInt(row.querySelector('.grade-max')?.value   || '1', 10);
    const feedback = row.querySelector('.grade-feedback')?.value || '';
    marks.push({ prompt_id: pid, is_correct, score, max, feedback });
  }
  return marks;
}

function collectOverallMark(root, questionId){
  const choice = root.querySelector(`input[name="g-overall-${questionId}"]:checked`);
  if (!choice) return null;
  const is_correct = (choice.value === 'true');
  const score = parseInt(root.querySelector('#overallScore')?.value || '0', 10);
  const max   = parseInt(root.querySelector('#overallMax')?.value   || '1', 10);
  const feedback = root.querySelector('#overallFeedback')?.value || '';
  return { is_correct, score, max, feedback };
}

function showGraderToast(msg){
  try {
    displayValidationMessage(msg, true);
  } catch {
    // minimal fallback
    console.log(msg);
  }
}

// --- helper: Essay prompts as readonly textareas to match player vibe ---
function qaBuildEssayHTML(item){
  const prompts = Array.isArray(item.essay_prompts) ? item.essay_prompts : [];
  if (!prompts.length) {
    // single-prompt essay: show a single box with the text (if any in response)
    const text = (item.response ?? '').toString();
    return `
      <div class="edit-user-input question-answer-container margin-bottom-4">
        <textarea class="essay-response" rows="5" cols="60" readonly>${escapeHtml(text)}</textarea>
      </div>
    `;
  }

  const blocks = prompts.map((p, i) => `
    <div class="essay-prompt-block edit-user-input margin-bottom-4" data-prompt-id="${p.id}">
      <label class="essay-prompt-label"><strong>${i + 1}.</strong> ${escapeHtml(p.prompt_text || '')}</label>
      <textarea name="answer" class="essay-response" data-prompt-id="${p.id}" rows="5" cols="60" readonly>${escapeHtml(p.answer_text || '')}</textarea>
    </div>
  `).join('');

  return `<div class="essay-prompts">${blocks}</div>`;
}

async function gradeEssaySingle(attemptId, questionId, isCorrect, score=1, max=1, feedback='') {
  const res = await fetch(`/admin/course-progress/quiz/attempt/${attemptId}/grade-essay/${questionId}/`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify({ overall: { is_correct: !!isCorrect, score, max, feedback } })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to grade');
  return json.data;
}

async function gradeEssayMulti(attemptId, questionId, prompts /* array of {prompt_id, is_correct, score, max, feedback?} */) {
  const res = await fetch(`/admin/course-progress/quiz/attempt/${attemptId}/grade-essay/${questionId}/`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify({ prompt_marks: prompts })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to grade');
  // Optionally re-fetch the Q&A pane or update the one item inline
  return json.data;
}

function computeFitbCorrect(item){
  // If the backend already told us, trust it.
  if (item.correct === true)  return true;
  if (item.correct === false) return false;

  // Otherwise, compute using the flags + acceptable answers.
  const list = Array.isArray(item.fitb_acceptable) ? item.fitb_acceptable : [];
  if (!list.length) return null; // nothing to compare against

  const cs = item.fitb_case_sensitive === true;         // default false
  const ws = item.fitb_strip_whitespace !== false;      // default true

  const norm = (s) => {
    let x = String(s ?? '');
    if (ws) x = x.trim();
    if (!cs) x = x.toLowerCase();
    return x;
  };

  const normVal  = norm(item.fitb_text || '');
  const normSet  = new Set(list.map(norm));
  return normSet.has(normVal);
}

function qaBuildFITBHTML(item){
    const val   = (item.fitb_text || '').toString();
    const list  = Array.isArray(item.fitb_acceptable) ? item.fitb_acceptable : [];
    const cs    = item.fitb_case_sensitive === true;
    const ws    = item.fitb_strip_whitespace !== false; // default True in your model

    // Decide status: true/false/null
    const corr = computeFitbCorrect(item);
    let statusClass;
    let fitbIcon;
    let iconClass;
    if(corr === true){
        statusClass = 'selected-answer correct';
        fitbIcon = '<i class="fa-regular fa-circle-check qa-option-icon"></i>';
        iconClass = 'icon-correct';
    }else if(corr === false){
        statusClass = 'incorrect';
        fitbIcon = '<i class="fa-regular fa-circle-xmark qa-option-icon"></i>';
        iconClass = 'icon-incorrect';
    }else{
        statusClass = 'pending';
        fitbIcon = '<i class="fa-regular fa-clock"></i>';
        iconClass = 'icon-pending';
    }

    const answersChips = list.map(a =>
        `<span class="answer-chip">${escapeHtml(a)}</span>`
    ).join(', ');

    const metaNote = list.length
        ? `<div class="answers-meta">
            ${cs
                ? '<div class="question-editor-label pastel-gray" style="display:flex;"><div class="question-editor-label-text">Case sensitive</div></div>'
                : '<div class="question-editor-label pastel-gray" style="display:flex;"><div class="question-editor-label-text">Not case sensitive</div></div>'}
            ${ws
                ? '<div class="question-editor-label pastel-gray" style="display:flex;"><div class="question-editor-label-text">Whitespace trimmed</div></div>'
                : '<div class="question-editor-label pastel-gray" style="display:flex;"><div class="question-editor-label-text">Whitespace preserved</div></div>'}
        </div>`
        : '';

    const acceptableHtml = list.length
        ? `<div id="FITBAcceptableAnswers" class="question-answers-subtext">
            <div class="answers-list">Acceptable Answers: ${answersChips}</div>
            ${metaNote}
        </div>`
        : '';

    return `
        <div class="fitb-answers-container">
            <div class="quiz-answer-item  ${statusClass}">
                <label class="container answer-option" style="cursor: default;">
                <span>${escapeHtml(val)}</span>
                <div class="answer-item-icons-container">           
                    <span class="${iconClass}">${fitbIcon}</span>           
                </div>
                </label>
            </div>
            ${acceptableHtml}
        </div>
    `;
}

function qaBackToAttempts(quizId){
  closePopup('quizAttemptDetail');
  openQuizAttempts(quizId)
}

// tiny sanitizer for titles/text we inject
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[c]));
}

const POPUP_ID = 'lessonAssignmentsPopup';
const titleEl = document.getElementById('AssignmentLessonTitle');   // subtitle
const typeEl  = document.getElementById('AssignmentLessonType');          // badge on right

const loadingWrap = document.getElementById('lessonAssignmentsLoading');
const loadedWrap  = document.getElementById('lessonAssignmentsLoaded');
const listEl      = document.getElementById('assignmentListContainer');
const errEl       = document.getElementById('assignmentListError');

// Expose a helper since your close button calls it
window.resetlessonAssignmentsLoading = function(){
  // clear any previous content/error and restore loading state
  listEl.innerHTML = '';
  errEl.textContent = '';
  errEl.classList.add('hidden');
  loadingWrap.classList.remove('hidden');
  loadedWrap.classList.add('hidden');
  titleEl.textContent = '';
  if (typeEl) typeEl.textContent = '—';
};

function showLoaded(){
  loadingWrap.classList.add('hidden');
  loadedWrap.classList.remove('hidden');
}

function showError(msg){
  errEl.textContent = msg || 'Could not load assignments. Please try again.';
  errEl.classList.remove('hidden');
}

function cap(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function buildRow(item, index){
  // wrapper
  const row = document.createElement('div');
  row.className = 'lesson-list-option';
  if(index == 0){row.classList.add('lesson-list-option-1');}

  // LEFT
  const left = document.createElement('div');
  left.className = 'lesson-list-option-left';

  // counter
  const counterWrap = document.createElement('div');
  counterWrap.className = 'lesson-list-counter';
  const counter = document.createElement('span');
  counter.textContent = index + 1;  // 1-based index
  counterWrap.appendChild(counter);

  // title
  const typeWrap = document.createElement('div');
  typeWrap.className = 'lesson-list-type';
  const title = document.createElement('span');
  title.className = 'selected-lesson-title';
  title.textContent = item.title;
  typeWrap.appendChild(title);

  left.appendChild(counterWrap);
  left.appendChild(typeWrap);

  // RIGHT
  const right = document.createElement('div');
  right.className = 'lesson-list-option-right';

  // status badge
  const statusWrap = document.createElement('div');
  statusWrap.className = 'lesson-list-progress';
  const statusSpan = document.createElement('span');
  statusSpan.className = `status course-active ${statusToPastel(item.status)}`;
  let statusText;
  if(item.status == 'pending'){statusText='Not Completed'}else{statusText = item.status};
  statusSpan.textContent = capitalize(statusText);
  statusWrap.appendChild(statusSpan);
  right.appendChild(statusWrap);

  // eye icon
  if (item.progress_id && item.manage_url) {
    const viewBtn = document.createElement('div');
    viewBtn.className = 'class-action-icon edit-icon';
    viewBtn.setAttribute('data-tooltip', 'View Submission');
    viewBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = item.manage_url;
    });
    right.appendChild(viewBtn);
  }

  row.appendChild(left);
  row.appendChild(right);

  return row;
}


function statusToPastel(status){
  // map your statuses to the pastel classes used in your template
  switch ((status || '').toLowerCase()) {
    case 'approved':
    case 'completed':
    case 'passed':
      return 'pastel-green';
    case 'pending':
      return 'pastel-gray';
    case 'failed':
    case 'rejected':
      return 'pastel-red';
    // treat submitted / incomplete / anything else as gray
    default:
      return 'pastel-yellow';
  }
}

function capitalize(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }


  async function fetchLessonAssignments(lessonId){
    const url = `/admin/course-progress/lesson/lesson-assignment/?lesson_id=${encodeURIComponent(lessonId)}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // Called by your flag icon
  window.openAssignmentListPopup = async function(el, lessonType){
    const lessonId = el.getAttribute('data-lesson-id');
    if (!lessonId) return;

    resetlessonAssignmentsLoading();
    openPopup(POPUP_ID);

    try {
      const data = await fetchLessonAssignments(lessonId);

      titleEl.textContent = data.lesson?.title || '';
      if(lessonType == 'SCORM2004'){typeEl.textContent = 'SCORM 2004'}else if(lessonType == 'SCORM1.2'){typeEl.textContent = 'SCORM 1.2'}else if(lessonType == 'file'){typeEl.textContent = 'File'}else if(lessonType == 'quiz'){typeEl.textContent = 'Quiz'}

      listEl.innerHTML = '';
      if (!data.assignments || data.assignments.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'hint';
        empty.textContent = 'No assignments for this lesson.';
        listEl.appendChild(empty);
      } else {
        data.assignments.forEach((item, i) => {
          listEl.appendChild(buildRow(item, i));
        });
      }

      showLoaded();
    } catch (e) {
      showLoaded();           // reveal body so error is visible
      showError('Could not load assignments. Please try again.');
      // console.error(e);
    }
  };