// const lessonDataElement = document.getElementById('lessonData');
// const parsedLessonData = JSON.parse(lessonDataElement.textContent);
// window.lessonData = parsedLessonData;  
let lessonScrollPositions = JSON.parse(localStorage.getItem("lessonScrollPositions") || "{}");
window.lessonSessionId = crypto.randomUUID();


// Define the global lesson ID and user ID
//window.lessonId = "{{ lesson.id }}";
//window.userId = "{{ profile_id }}";
//window.savedLocation = "{{ lesson_location|escapejs }}"; // Passed from Django
//window.savedProgress = parseFloat("{{ saved_progress }}") || 0;
//window.savedScrollPosition = parseInt("{{ saved_scroll_position|escapejs }}", 10) || 0;
//let progressDataString = '{{ mini_lesson_progress|default:"[]"|escapejs }}';
let progressData = Array.isArray(window.miniLessonProgress) ? window.miniLessonProgress : [];

let totalPages = 0;
let pagesVisited = new Set();

// Initialize session start time globally
let sessionStartTime = new Date();
let lastSessionSentTime = 0;

window.API_1484_11 = window.API_1484_11 || {
    dataStore: {},  // ✅ define it here

    Initialize: function () {
        // console.log("SCORM API: Initialize called");
        sessionStartTime = new Date(); // Set the session start time
        return "true";
    },
    Terminate: function () {
        // console.log("SCORM API: Terminate called");
        return "true";
    },
    GetValue: function (key) {
        // console.log(`SCORM API: GetValue called for key: ${key}`);
        return this.dataStore[key] || "";
    },
    SetValue: function (key, value) {
        // console.log(`📥 SCORM SetValue: ${key} = ${value}`);
        this.dataStore[key] = value;
        return "true";
    },
    Commit: function () {
        // console.log("SCORM API: Commit called");
        return "true";
    },
    SetBookmark: function () {
        // console.log("SCORM API: SetBookmark called");
        return "true";
    },
    CommitData: function () {
        // console.log("SCORM API: CommitData called");
        return "true";
    },
    GetLastError: function () {
        return "0";
    },
    GetErrorString: function (errorCode) {
        return "No error";
    },
    GetDiagnostic: function (errorCode) {
        return "";
    }
};

function isScormLesson() {
    return window.lessonContentType === 'SCORM2004' || window.lessonContentType === 'SCORM1.2';
}

function getSessionTime() {
    const now = new Date();
    const duration = Math.floor((now - sessionStartTime) / 1000);

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    return `PT${hours}H${minutes}M${seconds}S`;
}    

function getNewSessionTime() {
    const now = new Date();
    const duration = Math.floor((now - sessionStartTime) / 1000);  // seconds
    const newSeconds = duration - lastSessionSentTime;
    lastSessionSentTime = duration;  // update for next time

    const hours = Math.floor(newSeconds / 3600);
    const minutes = Math.floor((newSeconds % 3600) / 60);
    const seconds = newSeconds % 60;

    return `PT${hours}H${minutes}M${seconds}S`;
}

// Function to get CSRF token
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

function getTotalPagesFromIframe() {
    if (!isScormLesson()) return;
    const iframe = document.getElementById("scormContentIframe");
    if (iframe && iframe.contentWindow) {
        try {
            const iframeDocument = iframe.contentWindow.document;

            // Adjust selectors to match the structure of your SCORM content
            const slides = iframeDocument.querySelectorAll(".slide, .page"); // Example selectors
            // console.log("Slides Found:", slides.length);

            return slides.length;
        } catch (error) {
            console.error("Unable to access iframe content:", error);
        }
    }
    return 0; // Default fallback if pages are not found
}

function trackScrollPosition() {
    try {
        if (!isScormLesson()) return;

        const iframe = document.getElementById("scormContentIframe");
        if (iframe && iframe.contentWindow) {
            const scrollPos = iframe.contentWindow.scrollY || 
                                iframe.contentWindow.document.documentElement.scrollTop || 
                                iframe.contentWindow.document.body.scrollTop || 0;

            const lessonLocation = getLessonLocation();
            let suspendRaw = window.API_1484_11.GetValue("cmi.suspend_data") || "{}";

            let suspendData = {};
            try {
                suspendData = JSON.parse(suspendRaw);
            } catch (e) {
                console.warn("⚠️ Couldn't parse suspend_data:", e);
            }

            // 🔄 Update (don't overwrite) scroll data
            suspendData.scrollPos = scrollPos;
            suspendData.lessonLocation = lessonLocation;

            // Keep mini-lessons if present
            suspendData.miniLessons = suspendData.miniLessons || {};

            // Optionally track current mini-lesson scroll as well
            const currentIndex = getCurrentMiniLessonIndex();
            suspendData.miniLessons[currentIndex] = {
                scrollPos,
                lessonLocation
            };

            // ✅ Save back to SCORM
            window.API_1484_11.SetValue("cmi.suspend_data", JSON.stringify(suspendData));
            window.API_1484_11.Commit();

            // console.log(`💾 Saved suspend_data with scroll and mini-lesson (index ${currentIndex})`, suspendData);
        }
    } catch (error) {
        console.error("Error tracking scroll position:", error);
    }
}    

function getCurrentMiniLessonIndex() {
    try {
        const iframe = document.getElementById("scormContentIframe");
        const doc = iframe?.contentWindow?.document;
        if (!doc) return 0;

        const active = doc.querySelector('[aria-label*="Completed"].active, .mini-lesson.active');
        if (active?.dataset?.lessonIndex) {
            return parseInt(active.dataset.lessonIndex);
        }

        // fallback — use the first completed or visible element
        const all = doc.querySelectorAll('[aria-label*="Completed"], .mini-lesson');
        for (let i = 0; i < all.length; i++) {
            if (all[i].classList.contains("active")) return i;
        }

        return 0;  // fallback
    } catch (e) {
        console.warn("⚠️ Couldn't determine current mini-lesson index:", e);
        return 0;
    }
}
   
// Track scroll every 5 seconds
setInterval(trackScrollPosition, 5000);

function trackProgress() {
    console.log('here')
    try {
        // console.log("Attempting to track progress...");
        const iframe = document.getElementById("scormContentIframe");

        // --- For static content (PDFs, images, etc) ---
        if (iframe && !isScormLesson()) {
            const iframeUrl = iframe.src || '';
            const staticTypes = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov"];
            const isStaticFile = staticTypes.some(ext => iframeUrl.toLowerCase().includes(ext));

            if (isStaticFile) {
                iframe.classList.add('course-player-pdf');  // optional styling
                console.log("✅ Static content detected — marking as complete");
                markStaticLessonComplete(iframeUrl);
                return;
            }
            return;
        }

        // --- SCORM-only logic below ---
        if (!iframe || !iframe.contentWindow) {
            console.error("SCORM iframe not found.");
            return;
        }

        const progressMeasure = getProgressFromIframe();
        const lessonLocation = iframe.contentWindow.location.href;
        const scrollPosition = iframe.contentWindow.document.documentElement.scrollTop || 
                    iframe.contentWindow.document.body.scrollTop || 
                    iframe.contentWindow.scrollY || 
                    0;
        
        //let scrollPosition = getScrollPosition();
        window.API_1484_11.SetValue("cmi.scroll_position", scrollPosition.toString());

        if (progressMeasure > 0) {
            window.API_1484_11.SetValue("cmi.progress_measure", progressMeasure.toFixed(2));
            window.API_1484_11.SetValue("cmi.location", lessonLocation);
            window.API_1484_11.SetValue("cmi.scroll_position", scrollPosition.toString());

            // console.log(`Progress: ${progressMeasure}, Location: ${lessonLocation}, Scroll: ${scrollPosition}`);
            console.log('trackProgress');
            sendTrackingData({
                lesson_id: window.lessonId,
                user_id: window.userId,
                progress: progressMeasure,
                lesson_location: lessonLocation,
                scroll_position: scrollPosition,  
                completion_status: progressMeasure === 1 ? "complete" : "incomplete",
                session_time: getSessionTime(),
                score: null,
                cmi_data: JSON.stringify({
                    progress_measure: progressMeasure,
                    lesson_location: lessonLocation,
                    scroll_position: scrollPosition,
                }) // ✅ Send structured SCORM data
            });
            trackMiniLessonProgress();

        } else {
            console.warn("Progress measure not found or is 0.");
        }
    } catch (error) {
        console.error("Error tracking progress:", error);
    }
}

