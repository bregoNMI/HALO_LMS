// handle file input changes
document.addEventListener('DOMContentLoaded', function() {
    const fileInputs = document.querySelectorAll('.custom-file');

    fileInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            const file = input.files[0];
            const fileName = file ? file.name : "No file selected";
    
            const fileDisplayArea = input.closest('.custom-file-upload-container').querySelector('.file-name-display');
            fileDisplayArea.textContent = fileName;
    
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const base64 = e.target.result;

                    const inputId = input.getAttribute('id');
                    const previewId = inputId + '_preview';
                    const imgPreview = document.getElementById(previewId);

                    if (imgPreview) {
                        imgPreview.src = base64;
                        imgPreview.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    });
    

    const passwordInput = document.getElementById('id_password'); 
    if(passwordInput){passwordInput.addEventListener('input', testPasswordReqs);}
    const usernameInput = document.getElementById('id_username'); 
    if(usernameInput){usernameInput.addEventListener('input', testUsernameReqs);}
});


function testPasswordReqs() {
    const passwordInput = document.getElementById('id_password');
    const passwordValue = passwordInput.value;

    const passwordReqOne = document.getElementById('passwordReqOne');
    const passwordReqTwo = document.getElementById('passwordReqTwo');
    const passwordReqThree = document.getElementById('passwordReqThree');

    if (passwordValue.length === 0) {
        [passwordReqOne, passwordReqTwo, passwordReqThree].forEach(req => {
            req.className = 'field-requirement';
            req.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-regular fa-circle-small"></i>`;
        });
        disableSubmitButton();
        return;
    }

    const isAtLeastEight = passwordValue.length >= 8;
    const isNumeric = /^[0-9]+$/.test(passwordValue);
    const containsNumber = /\d/.test(passwordValue);

    if (isAtLeastEight) {
        passwordReqOne.className = 'field-requirement req-success';
        passwordReqOne.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
    } else {
        passwordReqOne.className = 'field-requirement req-error';
        passwordReqOne.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
    }
    if(isNumeric){
        passwordReqTwo.className = 'field-requirement req-error';
        passwordReqTwo.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
    }else{
        passwordReqTwo.className = 'field-requirement req-success';
        passwordReqTwo.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
    }
    if (containsNumber) {
        passwordReqThree.className = 'field-requirement req-success';
        passwordReqThree.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
    } else {
        passwordReqThree.className = 'field-requirement req-error';
        passwordReqThree.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
    }

    if (isAtLeastEight && !isNumeric && containsNumber) {
        enableSubmitButton();
    } else {
        disableSubmitButton();
    }
}

function testUsernameReqs() {
    const usernameInput = document.getElementById('id_username'); // Make sure to correct the ID here
    const usernameValue = usernameInput.value;

    const usernameReqOne = document.getElementById('usernameReqOne');
    const usernameReqTwo = document.getElementById('usernameReqTwo');

    if(usernameValue.length === 0){
        usernameReqOne.className = 'field-requirement';
        usernameReqOne.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-regular fa-circle-small"></i>`;
        usernameReqTwo.className = 'field-requirement';            
        usernameReqTwo.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-regular fa-circle-small"></i>`;
        return;
    }

    const isUnder150 = usernameValue.length <= 150;
    const isValidCharacters = /^[a-zA-Z0-9@.+/_-]+$/.test(usernameValue);

    if (isUnder150) {
        usernameReqOne.className = 'field-requirement req-success';
        usernameReqOne.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
        enableSubmitButton();
    } else {
        usernameReqOne.className = 'field-requirement req-error';
        usernameReqOne.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
        disableSubmitButton();
    }

    if (isValidCharacters) {
        usernameReqTwo.className = 'field-requirement req-success';
        usernameReqTwo.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
        enableSubmitButton();
    } else {
        usernameReqTwo.className = 'field-requirement req-error';
        usernameReqTwo.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
        disableSubmitButton();
    }
}

function disableSubmitButton(){
    const registerButton = document.getElementById('registerButton');
    registerButton.setAttribute('disabled', true);
    registerButton.classList.add('disabled');
}

function enableSubmitButton(){
    const registerButton = document.getElementById('registerButton');
    registerButton.removeAttribute('disabled', true);
    registerButton.classList.remove('disabled');
}



