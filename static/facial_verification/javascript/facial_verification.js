const STORAGE_KEY = 'nextFacialCheckAt';

document.addEventListener('DOMContentLoaded', () => {
    const CHECK_INTERVAL = window.CHECK_FREQUENCY_TIME; // e.g. 60000 ms = 1 minute
    window.facialVerifiedForCourseLaunch = false;
    window.PENDING_LESSON_ID = null;

    console.log('Start Interval', CHECK_INTERVAL);
    if (window.location.href.includes("launch_scorm_file") && CHECK_INTERVAL > 0) {       
        setupFacialVerificationInterval(CHECK_INTERVAL);
    }

    // Block refresh if facial not verified
    window.addEventListener('beforeunload', function (e) {
        const popupIsOpen = document.getElementById('courseLaunchVerification')?.querySelector('.popup-content')?.classList.contains('animate-popup-content');
        const notVerified = !window.facialVerifiedForCourseLaunch;
        if (popupIsOpen && notVerified) {
            e.preventDefault();
            e.returnValue = 'Facial verification is still required before leaving.';
        }
        clearFacialVerificationInterval();
    });

    // Block Ctrl+R / F5
    document.addEventListener('keydown', function (e) {
        const popupIsOpen = document.getElementById('courseLaunchVerification')?.querySelector('.popup-content')?.classList.contains('animate-popup-content');
        const notVerified = !window.facialVerifiedForCourseLaunch;
        if (popupIsOpen && notVerified && ((e.key === 'F5') || (e.ctrlKey && e.key === 'r'))) {
            e.preventDefault();
        }
    });
});

function setupFacialVerificationInterval(CHECK_INTERVAL) {
    const now = Date.now();
    let nextCheckTime = parseInt(localStorage.getItem(STORAGE_KEY), 10);

    if (!nextCheckTime || isNaN(nextCheckTime)) {
        nextCheckTime = now + CHECK_INTERVAL;
        localStorage.setItem(STORAGE_KEY, nextCheckTime);
    }

    const delay = Math.max(0, nextCheckTime - now);
    console.log(`Next facial check in ${delay / 1000} seconds`);

    setTimeout(() => {
        performFacialCheck(CHECK_INTERVAL);
        facialVerificationInterval = setInterval(performFacialCheck, CHECK_INTERVAL);
    }, delay);
}

async function performFacialCheck(CHECK_INTERVAL) {
    const isVerified = await checkingIfVerified('in_session_check');
    if (isVerified) {
        console.log('Facial verification passed.');
    } else {
        initializeFacialVerification('in_session_check');
    }
    // Always update next check time
    localStorage.setItem(STORAGE_KEY, Date.now() + CHECK_INTERVAL);
}


let facialVerificationInterval = null;

