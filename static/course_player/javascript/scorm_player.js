const lessonDataElement = document.getElementById('lessonData');
const parsedLessonData = JSON.parse(lessonDataElement.textContent);
window.lessonData = parsedLessonData;  // Make globally accessible if needed
let lessonScrollPositions = JSON.parse(localStorage.getItem("lessonScrollPositions") || "{}");
window.lessonSessionId = crypto.randomUUID();


console.log("iplayer.html script loaded");

// Define the global lesson ID and user ID
//window.lessonId = "{{ lesson.id }}";
//window.userId = "{{ profile_id }}";
//window.savedLocation = "{{ lesson_location|escapejs }}"; // Passed from Django
//window.savedProgress = parseFloat("{{ saved_progress }}") || 0;
//window.savedScrollPosition = parseInt("{{ saved_scroll_position|escapejs }}", 10) || 0;
//let progressDataString = '{{ mini_lesson_progress|default:"[]"|escapejs }}';
let progressData = Array.isArray(window.miniLessonProgress) ? window.miniLessonProgress : [];

console.log("✅ Using mini lesson progress from server:", progressData);

console.log("Progress Data Loaded:", progressData);

let totalPages = 0;
let pagesVisited = new Set();

console.log("Profile ID:", window.userId);

// Initialize session start time globally
let sessionStartTime = new Date();
let lastSessionSentTime = 0;

window.API_1484_11 = window.API_1484_11 || {
    dataStore: {},  // ✅ define it here

    Initialize: function () {
        console.log("SCORM API: Initialize called");
        sessionStartTime = new Date(); // Set the session start time
        return "true";
    },
    Terminate: function () {
        console.log("SCORM API: Terminate called");
        return "true";
    },
    GetValue: function (key) {
        console.log(`SCORM API: GetValue called for key: ${key}`);
        return this.dataStore[key] || "";
    },
    SetValue: function (key, value) {
        console.log(`SCORM API: SetValue called for key: ${key}, value: ${value}`);
        this.dataStore[key] = value;
        return "true";
    },
    Commit: function () {
        console.log("SCORM API: Commit called");
        return "true";
    },
    SetBookmark: function () {
        console.log("SCORM API: SetBookmark called");
        return "true";
    },
    CommitData: function () {
        console.log("SCORM API: CommitData called");
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
    return window.lessonContentType === 'SCORM2004';
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
            console.log("Slides Found:", slides.length);

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

            console.log(`💾 Saved suspend_data with scroll and mini-lesson (index ${currentIndex})`, suspendData);
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
    try {
        console.log("Attempting to track progress...");
        const iframe = document.getElementById("scormContentIframe");
        
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

        console.log("🚀 Scroll Position Read:", {
            documentElementScroll: iframe.contentWindow.document.documentElement.scrollTop,
            bodyScroll: iframe.contentWindow.document.body.scrollTop,
            scrollY: iframe.contentWindow.scrollY,
            finalScrollPosition: scrollPosition
        });

        if (progressMeasure > 0) {
            window.API_1484_11.SetValue("cmi.progress_measure", progressMeasure.toFixed(2));
            window.API_1484_11.SetValue("cmi.location", lessonLocation);
            window.API_1484_11.SetValue("cmi.scroll_position", scrollPosition.toString());

            console.log(`Progress: ${progressMeasure}, Location: ${lessonLocation}, Scroll: ${scrollPosition}`);

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
        console.log("📌 SCORM Sending Scroll Position:", scrollPos);
        
        // 🔹 Send scroll position back to LMS
        window.parent.postMessage({ type: "scrollPositionResponse", scrollPos: scrollPos }, "*");
    }
});

function sendTrackingData(trackingData) {
    trackingData.session_id = window.lessonSessionId;  // 👈 Ensure session ID is attached

    if (trackingData.completion_status === "complete" || trackingData.final === true) {
        trackingData.session_time = getNewSessionTime();  // ✅ only here
    } else {
        delete trackingData.session_time;  // ❌ prevent backend accumulation during autosaves
    }

    console.log("📡 Sending SCORM tracking data to server...");

    fetch('/course_player/track-scorm-data/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(trackingData),
    })
    .then(response => response.json())
    .then(data => console.log("✅ SCORM progress updated:", trackingData))
    .catch(error => console.error("🚨 Error tracking SCORM data:", error));
}