/* Progress Steps */
const circles = document.querySelectorAll(".circle");
progressBar = document.querySelector(".indicator");
let buttons;
buttons = document.querySelectorAll(".true-registration-btn");
let currentStep = 1;
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const submitFormBtn = document.getElementById('registerButton');
const javascriptErrorContainer = document.getElementById('javascriptErrorContainer');
let javascriptErrorMessage;
if(javascriptErrorContainer){
    javascriptErrorMessage = javascriptErrorContainer.querySelector('.lesson-alert-message');
}
let currentErrorStep = 0;

const updateSteps = (e) => {
    if(currentStep > 0){
        // update current step based on the button clicked
        if(e != undefined){
            currentStep = e.target.classList.contains('next-slide-btn') ? ++currentStep : --currentStep;
        }
        
        // loop through all circles and add/remove "active" class based on their index and current step
        circles.forEach((circle, index) => {
            circle.classList[`${index < currentStep ? "add" : "remove"}`]("active");
        });
        // update progress bar width based on current step
        progressBar.style.width = `${((currentStep - 1) / (circles.length - 1)) * 100}%`;
        // check if current step is last step or first step and disable corresponding buttons
        if (currentStep === circles.length) {
            nextBtn.disabled = true;
        } else {
            buttons.forEach((button) => (button.disabled = false));
        }

        //Adding functions and changing text depending on what slide the user is on
        if(currentStep === 1){
            slide1();
        } else if(currentStep === 2){
            slide2();
        }else if(currentStep === 3){
            slide3();
        }

        if(currentStep != currentErrorStep){
            javascriptErrorContainer.classList.add('hidden');
        }else{
            javascriptErrorContainer.classList.remove('hidden');
        }
    }
};

// add click event listeners to all buttons
buttons.forEach((button) => {
    button.addEventListener("click", updateSteps);
});

function slide1(){
    showSlide('registrationSlideOne');
    hideSlide('registrationSlideTwo');
    hideSlide('registrationSlideThree');
    prevBtn.setAttribute('disabled', true);
    prevBtn.classList.add('hidden');

    nextBtn.removeAttribute('disabled', true);
    nextBtn.classList.remove('hidden');

    submitFormBtn.classList.add('hidden');
}

function slide2(){
    showSlide('registrationSlideTwo');
    hideSlide('registrationSlideOne');
    hideSlide('registrationSlideThree');
    prevBtn.removeAttribute('disabled', true);
    prevBtn.classList.remove('hidden');

    nextBtn.removeAttribute('disabled', true);
    nextBtn.classList.remove('hidden');

    // submitFormBtn.setAttribute('disabled', true);
    submitFormBtn.classList.add('hidden');
}

function slide3(){
    showSlide('registrationSlideThree');
    hideSlide('registrationSlideTwo');
    nextBtn.setAttribute('disabled', true);
    nextBtn.classList.add('hidden');

    // submitFormBtn.removeAttribute('disabled', true);
    submitFormBtn.classList.remove('hidden');
}

function showSlide(slideId){
    const slide = document.getElementById(slideId);
    slide.classList.remove('hidden');
}

function hideSlide(slideId){
    const slide = document.getElementById(slideId);
    slide.classList.add('hidden');
}

function openCamera(photoId) {
    const cameraLoading = document.getElementById('cameraLoading');
    const retakeRegistrationPhoto = document.getElementById('retakeRegistrationPhoto');
    const captureRegistrationPhoto = document.getElementById('captureRegistrationPhoto');
    const saveRegistrationPhoto = document.getElementById('saveRegistrationPhoto');
    const cameraFeed = document.getElementById('cameraFeed');
    const photoCanvas = document.getElementById('photoCanvas');
    const takePhotoHeader = document.getElementById('takePhotoHeader');
    const photoContainer = document.querySelector('.take-photo-container');

    setupPhotoButtons(photoId);

    if (photoId === 'id_id_photo') {
        takePhotoHeader.innerText = 'Take Identification Photo';
    } else if (photoId === 'id_reg_photo') {
        takePhotoHeader.innerText = 'Take Headshot Photo';
    }

    cameraLoading.classList.remove('hidden');
    photoCanvas.style.display = 'none';
    cameraFeed.style.display = 'none'; // keep hidden until stream starts

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true}) // request both video and audio
            .then(function (stream) {
                cameraFeed.srcObject = stream;
                cameraFeed.play();

                // Show video and UI elements
                cameraFeed.style.display = 'flex';
                cameraLoading.classList.add('hidden');
                photoContainer.classList.remove('hidden');
                captureRegistrationPhoto.removeAttribute('disabled');
                captureRegistrationPhoto.classList.remove('disabled');

            })
            .catch(function (error) {
                cameraLoading.classList.add('hidden');
                showCameraError(error, 'cameraErrorContainer');
            });
    } else {
        showCameraError('MediaDevices API not supported', 'cameraErrorContainer');
    }

    retakeRegistrationPhoto.classList.add('hidden');
    saveRegistrationPhoto.classList.add('hidden');
    captureRegistrationPhoto.classList.remove('hidden');
}