window.addEventListener("message", function(event) {
    if (event.data.type === "getScrollPosition") {
        var scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
        
        // 🔹 Send scroll position back to LMS
        window.parent.postMessage({ type: "scrollPositionResponse", scrollPos: scrollPos }, "*");
    }
});

let lastTrackingPayload = null;
let lessonMarkedComplete = false;
function sendTrackingData(trackingData) {
    if (lessonMarkedComplete && trackingData.completion_status !== "complete") {
        console.warn("🚫 Skipping post-completion tracking payload:", trackingData);
        return;
    }

    // Deduplication logic
    const payloadKey = JSON.stringify(trackingData);
    if (lastTrackingPayload === payloadKey) {
        console.warn("🛑 Duplicate trackingData detected — skipping second send.");
        return;
    }
    lastTrackingPayload = payloadKey;
    trackingData.session_id = window.lessonSessionId;

    if (trackingData.completion_status === "complete" || trackingData.final === true) {
        trackingData.session_time = getNewSessionTime();
    } else {
        delete trackingData.session_time;
    }

    fetch('/course_player/track-scorm-data/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(trackingData),
    })
    .then(response => response.json())
    .then(data => {
        console.log("📬 Backend responded with:", data);

        if (data.lesson_completed && data.status === 'success') {
            lessonMarkedComplete = true; // ✅ Block future sends
            waitForValidMiniLessonProgress(0, (progress) => {
                updateSidebarItems({ ...trackingData, progress, completion_status: 'complete' });
            });
            console.log(data.message);
        } else {
            waitForValidMiniLessonProgress(0, (progress) => {
                updateSidebarItems({ ...trackingData, progress, completion_status: 'incomplete' });
            });
            console.log("⏳ Lesson NOT marked complete by backend (likely due to pending assignments)", data.message);
        }
        updatecourseProgressBar(data);
    })
    .catch(error => console.error("🚨 Error tracking SCORM data:", error));
}

function updateSidebarItems(trackingData) {
    const lessonIdStr = String(trackingData.lesson_id);
    const currentLessons = document.querySelectorAll(`button[data-lesson-id="${lessonIdStr}"]`);
    const nextLessons = document.querySelectorAll(`button[data-lesson-id="${window.nextlessonId}"]`);

    if (currentLessons.length === 0) {
        console.warn(`No sidebar item found for lesson_id ${trackingData.lesson_id}`);
        return;
    }

    currentLessons.forEach(currentLesson => {
        const lessonRight = currentLesson.querySelector('.lesson-item-right');
        const lessonProgress = currentLesson.querySelector('.lesson-progress');

        // Always reset icons
        currentLesson.classList.remove('lesson-completed');
        if (lessonRight) lessonRight.innerHTML = '';

        if (trackingData.completion_status === 'complete') {
            currentLesson.classList.add('lesson-completed');
            if (lessonRight) {
                lessonRight.innerHTML = `<div class="lesson-complete-icon"><i class="fa-solid fa-circle-check"></i></div>`;
            }
            if (lessonProgress) {
                lessonProgress.style.display = 'none';
            }
        } else {
            if (lessonProgress) {
                lessonProgress.style.display = 'flex';
                lessonProgress.innerText = `${trackingData.progress}%`;
            }
            if (lessonRight) {
                lessonRight.innerHTML = `<span class="lesson-progress">${trackingData.progress}%</span>`;
            }
        }
    });

    if (
        trackingData.completion_status === 'complete' &&
        nextLessons.length > 0
    ) {
        const nextLessonBtn = document.getElementById('nextLessonBtn');
        if (nextLessonBtn) {
            nextLessonBtn.classList.remove('disabled');
            nextLessonBtn.removeAttribute('disabled');
        }
        nextLessons.forEach(nextLesson => {
            if (nextLesson.classList.contains('locked')) {
                const nextLessonRight = nextLesson.querySelector('.lesson-item-right');
                const nextLessonProgress = nextLesson.getAttribute('data-lesson-progress');

                nextLesson.classList.remove('locked', 'disabled');
                nextLesson.removeAttribute('disabled');

                if (nextLessonRight && nextLessonProgress) {
                    nextLessonRight.innerHTML = `<span class="lesson-progress">${nextLessonProgress}%</span>`;
                }
            }
        });
    }
}

function updatecourseProgressBar(data){
    console.log('trackingData.course_progress:', data.course_progress);
    const courseProgressBar = document.getElementById("courseProgressBar");
    const courseProgress = document.getElementById('courseProgress');
    const courseProgressText = document.getElementById("courseProgressText");
    if (courseProgressBar && courseProgressText) {
        courseProgressText.innerText = `${data.course_progress}%`;
        courseProgressBar.style.width = `${data.course_progress}%`;
        courseProgress.setAttribute("value", data.course_progress);
        courseProgress.nextElementSibling.innerText = `${data.course_progress}%`;
    }
    updateLessonCompletionCounterSCORM();
}

function updateLessonCompletionCounterSCORM() {
    document.querySelectorAll('.details-info-card').forEach(moduleCard => {
        const lessonButtons = moduleCard.querySelectorAll('.lesson-item');
        const counterEl = moduleCard.querySelector('.lesson-completion-counter span');

        let total = 0;
        let completed = 0;

        lessonButtons.forEach(button => {
            // Skip assignment buttons or non-lesson elements
            if (!button.classList.contains('lesson-item')) return;

            total++;

            // Check for .lesson-completed class
            if (button.classList.contains('lesson-completed')) {
                completed++;
            }
        });

        if (counterEl) {
            counterEl.textContent = `${completed}/${total}`;
        }
    });
}

function sendMiniLessonProgress(lessonProgressArray) {
    if (!lessonProgressArray || lessonProgressArray.length === 0) {
        console.warn("⚠️ No progress to send — skipping.");
        return;
    }

    // console.log("📡 Sending mini-lesson progress to server...", lessonProgressArray);

    fetch('/course_player/track-mini-lesson-progress/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            user_id: window.userId,
            lesson_progress: lessonProgressArray
        }),
    })
    .then(response => response.json())
    .then(data => {
        // console.log("✅ Mini-lesson progress updated:", data)
        waitForValidMiniLessonProgress();
    })
    .catch(error => console.error("🚨 Error tracking mini-lesson progress:", error));
}