function sendMiniLessonProgress(lessonProgressArray) {
    if (!lessonProgressArray || lessonProgressArray.length === 0) {
        console.warn("⚠️ No progress to send — skipping.");
        return;
    }

    console.log("📡 Sending mini-lesson progress to server...", lessonProgressArray);

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
    .then(data => console.log("✅ Mini-lesson progress updated:", data))
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
        console.log("✅ SCORM iframe is now accessible.");
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
                    console.log("⚠️ Iframe not ready for scroll. Retrying...");
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

function markPdfLessonComplete() {
    const lessonId = window.lessonId;
    const userId = window.userId;

    const trackingData = {
        lesson_id: lessonId,
        user_id: userId,
        progress: 1,  // 100%
        lesson_location: window.location.href,
        scroll_position: 0,
        completion_status: "complete",
        session_time: getSessionTime(),
        score: null,
        cmi_data: JSON.stringify({
            progress_measure: 1,
            lesson_location: window.location.href,
            scroll_position: 0
        })
    };

    sendTrackingData(trackingData);
}

function restoreLessonProgress(iframe, suspendRaw) {
    if (!isScormLesson()) return;
    console.log("🔁 [restoreLessonProgress] Raw suspend_data:", suspendRaw);

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

    console.log("📌 Restoring scroll — overall:", scrollPos, "mini:", miniScroll);
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
            console.log("✅ Scroll position restored:", finalScroll);
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
    console.log("🧪 Writing merged suspend_data back to SCORM API:", merged);

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
        console.log("🔄 SCORM UI updated, ensuring progress circles stay correct...");
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

    console.log("✅ Annotated sidebar progress circles with data-lesson-index.");
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
        console.log("✅ SCORM API found, triggering completion...");
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
    const observer = new iframe.contentWindow.MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const tooltip = iframeDoc.querySelector('.lesson-progress__tooltip_inner');
                if (tooltip && tooltip.textContent.trim() === "Unstarted") {
                    tooltip.textContent = "Completed";
                }
            }
        }
    });

    observer.observe(iframeDoc.body, {
        childList: true,
        subtree: true
    });

    console.log("👀 MutationObserver for tooltips activated.");
}

