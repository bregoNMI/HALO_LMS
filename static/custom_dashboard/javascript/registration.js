let buttonBackgroundHover = '{{ login_form.button_color_hover }}';
let buttonBackground = '{{ login_form.button_color }}';  
let buttonColorHover = '{{ login_form.button_text_hover }}';
let buttonColor = '{{ login_form.button_text }}';
let buttonBorderHover = '{{ login_form.button_border_color_hover }}';
let buttonBorder = '{{ login_form.button_border_color }}';

let forgetColor = '{{ login_form.forgot_link_color }}';
let forgetColorHover = '{{ login_form.forgot_link_color_hover }}';
let forgotTextDecoration = '{{ login_form.forgot_text_decoration }}';
let forgotTextDecorationHover = '{{ login_form.forgot_text_decoration_hover }}';

let signupColor = '{{ login_form.signup_link_color }}';
let signupColorHover = '{{ login_form.signup_link_color_hover }}';
let signupTextDecoration = '{{ login_form.signup_text_decoration }}';
let signupTextDecorationHover = '{{ login_form.signup_text_decoration_hover }}';

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
                const fileURL = URL.createObjectURL(file);   
                if (input.getAttribute('id') === 'id_id_photo') {
                    document.getElementById('id_id_photo_preview').src = fileURL;
                    document.getElementById('id_id_photo_preview').classList.remove('hidden');
                } else if (input.getAttribute('id') === 'id_reg_photo') {
                    document.getElementById('id_reg_photo_preview').src = fileURL;
                    document.getElementById('id_reg_photo_preview').classList.remove('hidden');
                }
            }
        });
    });
    

    const passwordInput = document.getElementById('id_password'); 
    passwordInput.addEventListener('input', testPasswordReqs);
    const usernameInput = document.getElementById('id_username'); 
    usernameInput.addEventListener('input', testUsernameReqs);
});