function takeSnapshot(photoId) {
    const retakeRegistrationPhoto = document.getElementById('retakeRegistrationPhoto');
    const captureRegistrationPhoto = document.getElementById('captureRegistrationPhoto');
    const saveRegistrationPhoto = document.getElementById('saveRegistrationPhoto');
    const cameraFeed = document.getElementById('cameraFeed');
    const photoCanvas = document.getElementById('photoCanvas');
    const context = photoCanvas.getContext('2d');
    
    photoCanvas.width = cameraFeed.videoWidth;
    photoCanvas.height = cameraFeed.videoHeight;
    context.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);

    cameraFeed.style.display = 'none';
    photoCanvas.style.display = 'flex'; // Show the canvas

    retakeRegistrationPhoto.classList.remove('hidden');
    saveRegistrationPhoto.classList.remove('hidden');
    captureRegistrationPhoto.classList.add('hidden');
}

function savePhoto(photoId) {
    const photoCanvas = document.getElementById('photoCanvas');
    const dataURL = photoCanvas.toDataURL('image/png');
    const cameraLoading = document.getElementById('cameraLoading');

    // Convert the dataURL to a blob
    fetch(dataURL)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], "your_photo.png", {
                type: 'image/png',
                lastModified: new Date()
            });

            // Set the file to the file input field
            const fileInput = document.getElementById(photoId);
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            // Optionally display the image in an <img> tag
            const displayPhoto = document.getElementById(photoId + '_preview');
            displayPhoto.classList.remove('hidden');
            displayPhoto.src = dataURL;

            const displayName = document.getElementById(photoId + '_name');
            if(photoId == 'id_id_photo'){
                displayName.innerText = 'Identification_Photo.png';
            }else if(photoId == 'id_reg_photo'){
                displayName.innerText = 'Headshot_Photo.png';
            }
            if(photoId == 'passportphoto' || photoId == 'photoid'){detectFileChanges();}   
        });
    
        setTimeout(() => {cameraLoading.classList.remove('hidden');}, 300);
    closePopup('takePhotoPopup');
}

function takePhoto(photoId) {
    openCamera(photoId);
    openPopup('takePhotoPopup');
}

function setupPhotoButtons(photoId) {
    const saveBtn = document.getElementById('saveRegistrationPhoto');
    const captureBtn = document.getElementById('captureRegistrationPhoto');
    const retakeBtn = document.getElementById('retakeRegistrationPhoto');

    saveBtn.removeEventListener('click', saveBtn.clickHandler);
    captureBtn.removeEventListener('click', captureBtn.clickHandler);
    retakeBtn.removeEventListener('click', retakeBtn.clickHandler);

    saveBtn.clickHandler = function() {
        savePhoto(photoId);
    };
    captureBtn.clickHandler = function() {
        takeSnapshot(photoId);
    };
    retakeBtn.clickHandler = function() {
        openCamera(photoId);
    };

    saveBtn.addEventListener('click', saveBtn.clickHandler);
    captureBtn.addEventListener('click', captureBtn.clickHandler);
    retakeBtn.addEventListener('click', retakeBtn.clickHandler);
}