function waitForSCORMUI(callback) {
    if (!isScormLesson()) return;
    let iframe = document.getElementById("scormContentIframe");
    if (!iframe || !iframe.contentWindow || !iframe.contentWindow.document) {
        console.warn("⚠️ SCORM iframe not found. Retrying in 2 seconds...");
        setTimeout(() => waitForSCORMUI(callback), 2000);
        return;
    }

    let iframeDocument = iframe.contentWindow.document;
    let progressCircles = iframeDocument.querySelectorAll("svg.progress-circle--sidebar");

    if (progressCircles.length > 0) {
        console.log("✅ SCORM Progress Circles Found:", progressCircles);
        callback(iframe);
    } else {
        console.warn("⚠️ SCORM UI not fully loaded yet. Retrying...");
        setTimeout(() => waitForSCORMUI(callback), 2000);
    }
}

function waitForSCORMIframe(callback, attempts = 10) {
    if (!isScormLesson()) return;
    let iframe = document.getElementById("scormContentIframe");
    if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
        // console.log("✅ SCORM iframe is now accessible.");
        callback(iframe);
    } else if (attempts > 0) {
        console.warn(`⚠️ SCORM iframe not ready yet. Retrying... (${attempts} attempts left)`);
        setTimeout(() => waitForSCORMIframe(callback, attempts - 1), 1000);
    } else {
        console.error("❌ SCORM iframe could not be accessed after multiple attempts.");
    }
}

function restoreScrollPosition() {
    try {
        var suspendData = window.API_1484_11.GetValue("cmi.suspend_data");
        if (suspendData) {
            var parsedData = JSON.parse(suspendData);
            var savedScrollPos = parsedData.scrollPos || 0;

            let iframe = document.getElementById("scormContentIframe");

            // Retry scroll restoration after content loads
            const tryScrollRestore = (attempts = 5) => {
                if (iframe && iframe.contentWindow && iframe.contentWindow.document.readyState === "complete") {
                    iframe.contentWindow.scrollTo(0, savedScrollPos);
                    console.log("✅ Scroll position restored to:", savedScrollPos);
                } else if (attempts > 0) {
                    // console.log("⚠️ Iframe not ready for scroll. Retrying...");
                    setTimeout(() => tryScrollRestore(attempts - 1), 1000);
                } else {
                    console.warn("❌ Failed to restore scroll position after retries.");
                }
            };

            tryScrollRestore();
        }
    } catch (error) {
        console.error("Error restoring scroll position:", error);
    }
}

function markStaticLessonComplete(lessonUrl = "") {
    const lessonId = window.lessonId;
    const userId = window.userId;

    const trackingData = {
        lesson_id: lessonId,
        user_id: userId,
        progress: 1,
        lesson_location: lessonUrl || window.location.href,
        scroll_position: 0,
        completion_status: "complete",
        session_time: getSessionTime(),
        score: null,
        cmi_data: JSON.stringify({
            progress_measure: 1,
            lesson_location: lessonUrl || window.location.href,
            scroll_position: 0
        })
    };

    console.log('markStaticLessonComplete');
    sendTrackingData(trackingData);
    trackMiniLessonProgress();
}

function restoreLessonProgress(iframe, suspendRaw) {
    if (!isScormLesson()) return;
    // console.log("🔁 [restoreLessonProgress] Raw suspend_data:", suspendRaw);

    let suspendData = {};
    try {
        suspendData = JSON.parse(
            suspendRaw || window.API_1484_11.GetValue("cmi.suspend_data") || "{}"
        );
    } catch (e) {
        console.warn("⚠️ Failed to parse suspend_data for restore:", e);
        return;
    }

    const scrollPos = suspendData.scrollPos || 0;
    const lessonLocation = suspendData.lessonLocation || iframe?.src;

    const miniIndex = getCurrentMiniLessonIndex();
    const mini = suspendData.miniLessons?.[miniIndex];
    const miniScroll = mini?.scrollPos;
    const miniLoc = mini?.lessonLocation;

    // console.log("📌 Restoring scroll — overall:", scrollPos, "mini:", miniScroll);
    const finalScroll = miniScroll ?? scrollPos;
    const finalLoc = miniLoc ?? lessonLocation;

    try {
        if (iframe?.contentWindow?.location && finalLoc) {
            iframe.contentWindow.location.href = finalLoc;
        }
    } catch (err) {
        console.error("🚨 Error applying lesson location:", err);
    }

    const tryScrollRestore = (attempts = 5) => {
        if (iframe?.contentWindow?.document.readyState === "complete") {
            iframe.contentWindow.scrollTo(0, finalScroll);
            // console.log("✅ Scroll position restored:", finalScroll);
        } else if (attempts > 0) {
            setTimeout(() => tryScrollRestore(attempts - 1), 1000);
        } else {
            console.warn("❌ Failed to restore scroll position after retries.");
        }
    };
    tryScrollRestore();

    // ✅ Merge back any new mini-objectives progress into suspend_data
    const merged = {
        ...suspendData,
        scrollPos: finalScroll,
        lessonLocation: finalLoc,
        miniLessons: {
            ...suspendData.miniLessons,
            [miniIndex]: {
                scrollPos: finalScroll,
                lessonLocation: finalLoc
            }
        },
        miniObjectives: suspendData.miniObjectives || window.miniLessonProgress || []
    };

    const updatedSuspendStr = JSON.stringify(merged);
    // console.log("🧪 Writing merged suspend_data back to SCORM API:", merged);

    try {
        window.API_1484_11.SetValue("cmi.suspend_data", updatedSuspendStr);
        window.API_1484_11.Commit();
    } catch (e) {
        console.warn("❌ Failed to write merged suspend_data:", e);
    }
}

function observeSCORMChanges(iframe) {
    let iframeDocument = iframe.contentWindow.document;
    let observer = new MutationObserver(() => {
        // console.log("🔄 SCORM UI updated, ensuring progress circles stay correct...");
    });

    observer.observe(iframeDocument.body, {
        childList: true,
        subtree: true
    });
}

function annotateSidebarCircles() {
    const iframe = document.getElementById("scormContentIframe");
    if (!iframe || !iframe.contentWindow || !iframe.contentWindow.document) return;

    const iframeDocument = iframe.contentWindow.document;
    const sidebarSVGs = iframeDocument.querySelectorAll("svg.progress-circle--sidebar");

    sidebarSVGs.forEach((svg, index) => {
        svg.setAttribute("data-lesson-index", index.toString());
    });

    // console.log("✅ Annotated sidebar progress circles with data-lesson-index.");
}   

function markLessonAsCompletedInSCORM() {
    const iframe = document.getElementById("scormContentIframe");
    if (!iframe || !iframe.contentWindow) {
        console.warn("⚠️ SCORM iframe not ready for completion call.");
        return;
    }

    const win = iframe.contentWindow;
    const api = win.API_1484_11 || win.parent?.API_1484_11;

    if (api && typeof api.SetValue === "function") {
        // console.log("✅ SCORM API found, triggering completion...");
        api.SetValue("cmi.completion_status", "completed");
        api.Commit();

        // Also mark progress_measure as 1.0 for good measure
        api.SetValue("cmi.progress_measure", "1.0");
        api.Commit();
    } else {
        console.warn("❌ SCORM API not available in iframe.");
    }
}   