async function checkingIfVerified(verificationType) {
    return new Promise(async (resolve, reject) => {
        try {
            const videoElement = document.createElement('video');
            videoElement.setAttribute('autoplay', true);
            videoElement.setAttribute('playsinline', true);

            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            videoElement.srcObject = stream;

            // Wait for a frame before capturing
            await new Promise(resolve => setTimeout(resolve, 1000));

            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const imageDataUrl = canvas.toDataURL('image/jpeg');

            stream.getTracks().forEach(track => track.stop());

            const formData = new FormData();
            formData.append('image1', imageDataUrl);
            let lessonIdFromUrl = null;
            const pathMatch = window.location.pathname.match(/\/launch_scorm_file\/(\d+)\//);
            if (pathMatch) {
                lessonIdFromUrl = pathMatch[1];
                formData.append('lesson_id', lessonIdFromUrl);
            }           
            if (window.PENDING_USER_COURSE_ID) {
                formData.append('user_course_id', window.PENDING_USER_COURSE_ID);
            }
            if (window.PENDING_COURSE_ID) {
                formData.append('course_id', window.PENDING_COURSE_ID);
            }
            console.log('lesson_id', lessonIdFromUrl, 'user_course_id', window.PENDING_USER_COURSE_ID, 'course_id', window.PENDING_COURSE_ID);

            const response = await fetch('/admin/facial-verification-check/?type=' + verificationType, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                resolve(true);
            } else {
                console.warn("Verification failed:", result.message || result.error_type);
                resolve(false);  // still resolve false instead of rejecting
            }

        } catch (err) {
            console.error("Error during verification:", err);
            resolve(false);
        }
    });
}

function clearFacialVerificationInterval() {
    if (facialVerificationInterval) {
        clearInterval(facialVerificationInterval);
        facialVerificationInterval = null;
    }
}

function initializeFacialVerification(verificationType){
    clearFacialVerificationInterval();

    const scanFaceBtn = document.getElementById('scanFaceBtn');
    const closeVerificationPopupBtn = document.getElementById('closeVerificationPopupBtn');

    if(verificationType == 'course_launch_verification'){
        openPopup('courseLaunchVerification');
        document.querySelector('.learner-body-container').style.overflow = 'hidden';
        scanFaceBtn.setAttribute('onclick', "initiateFacialRecognition('course_launch_verification')");
        closeVerificationPopupBtn.setAttribute('onclick', "closeVerificationPopup('course_launch_verification')");
        closeVerificationPopupBtn.innerText = 'Return';
        baseText.innerText = "Let's Confirm It's You";
        facialRecognitionMessage.innerHTML = `<span>To begin, we’ll verify your identity by matching your face with your Headshot Photo.</span>`;
    }else if(verificationType == 'in_session_check'){
        openPopup('courseLaunchVerification');
        scanFaceBtn.setAttribute('onclick', "initiateFacialRecognition('in_session_check')");
        closeVerificationPopupBtn.setAttribute('onclick', "closeVerificationPopup('in_session_check')");
        closeVerificationPopupBtn.innerText = 'Exit Course';
        baseText.innerText = "Just checking in!";
        facialRecognitionMessage.innerHTML = `<span>To ensure the integrity of your learning experience, we'll perform occasional facial verification checks during your course.</span>`;
    }
}

function closeVerificationPopup(verificationType){

    if(verificationType == 'course_launch_verification'){
        closePopup('courseLaunchVerification');
        document.querySelector('.learner-body-container').style.overflow = 'auto';
    }else if(verificationType == 'in_session_check'){
        window.location.href = '/courses/';
    }
}

let facialStream = null;

async function initiateFacialRecognition(verificationType) {
    const videoElement = document.getElementById('facialRecognitionVideo');
    const cameraLoading = document.getElementById('cameraLoadingVerification');
    const facialVideoFeedPlaceholder = document.getElementById('facialVideoFeedPlaceholder');
    
    if (facialStream) {
        facialStream.getTracks().forEach(track => track.stop());
        facialStream = null;
    }

    videoElement.srcObject = null; // Clear previous stream if it exists

    facialVideoFeedPlaceholder.classList.add('hidden');
    fadeIn('cameraLoadingVerification');
    fadeOut('scanFaceBtn');
    fadeOut('closeVerificationPopupBtn');
    fadeIn('facialRecognitionMessage');
    facialRecognitionMessage.innerHTML = `<span>Please look directly into the camera while we work our magic.</span>`;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(async function(stream) {
                cameraLoading.classList.add('hidden');
                facialStream = stream;
                const dotsInterval = animateEllipses('animatedDots');
                baseText.innerText = 'Scanning';
                facialVerificationHeader.style.fontSize = '1.2rem';
                fadeIn('facialRecognitionVideo');
                videoElement.srcObject = stream;

                await new Promise(resolve => setTimeout(resolve, 1000));

                const liveImage = captureVideoFrame(videoElement);

                const formData = new FormData();
                formData.append('image1', liveImage);  // Only send live image
                let lessonIdFromUrl = null;
                const pathMatch = window.location.pathname.match(/\/launch_scorm_file\/(\d+)\//);
                if(window.PENDING_LESSON_ID){
                    formData.append('lesson_id', window.PENDING_LESSON_ID);
                }else if (pathMatch){
                    lessonIdFromUrl = pathMatch[1];
                    formData.append('lesson_id', lessonIdFromUrl);
                } 
                if (window.PENDING_USER_COURSE_ID) {
                    formData.append('user_course_id', window.PENDING_USER_COURSE_ID);
                }
                if (window.PENDING_COURSE_ID) {
                    formData.append('course_id', window.PENDING_COURSE_ID);
                }
                console.log('lesson_id', window.PENDING_LESSON_ID, 'user_course_id', window.PENDING_USER_COURSE_ID, 'course_id', window.PENDING_COURSE_ID);

                try {
                    const response = await fetch('/admin/facial-verification-check/?type=' + verificationType, {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success) {
                        if(verificationType == 'in_session_check'){
                            showSuccess(``, dotsInterval, videoElement, verificationType);
                        }else{
                            showSuccess(`<i class="fa-regular fa-spinner-third fa-spin" style="--fa-animation-duration: 1s;"></i> Launching your course...`, dotsInterval, videoElement, verificationType);
                        }
                        baseText.innerText = 'Verification Successful!';
                        animatedDots.innerText = '';
                    } else {
                        console.log(result.error_type);
                        switch (result.error_type) {
                            case 'no_face_live':
                                showFacialError("Hmm... we couldn't detect your face. Please make sure you're looking directly into the camera and avoid wearing hats or glasses during the scan.", dotsInterval, videoElement);
                                baseText.innerText = 'Face not detected';
                                animatedDots.innerText = '';
                                break;
                            case 'no_face_uploaded':
                                showFacialError("Hmm... we couldn't detect any facial features in your Headshot Photo. Please upload a clearer one in your profile.", dotsInterval, videoElement);
                                baseText.innerText = 'Re-upload Headshot Photo';
                                animatedDots.innerText = '';
                                break;
                            case 'face_mismatch':
                                showFacialError("Hmm... your face doesn't match your Headshot Photo. Please try again or update your photo in your profile.", dotsInterval, videoElement);
                                baseText.innerText = 'Faces do not match';
                                animatedDots.innerText = '';
                                break;
                            default:
                                showFacialError("Unexpected error: " + result.message, dotsInterval, videoElement);
                                baseText.innerText = 'Unexpected Error';
                                animatedDots.innerText = '';
                        }
                    }

                } catch (err) {
                    alert("An error occurred while verifying your face.");
                    console.error(err);
                }

            })
            .catch(function (error) {
                console.error(error);
                if (error.name === 'AbortError') {
                    showFacialError("Camera access timed out. Please ensure no other apps or browser tabs are using your webcam and try again.", 0, videoElement);
                } else {
                    showCameraError(error, 'facialVerification');
                }
            });
    } else {
        console.error({ name: 'Unsupported' });
        showCameraError({ name: 'Unsupported' }, 'facialVerification');
    }
}


function showFacialError(message, dotsInterval, videoElement){
    const facialRecognitionMessage = document.getElementById('facialRecognitionMessage');
    facialRecognitionMessage.innerHTML = `<span>${message}</span>`
    scanFaceBtn.innerText = 'Scan My Face Again';

    videoElement.classList.add('hidden');

    fadeIn('scanFaceBtn');
    fadeIn('facialVideoFeedPlaceholder');
    fadeIn('closeVerificationPopupBtn');
    clearInterval(dotsInterval);
}

// Call this function once Learner has been verified
function showSuccess(message, dotsInterval, videoElement, verificationType) {
    const facialVideoFeedContainer = document.getElementById('facialVideoFeedContainer');
    const facialRecognitionMessage = document.getElementById('facialRecognitionMessage');
    facialRecognitionMessage.innerHTML = `<span class="facial-videofeed-successful-message">${message}</span`

    videoElement.classList.add('hidden');
    facialVideoFeedContainer.classList.add('hidden');

    fadeIn('facialVideoFeedSuccessfulContainer');
    clearInterval(dotsInterval);

    if (facialStream) {
        facialStream.getTracks().forEach(track => track.stop());
        facialStream = null;
    }

    window.facialVerifiedForCourseLaunch = true;
    if (window.PENDING_LESSON_ID) {
        launchCourse(window.PENDING_LESSON_ID);
        window.PENDING_LESSON_ID = null;
    }
    if (verificationType == 'in_session_check') {
        setTimeout(() => {
            const newNextCheck = Date.now() + window.CHECK_FREQUENCY_TIME;
            localStorage.setItem(STORAGE_KEY, newNextCheck);  // Reset next check time

            setupFacialVerificationInterval(window.CHECK_FREQUENCY_TIME);
            closePopup('courseLaunchVerification');

            setTimeout(() => {
                resetVerificationPopup(verificationType);
            }, 500);
        }, 1500);
    }
}

function resetVerificationPopup(verificationType) {
    const videoElement = document.getElementById('facialRecognitionVideo');
    const facialVideoFeedPlaceholder = document.getElementById('facialVideoFeedPlaceholder');
    const cameraLoading = document.getElementById('cameraLoadingVerification');
    const scanFaceBtn = document.getElementById('scanFaceBtn');
    const closeVerificationPopupBtn = document.getElementById('closeVerificationPopupBtn');
    const facialRecognitionMessage = document.getElementById('facialRecognitionMessage');
    const facialVideoFeedContainer = document.getElementById('facialVideoFeedContainer');
    const facialVideoFeedSuccessfulContainer = document.getElementById('facialVideoFeedSuccessfulContainer');

    // Reset button text and visibility
    scanFaceBtn.innerText = 'Scan My Face';
    scanFaceBtn.classList.remove('hidden');
    closeVerificationPopupBtn.classList.add('hidden');

    // Reset base text
    baseText.innerText = '';

    // Reset containers
    facialVideoFeedPlaceholder.classList.remove('hidden');
    facialVideoFeedContainer.classList.remove('hidden');
    facialVideoFeedSuccessfulContainer.classList.add('hidden');

    // Reset video visibility
    videoElement.classList.add('hidden');
    cameraLoading.classList.add('hidden');
    fadeOut('facialRecognitionVideo');

    // Reset message
    if (verificationType === 'in_session_check') {
        facialRecognitionMessage.innerHTML = `<span>To ensure the integrity of your learning experience, we'll perform occasional facial verification checks during your course.</span>`;
    } else {
        facialRecognitionMessage.innerHTML = `<span>To begin, we’ll verify your identity by matching your face with your Headshot Photo.</span>`;
    }

    // Reset header font size
    facialVerificationHeader.style.fontSize = ''; // or set to '1.2rem' if that's your default
}

function captureVideoFrame(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg');  // Returns base64 JPEG string
}

function showCameraError(error, errorContainer){
    const cameraAccessTroubleshooting = document.getElementById('cameraAccessTroubleshooting');
    const cameraErrorContainer = document.getElementById(errorContainer);
    const cameraLoading = cameraErrorContainer.nextElementSibling;
    const cameraErrorHeading = cameraErrorContainer.querySelector('#cameraErrorHeading');
    const cameraErrorSubtext = cameraErrorContainer.querySelector('#cameraErrorSubtext');
    cameraErrorContainer.classList.remove('hidden');
    cameraLoading.classList.add('hidden');

    // Detecting browser to show the correct enable permissions popup
    if(error.name == 'NotAllowedError'){
        cameraErrorHeading.innerText = "We don't have permissions to access your camera";
        cameraErrorSubtext.innerText = `To enable your camera permissions on ${detectBrowser(errorContainer)}, please click on the "Fix Permissions" button below to be taken to an external website for additional information.`;
        cameraAccessTroubleshooting.classList.add('hidden');
        if(errorContainer == 'facialVerification'){
            setTimeout(() => {
                fadeIn('fixPermissionsVerificationBtn');
                fadeIn('closeVerificationPopupBtn');
            }, 300);
        }   
    }else if(error.name == 'NotReadableError'){
        cameraErrorHeading.innerText = "We can't seem to access your camera";
        cameraErrorSubtext.innerText = `${detectBrowser(errorContainer)} has permissions to use your camera, but something is preventing your camera from being accessed. Below are a few steps to follow to troubleshoot why your camera may not be working, after going through these steps please click on the "Refresh page" button below.`;
        cameraAccessTroubleshooting.classList.remove('hidden');
        if(errorContainer == 'facialVerification'){
            setTimeout(() => {
                fadeIn('refreshPageVerificationBtn');
                fadeIn('cameraAccessTroubleshootingVerification');
                fadeIn('closeVerificationPopupBtn');
            }, 300);
            
        }  
    }
}

function detectBrowser(errorContainer) {
    const userAgent = navigator.userAgent;
    let fixPermissionsBtn;
    if(errorContainer == 'facialVerification'){
        fixPermissionsBtn = document.getElementById('fixPermissionsVerificationBtn');
        facialVerificationHeader.classList.add('hidden');
        facialRecognitionMessage.classList.add('hidden');
    }else{
        fixPermissionsBtn = document.getElementById('fixPermissionsBtn');
    }
    

    if (userAgent.includes("Chrome") && !userAgent.includes("Edg") && !userAgent.includes("OPR")) {
        fixPermissionsBtn.href = 'https://support.google.com/chrome/answer/2693767';
        return "Google Chrome";
    } else if (userAgent.includes("Firefox")) {
        fixPermissionsBtn.href = 'https://support.mozilla.org/en-US/kb/how-manage-your-camera-and-microphone-permissions';
        return "Firefox";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
        fixPermissionsBtn.href = 'https://support.apple.com/guide/safari/change-websites-preferences-sfri30506/mac';
        return "Safari";
    } else if (userAgent.includes("Edg")) {
        fixPermissionsBtn.href = 'https://knowledge.vpmsolutions.com/knowledge/microsoft-edge-camera-and-microphone-settings';
        return "Edge";
    } else if (userAgent.includes("OPR") || userAgent.includes("Opera")) {
        fixPermissionsBtn.href = 'https://help.opera.com/en/latest/web-preferences/#camera';
        return "Opera";
    } else {
        return "This Browser";
    }
}

function fadeOut(container) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;

    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    container.style.opacity = '0';
    container.style.transform = 'scale(0.95)';

    setTimeout(() => {
        container.classList.add('hidden');
        // Optional cleanup
        container.style.opacity = '';
        container.style.transform = '';
        container.style.transition = '';
    }, 300); // Match the transition duration
}

function fadeIn(container) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;

    container.classList.remove('hidden');
    container.style.opacity = '0';
    container.style.transform = 'scale(0.95)';
    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    requestAnimationFrame(() => {
        container.style.opacity = '1';
        container.style.transform = 'scale(1)';
    });

    setTimeout(() => {
        container.style.opacity = '';
        container.style.transform = '';
        container.style.transition = '';
    }, 300);
}

function animateEllipses(dotSpanId, intervalSpeed = 500) {
    const dotSpan = document.getElementById(dotSpanId);
    let dotCount = 0;
    const maxDots = 3;

    const interval = setInterval(() => {
        dotCount = (dotCount + 1) % (maxDots + 1);
        dotSpan.textContent = '.'.repeat(dotCount);
    }, intervalSpeed);

    return interval;
}