function patchGlobalTooltipText() {
    const tooltipSelector = '.lesson-progress__tooltip_inner';

    const fixTooltip = () => {
        const tooltips = document.querySelectorAll(tooltipSelector);
        tooltips.forEach(el => {
            if (el.textContent.trim().toLowerCase() === "unstarted") {
                el.textContent = "Completed";
                console.log("✅ Tooltip text manually corrected.");
            }
        });
    };

    // Immediate fix
    fixTooltip();

    // Observer for dynamic updates
    const portal = document.getElementById("portal");
    if (!portal) return;

    const observer = new MutationObserver(() => fixTooltip());
    observer.observe(portal, {
        childList: true,
        subtree: true
    });

    // Optionally stop observing after some time
    setTimeout(() => observer.disconnect(), 10000);
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

    // 🛠 Tooltip label patch for hover feedback
    const tooltipLabels = iframeDocument.querySelectorAll(".lesson-progress__tooltip_inner");
    tooltipLabels.forEach(el => {
        if (el.textContent.trim().toLowerCase() === "unstarted") {
            el.textContent = "Completed";
        }
    });
    // 🧪 Ensure tooltip always says "Completed" using MutationObserver
    const observerConfig = { childList: true, subtree: true };
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(node => {
                    if (
                        node.nodeType === Node.TEXT_NODE &&
                        node.textContent.trim().toLowerCase() === "unstarted"
                    ) {
                        node.textContent = "Completed";
                        console.log("🛠 Tooltip override enforced via MutationObserver.");
                    }
                });
            }
        }
    });

    // Attach observer to each tooltip container
    tooltipLabels.forEach(label => observer.observe(label, observerConfig));

    //patchGlobalTooltipText();
    // Optional: if SCORM's own tooltip system rewrites the DOM later,
    // you may need to use MutationObserver or repeat this check after a small delay
    setTimeout(updateProgressCircles, 1500);
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

        // ✅ Write each objective back to SCORM
        parsed.miniObjectives.forEach(obj => {
            const idx = obj.mini_lesson_index;
            const isComplete = obj.progress === "Completed";

            window.API_1484_11.SetValue(`cmi.objectives.${idx}.id`, `mini_${idx}`);
            window.API_1484_11.SetValue(`cmi.objectives.${idx}.progress_measure`, isComplete ? "1.0" : "0.0");
            window.API_1484_11.SetValue(`cmi.objectives.${idx}.completion_status`, isComplete ? "completed" : "incomplete");
        });

        window.API_1484_11.Commit();
        console.log("✅ SCORM objectives restored from suspend_data");

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

    console.log(`✅ Progress Saved for Lesson ${lessonId}:`, lessonScrollPositions[lessonId]);

    sendTrackingData({
        lesson_id: lessonId,
        user_id: window.userId,
        progress: isScormLesson() ? getProgressFromIframe() : 1,
        lesson_location: lessonLocation,
        scroll_position: scrollPosition,
        completion_status: isScormLesson() ? "incomplete" : "complete",
        session_time: getSessionTime(),
        score: null,
    });
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
function updateSidebarProgress() {
    if (!isScormLesson()) return;
    console.log("📊 Updating sidebar progress based on mini-lesson completion...");

    let attemptCount = 0;

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
        console.log(`✅ Mini-lesson completion: ${completedCount}/${total} = ${percent}%`);
        return percent;
    }

    function tryUpdateProgress() {
        const progressPercentage = calculateMiniLessonProgress();

        const iframe = document.getElementById("scormContentIframe");
        if (iframe && iframe.contentWindow) {
            try {
                const iframeDocument = iframe.contentWindow.document;

                const progressTextElement = iframeDocument.querySelector(".nav-sidebar-header__progress-text");
                const progressBarElement = iframeDocument.querySelector(".nav-sidebar-header__progress-runner");

                if (progressTextElement) {
                    progressTextElement.textContent = `${progressPercentage}% COMPLETE`;
                    console.log(`📝 Updated sidebar text to ${progressPercentage}%`);
                }

                if (progressBarElement) {
                    progressBarElement.style.width = `${progressPercentage}%`;
                    progressBarElement.style.transition = "width 0.5s ease-in-out";
                    console.log(`📈 Updated progress bar width to ${progressPercentage}%`);
                } else if (attemptCount < 10) {
                    attemptCount++;
                    console.warn(`⏳ Progress bar missing, retrying (${attemptCount})...`);
                    setTimeout(tryUpdateProgress, 500);
                } else {
                    console.error("❌ Progress bar update failed after retries.");
                }

            } catch (error) {
                console.error("🚨 Error updating sidebar progress:", error);
            }
        } else {
            console.warn("🕐 Iframe not ready, retrying...");
            setTimeout(tryUpdateProgress, 500);
        }
    }

    setTimeout(tryUpdateProgress, 500);
}