function testPasswordReqs() {
    const passwordInput = document.getElementById('id_password');
    const passwordValue = passwordInput.value;

    const passwordReqOne = document.getElementById('passwordReqOne');
    const passwordReqTwo = document.getElementById('passwordReqTwo');

    if(passwordValue.length == 0){
        passwordReqOne.className = 'field-requirement';
        passwordReqOne.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-regular fa-circle-small"></i>`;
        passwordReqTwo.className = 'field-requirement';            
        passwordReqTwo.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-regular fa-circle-small"></i>`;
        return;
    }

    const isAtLeastEight = passwordValue.length >= 8;
    const isNumeric = /^[0-9]+$/.test(passwordValue);

    if (isAtLeastEight) {
        passwordReqOne.className = 'field-requirement req-success';
        passwordReqOne.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
        enableSubmitButton();
    } else {
        passwordReqOne.className = 'field-requirement req-error';
        passwordReqOne.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
        disableSubmitButton();
    }
    if(isNumeric){
        passwordReqTwo.className = 'field-requirement req-error';
        passwordReqTwo.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
        disableSubmitButton();
    }else{
        passwordReqTwo.className = 'field-requirement req-success';
        passwordReqTwo.querySelector('.field-requirement-icon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
        enableSubmitButton();
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
buttons = document.querySelectorAll(".registration-btn");
let currentStep = 1;
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const submitFormBtn = document.getElementById('registerButton');
const javascriptErrorContainer = document.getElementById('javascriptErrorContainer');
const javascriptErrorMessage = javascriptErrorContainer.querySelector('.lesson-alert-message');
let currentErrorStep = 0;

const updateSteps = (e) => {
    if(currentStep > 0){
        // update current step based on the button clicked
        console.log(e);
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
                showCameraError(error);
            });
    } else {
        showCameraError('MediaDevices API not supported');
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

function showCameraError(error){
    console.log(error.name, error.message);
    const cameraAccessTroubleshooting = document.getElementById('cameraAccessTroubleshooting');
    const fixPermissionsBtn = document.getElementById('fixPermissionsBtn');
    const refreshPageBtn= document.getElementById('refreshPageBtn')
    const captureRegistrationPhoto = document.getElementById('captureRegistrationPhoto');
    const cameraErrorContainer= document.getElementById('cameraErrorContainer');
    const cameraLoading = document.getElementById('cameraLoading');
    const cameraErrorHeading = document.getElementById('cameraErrorHeading');
    const cameraErrorSubtext = document.getElementById('cameraErrorSubtext');
    cameraErrorContainer.classList.remove('hidden');
    cameraLoading.classList.add('hidden');
    captureRegistrationPhoto.classList.add('hidden');

    // Detecting browser to show the correct enable permissions popup
    if(error.name == 'NotAllowedError'){
        cameraErrorHeading.innerText = "We don't have permissions to access your camera";
        cameraErrorSubtext.innerText = `To enable your camera permissions on ${detectBrowser()}, please click on the "Fix Permissions" button below to be taken to an external website for additional information.`;
        cameraAccessTroubleshooting.classList.add('hidden');
        fixPermissionsBtn.classList.remove('hidden');
        fixPermissionsBtn.removeAttribute('disabled', true);   
    }else if(error.name == 'NotReadableError'){
        cameraErrorHeading.innerText = "We can't seem to access your camera";
        cameraErrorSubtext.innerText = `${detectBrowser()} has permissions to use your camera, but something is preventing your camera from being accessed. Below are a few steps to follow to troubleshoot why your camera may not be working, after going through these steps please click on the "Refresh page" button below.`;
        cameraAccessTroubleshooting.classList.remove('hidden');
        refreshPageBtn.classList.remove('hidden');
        refreshPageBtn.removeAttribute('disabled', true);
    }
}

function detectBrowser() {
    const userAgent = navigator.userAgent;
    const fixPermissionsBtn = document.getElementById('fixPermissionsBtn');

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

submitFormBtn.addEventListener("click", addLoadingSymbol);

function addLoadingSymbol(){
    const password = document.getElementById('id_password').value;
    const confirmPassword = document.getElementById('id_confirm_password').value;
    const slideOneInputFields = document.querySelectorAll('.slide-one-input-field');
    const slideThreeInputFields = document.querySelectorAll('.slide-three-input-field');
    const fileFields = document.querySelectorAll('.form-file-field');
    let areFieldsComplete = true;
    // Running just to reset the message incase
    showErrorMessage('', false);

    // Testing Slide 1 Input fields
    slideOneInputFields.forEach((field) => {
        if(field.value == '' || field.id === 'id_email' && !field.value.includes('@')){            
            currentStep = 1;
            updateSteps();
            areFieldsComplete = false;
            showErrorMessage('Please fill out all of the required fields.', true)
            currentErrorStep = 1;
            return;
        }      
    });

    // Testing Slide 2 File fields
    for (let field of fileFields) {
        if (!field.files || field.files.length === 0) {
            areFieldsComplete = false;
            currentStep = 2;
            updateSteps();
            showErrorMessage('Please ensure that you have entered both your Identification Photo and Headshot Photo.', true)
            currentErrorStep = 2;
            break;
        }
    }

    // Testing Slide 3 Input fields
    slideThreeInputFields.forEach((field) => {
        if(field.value == ''){            
            currentStep = 3;
            updateSteps();
            areFieldsComplete = false;
            return;
        }
        // Testing if password fields match   
        if (password !== confirmPassword) {
            currentStep = 3;
            updateSteps();
            showErrorMessage('Passwords do not match.', true)
            currentErrorStep = 3;
            return;
        }      
    });

    if(areFieldsComplete == true){
        submitFormBtn.innerHTML = `<i class="fa-regular fa-spinner-third fa-spin" style="--fa-animation-duration: 1s;">`;
    }
}

function showErrorMessage(message, isError, slide){
    // Resetting the error
    javascriptErrorContainer.classList.add('hidden');

    if(isError == true){
        javascriptErrorContainer.classList.remove('hidden');
        javascriptErrorMessage.innerText = message;
    }
}