function showCameraError(error, errorContainer){
    const cameraAccessTroubleshooting = document.getElementById('cameraAccessTroubleshooting');
    const fixPermissionsBtn = document.getElementById('fixPermissionsBtn');
    const refreshPageBtn= document.getElementById('refreshPageBtn')
    const captureRegistrationPhoto = document.getElementById('captureRegistrationPhoto');
    const cameraErrorContainer = document.getElementById(errorContainer);
    const cameraLoading = cameraErrorContainer.nextElementSibling;
    const cameraErrorHeading = cameraErrorContainer.querySelector('#cameraErrorHeading');
    const cameraErrorSubtext = cameraErrorContainer.querySelector('#cameraErrorSubtext');
    cameraErrorContainer.classList.remove('hidden');
    cameraLoading.classList.add('hidden');
    captureRegistrationPhoto.classList.add('hidden');

    // Detecting browser to show the correct enable permissions popup
    if(error.name == 'NotAllowedError'){
        cameraErrorHeading.innerText = "We don't have permissions to access your camera";
        cameraErrorSubtext.innerText = `To enable your camera permissions on ${detectBrowser(errorContainer)}, please click on the "Fix Permissions" button below to be taken to an external website for additional information.`;
        cameraAccessTroubleshooting.classList.add('hidden');
        fixPermissionsBtn.classList.remove('hidden');
        fixPermissionsBtn.removeAttribute('disabled', true);
        if(errorContainer == 'facialVerification'){
            fadeIn('fixPermissionsVerificationBtn');
        }   
    }else if(error.name == 'NotReadableError'){
        cameraErrorHeading.innerText = "We can't seem to access your camera";
        cameraErrorSubtext.innerText = `${detectBrowser(errorContainer)} has permissions to use your camera, but something is preventing your camera from being accessed. Below are a few steps to follow to troubleshoot why your camera may not be working, after going through these steps please click on the "Refresh page" button below.`;
        cameraAccessTroubleshooting.classList.remove('hidden');
        refreshPageBtn.classList.remove('hidden');
        refreshPageBtn.removeAttribute('disabled', true);
        if(errorContainer == 'facialVerification'){
            fadeIn('refreshPageVerificationBtn');
            fadeIn('cameraAccessTroubleshootingVerification')
        }  
    }
}

