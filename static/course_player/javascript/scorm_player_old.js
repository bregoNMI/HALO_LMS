const lessonDataElement = document.getElementById('lessonData');
const parsedLessonData = JSON.parse(lessonDataElement.textContent);
window.lessonData = parsedLessonData;  // Make globally accessible if needed
let lessonScrollPositions = JSON.parse(localStorage.getItem("lessonScrollPositions") || "{}");


console.log("iplayer.html script loaded");

    // Define the global lesson ID and user ID
    //window.lessonId = "{{ lesson.id }}";
    //window.userId = "{{ profile_id }}";
    //window.savedLocation = "{{ lesson_location|escapejs }}"; // Passed from Django
    //window.savedProgress = parseFloat("{{ saved_progress }}") || 0;
    //window.savedScrollPosition = parseInt("{{ saved_scroll_position|escapejs }}", 10) || 0;
    //let progressDataString = '{{ mini_lesson_progress|default:"[]"|escapejs }}';
    let progressData;

    try {
        progressData = window.progressDataString ? JSON.parse(window.progressDataString) : [];
    } catch (error) {
        console.error("JSON parsing error for progressDataString:", error, window.progressDataString);
        progressData = []; // Fallback to empty array
    }

    console.log("Progress Data Loaded:", progressData);

    let totalPages = 0;
    let pagesVisited = new Set();

    console.log("Profile ID:", window.userId);

    // Initialize session start time globally
    let sessionStartTime = new Date();

    // Ensure SCORM API is available globally
    window.API_1484_11 = window.API_1484_11 || {
        Initialize: () => {
            console.log("SCORM API: Initialize called");
            sessionStartTime = new Date(); // Set the session start time
            return "true";
        },
        Terminate: () => {
            console.log("SCORM API: Terminate called");
            return "true";
        },
        GetValue: (key) => {
            console.log(`SCORM API: GetValue called for key: ${key}`);
            
            // Retrieve from mock data store
            return this.dataStore ? this.dataStore[key] || "" : "";
        },
        SetValue: (key, value) => {
            console.log(`SCORM API: SetValue called for key: ${key}, value: ${value}`);
            
            // Persist progress measure in a mock data store
            if (!this.dataStore) {
                this.dataStore = {}; // Create a mock data store if it doesn't exist
            }
            this.dataStore[key] = value; // Store the key-value pair

            return "true";
        },
        Commit: () => {
            console.log("SCORM API: Commit called");
            return "true";
        },
        SetBookmark: () => {
            console.log("SCORM API: SetBookmark called");
            return "true";
        },
        CommitData: () => {
            console.log("SCORM API: CommitData called");
            return "true";
        },
        GetLastError: () => "0",
        GetErrorString: (errorCode) => "No error",
        GetDiagnostic: (errorCode) => "",
    };

    function isScormLesson() {
        return window.lessonContentType === 'SCORM2004';
    }
    

    // Function to calculate session time
    function getSessionTime() {
        const now = new Date();
        const duration = Math.floor((now - sessionStartTime) / 1000); // Duration in seconds

        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;

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

    function updateTotalPages() {
        const iframe = document.getElementById("scormContentIframe");
        if (iframe) {
            iframe.addEventListener("load", () => {
                totalPages = getTotalPagesFromIframe();
                console.log("Total Pages Updated:", totalPages); // Display total pages in the console
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        updateTotalPages(); // Initialize the process to count total pages
    });

    document.addEventListener("DOMContentLoaded", function () {
        const currentLessonId = parseInt(window.lessonId);
        console.log("🔍 Highlighting current lesson ID:", currentLessonId);

        let lessonData = [];

        try {
            const raw = document.getElementById('lessonData').textContent;
            lessonData = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Lesson data parse error:", e);
        }

        let parsedData = [];
        try {
            const rawData = document.getElementById('lessonData').textContent;
            const maybeData = JSON.parse(rawData);
            parsedData = Array.isArray(maybeData) ? maybeData : [];
        } catch (e) {
            console.error("Failed to parse lesson data:", e);
        }

        if (parsedData.length === 0) {
            console.warn("⚠️ No valid lesson data to process");
        }

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
    });
    
    document.addEventListener("DOMContentLoaded", function () {
        //const courseLocked = {{ course_locked|yesno:"true,false" }};  // Render as true/false
        console.log("🔒 Course Locked:", window.courseLocked);

        if (courseLocked) {
            // Lock all lessons except the current one
            const urlPath = window.location.pathname;
            const match = urlPath.match(/\/launch_scorm_file\/(\d+)\//);
            const currentLessonId = match ? parseInt(match[1]) : null;

            document.querySelectorAll('.lesson-item').forEach(item => {
                const lessonId = parseInt(item.getAttribute('data-lesson-id'));
                if (lessonId !== currentLessonId) {
                    item.classList.add('locked');
                    item.innerHTML = '<i class="fas fa-lock"></i> ' + item.innerHTML;
                } else {
                    console.log("🔓 Current lesson remains unlocked:", lessonId);
                }
            });
        }
    });
    
    function trackScrollPosition() {
        try {
            if (!isScormLesson()) return;

            var iframe = document.getElementById("scormContentIframe");
            if (iframe && iframe.contentWindow) {
                var scrollPos = iframe.contentWindow.scrollY || iframe.contentWindow.document.documentElement.scrollTop || iframe.contentWindow.document.body.scrollTop || 0;

                console.log("Captured Scroll Position:", scrollPos);

                if (window.API_1484_11) {
                    window.API_1484_11.SetValue("cmi.suspend_data", JSON.stringify({ scrollPos }));
                    window.API_1484_11.Commit();
                }
            }
        } catch (error) {
            console.error("Error tracking scroll position:", error);
        }
    }

    // Track scroll every 5 seconds
    setInterval(trackScrollPosition, 5000);
    /*
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
    */
    window.addEventListener("message", function(event) {
        if (event.data.type === "getScrollPosition") {
            var scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
            console.log("📌 SCORM Sending Scroll Position:", scrollPos);
            
            // 🔹 Send scroll position back to LMS
            window.parent.postMessage({ type: "scrollPositionResponse", scrollPos: scrollPos }, "*");
        }
    });

    function trackProgress() {
        try {
            console.log("Attempting to track progress...");
            const iframe = document.getElementById("scormContentIframe");
    
            if (!iframe || !iframe.contentWindow) {
                console.error("SCORM iframe not found.");
                return;
            }
    
            const lessonLocation = iframe.contentWindow.location.href;
            const sessionTime = getSessionTime();
    
            // ✅ For non-SCORM lessons (e.g., PDFs)
            if (!isScormLesson()) {
                console.log("📄 Non-SCORM lesson — tracking simple progress");
    
                sendTrackingData({
                    lesson_id: window.lessonId,
                    user_id: window.userId,
                    progress: 1, // always complete for PDFs
                    lesson_location: getLessonLocation(),
                    scroll_position: 0,
                    completion_status: "complete",
                    session_time: sessionTime,
                    score: null,
                    cmi_data: JSON.stringify({
                        type: "pdf",
                        completed: true,
                        lesson_location: getLessonLocation(),
                        scroll_position: 0
                    })
                });
    
                return;
            }
    
            // 🔐 SCORM-specific logic below this point
            const progressMeasure = getProgressFromIframe();
    
            // Listen for scrollPosition from iframe postMessage
            window.addEventListener("message", function(event) {
                if (event.data.type === "scrollPositionResponse") {
                    let scrollPosition = event.data.scrollPos;
    
                    console.log("📌 SCORM Saving Scroll Position:", scrollPosition);
    
                    // Store scroll position and progress in SCORM API
                    if (window.API_1484_11) {
                        window.API_1484_11.SetValue("cmi.scroll_position", scrollPosition.toString());
    
                        if (progressMeasure > 0) {
                            window.API_1484_11.SetValue("cmi.progress_measure", progressMeasure.toFixed(2));
                            window.API_1484_11.SetValue("cmi.location", lessonLocation);
                            window.API_1484_11.SetValue("cmi.scroll_position", scrollPosition.toString());
                        }
                    }
    
                    // Send SCORM-style tracking
                    if (progressMeasure > 0) {
                        console.log(`Progress: ${progressMeasure}, Location: ${lessonLocation}, Scroll: ${scrollPosition}`);
    
                        sendTrackingData({
                            lesson_id: window.lessonId,
                            user_id: window.userId,
                            progress: progressMeasure,
                            lesson_location: lessonLocation,
                            scroll_position: scrollPosition,
                            completion_status: progressMeasure === 1 ? "complete" : "incomplete",
                            session_time: sessionTime,
                            score: null,
                            cmi_data: JSON.stringify({
                                progress_measure: progressMeasure,
                                lesson_location: lessonLocation,
                                scroll_position: scrollPosition
                            })
                        });
                    } else {
                        console.warn("Progress measure not found or is 0.");
                    }
                }
            });
    
        } catch (error) {
            console.error("Error tracking progress:", error);
        }
    }    
    
    function sendTrackingData(trackingData) {
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
        console.log("📡 Sending mini-lesson progress to server...", lessonProgressArray);

        fetch('/course_player/track-mini-lesson-progress/', {  // New API endpoint
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

    function updateSCORMProgress(iframe) {
        if (!isScormLesson()) return;

        let iframeDocument = iframe.contentWindow.document;
        let sidebarItems = iframeDocument.querySelectorAll("svg.progress-circle--sidebar");

        if (!sidebarItems.length) {
            console.warn("⚠️ No sidebar progress circles found inside SCORM iframe. Retrying...");
            //setTimeout(() => updateSCORMProgress(iframe), 2000);
            return;
        }

        console.log("✅ Found Sidebar Progress Elements in SCORM iframe:", sidebarItems);

        let miniLessonProgress = [];
        try {
            miniLessonProgress = window.progressDataString ? JSON.parse(window.progressDataString) : [];
        } catch (error) {
            console.error("Failed to parse miniLessonProgress:", error, window.progressDataString);
        }

        console.log("📊 Extracted Lesson Progress Data:", miniLessonProgress);

        miniLessonProgress.forEach((miniLesson, index) => {
            let { mini_lesson_index, progress } = miniLesson;

            if (mini_lesson_index >= sidebarItems.length) {
                console.warn(`⚠️ Skipping mini-lesson ${mini_lesson_index} (No matching sidebar item found)`);
                return;
            }

            let sidebarItem = sidebarItems[mini_lesson_index];

            if (sidebarItem) {
                console.log(`🔄 Processing sidebar item ${mini_lesson_index} with progress: ${progress}`);

                let progressCircle = sidebarItem.querySelector("circle.progress-circle__runner, circle");
                let checkmark = sidebarItem.querySelector("path.progress-circle__pass");

                // Extract progress percentage (e.g., "23% Completed" → 23)
                let progressPercentage = parseFloat(progress.replace("% Completed", "").trim()) || 0;

                // Calculate stroke-dashoffset for outer circle
                let totalStroke = 43.982297150257104;
                let strokeOffset = totalStroke * (1 - (progressPercentage / 100));

                if (progressCircle) {
                    console.log(`🔄 Setting progress circle for mini-lesson ${mini_lesson_index} to ${progressPercentage}%`);
                    
                    // Apply stroke offset
                    progressCircle.setAttribute("stroke-dashoffset", strokeOffset);
                    progressCircle.style.transition = "stroke-dashoffset 0.5s ease-in-out";
                    
                    // Force reapply after SCORM loads
                    setTimeout(() => {
                        progressCircle.setAttribute("stroke-dashoffset", strokeOffset);
                    }, 1000);
                }

                // Check if lesson is fully completed
                if (progress === "Completed") {
                    console.log(`✅ Marking lesson ${mini_lesson_index} as completed.`);

                    if (progressCircle) {
                        progressCircle.setAttribute("stroke-dashoffset", "0");
                        progressCircle.classList.add("progress-circle__runner--completed");
                        progressCircle.style.fill = "#162c53"; // Ensure full completion color
                    }

                    if (checkmark) {
                        console.log(`✅ Showing checkmark for lesson ${mini_lesson_index}`);
                        checkmark.style.display = "block";
                        checkmark.style.opacity = "1";
                        checkmark.style.visibility = "visible";
                    }
                } else {
                    console.log(`🚫 Lesson ${mini_lesson_index} is not fully completed, hiding checkmark.`);
                    if (checkmark) {
                        checkmark.style.display = "none";
                        checkmark.style.opacity = "0";
                        checkmark.style.visibility = "hidden";
                    }
                }
            }
        });

        // **Force UI Refresh**
        if (iframeDocument.body) {
            iframeDocument.body.style.display = "none";
            setTimeout(() => {
                iframeDocument.body.style.display = "";
                console.log("🔄 SCORM UI refreshed to apply changes.");
            }, 500);
        }
    }
    /*
    function restoreLessonProgress() {
        let lessonId = window.lessonId;
        console.log('LESSSSSSSSSSSSSSSSSSSSSSONNNNNNNNNNNNNNNNNNNNNNNN: ', lessonId);
        
        if (!lessonId || !lessonScrollPositions[lessonId]) {
            console.warn("⚠️ No saved progress for this lesson.");
            return;
        }
    
        let iframe = document.getElementById("scormContentIframe");
        if (!iframe) {
            console.error("❌ Could not find SCORM iframe.");
            return;
        }
    
        iframe.addEventListener("load", function () {
            setTimeout(() => {
                try {
                    let savedData = lessonScrollPositions[lessonId];
                    let savedScrollPosition = savedData.scrollPosition || 0;
                    let savedLessonLocation = savedData.lessonLocation || "";
    
                    console.log(`🔄 Restoring Lesson Progress for ${lessonId}:`, savedData);
    
                    let currentLessonLocation = iframe.contentWindow.location.href;
    
                    if (currentLessonLocation !== savedLessonLocation) {
                        console.warn("⚠️ SCORM changed the lesson location. Resetting...");
                        iframe.contentWindow.location.href = savedLessonLocation;
                    }
    
                    let iframeDocument = iframe.contentWindow.document;
                    let scrollContainer = iframeDocument.querySelector(".scorm-content") || iframeDocument.body;
                    scrollContainer.scrollTo(0, savedScrollPosition);
    
                } catch (error) {
                    console.error("🚨 Error restoring lesson progress:", error);
                }
            }, 2500); // ✅ Delay to allow SCORM to fully load
        });
    }
    */

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
    
    document.addEventListener("DOMContentLoaded", function () {
        const iframe = document.getElementById("scormContentIframe");
    
        iframe.addEventListener("load", function () {
            const iframeUrl = iframe.contentWindow?.location?.href || iframe.src;
            console.log("📄 Loaded content:", iframeUrl);
            console.log("HERE");
    
            // ✅ Detect if it's a PDFs
            if (iframeUrl.endsWith(".pdf")) {
                console.log("✅ PDF detected — marking as complete");
                markPdfLessonComplete();
            }
        });
    });    

    // [Line ~530] - Update this or add if missing
    function restoreLessonProgress(iframe, suspendData) {
        if (!isScormLesson()) return;
    
        if (!suspendData) return;
    
        let parsedData;
        try {
            parsedData = JSON.parse(suspendData);
        } catch (err) {
            console.warn("⚠️ Invalid suspend data:", suspendData);
            return;
        }
    
        const { scrollPos, lessonLocation } = parsedData;
        console.log("📌 Restoring scroll position:", scrollPos);
        console.log("📌 Restoring lesson location:", lessonLocation);
    
        try {
            if (lessonLocation && iframe?.contentWindow?.location) {
                iframe.contentWindow.location.href = lessonLocation;
            }
        } catch (err) {
            console.error("🚨 Error applying lesson location:", err);
        }
    
        if (scrollPos !== undefined) {
            iframe.contentWindow.scrollTo(0, scrollPos);
        }
    }
    

    function observeSCORMChanges(iframe) {
        let iframeDocument = iframe.contentWindow.document;
        let observer = new MutationObserver(() => {
            console.log("🔄 SCORM UI updated, ensuring progress circles stay correct...");
            updateSCORMProgress(iframe);
        });

        observer.observe(iframeDocument.body, {
            childList: true,
            subtree: true
        });
    }

    waitForSCORMIframe((iframe) => {
        updateSCORMProgress(iframe);
        //observeSCORMChanges(iframe);
        updateProgressCircles();
        iframe.addEventListener("load", () => {
            const suspendData = window.API_1484_11.GetValue("cmi.suspend_data");
            restoreLessonProgress(iframe, suspendData);
        });  
    });

    function updateProgressCircles() {
        let iframe = document.getElementById("scormContentIframe");
        if (!isScormLesson()) return;
        if (!iframe || !iframe.contentWindow || !iframe.contentWindow.document) {
            console.warn("⚠️ SCORM iframe not fully loaded. Retrying in 2 seconds...");
            setTimeout(updateProgressCircles, 2000);
            return;
        }

        let iframeDocument = iframe.contentWindow.document;
        let progressCircles = iframeDocument.querySelectorAll("circle.progress-circle__runner");

        if (!progressCircles.length) {
            console.warn("⚠️ No progress circles found inside SCORM iframe. Retrying...");
            setTimeout(updateProgressCircles, 2000);
            return;
        }

        console.log("✅ Found Progress Circles:", progressCircles);

        let miniLessonProgress = [];
        try {
            miniLessonProgress = window.progressDataString ? JSON.parse(window.progressDataString) : [];
        } catch (error) {
            console.error("Failed to parse miniLessonProgress:", error, window.progressDataString);
        }

        console.log("📊 Extracted Lesson Progress Data:", miniLessonProgress);

        miniLessonProgress.forEach((miniLesson, index) => {
            let { mini_lesson_index, progress } = miniLesson;

            if (mini_lesson_index >= progressCircles.length) {
                console.warn(`⚠️ No matching progress circle for mini-lesson ${mini_lesson_index}`);
                return;
            }

            let circle = progressCircles[mini_lesson_index];

            if (!circle) {
                console.warn(`⚠️ No progress circle found for mini_lesson_index: ${mini_lesson_index}`);
                return;  // Skip this iteration
            }        

            // Extract progress percentage (e.g., "23% Completed" → 23)
            let safeProgress = typeof progress === "string" ? progress : "";
            let progressPercentage = parseFloat(safeProgress.replace("% Completed", "").trim()) || 0;


            // **Update stroke-dashoffset based on progress**
            let totalStroke = 43.982297150257104; // Outer circle full stroke
            let strokeOffset = totalStroke * (1 - (progressPercentage / 100));

            console.log(`🔄 Setting progress circle ${mini_lesson_index} to ${progressPercentage}% (Offset: ${strokeOffset})`);

            // Apply stroke offset
            circle.setAttribute("stroke-dashoffset", strokeOffset);
            circle.style.transition = "stroke-dashoffset 0.5s ease-in-out";

            // Force reapply after SCORM loads
            setTimeout(() => {
                circle.setAttribute("stroke-dashoffset", strokeOffset);
            }, 1000);
        });

        console.log("🎯 Progress circles updated successfully.");
    }

    // Ensure the SCORM iframe is fully loaded before running
    waitForSCORMIframe(updateProgressCircles);

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

    function observeSCORMCheckmarks(iframe) {
        if (!isScormLesson()) return;
        let iframeDocument = iframe.contentWindow.document;
        let observer = new MutationObserver(() => {
            console.log("🔄 SCORM UI updated, ensuring checkmarks remain visible...");
            showSCORMCheckmarks(iframe);
        });

        observer.observe(iframeDocument.body, {
            childList: true,
            subtree: true
        });
    }

    waitForSCORMIframe((iframe) => {
        showSCORMCheckmarks(iframe);
        observeSCORMCheckmarks(iframe);
    });

    function trackMiniLessonProgress() {
        if (!isScormLesson()) return;

        console.log("🔍 Checking mini-lesson progress...");

        let lessonProgressArray = [];
        const iframe = document.getElementById("scormContentIframe");

        if (iframe && iframe.contentWindow) {
            const progressElements = iframe.contentWindow.document.querySelectorAll('[aria-label*="Completed"], [aria-label*="% Completed"]');

            progressElements.forEach((el, index) => {
                const progressText = el.getAttribute("aria-label") || "Unknown";
                const miniLessonId = el.getAttribute("data-lesson-id") || window.lessonId; 
                const miniLessonIndex = index;

                lessonProgressArray.push({
                    lesson_id: miniLessonId,  // ✅ Sending unique mini-lesson ID
                    mini_lesson_index: index,
                    user_id: window.userId,
                    progress: progressText
                });
            });

            console.log("📊 Extracted Lesson Progress Data:", lessonProgressArray);

            if (lessonProgressArray.length > 0) {
                console.log("🔍 BEFOOOOOOOOOOOOOOOOOOOOOOREEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE..");
                sendMiniLessonProgress(lessonProgressArray);  // ✅ Send to backend
            }
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        console.log("Adding progress tracking interval.");
        setInterval(trackProgress, 30000);  // Track progress and scroll position every 30 seconds
        setInterval(trackMiniLessonProgress, 30000);
    });

    document.addEventListener("DOMContentLoaded", function () {
        //let savedProgressString = '{{ mini_lessons_progress|escapejs }}';
        const savedProgress = window.miniLessonProgress || [];
        //let savedProgress;

        console.log("Saved Progress Data:", savedProgress);


        function applySavedProgress() {
            if (!isScormLesson()) return;
            const iframe = document.getElementById("scormContentIframe");
            if (iframe && iframe.contentWindow) {
                const iframeDocument = iframe.contentWindow.document;
                const progressElements = iframeDocument.querySelectorAll('[aria-label*="Completed"], [aria-label*="% Completed"]');

                progressElements.forEach((el, index) => {
                    const progress = savedProgress[index];
                    if (progress) {
                        el.setAttribute("aria-label", progress);
                        if (progress.includes("Completed")) {
                            el.classList.add("completed"); // Add a class if completed
                        } else {
                            const progressBar = el.querySelector(".progress-bar");
                            if (progressBar) {
                                const percentage = parseInt(progress);
                                progressBar.style.width = `${percentage}%`;
                            }
                        }
                    }
                });
            } else {
                console.warn("Iframe not ready, retrying...");
                setTimeout(applySavedProgress, 1000); // Retry if iframe isn't loaded
            }
        }

        // Apply saved progress after the iframe is loaded
        const iframe = document.getElementById("scormContentIframe");
        iframe.addEventListener("load", applySavedProgress);
    });

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

    // Run this function when the SCORM iframe loads
    document.addEventListener("DOMContentLoaded", function () {
        const iframe = document.getElementById("scormContentIframe");

        iframe.addEventListener("load", function () {
            console.log("✅ SCORM content loaded, updating progress bar...");
            updateSidebarProgress();
            setTimeout(() => {
                console.log("📌 Triggering scroll restoration...");
                //restoreScrollPosition();
                restoreLessonProgress();
                // Fire tracking explicitly
                //saveLessonProgress();  // Already sends scroll & location
            }, 3000);
            
        });
    });

    function getMiniLessonProgress(scoIndex) {
        if (window.API_1484_11) {
            let progress = window.API_1484_11.GetValue(`cmi.objectives.${scoIndex}.progress_measure`);
            let completionStatus = window.API_1484_11.GetValue(`cmi.objectives.${scoIndex}.completion_status`);
            
            console.log(`📊 Mini-Lesson ${scoIndex}: Progress = ${progress}, Status = ${completionStatus}`);
            
            return {
                progress: progress ? parseFloat(progress) : 0,
                status: completionStatus || "unknown"
            };
        }
        return null;
    }

    // Set progress tracking interval
    //document.addEventListener("DOMContentLoaded", function () {
        //console.log("Adding progress tracking interval.");
        //setInterval(trackProgress, 30000); // Track progress every 60 seconds
    //});
    /*
    function applyMiniLessonProgress(progressData) {
        console.log("🎯 Applying Mini-Lesson Progress:", progressData);

        // Select all sidebar progress indicators
        const sidebarItems = document.querySelectorAll('.lesson-progress_graphic .progress-circle--sidebar');

        if (!sidebarItems.length) {
            console.warn("⚠️ No sidebar progress circles found. Retrying...");
            setTimeout(() => applyMiniLessonProgress(progressData), 1000); // Retry if not found
            return;
        }

        progressData.forEach((item) => {
            let { mini_lesson_index, progress } = item;
            console.log(`🔍 Lesson Index: ${mini_lesson_index}, Progress: ${progress}`);

            const sidebarItem = sidebarItems[mini_lesson_index];  // Select the corresponding progress circle

            if (sidebarItem) {
                console.log(`✅ Found sidebar item for index ${mini_lesson_index}. Updating...`);

                // Update aria-label
                sidebarItem.setAttribute("aria-label", `${progress}`);

                // Find progress circle runner
                const progressCircle = sidebarItem.querySelector('.progress-circle_runner');

                if (progressCircle) {
                    let progressValue = progress.includes("Completed") ? 100 : parseInt(progress) || 0;
                    let radius = 7;
                    let circumference = 2 * Math.PI * radius;
                    let offset = circumference * (1 - progressValue / 100);

                    progressCircle.style.strokeDasharray = `${circumference}`;
                    progressCircle.style.strokeDashoffset = `${offset}`;
                    console.log(`✅ Updated progress circle for index ${mini_lesson_index}: ${progressValue}%`);
                } else {
                    console.warn(`⚠️ No progress-circle_runner found for index: ${mini_lesson_index}`);
                }
            } else {
                console.warn(`⚠️ Sidebar item not found for mini-lesson index: ${mini_lesson_index}`);
            }
        });
    }
    */
    // Call function after page fully loads
    document.addEventListener("DOMContentLoaded", function () {
        setTimeout(() => {
            console.log("🚀 Applying Mini-Lesson Progress...");
            //applyMiniLessonProgress(window.miniLessonProgress || []);
        }, 2000);
    });
    /*
    document.addEventListener("DOMContentLoaded", function () {
        console.log("Checking for saved progress...");

        const iframe = document.getElementById("scormContentIframe");

        window.savedLocation = "{{ saved_location|escapejs }}";
        window.savedScrollPosition = parseInt("{{ saved_scroll_position|escapejs }}", 10) || 0;

        if (window.savedLocation) {
            console.log(`Resuming at saved location: ${window.savedLocation}`);

            iframe.addEventListener("load", function () {
                console.log(`Navigating to saved location: ${window.savedLocation}`);
                iframe.contentWindow.location.href = window.savedLocation;

                console.log("SCORM content loaded. Applying mini-lesson progress.");
                //applyMiniLessonProgress(progressData);  // Apply saved progress when iframe loads

                setTimeout(() => {
                    try {
                        console.log(`Restoring scroll position to: ${window.savedScrollPosition}`);
                        iframe.contentWindow.scrollTo(0, window.savedScrollPosition);
                    } catch (error) {
                        console.error("Error restoring scroll position:", error);
                    }
                }, 2000); // ✅ Delay to ensure content fully loads
            });
        }

        function getScrollPosition() {
            try {
                let iframeDocument = iframe.contentWindow.document;
                let scrollPosition = iframeDocument.scrollingElement.scrollTop || 
                                    iframeDocument.documentElement.scrollTop || 
                                    iframeDocument.body.scrollTop || 0;

                console.log(`📌 Captured Scroll Position: ${scrollPosition}`);
                return scrollPosition;
            } catch (error) {
                console.error("🚨 Error reading scroll position:", error);
                return 0;
            }
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

        console.log("Adding progress tracking interval.");
        setInterval(trackProgress, 30000); // Track progress every 30 seconds
        console.log("SCORM content loaded. Applying mini-lesson progress.");
        //applyMiniLessonProgress(progressData);  // Apply saved progress when iframe loads
        //console.log("HEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE")

        if (iframe) {
            // Add the load event listener to track progress once iframe loads content
            iframe.addEventListener("load", function () {
                const progress = getProgressFromIframe();
                console.log(`Current Progress: ${progress * 100}%`);
            });

            // Log available iframe content (optional for debugging)
            if (iframe.contentWindow) {
                console.log("iframe contentWindow properties:", Object.keys(iframe.contentWindow));
            }

            // Load event to handle specific SCORM interactions or content
            iframe.addEventListener("load", () => {
                console.log("SCORM content iframe loaded");

                try {
                    // Example of LMSProxy override (already in your script)
                    const iframeWindow = iframe.contentWindow;

                    if (iframeWindow && iframeWindow.LMSProxy) {
                        console.log("LMSProxy detected. Wrapping SetDataChunk...");

                        const originalSetDataChunk = iframeWindow.LMSProxy.SetDataChunk;

                        iframeWindow.LMSProxy.SetDataChunk = function (data) {
                            console.log("SetDataChunk called with data:", data);

                            // Process SetDataChunk data and extract progress (your existing logic)
                            if (data) {
                                try {
                                    const parsedData = JSON.parse(data);
                                    console.log("Parsed SetDataChunk data:", parsedData);

                                    if (parsedData.totalSlides) {
                                        totalPages = parsedData.totalSlides;
                                        console.log("Total Slides Updated:", totalPages);
                                    }

                                    if (parsedData.currentSlide) {
                                        const currentPage = parsedData.currentSlide;
                                        pagesVisited.add(currentPage);
                                        console.log("Current Slide Visited:", currentPage);

                                        if (totalPages > 0) {
                                            const progress = pagesVisited.size / totalPages;
                                            window.API_1484_11.SetValue("cmi.progress_measure", progress.toFixed(2));
                                            console.log(`Progress Updated: ${progress}`);
                                        }
                                    }
                                } catch (error) {
                                    console.error("Error parsing SetDataChunk data:", error);
                                }
                            }

                            return originalSetDataChunk.apply(this, arguments);
                        };
                    } else {
                        console.warn("LMSProxy not found in iframe content.");
                    }
                } catch (error) {
                    console.error("Error wrapping LMSProxy.SetDataChunk:", error);
                }
            });
        } else {
            console.error("Iframe with ID 'scormContentIframe' not found.");
        }
    });
    */
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
        /*
        function getScrollPosition() {
            try {
                let iframeDocument = iframe.contentWindow.document;
                let scrollContainer = iframeDocument.querySelector(".scorm-content") || iframeDocument.body;
                let scrollPosition = scrollContainer.scrollTop;

                console.log(`📌 Captured Scroll Position: ${scrollPosition}`);
                return scrollPosition;
            } catch (error) {
                console.error("🚨 Error reading scroll position:", error);
                return 0;
            }
        }
        */

        function sendTrackingData(trackingData) {
            console.log("📡 Sending SCORM tracking data to backend...", trackingData);

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
                console.log("✅ SCORM progress successfully updated:", data);
                console.log("TACKING: ", trackingData)
            })
            .catch(error => console.error("🚨 Error sending SCORM tracking data:", error));
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

        function getSessionTime() {
            const now = new Date();
            const duration = Math.floor((now - sessionStartTime) / 1000);

            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;

            return `PT${hours}H${minutes}M${seconds}S`;
        }

        iframe.addEventListener("load", function () {
            console.log("✅ SCORM iframe loaded, restoring lesson progress...");
            restoreLessonProgress();
        
            try {
                iframe.contentWindow.addEventListener("scroll", function () {
                    console.log("📌 Detected scroll in SCORM iframe");
                    saveLessonProgress();
                });
            } catch (e) {
                console.warn("⚠️ Could not attach scroll listener inside iframe:", e);
            }
        });
        

        // Restore scroll position when SCORM loads
        iframe.addEventListener("load", function () {
            console.log("✅ SCORM iframe loaded, restoring lesson progress...");
            //restoreScrollPosition();
            //restoreLessonProgress();
        });

        // Ensure scroll position is saved every 30 seconds
        setInterval(saveLessonProgress, 30000);
    });