function observeAndLockTooltip() {
    const iframe = document.getElementById("scormContentIframe");
    if (!iframe || !iframe.contentWindow || !iframe.contentWindow.document) return;

    const iframeDoc = iframe.contentWindow.document;
    const saved = Array.isArray(window.miniLessonProgress) ? window.miniLessonProgress : [];

    const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach(mutation => {
            const el = mutation.target.closest?.("svg.progress-circle--sidebar");
            if (!el) return;

            const index = el.getAttribute("data-lesson-index");
            const savedEntry = saved.find(p => p.mini_lesson_index == index && p.progress === "Completed");
            if (!savedEntry) return;

            const currentLabel = el.getAttribute("aria-label");
            if (currentLabel === "Completed" && el.classList.contains("progress-circle--done")) {
                // Already good — skip mutation
                return;
            }

            // 🛠️ Re-apply completed state
            el.setAttribute("aria-label", "Completed");
            el.setAttribute("data-completion-status", "completed");
            el.classList.add("progress-circle--done");

            const circle = el.querySelector("circle.progress-circle__runner");
            if (circle) {
                circle.classList.add("progress-circle__runner--done", "progress-circle__runner--passed");
                circle.classList.remove("progress-circle__runner--unstarted");
                circle.setAttribute("stroke-dashoffset", "0");
            }

            const checkmark = el.querySelector("path.progress-circle__pass");
            if (checkmark) {
                checkmark.style.display = "block";
                checkmark.style.opacity = "1";
                checkmark.style.visibility = "visible";
            }

            const failIcon = el.querySelector("path.progress-circle__fail");
            if (failIcon) {
                failIcon.style.display = "none";
            }

            // console.log(`🔁 Reapplied and locked completion state for mini-lesson ${index}`);
        });
    });

    // Attach observer to each progress circle SVG once
    const circles = iframeDoc.querySelectorAll("svg.progress-circle--sidebar");
    circles.forEach(svg => {
        observer.observe(svg, {
            attributes: true,
            attributeFilter: ["class", "aria-label"]
        });
    });

    // console.log("👀 Safe MutationObserver attached to lock mini-lesson completion state.");
}

function waitForTooltipPortal(callback, retries = 100, delay = 500) {
    let attempts = 0;

    function tryFindPortal() {
        const iframe = document.getElementById("scormContentIframe");
        const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;

        if (!iframeDoc) {
            console.warn("❌ iframe document not ready");
            return;
        }

        const portal = iframeDoc.getElementById("portal");
        const sampleTooltip = iframeDoc.querySelector('.lesson-progress__tooltip__inner');
        // console.log('waitForTooltipPortal → tooltip sample:', sampleTooltip?.textContent);

        if (portal) {
            // console.log("✅ #portal found inside iframe, running tooltip observer logic...");
            callback(portal, iframeDoc);
        } else if (attempts < retries) {
            attempts++;
            console.warn(`⌛ Waiting for #portal inside iframe... (attempt ${attempts})`);
            setTimeout(tryFindPortal, delay);
        } else {
            console.error("❌ Failed to find #portal inside iframe after retries.");
        }
    }

    tryFindPortal();
}

function lockTooltipTextOnHover(portal, iframeDoc) {
    const saved = Array.isArray(window.miniLessonProgress) ? window.miniLessonProgress : [];
    // console.log('SAVED:', saved);

    const getExpectedText = (index) => {
        const match = saved.find(p => String(p.mini_lesson_index) === index);
        if (!match) return "Unstarted";

        const raw = (match.progress || "").trim();
        const rawLower = raw.toLowerCase();

        if (rawLower === "completed") return "Completed";
        if (rawLower === "failed") return "Failed";
        if (/\d+%/.test(raw)) return raw;
        return raw || "Unstarted";
    };

    const patchAllTooltips = () => {
        const tooltips = portal.querySelectorAll('.lesson-progress__tooltip__inner');
        const allCircles = iframeDoc.querySelectorAll('svg.progress-circle--sidebar');

        tooltips.forEach((tooltipEl, i) => {
            const circle = allCircles[i];
            if (!circle) return;

            const index = circle.getAttribute("data-lesson-index");
            if (!index) return;

            const expected = getExpectedText(index);
            const current = tooltipEl.textContent.trim();

            const isValid = /(\d+%)|completed|failed/i.test(current);
            if (!isValid || current.toLowerCase() === "unstarted") {
                tooltipEl.textContent = expected;
                // console.log(`⚡ Initial patch: tooltip[${index}] → "${expected}"`);
            }
        });
    };

    const observer = new MutationObserver(() => {
        const hovered = iframeDoc.querySelector('svg.progress-circle--sidebar:hover');
        if (!hovered) return;

        const index = hovered.getAttribute("data-lesson-index");
        if (index == null) return;

        const expectedText = getExpectedText(index);

        const tooltips = portal.querySelectorAll('.lesson-progress__tooltip__inner');
        tooltips.forEach((tooltipEl) => {
            const current = tooltipEl.textContent.trim();
            const isValid = /(\d+%)|completed|failed/i.test(current);
            if (!isValid || current.toLowerCase() === "unstarted") {
                if (current !== expectedText) {
                    tooltipEl.textContent = expectedText;
                    console.log(`✅ Tooltip updated for mini-lesson ${index}: "${expectedText}"`);
                }
            }
        });
    });

    observer.observe(portal, {
        childList: true,
        subtree: true,
        characterData: true,
    });

    console.log("👀 Tooltip MutationObserver attached to #portal inside iframe");

    // 🔥 Patch everything once immediately
    patchAllTooltips();
}

function updateProgressCircles() {
    if (!isScormLesson()) return;

    const iframe = document.getElementById("scormContentIframe");
    if (!iframe || !iframe.contentWindow || !iframe.contentWindow.document) {
        console.warn("⚠️ SCORM iframe not yet ready. Retrying...");
        setTimeout(updateProgressCircles, 1000);
        return;
    }

    const iframeDocument = iframe.contentWindow.document;
    const progressCircles = iframeDocument.querySelectorAll("circle.progress-circle__runner, circle.progress-circle_runner");

    if (!progressCircles.length) {
        console.warn("⚠️ No progress circles found inside SCORM iframe. Retrying...");
        setTimeout(updateProgressCircles, 1000);
        return;
    }

    console.log("✅ Found Progress Circles inside iframe:", progressCircles);

    let miniLessonProgress = Array.isArray(window.miniLessonProgress) ? window.miniLessonProgress : [];
    console.log("📊 Mini-Lesson Progress Data:", miniLessonProgress);

    miniLessonProgress.forEach((item) => {
        const mini_lesson_index = item.mini_lesson_index;
        const rawProgress = item.progress;

        if (typeof rawProgress !== "string") {
            console.warn(`⚠️ Skipping mini-lesson ${mini_lesson_index} — invalid progress type`, rawProgress);
            return;
        }

        const normalized = rawProgress.trim().toLowerCase();
        let progressPercentage = 0;

        if (normalized === "completed") {
            progressPercentage = 100;
        } else {
            const match = normalized.match(/(\d+)%/);
            if (match) {
                progressPercentage = parseInt(match[1], 10);
            }
        }

        if (progressPercentage === 0) {
            console.log(`🟡 Mini-lesson ${mini_lesson_index} has 0% progress. Skipping visual completion.`);
            return;
        }

        const svg = iframeDocument.querySelector(`svg.progress-circle--sidebar[data-lesson-index="${mini_lesson_index}"]`);
        if (!svg) return;

        const circle = svg.querySelector("circle.progress-circle__runner");
        if (!circle) return;

        const totalStroke = 43.982297150257104;
        const strokeOffset = totalStroke * (1 - (progressPercentage / 100));
        circle.setAttribute("stroke-dashoffset", strokeOffset);

        if (progressPercentage === 100) {
            console.log('progressPercentage', progressPercentage);
            svg.setAttribute("aria-label", "Completed");
            svg.setAttribute("data-completion-status", "completed");
            svg.classList.add("progress-circle--done");
            circle.classList.add("progress-circle__runner--done", "progress-circle__runner--passed");
            circle.classList.remove("progress-circle__runner--unstarted");

            circle.setAttribute("stroke-dashoffset", "0");

            const checkmark = svg.querySelector("path.progress-circle__pass");
            if (checkmark) {
                checkmark.style.display = "block";
                checkmark.style.opacity = "1";
                checkmark.style.visibility = "visible";
            }

            const failIcon = svg.querySelector("path.progress-circle__fail");
            if (failIcon) {
                failIcon.style.display = "none";
            }
        }

        console.log(`🔄 Circle ${mini_lesson_index} updated to ${progressPercentage}%`);
    });

    console.log("🎯 Progress circles inside iframe updated.");

    //patchGlobalTooltipText();
    // Optional: if SCORM's own tooltip system rewrites the DOM later,
}