function detectBrowser(errorContainer) {
    const userAgent = navigator.userAgent;
    let fixPermissionsBtn;
    if(errorContainer == 'facialVerification'){
        fixPermissionsBtn = document.getElementById('fixPermissionsVerificationBtn');
        fadeOut('facialVerificationHeader');
        fadeOut('facialRecognitionMessage');
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

if(submitFormBtn){submitFormBtn.addEventListener("click", addLoadingSymbol);}
const registerForm = document.getElementById('registerForm')
if(registerForm){
    registerForm.addEventListener('keydown', function(event) {
        if ((event.key === 'Enter' || event.keyCode === 13) &&
            !submitFormBtn.classList.contains('hidden') &&
            !submitFormBtn.disabled) {
            event.preventDefault();
            addLoadingSymbol();
        }
    });
}

function addLoadingSymbol() {
    const password = document.getElementById('id_password').value;
    const confirmPassword = document.getElementById('id_confirm_password').value;
    const slideOneInputFields = document.querySelectorAll('.slide-one-input-field');
    const slideThreeInputFields = document.querySelectorAll('.slide-three-input-field');
    const fileFields = document.querySelectorAll('.form-file-field');
    
    showErrorMessage('', false); // Reset message

    // Step 1: Check Slide 1 Input fields
    for (let field of slideOneInputFields) {
        if (field.value === '' || (field.id === 'id_email' && !field.value.includes('@'))) {
            currentStep = 1;
            updateSteps();
            showErrorMessage('Please fill out all of the required fields.', true);
            currentErrorStep = 1;
            console.log('Step 1 Error');
            return; // ⛔ stop execution
        }
    }

    // Step 2: Check file inputs
    for (let field of fileFields) {
        if (!field.files || field.files.length === 0) {
            currentStep = 2;
            updateSteps();
            showErrorMessage('Please ensure that you have entered both your Identification Photo and Headshot Photo.', true);
            currentErrorStep = 2;
            console.log('Step 2 Error');
            return; // ⛔ stop execution
        }
    }

    // Step 3: Check Slide 3 Input fields
    for (let field of slideThreeInputFields) {
        if (field.value === '') {
            currentStep = 3;
            updateSteps();
            showErrorMessage('Please fill out all of the required fields.', true);
            currentErrorStep = 3;
            console.log('Step 3 Error - Empty Field');
            return; // ⛔ stop execution
        }
    }

    // Step 3: Check password match
    if (password !== confirmPassword) {
        currentStep = 3;
        updateSteps();
        showErrorMessage('Passwords do not match.', true);
        currentErrorStep = 3;
        console.log('Step 3 Error - Password Mismatch');
        return; // ⛔ stop execution
    }

    // All checks passed
    submitFormBtn.innerHTML = `<i class="fa-regular fa-spinner-third fa-spin" style="--fa-animation-duration: 1s;"></i>`;
    javascriptErrorContainer.classList.add('hidden');
    showFacialRecognitionPopup();
    // document.getElementById('registerForm').submit(); // Call after facial recognition
}

function showErrorMessage(message, isError, slide){
    // Resetting the error
    javascriptErrorContainer.classList.add('hidden');

    if(isError == true){
        javascriptErrorContainer.classList.remove('hidden');
        javascriptErrorMessage.innerText = message;
    }
}

function showFacialRecognitionPopup(facialPage){
    if(facialPage == 'require_id_photo'){
        document.getElementById('scanFaceBtn').setAttribute('onclick', 'initiateFacialRecognition("require_id_photo")');
    }

    fadeIn('scanFaceBtn');
    openPopup('facialRecognition');
    document.getElementById('closeFacialPopupBtn').style.top = '36.4rem';
    if(javascriptErrorContainer){javascriptErrorContainer.classList.add('hidden');}
}

let facialStream = null;

async function initiateFacialRecognition(facialPage) {
    const videoElement = document.getElementById('facialRecognitionVideo');
    const cameraLoading = document.getElementById('cameraLoadingVerification');
    let regPhotoPreview;
    const facialVideoFeedPlaceholder = document.getElementById('facialVideoFeedPlaceholder');

    if(facialPage == 'require_id_photo'){
        regPhotoPreview = document.getElementById('passportphoto_preview');
    }else{
        regPhotoPreview = document.getElementById('id_reg_photo_preview');
    }

    if (!regPhotoPreview || regPhotoPreview.classList.contains('hidden')) {
        alert("Please upload your headshot photo before scanning.");
        closePopup('facialRecognition');
        return;
    }

    facialVideoFeedPlaceholder.classList.add('hidden');
    fadeIn('cameraLoadingVerification');
    fadeOut('scanFaceBtn');
    fadeOut('closeFacialPopupBtn');
    fadeIn('facialRecognitionMessage');
    facialRecognitionMessage.innerHTML = `<span>Please look directly into the camera while we work our magic.</span`

    // Check for support            
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

                // Give camera time to show a frame before capturing
                await new Promise(resolve => setTimeout(resolve, 1000));

                const liveImage = captureVideoFrame(videoElement);
                const regImage = regPhotoPreview.src;

                const formData = new FormData();
                formData.append('image1', liveImage);
                formData.append('image2', regImage);

                try {
                    const response = await fetch('/admin/compare-faces/', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success) {
                        console.log(`Verified! Similarity: ${result.similarity.toFixed(2)}`);
                        showSuccess(`<i class="fa-regular fa-spinner-third fa-spin" style="--fa-animation-duration: 1s;"></i> Now Finalizing your account...`, dotsInterval, videoElement, false, facialPage);
                        baseText.innerText = 'Verification Successful!';
                        animatedDots.innerText = '';
                        if(facialPage == 'require_id_photo'){await finalizeLearnerAccount();}
                    } else {
                        switch (result.error_type) {
                            case 'no_face_live':
                                showFacialError("Hmm... we couldn't detect your face. Please make sure you're looking directly into the camera and avoid wearing hats or glasses during the scan.", dotsInterval, videoElement, false);
                                baseText.innerText = 'Face not detected';
                                animatedDots.innerText = '';
                                break;
                            case 'no_face_uploaded':
                                showFacialError("Hmm... we couldn't detect any facial features in the Headshot Photo you uploaded. Please re-upload a clearer Photo then try again.", dotsInterval, videoElement, true);
                                baseText.innerText = 'Re-upload Headshot Photo';
                                animatedDots.innerText = '';
                                break;
                            case 'face_mismatch':
                                showFacialError("Hmm... your face doesn't match the Headshot Photo you uploaded. Please try again or re-upload your Headshot Photo and try again.", dotsInterval, videoElement, false);
                                baseText.innerText = 'Faces do not match';
                                animatedDots.innerText = '';
                                break;
                            default:
                                showFacialError("Unexpected error: " + result.message, dotsInterval, videoElement, false);
                        }
                    }

                } catch (err) {
                    alert("An error occurred while verifying your face.");
                    console.error(err);
                }

            })
            .catch(function (error) {
                showCameraError(error, 'facialVerification');
            });
    } else {
        showCameraError({ name: 'Unsupported' }, 'facialVerification');
    }
}