// Run this function when the SCORM iframe loads
/*
document.addEventListener("DOMContentLoaded", function () {
    const iframe = document.getElementById("scormContentIframe");

    iframe.addEventListener("load", function () {
        console.log("✅ SCORM content loaded, updating progress bar...");
        //updateSidebarProgress();
        setTimeout(() => {
            console.log("📌 Triggering scroll restoration...");
            //restoreScrollPosition();
            //restoreLessonProgress();
            // Fire tracking explicitly
            //saveLessonProgress();  // Already sends scroll & location
        }, 3000);
        
    });
});
*/
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
/*
document.addEventListener("DOMContentLoaded", function () {
    console.log("📌 Initializing SCORM progress and screen tracking...");

    const iframe = document.getElementById("scormContentIframe");

    //window.savedLocation = "{{ saved_location|escapejs }}";
    //window.savedScrollPosition = parseInt("{{ saved_scroll_position|escapejs }}", 10) || 0;
    //let lessonScrollPositions = JSON.parse(localStorage.getItem("lessonScrollPositions") || "{}");

    if (window.savedLocation) {
        console.log(`Resuming at saved location: ${window.savedLocation}`);

        iframe.addEventListener("load", function () {
            console.log(`Navigating to saved location: ${window.savedLocation}`);

            console.log("SCORM content loaded. Applying mini-lesson progress.");
            setTimeout(() => {
                try {
                    console.log(`Restoring scroll position to: ${window.savedScrollPosition}`);
                    iframe.contentWindow.scrollTo(0, window.savedScrollPosition);
                } catch (error) {
                    console.error("Error restoring scroll position:", error);
                }
            }, 2000); // ✅ Delay to ensure SCORM content fully loads
        });
    }

    function getActiveLessonId() {
        let activeLessonElement = document.querySelector(".lesson-item.active, .lesson-item.current");
        console.log('LESSSSSSSSSSSSSSSON: ', activeLessonElement)
        return activeLessonElement ? activeLessonElement.getAttribute("data-lesson-id") : null;
    }

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

    function getProgressFromIframe() {
        let iframeDocument = iframe.contentWindow.document;
        let progressElement = iframeDocument.querySelector(".nav-sidebar-header__progress-text");

        if (progressElement) {
            let progressText = progressElement.textContent.trim();
            console.log("📊 Found Progress Text:", progressText);

            let progressMatch = progressText.match(/(\d+)%/);
            if (progressMatch) {
                let progressValue = parseInt(progressMatch[1], 10);
                console.log("📏 Extracted Progress Value:", progressValue);
                return progressValue / 100;
            }
        }
        console.warn("⚠️ No progress element found.");
        return 0;
    }

    iframe.addEventListener("load", function () {
        console.log("✅ SCORM iframe loaded, restoring lesson progress...");
        const suspendData = window.API_1484_11.GetValue("cmi.suspend_data");
        console.log("📦 Retrieved suspend_data from SCORM API:", suspendData);
        restoreLessonProgress(iframe, suspendData);

        waitForSCORMUI((iframe) => {
            console.log("🧱 Rebuilding progress from SCORM...");
            rebuildMiniLessonProgressFromSCORM();  // ✅ moved inside UI-ready callback

            annotateSidebarCircles();
            updateProgressCircles(); // ✅ now uses freshly rebuilt progress
            observeSCORMChanges(iframe);

            setTimeout(() => {
                console.log("⏳ Triggering SCORM completion after sidebar setup...");
                trackMiniLessonProgress(); // ✅ now captures rebuilt + updated visuals
                markLessonAsCompletedInSCORM();
            }, 1000);
        });

        try {
            iframe.contentWindow.addEventListener("scroll", function () {
                console.log("📌 Detected scroll in SCORM iframe");
                saveLessonProgress();
            });
        } catch (e) {
            console.warn("⚠️ Could not attach scroll listener inside iframe:", e);
        }
    });

    // Ensure scroll position is saved every 30 seconds
    setInterval(saveLessonProgress, 5000);
});

console.log("✅ pagehide event listener attached");

document.addEventListener("DOMContentLoaded", () => {
  fetch(`/course_player/get-scorm-progress/${window.lessonId}/`)
    .then(res => res.json())
    .then(data => {
      if (data && data.suspend_data) {
        console.log("🎒 Restoring suspend_data from backend:", data.suspend_data);
        window.API_1484_11.dataStore["cmi.suspend_data"] = data.suspend_data;

        // ✅ Inject suspend_data *before* SCORM content reads from it
        rebuildMiniLessonProgressFromSCORM();  // <<—— Place here
      }
    })
    .catch(err => {
      console.warn("⚠️ Failed to fetch suspend_data from server:", err);
    });
});

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded — attaching unload handlers");

    window.addEventListener("pagehide", function () {
        const sessionTime = getNewSessionTime();
        console.log("📤 [pagehide] Sending unload session_time:", sessionTime);

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
            cmi_data: {}
        };

        // ✅ Add this to set cmi.exit = "suspend"
        if (window.API_1484_11 && typeof window.API_1484_11.SetValue === "function") {
            console.log("🔒 Setting cmi.exit = 'suspend' before exit...");
            window.API_1484_11.SetValue("cmi.exit", "suspend");
            window.API_1484_11.Commit();
            window.API_1484_11.Terminate();
        }

        navigator.sendBeacon(
            "/course_player/track-scorm-data/",
            new Blob([JSON.stringify(finalPayload)], { type: "application/json" })
        );
    });

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            const sessionTime = getNewSessionTime();
            console.log("📤 [visibilitychange] Sending unload session_time:", sessionTime);

            const finalPayload = {
                lesson_id: window.lessonId,
                user_id: window.userId,
                session_id: window.lessonSessionId,
                session_time: sessionTime,
                progress: getProgressFromIframe(),
                scroll_position: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0, // ✅ Here!
                completion_status: getProgressFromIframe() === 1 ? "complete" : "incomplete",
                score: null,
                final: true,
                lesson_location: getLessonLocation(),
                cmi_data: {}
            };

            navigator.sendBeacon(
                "/course_player/track-scorm-data/",
                new Blob([JSON.stringify(finalPayload)], { type: "application/json" })
            );
        }
    });

    // ✅ Add checkmark/visual sync logic after iframe load
    const iframe = document.getElementById("scormContentIframe");

    if (iframe) {
        iframe.addEventListener("load", function () {
            console.log("✅ SCORM iframe loaded — applying saved progress");

            waitForSCORMUI((iframe) => {
                rebuildMiniLessonProgressFromSCORM();
                annotateSidebarCircles();
                updateProgressCircles();
                observeSCORMChanges(iframe);
                //observeSCORMCheckmarks(iframe);
            });
        });
    }
});
*/
function waitForPortalAndObserveTooltip() {
    const maxRetries = 20;
    let attempt = 0;

    function tryAttach() {
        const portal = document.getElementById("portal");
        if (portal) {
            console.log("✅ #portal found, attaching tooltip observer");
            attachTooltipObserver(portal); // 👈 start real logic
        } else if (attempt < maxRetries) {
            attempt++;
            console.warn(`⚠️ #portal not found. Retrying... (${attempt})`);
            setTimeout(tryAttach, 500); // Retry every 500ms
        } else {
            console.error("❌ Failed to find #portal after multiple attempts.");
        }
    }

    tryAttach();
}