// Ensure the SCORM iframe is fully loaded before running
//waitForSCORMIframe(updateProgressCircles);  

function showSCORMCheckmarks(iframe) {
    if (!isScormLesson()) return;

    let iframeDocument = iframe.contentWindow.document;
    let checkmarks = iframeDocument.querySelectorAll("path.progress-circle__pass");

    if (checkmarks.length === 0) {
        console.warn("⚠️ No checkmarks found. Make sure SCORM has loaded.");
        return;
    }

    checkmarks.forEach((checkmark) => {
        //console.log("✅ Making checkmark visible:", checkmark);

        checkmark.style.display = "block";
        checkmark.style.opacity = "1";
        checkmark.style.visibility = "visible";

        // Ensure it's not hidden by SCORM's CSS
        let parentSVG = checkmark.closest("svg.progress-circle--sidebar");
        if (parentSVG) {
            parentSVG.style.display = "block";
            parentSVG.style.opacity = "1";
            parentSVG.style.visibility = "visible";
        }
    });

    console.log("✅ All checkmarks should now be visible.");
}  

// function observeSCORMCheckmarks(iframe) {
//     if (!isScormLesson()) return;
//     let iframeDocument = iframe.contentWindow.document;
//     let observer = new MutationObserver(() => {
//         console.log("🔄 SCORM UI updated, ensuring checkmarks remain visible...");
//         showSCORMCheckmarks(iframe);
//     });

//     observer.observe(iframeDocument.body, {
//         childList: true,
//         subtree: true
//     });
// }
/*
function trackMiniLessonProgress() {
    if (!isScormLesson()) return;

    console.log("🔍 Checking mini-lesson progress...");

    let updatedProgressArray = [...(window.miniLessonProgress || [])];
    const iframe = document.getElementById("scormContentIframe");

    if (iframe && iframe.contentWindow) {
        const doc = iframe.contentWindow.document;
        const allSidebarCircles = doc.querySelectorAll("svg.progress-circle--sidebar");

        allSidebarCircles.forEach((el, index) => {
            const progressText = el.getAttribute("aria-label") || "Incomplete";
            const miniLessonId = el.getAttribute("data-lesson-id") || window.lessonId;

            if (typeof index !== "number" || !progressText || progressText === "Incomplete") {
                console.warn(`⚠️ Skipping invalid or incomplete mini-lesson at index ${index}`);
                return;
            }

            const existing = updatedProgressArray.find(p => p.mini_lesson_index === index);
            if (!existing || existing.progress !== progressText) {
                updatedProgressArray = updatedProgressArray.filter(p => p.mini_lesson_index !== index);
                updatedProgressArray.push({
                    lesson_id: miniLessonId,
                    mini_lesson_index: index,
                    user_id: window.userId,
                    progress: progressText
                });
            }
        });
        console.log("✅ Final miniLessonProgress:", JSON.stringify(updatedProgressArray, null, 2));
        console.log("📊 Merged Mini-Lesson Progress Array:", updatedProgressArray);

        window.miniLessonProgress = updatedProgressArray;  // update local state
        sendMiniLessonProgress(updatedProgressArray);      // send to server
    }
}
*/
function rebuildMiniLessonProgressFromSCORM(providedRawData = null) {
    if (!window.API_1484_11 || typeof window.API_1484_11.GetValue !== "function") {
        console.warn("⚠️ SCORM API not ready — cannot rebuild mini lesson progress.");
        return;
    }

    console.log('REBUILLLLLLLLLLLLLLLLLD');

    try {
        const suspendRaw = providedRawData || window.API_1484_11.GetValue("cmi.suspend_data");
        console.log("📦 Raw suspend_data string for rebuild:", suspendRaw);

        if (!suspendRaw) {
            console.warn("⚠️ No suspend_data found.");
            return;
        }

        const parsed = JSON.parse(suspendRaw);

        if (!parsed || !Array.isArray(parsed.miniObjectives)) {
            console.warn("⚠️ suspend_data format invalid or miniObjectives not found");
            return;
        }

        console.log("📥 Rehydrated mini-lesson progress from suspend_data:", parsed.miniObjectives);

        // ✅ Update in-memory tracking
        window.miniLessonProgress = parsed.miniObjectives;

        let lastIdx = null;

    parsed.miniObjectives.forEach(obj => {
        const idx = obj.mini_lesson_index;
        const isComplete = obj.progress === "Completed";

        window.API_1484_11.SetValue(`cmi.objectives.${idx}.id`, `mini_${idx}`);
        window.API_1484_11.SetValue(`cmi.objectives.${idx}.progress_measure`, isComplete ? "1.0" : "0.0");
        window.API_1484_11.SetValue(`cmi.objectives.${idx}.completion_status`, isComplete ? "completed" : "incomplete");

        lastIdx = idx;
    });

    window.API_1484_11.Commit();

    if (lastIdx !== null) {
        const id = window.API_1484_11.GetValue(`cmi.objectives.${lastIdx}.id`);
        const measure = window.API_1484_11.GetValue(`cmi.objectives.${lastIdx}.progress_measure`);
        const status = window.API_1484_11.GetValue(`cmi.objectives.${lastIdx}.completion_status`);

        console.log(`🧪 Re-verified SCORM objective[${lastIdx}]: id=${id}, measure=${measure}, status=${status}`);
    }

    } catch (e) {
        console.error("❌ Failed to parse suspend_data or restore objectives:", e);
    }
}