function showFacialError(message, dotsInterval, videoElement, headshotError){
    const facialRecognitionMessage = document.getElementById('facialRecognitionMessage');
    facialRecognitionMessage.innerHTML = `<span>${message}</span>`
    scanFaceBtn.innerText = 'Scan My Face Again';

    videoElement.classList.add('hidden');

    if(headshotError == false){
        fadeIn('scanFaceBtn');
    }else{
        document.getElementById('closeFacialPopupBtn').style.top = '33rem';
    }
    fadeIn('facialVideoFeedPlaceholder');
    fadeIn('closeFacialPopupBtn');
    clearInterval(dotsInterval);
}

function showSuccess(message, dotsInterval, videoElement, headshotError, facialPage){
    const facialVideoFeedContainer = document.getElementById('facialVideoFeedContainer');
    const facialRecognitionMessage = document.getElementById('facialRecognitionMessage');
    facialRecognitionMessage.innerHTML = `<span class="facial-videofeed-successful-message">${message}</span`

    videoElement.classList.add('hidden');
    facialVideoFeedContainer.classList.add('hidden');

    fadeIn('facialVideoFeedSuccessfulContainer');
    clearInterval(dotsInterval);
    if(facialPage != 'require_id_photo'){
        setTimeout(() => {
            document.getElementById('registerForm').submit();
        }, 2000);
    }
}

function dataURLtoBlob(dataUrl, filename='image.jpg') {
    const [meta, b64] = dataUrl.split(',');
    const mime = (meta.match(/data:(.*?);base64/) || [,'image/jpeg'])[1];
    const bin = atob(b64);
    const u8  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const blob = new Blob([u8], { type: mime });
    blob.name = filename;
    return blob;
}

async function resizeDataURL(dataUrl, maxSide=1280, quality=0.85) {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const { width, height } = img;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
}

async function finalizeLearnerAccount() {
    // Prefer original files if present, otherwise fall back to preview dataURLs
    const headshotInput = document.getElementById('passportphoto');
    const idInput       = document.getElementById('photoid');

    const headshotPreview = document.getElementById('passportphoto_preview');
    const idPreview       = document.getElementById('photoid_preview');

    const fd = new FormData();

    // Headshot (passportphoto)
    if (headshotInput?.files?.[0]) {
        fd.append('passportphoto', headshotInput.files[0]);
    } else if (headshotPrev?.src) {
        const small = await resizeDataURL(headshotPrev.src);
        fd.append('passportphoto', dataURLtoBlob(small, 'headshot.jpg'), 'headshot.jpg');
    }

    // Photo ID (photoid)
    if (idInput?.files?.[0]) {
        fd.append('photoid', idInput.files[0]);
    } else if (idPrev?.src) {
        const small = await resizeDataURL(idPrev.src);
        fd.append('photoid', dataURLtoBlob(small, 'photoid.jpg'), 'photoid.jpg');
    }

    fd.append('from_verification', '1');

    const resp = await fetch('/admin/finalize-account/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') }, // your existing getCookie helper
        body: fd
    });

    const result = await resp.json();
    if (result.success) {
        setTimeout(() => {
            window.location = '/dashboard/';
        }, 2000);
    } else {
        displayValidationMessage('Could not finalize your account', false);
        alert(result.message || 'Could not finalize your account.');
    }
}

function reUploadHeadshot(){
    closePopup('facialRecognition');

    submitFormBtn.innerText = `Sign Up`;
    javascriptErrorContainer.classList.add('hidden');

    currentStep = 2;
    currentErrorStep = 0;
    updateSteps();
}

function captureVideoFrame(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
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

    setTimeout(() => {
        requestAnimationFrame(() => {
            container.style.opacity = '1';
            container.style.transform = 'scale(1)';
        });
    }, 100);

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