function attachTooltipObserver(portal) {
    const saved = Array.isArray(window.miniLessonProgress) ? window.miniLessonProgress : [];

    const correctTooltipText = () => {
        const tooltip = portal.querySelector('.lesson-progress__tooltip_inner');
        if (!tooltip) return;

        const hovered = document.querySelector('svg.progress-circle--sidebar:hover');
        if (!hovered) return;

        const index = hovered.getAttribute("data-lesson-index");
        if (index == null) return;

        const match = saved.find(p => p.mini_lesson_index == index && p.progress === "Completed");
        if (match && tooltip.textContent.trim().toLowerCase() === "unstarted") {
            tooltip.textContent = "Completed";
            console.log(`✅ Tooltip for mini_lesson ${index} corrected to "Completed"`);
        }
    };

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (
                    node.nodeType === Node.ELEMENT_NODE &&
                    node.classList.contains("lesson-progress__tooltip_inner")
                ) {
                    setTimeout(correctTooltipText, 10);
                }
            }
        }
    });

    observer.observe(portal, { childList: true, subtree: true });
    console.log("🔒 Tooltip observer now monitoring #portal");
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
    document.querySelectorAll('.lesson-item').forEach(item => {
        const lessonId = parseInt(item.dataset.lessonId);
        const lessonInfo = parsedData.find(l => l.id === lessonId);

        if (lessonInfo?.completed) {
            item.classList.add("lesson-completed");
        }

        if (lessonInfo?.progress != null) {
            const progressText = document.createElement("span");
            progressText.className = "lesson-progress";
            progressText.textContent = `${lessonInfo.progress}%`;
            item.appendChild(progressText);
        }
    });

    // --- Handle course lock logic ---
    console.log("🔒 Course Locked:", window.courseLocked);
    if (window.courseLocked) {
        const urlPath = window.location.pathname;
        const match = urlPath.match(/\/launch_scorm_file\/(\d+)\//);
        const currentLessonIdFromUrl = match ? parseInt(match[1]) : null;

        document.querySelectorAll('.lesson-item').forEach(item => {
            const lessonId = parseInt(item.getAttribute('data-lesson-id'));
            if (lessonId !== currentLessonIdFromUrl) {
                item.classList.add('locked');
                item.innerHTML = '<i class="fas fa-lock"></i> ' + item.innerHTML;
            } else {
                console.log("🔓 Current lesson remains unlocked:", lessonId);
            }
        });
    }

    // --- Detect PDF content ---
    if (iframe) {
        iframe.addEventListener("load", function () {
            const iframeUrl = iframe.contentWindow?.location?.href || iframe.src;
            console.log("📄 Loaded content:", iframeUrl, 'iframe.src:', iframe.src);
            if (iframeUrl.endsWith(".pdf")) {
                console.log("✅ PDF detected — marking as complete");
                markPdfLessonComplete();
            }
        });
    }

    // --- Fetch suspend_data from backend before loading SCORM content
    fetch(`/course_player/get-scorm-progress/${window.lessonId}/`)
    .then(res => res.json())
    .then(data => {
        if (data && data.suspend_data) {
            console.log("🎒 Restoring suspend_data from backend:", data.suspend_data);
            window.API_1484_11.dataStore["cmi.suspend_data"] = data.suspend_data;
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
            }, 2000);
        });
    }

    // --- Iframe load logic ---
    iframe.addEventListener("load", function () {
        console.log("✅ SCORM iframe loaded — restoring progress");

        waitForSCORMSuspendData((suspendData) => {
            console.log("📦 Retrieved suspend_data from SCORM API:", suspendData);
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
            console.log("📦 Retrieved suspend_data from SCORM API (UI phase):", rawSuspend);  // Optional log
            console.log("🧱 Rebuilding progress from SCORM...");
            rebuildMiniLessonProgressFromSCORM(rawSuspend);
            annotateSidebarCircles();
            updateProgressCircles();
            updateSidebarProgress();
            enforceTooltipOverrides();
            waitForPortalAndObserveTooltip();
            observeSCORMChanges(iframe);

            setTimeout(() => {
                console.log("📈 Triggering SCORM completion check...");
                trackMiniLessonProgress();
                markLessonAsCompletedInSCORM();
            }, 1000);
        });

        try {
            iframe.contentWindow.addEventListener("scroll", () => {
                console.log("📌 Detected scroll in SCORM iframe");
                saveLessonProgress();
            });
        } catch (e) {
            console.warn("⚠️ Could not attach scroll listener inside iframe:", e);
        }

        console.log("✅ SCORM iframe fully loaded and ready.");
    });

    // --- Periodic tracking
    console.log("⏱ Adding periodic progress tracking intervals");
    setInterval(saveLessonProgress, 5000);
    setInterval(trackProgress, 5000);
    setInterval(trackMiniLessonProgress, 1000);

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