function trackMiniLessonProgress() {
    if (!isScormLesson()) return;

    console.log("🔍 Checking mini-lesson progress...");

    const iframe = document.getElementById("scormContentIframe");
    if (!iframe || !iframe.contentWindow) return;

    const doc = iframe.contentWindow.document;
    const sidebarCircles = doc.querySelectorAll("svg.progress-circle--sidebar");
    let updated = [...(window.miniLessonProgress || [])];

    sidebarCircles.forEach((el, index) => {
        const progressText = el.getAttribute("aria-label");
        if (!progressText || progressText === "Unstarted") return;

        const existing = updated.find(p => p.mini_lesson_index === index);
        if (!existing || existing.progress !== progressText) {
            updated = updated.filter(p => p.mini_lesson_index !== index);
            updated.push({
                mini_lesson_index: index,
                progress: progressText
            });
            console.log("➡️ Applying progress for mini_lesson_index =", index);
        }

        // ✅ SCORM Objective API Sync
        try {
            if (window.API_1484_11 && typeof window.API_1484_11.SetValue === "function") {
                const api = window.API_1484_11;
                const isComplete = progressText === "Completed";

                api.SetValue(`cmi.objectives.${index}.id`, `mini_${index}`);
                api.SetValue(`cmi.objectives.${index}.progress_measure`, isComplete ? "1.0" : "0.0");
                api.SetValue(`cmi.objectives.${index}.completion_status`, isComplete ? "completed" : "incomplete");
            }
        } catch (err) {
            console.warn(`⚠️ Could not sync mini-lesson ${index} to SCORM`, err);
        }
    });

    // ✅ Update frontend copy only with trimmed data
    window.miniLessonProgress = updated;

    // ✅ Prepare clean backend payload
    const serverPayload = updated.map(p => ({
        lesson_id: window.lessonId,
        user_id: window.userId,
        mini_lesson_index: p.mini_lesson_index,
        progress: p.progress
    }));

    console.log("✅ Cleaned Mini-Lesson Progress for backend:", serverPayload);
    sendMiniLessonProgress(serverPayload);

    // ✅ Save to suspend_data
    try {
        let suspendPayload = { miniObjectives: updated };

        const existing = window.API_1484_11.GetValue("cmi.suspend_data");
        console.log("🔍 Existing suspend_data before update:", existing);
        if (existing) {
            const parsed = JSON.parse(existing);
            suspendPayload = { ...parsed, miniObjectives: updated };
        }

        const suspendString = JSON.stringify(suspendPayload);
        window.API_1484_11.SetValue("cmi.suspend_data", suspendString);
        console.log("🧪 Writing suspend_data to SCORM API:", suspendString);
    } catch (e) {
        console.warn("⚠️ Could not save to suspend_data", e);
    }


    // ✅ Final commit to LMS
    if (window.API_1484_11?.Commit) {
        window.API_1484_11.Commit();
    }

    updateSidebarProgress();
}

//function updateProgress(currentPage) {
    // Add current page to visited set
    //pagesVisited.add(currentPage);

    //if (totalPages > 0) {
        //const progress = pagesVisited.size / totalPages;
        //window.API_1484_11.SetValue("cmi.progress_measure", progress.toFixed(2));
        //console.log(`Progress Updated: ${progress}`);
        //trackProgress();
    //}
//}

function getProgressFromIframe() {
    if (!isScormLesson()) return;
    const iframe = document.getElementById("scormContentIframe");
    console.log("Checking iframe for progress...");

    if (iframe && iframe.contentWindow) {
        try {
            const iframeDocument = iframe.contentWindow.document;

            // Select the element containing the progress text
            const progressElement = iframeDocument.querySelector(".nav-sidebar-header__progress-text");
            if (progressElement) {
                const progressText = progressElement.textContent.trim();
                console.log("Progress Element Text Found:", progressText);

                // Extract numeric value from progress text (e.g., "10% COMPLETE")
                const progressMatch = progressText.match(/(\d+)%/);
                if (progressMatch) {
                    const progressValue = parseInt(progressMatch[1], 10);
                    console.log("Extracted Progress Value:", progressValue);

                    return progressValue / 100; // Convert to decimal (e.g., 0.1)
                }
            } else {
                console.warn("No progress element found matching the selector.");
            }
        } catch (error) {
            console.error("Error accessing iframe content for progress:", error);
        }
    } else {
        console.error("Iframe or iframe.contentWindow not available.");
    }
    return 0; // Default progress if not found
}
/*
function getLessonLocation() {
    try {
        const iframe = document.getElementById("scormContentIframe");
        if (!iframe || !iframe.contentWindow) {
            console.warn("⚠️ Iframe not accessible in getLessonLocation()");
            return "";
        }

        let lessonLocation = iframe.contentWindow.location.href;
        console.log(`📍 Captured Lesson Location: ${lessonLocation}`);
        return lessonLocation;
    } catch (error) {
        console.error("🚨 Error retrieving lesson location:", error);
        return "";
    }
}
*/

function getLessonLocation() {
    try {
        const iframe = document.getElementById("scormContentIframe");
        if (!iframe) return "";

        // ✅ Fallback to safe src for PDFs
        if (!isScormLesson() || !iframe.contentWindow) {
            return iframe.src || "";
        }

        return iframe.contentWindow.location.href;
    } catch (error) {
        console.error("🚨 Error retrieving lesson location:", error);
        return "";
    }
}    
/*
function saveLessonProgress() {
    let lessonId = window.lessonId;
    if (!lessonId) {
        console.warn("⚠️ No active lesson found, skipping progress save.");
        return;
    }

    try {
        let iframe = document.getElementById("scormContentIframe");
        let scrollPosition = 0;
        

        if (iframe && iframe.contentWindow) {
            scrollPosition = iframe.contentWindow.scrollY || 
                            iframe.contentWindow.document.documentElement.scrollTop || 
                            iframe.contentWindow.document.body.scrollTop || 0;
        }

        let lessonLocation = getLessonLocation();

        lessonScrollPositions[lessonId] = { scrollPosition, lessonLocation };
        localStorage.setItem("lessonScrollPositions", JSON.stringify(lessonScrollPositions));

        console.log(`✅ Progress Saved for Lesson ${lessonId}:`, lessonScrollPositions[lessonId]);
        
        sendTrackingData({
            lesson_id: lessonId,
            user_id: window.userId,
            progress: getProgressFromIframe(),
            lesson_location: lessonLocation, // 🔹 Send the exact lesson location
            scroll_position: scrollPosition, // 🔹 Send the exact scroll position
            completion_status: "incomplete",
            session_time: getSessionTime(),
            score: null,
        });
        
    } catch (error) {
        console.error("🚨 Error saving lesson progress:", error);
    }
}
*/

function saveLessonProgress() {
    let lessonId = window.lessonId;
    if (!lessonId) {
        console.warn("⚠️ No active lesson found, skipping progress save.");
        return;
    }

    const iframe = document.getElementById("scormContentIframe");

    // --- For static content (PDFs, images, etc) ---
    if (iframe && !isScormLesson()) {
        return;
    }

    let scrollPosition = 0;
    let lessonLocation = getLessonLocation();  // ✅ now safely returns iframe.src for PDFs

    if (isScormLesson()) {
        try {
            if (iframe && iframe.contentWindow) {
                scrollPosition = iframe.contentWindow.scrollY ||
                                    iframe.contentWindow.document.documentElement.scrollTop ||
                                    iframe.contentWindow.document.body.scrollTop || 0;
            }
        } catch (e) {
            console.warn("⚠️ Error reading scroll position (SCORM):", e);
        }
    }

    // Save scroll + location
    lessonScrollPositions[lessonId] = { scrollPosition, lessonLocation };
    localStorage.setItem("lessonScrollPositions", JSON.stringify(lessonScrollPositions));

    const progress = isScormLesson() ? getProgressFromIframe() : 1;
    const isComplete = progress >= 1.0;

    console.log('saveLessonProgress');
    sendTrackingData({
        lesson_id: lessonId,
        user_id: window.userId,
        progress: isScormLesson() ? getProgressFromIframe() : 1,
        lesson_location: lessonLocation,
        scroll_position: scrollPosition,
        completion_status: isComplete ? "complete" : "incomplete",
        session_time: getSessionTime(),
        score: null,
    });
    trackMiniLessonProgress();
}    
/*
function updateSidebarProgress() {
    if (!isScormLesson()) return;
    console.log("Updating sidebar progress on page load...");

    let attemptCount = 0;
    function tryUpdateProgress() {
        let savedProgress = window.savedProgress;
        const progressPercentage = Math.round(savedProgress * 100); // Convert decimal to percentage

        // Get the progress bar elements inside the iframe
        const iframe = document.getElementById("scormContentIframe");
        if (iframe && iframe.contentWindow) {
            try {
                const iframeDocument = iframe.contentWindow.document;
                
                // Select the progress text and progress bar elements
                const progressTextElement = iframeDocument.querySelector(".nav-sidebar-header__progress-text");
                const progressBarElement = iframeDocument.querySelector(".nav-sidebar-header__progress-runner"); // Adjusted selector
                
                if (progressTextElement) {
                    progressTextElement.textContent = `${progressPercentage}% COMPLETE`;
                    console.log(`✅ Updated sidebar progress text to ${progressPercentage}%`);
                }

                if (progressBarElement) {
                    progressBarElement.style.width = `${progressPercentage}%`;
                    progressBarElement.style.transition = "width 0.5s ease-in-out"; // Smooth transition effect
                    console.log(`✅ Updated sidebar progress bar width to ${progressPercentage}%`);
                } else if (attemptCount < 10) {
                    attemptCount++;
                    console.warn(`⚠️ Progress bar not found, retrying... (${attemptCount})`);
                    setTimeout(tryUpdateProgress, 500); // Retry after 500ms
                } else {
                    console.error("🚨 Failed to update progress bar after multiple attempts.");
                }
                // ✅ New Logic: Apply mini-lesson progress updates
                //applyMiniLessonProgress(progressData);

            } catch (error) {
                console.error("⚠️ Error accessing iframe content for progress update:", error);
            }
        } else {
            console.warn("⚠️ Iframe not fully loaded, retrying...");
            setTimeout(tryUpdateProgress, 500);
        }
    }

    // Start the retry mechanism
    setTimeout(tryUpdateProgress, 500);
}
*/
function calculateMiniLessonProgress() {
    const iframe = document.getElementById("scormContentIframe");
    if (!iframe || !iframe.contentWindow || !iframe.contentWindow.document) return 0;

    const iframeDocument = iframe.contentWindow.document;
    const allMiniLessons = iframeDocument.querySelectorAll("svg.progress-circle--sidebar");
    const total = allMiniLessons.length;

    if (total === 0) return 0;

    let completedCount = 0;
    allMiniLessons.forEach(el => {
        const label = el.getAttribute("aria-label") || "";
        if (label.trim().toLowerCase() === "completed") {
            completedCount++;
        }
    });

    const percent = Math.round((completedCount / total) * 100);
    // console.log(`✅ Mini-lesson completion: ${completedCount}/${total} = ${percent}%`);
    return percent;
}

function waitForValidMiniLessonProgress(attempts = 0, callback = null) {
    const maxAttempts = 50;
    const delay = 1000;

    if (!isScormLesson()) {
        console.log("📄 Non-SCORM lesson detected — skipping mini-lesson progress injection.");
        if (typeof callback === "function") callback(0);
        return;
    }

    const progress = calculateMiniLessonProgress();
    const iframe = document.getElementById("scormContentIframe");
    const lessonProgressTextElements = document.querySelectorAll(".lesson-item.active-lesson .lesson-progress");

    if (progress > 0) {
        console.log(`✅ Applying mini-lesson progress: ${progress}% (valid)`);

        lessonProgressTextElements.forEach(el => {
            el.textContent = `${progress}%`;
        });

        if (iframe?.contentWindow?.document) {
            const iframeDoc = iframe.contentWindow.document;
            const progressTextElement = iframeDoc.querySelector(".nav-sidebar-header__progress-text");
            const progressBarElement = iframeDoc.querySelector(".nav-sidebar-header__progress-runner");

            if (progressTextElement) {
                progressTextElement.textContent = `${progress}% COMPLETE`;
            }

            if (progressBarElement) {
                progressBarElement.style.width = `${progress}%`;
                progressBarElement.style.transition = "width 0.5s ease-in-out";
            }
        }

        if (typeof callback === "function") {
            callback(progress);
        }

    } else if (attempts < maxAttempts) {
        // console.log(`⏳ Progress still 0%, retrying... (${attempts + 1})`);
        setTimeout(() => waitForValidMiniLessonProgress(attempts + 1, callback), delay);
    } else {
        console.warn(`⚠️ Max retries hit (${maxAttempts}), applying fallback 0% progress.`);

        lessonProgressTextElements.forEach(el => {
            el.textContent = `0%`;
        });

        if (typeof callback === "function") {
            callback(0);
        }
    }
}

// Main entry point
function updateSidebarProgress() {
    if (!isScormLesson()) return;
    console.log("📊 Updating sidebar progress based on mini-lesson completion...");
    setTimeout(waitForValidMiniLessonProgress, 500);
}

function getMiniLessonProgress(scoIndex) {
    if (window.API_1484_11) {
        let progress = window.API_1484_11.GetValue(`cmi.objectives.${scoIndex}.progress_measure`);
        let completionStatus = window.API_1484_11.GetValue(`cmi.objectives.${scoIndex}.completion_status`);
        console.log("check here")
        console.log(`📊 Mini-Lesson ${scoIndex}: Progress = ${progress}, Status = ${completionStatus}`);
        
        return {
            progress: progress ? parseFloat(progress) : 0,
            status: completionStatus || "unknown"
        };
    }
    return null;
}

function waitForSCORMSuspendData(callback, retries = 20) {
    try {
        const suspendRaw = window.API_1484_11?.GetValue("cmi.suspend_data");
        if (suspendRaw && suspendRaw.includes("miniObjectives")) {
            console.log("🧠 suspend_data ready:", suspendRaw);
            callback(suspendRaw);
        } else if (retries > 0) {
            console.log("⏳ suspend_data not ready. Retrying...");
            setTimeout(() => waitForSCORMSuspendData(callback, retries - 1), 500);
        } else {
            console.warn("❌ suspend_data still missing after retries");
            callback(""); // Fallback
        }
    } catch (err) {
        console.error("🚨 Error checking suspend_data:", err);
        callback("");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded — processing lesson data, iframe logic, SCORM progress, and event handlers");

    const currentLessonId = parseInt(window.lessonId);
    console.log("🔍 Highlighting current lesson ID:", currentLessonId);

    const iframe = document.getElementById("scormContentIframe");
    const savedProgress = window.miniLessonProgress || [];

    // --- Parse lesson data ---
    let parsedData = [];
    try {
        const raw = document.getElementById('lessonData').textContent;
        const maybeData = JSON.parse(raw);
        parsedData = Array.isArray(maybeData) ? maybeData : [];
    } catch (e) {
        console.error("❌ Failed to parse lesson data:", e);
    }

    if (parsedData.length === 0) {
        console.warn("⚠️ No valid lesson data to process");
    }

    // --- Annotate each lesson item ---
    // document.querySelectorAll('.lesson-item').forEach(item => {
    //     const lessonId = parseInt(item.dataset.lessonId);
    //     const lessonInfo = parsedData.find(l => l.id === lessonId);

    //     if (lessonInfo?.completed) {
    //         item.classList.add("lesson-completed");
    //     }

    //     if (lessonInfo?.progress != null) {
    //         const progressText = document.createElement("span");
    //         progressText.className = "lesson-progress";
    //         progressText.textContent = `${lessonInfo.progress}%`;
    //         item.appendChild(progressText);
    //     }
    // });

    // --- Handle course lock logic ---
    // console.log("🔒 Course Locked:", window.courseLocked);
    // if (window.courseLocked) {
    //     const urlPath = window.location.pathname;
    //     const match = urlPath.match(/\/launch_scorm_file\/(\d+)\//);
    //     const currentLessonIdFromUrl = match ? parseInt(match[1]) : null;

    //     document.querySelectorAll('.lesson-item').forEach(item => {
    //         const lessonId = parseInt(item.getAttribute('data-lesson-id'));
    //         const lessonRight = item.querySelector('.lesson-item-right');
    //         if (lessonId !== currentLessonIdFromUrl) {
    //             const lockedIcon = document.createElement('div');
    //             lockedIcon.innerHTML = '<i class="fas fa-lock"></i> ';
    //             lessonRight.appendChild(lockedIcon);
    //             item.classList.add('locked');
                
    //         } else {
    //             console.log("🔓 Current lesson remains unlocked:", lessonId);
    //         }
    //     });
    // }

    // --- Fetch suspend_data from backend before loading SCORM content
    fetch(`/course_player/get-scorm-progress/${window.lessonId}/`)
    .then(res => res.json())
    .then(data => {
        if (data && data.suspend_data) {
            console.log("🎒 Restoring suspend_data from backend:", data.suspend_data);
            window.API_1484_11.dataStore["cmi.suspend_data"] = data.suspend_data;
            window.API_1484_11.Initialize();
            rebuildMiniLessonProgressFromSCORM(data.suspend_data);

            const dataSrc = iframe?.dataset?.src;
            console.log("🧪 iframe.dataset.src before setting src:", dataSrc);
            console.log("🧪 iframe current src before setting:", iframe?.src);

            if (dataSrc && dataSrc !== "about:blank") {
                iframe.src = dataSrc;
                console.log("✅ iframe.src set from dataset.src:", dataSrc);
            } else {
                console.warn("⚠️ iframe.dataset.src was about:blank — skipping src assignment");
            }
        }
    })
    .catch(err => {
        console.warn("⚠️ Failed to fetch suspend_data from server:", err);
    });

    // --- Resume to saved location ---
    if (window.savedLocation) {
        console.log(`📌 Resuming at saved location: ${window.savedLocation}`);
        iframe.addEventListener("load", function () {
            setTimeout(() => {
                try {
                    iframe.contentWindow.scrollTo(0, window.savedScrollPosition);
                } catch (error) {
                    console.error("❌ Scroll restore error:", error);
                }
            }, 0); // or some delay if needed
        });
    }
    // --- Iframe load logic ---
    iframe.addEventListener("load", function () {
        // console.log("✅ SCORM iframe loaded — restoring progress");

        waitForSCORMSuspendData((suspendData) => {
            // console.log("📦 Retrieved suspend_data from SCORM API:", suspendData);
            restoreLessonProgress(iframe, suspendData);
        });

        // Inject visual mini lesson progress
        function applySavedProgress() {
            if (!isScormLesson()) return;
            const iframeDocument = iframe.contentWindow.document;
            const progressElements = iframeDocument.querySelectorAll('[aria-label*="Completed"], [aria-label*="% Completed"]');

            progressElements.forEach((el, index) => {
                const progress = savedProgress[index];
                if (progress) {
                    el.setAttribute("aria-label", progress);
                    if (progress.includes("Completed")) {
                        el.classList.add("completed");
                    } else {
                        const progressBar = el.querySelector(".progress-bar");
                        if (progressBar) {
                            const percentage = parseInt(progress);
                            progressBar.style.width = `${percentage}%`;
                        }
                    }
                }
            });
        }
        applySavedProgress();

        waitForSCORMUI((iframe) => {
            const rawSuspend = window.API_1484_11.GetValue("cmi.suspend_data");  // ADDED LINE
            // console.log("📦 Retrieved suspend_data from SCORM API (UI phase):", rawSuspend);  // Optional log
            // console.log("🧱 Rebuilding progress from SCORM...");
            // rebuildMiniLessonProgressFromSCORM(rawSuspend);
            annotateSidebarCircles();
            updateProgressCircles();
            observeAndLockTooltip();
            waitForTooltipPortal(lockTooltipTextOnHover);
            // updateSidebarProgress();
            observeSCORMChanges(iframe);

            setTimeout(() => {
                console.log("📈 Triggering SCORM completion check...");
                trackMiniLessonProgress();
                markLessonAsCompletedInSCORM();
            }, 1000);
            // --- Periodic tracking
            // console.log("⏱ Adding periodic progress tracking intervals");
            setInterval(saveLessonProgress, 5000);
            setInterval(trackProgress, 5000);
        });

        try {
            iframe.contentWindow.addEventListener("scroll", () => {
                // console.log("📌 Detected scroll in SCORM iframe");
                saveLessonProgress();
            });
        } catch (e) {
            console.warn("⚠️ Could not attach scroll listener inside iframe:", e);
        }

        console.log("✅ SCORM iframe fully loaded and ready.");
    });

    setInterval(() => {
        if(!isScormLesson()){
            saveLessonProgress();
            trackProgress();
        }
    }, 5000);

    // --- Unload tracking
    function getProgressFromIframe() {
        try {
            const doc = iframe.contentWindow.document;
            const el = doc.querySelector(".nav-sidebar-header__progress-text");
            if (el) {
                const text = el.textContent.trim();
                const match = text.match(/(\d+)%/);
                if (match) return parseInt(match[1], 10) / 100;
            }
        } catch (e) {
            console.warn("⚠️ Cannot access iframe progress:", e);
        }

        // ✅ Fallback to SCORM objective
        try {
            const raw = window.API_1484_11.GetValue("cmi.objectives.0.progress_measure");
            const num = parseFloat(raw);
            if (!isNaN(num)) return num;
        } catch (e) {
            console.warn("⚠️ Cannot access SCORM objective progress:", e);
        }

        return 0;
    }

    function getScrollPosition() {
        try {
            const doc = iframe.contentWindow.document;
            const container = doc.querySelector(".scorm-content") || doc.body;
            return container.scrollTop;
        } catch (error) {
            console.error("🚨 Error reading scroll position:", error);
            return 0;
        }
    }

    window.addEventListener("pagehide", () => {
        const sessionTime = getNewSessionTime();
        const finalPayload = {
            lesson_id: window.lessonId,
            user_id: window.userId,
            session_id: window.lessonSessionId,
            session_time: sessionTime,
            progress: getProgressFromIframe(),
            scroll_position: getScrollPosition(),
            completion_status: getProgressFromIframe() === 1 ? "complete" : "incomplete",
            score: null,
            final: true,
            lesson_location: getLessonLocation(),
            cmi_data: {
                suspend_data: window.API_1484_11?.GetValue("cmi.suspend_data") || null
            }
        };

        if (window.API_1484_11 && typeof window.API_1484_11.SetValue === "function") {
            window.API_1484_11.SetValue("cmi.exit", "suspend");
            window.API_1484_11.Commit();
            window.API_1484_11.Terminate();
        }

        navigator.sendBeacon("/course_player/track-scorm-data/", new Blob([JSON.stringify(finalPayload)], { type: "application/json" }));
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            const sessionTime = getNewSessionTime();
            const finalPayload = {
                lesson_id: window.lessonId,
                user_id: window.userId,
                session_id: window.lessonSessionId,
                session_time: sessionTime,
                progress: getProgressFromIframe(),
                scroll_position: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
                completion_status: getProgressFromIframe() === 1 ? "complete" : "incomplete",
                score: null,
                final: true,
                lesson_location: getLessonLocation(),
                cmi_data: {
                    suspend_data: window.API_1484_11?.GetValue("cmi.suspend_data") || null
                }
            };

            navigator.sendBeacon("/course_player/track-scorm-data/", new Blob([JSON.stringify(finalPayload)], { type: "application/json" }));
        }
    });
});
