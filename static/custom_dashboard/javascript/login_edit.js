document.addEventListener('DOMContentLoaded', function() {
    const cardHeaders = document.querySelectorAll('.info-card-header');

    cardHeaders.forEach(header => {
        header.addEventListener('click', function() {

            header.querySelector('.card-header-right').classList.toggle('active');
            header.classList.toggle('active');

            const cardBody = header.closest('.details-info-card').querySelector('.info-card-body');
            if (cardBody) {
                cardBody.classList.toggle('hidden'); // 'hidden' class should be styled with display: none;
            }
        });
    });

    initializeRangeSliders();
    initializeExternalLinks();
    initializeDisableLogoSlider();
    initializeColorListeners()
    initializeTextColorListeners();
    checkBannerPosition();
    checkLayout();

    initializeSliderChanges();
    initializeURLChanges();
    initializeImageChanges();
    initializeColorChanges();
    initializePositionChanges();
    initializeSelectChanges();
    initializeCheckboxChanges();
    initializeLayoutChanges();
    initializeTextChanges();
    initializeDeviceOptions();
});

function initializeDisableLogoSlider() {
    const is_logo_disabled = document.getElementById('is_logo_disabled');
    const toggleLogoOptions = document.getElementById('toggleLogoOptions');

    const is_background_disabled = document.getElementById('is_background_disabled');
    const toggleBackgroundOptions = document.getElementById('toggleBackgroundOptions');

    const form_enable_transparency = document.getElementById('form_enable_transparency');
    const toggleLoginFormOptions = document.getElementById('toggleLoginFormOptions');

    const is_forgot_disabled = document.getElementById('is_forgot_disabled');
    const toggleForgotPassword = document.getElementById('toggleForgotPassword');

    const is_signup_disabled = document.getElementById('is_signup_disabled');
    const toggleSignUp = document.getElementById('toggleSignUp');

    function updateLogoOptionsVisibility() {
        if (is_logo_disabled.checked) {toggleLogoOptions.classList.add('hidden');} else {toggleLogoOptions.classList.remove('hidden');}
        if (!is_background_disabled.checked) {toggleBackgroundOptions.classList.add('hidden');} else {toggleBackgroundOptions.classList.remove('hidden');}
        if (form_enable_transparency.checked) {toggleLoginFormOptions.classList.add('hidden');} else {toggleLoginFormOptions.classList.remove('hidden');}
        if (is_forgot_disabled.checked) {toggleForgotPassword.classList.add('hidden');} else {toggleForgotPassword.classList.remove('hidden');}
        if (is_signup_disabled.checked) {toggleSignUp.classList.add('hidden');} else {toggleSignUp.classList.remove('hidden');}
    }

    is_logo_disabled.addEventListener('change', updateLogoOptionsVisibility);
    is_background_disabled.addEventListener('change', updateLogoOptionsVisibility);
    form_enable_transparency.addEventListener('change', updateLogoOptionsVisibility);
    is_forgot_disabled.addEventListener('change', updateLogoOptionsVisibility);
    is_signup_disabled.addEventListener('change', updateLogoOptionsVisibility);
    updateLogoOptionsVisibility();
}

function initializeRangeSliders() {
    const sliders = document.querySelectorAll('.custom-range-slider');

    sliders.forEach(slider => {
        const rangeInput = slider.querySelector('input[type=range]');
        const textInput = slider.querySelector('.custom-range-value');
        const resetButton = slider.querySelector('.reset-custom-range-value');
        const defaultValue = rangeInput.getAttribute('value');

        function updateSliderBackground(sliderElement) {
            const value = sliderElement.value;
            const min = sliderElement.min || 0;
            const max = sliderElement.max || 100;
            const percentage = ((value - min) / (max - min)) * 100;
            sliderElement.style.background = `linear-gradient(to right, var(--primary-blue) ${percentage}%, var(--bg-color3) ${percentage}%)`;
        }

        rangeInput.addEventListener('input', function() {
            textInput.value = rangeInput.value;
            updateSliderBackground(rangeInput);
        });

        textInput.addEventListener('input', function() {
            rangeInput.value = textInput.value;
            updateSliderBackground(rangeInput);
        });

        resetButton.addEventListener('click', function() {
            rangeInput.value = defaultValue;
            textInput.value = defaultValue;
            updateSliderBackground(rangeInput);
        });

        updateSliderBackground(rangeInput);
    });
}

function saveLoginForm() {
    const selectedLayoutElement = document.querySelector('input[name="layout-selection"]:checked');
    const layout = selectedLayoutElement.getAttribute('data-layout');
    const is_logo_disabled = document.getElementById('is_logo_disabled').checked;
    const loginLogoURLInput = document.getElementById('loginLogoURLInput').value;
    const loginLogoImageDisplay = document.getElementById('loginLogoImageDisplay').innerText;
    const logo_width = document.getElementById('logo_width').value;
    const logo_height = document.getElementById('logo_height').value;
    const logo_space_bottom = document.getElementById('logo_space_bottom').value;
    const logo_url = document.getElementById('logo_url').value;

    const background_colorHex = document.getElementById('background_colorHex').value;
    const is_background_disabled = document.getElementById('is_background_disabled').checked;
    const loginBackgroundURLInput = document.getElementById('loginBackgroundURLInput').value;
    const loginBackgroundImageDisplay = document.getElementById('loginBackgroundImageDisplay').innerText;
    const selectedElement = document.querySelector('input[name="position-selection"]:checked');
    const background_repeat = document.getElementById('background_repeat').value;
    const background_position = selectedElement.getAttribute('data-position');
    const background_size = document.getElementById('background_size').value;

    const form_enable_transparency = document.getElementById('form_enable_transparency').checked;
    const form_background_colorHex = document.getElementById('form_background_colorHex').value;
    const formBackgroundURLInput = document.getElementById('formBackgroundURLInput').value;
    const formBackgroundImageDisplay = document.getElementById('formBackgroundImageDisplay').innerText;
    const form_max_width = document.getElementById('form_max_width').value;
    const form_radius = document.getElementById('form_radius').value;
    const form_shadow = document.getElementById('form_shadow').value;
    const form_shadow_opacity = document.getElementById('form_shadow_opacity').value;
    const form_padding_top = document.getElementById('form_padding_top').value;
    const form_padding_right = document.getElementById('form_padding_right').value;
    const form_padding_bottom = document.getElementById('form_padding_bottom').value;
    const form_padding_left = document.getElementById('form_padding_left').value;
    const form_border_width = document.getElementById('form_border_width').value;
    const form_border_style = document.getElementById('form_border_style').value;
    const form_border_colorHex = document.getElementById('form_border_colorHex').value;

    const input_background_colorHex = document.getElementById('input_background_colorHex').value;
    const input_text_colorHex = document.getElementById('input_text_colorHex').value;
    const input_padding_top = document.getElementById('input_padding_top').value;
    const input_padding_right = document.getElementById('input_padding_right').value;
    const input_padding_bottom = document.getElementById('input_padding_bottom').value;
    const input_padding_left = document.getElementById('input_padding_left').value;
    const input_width = document.getElementById('input_width').value;
    const input_border_color = document.getElementById('input_border_color').value;
    const input_radius = document.getElementById('input_radius').value;
    const input_font_size = document.getElementById('input_font_size').value;
    const input_space_between = document.getElementById('input_space_between').value;

    const label_color = document.getElementById('label_color').value;
    const label_font_size = document.getElementById('label_font_size').value;
    const label_font_weight = document.getElementById('label_font_weight').value;
    const label_space_bottom = document.getElementById('label_space_bottom').value;

    const button_colorHex = document.getElementById('button_colorHex').value;
    const button_color_hoverHex = document.getElementById('button_color_hoverHex').value;
    const button_textHex = document.getElementById('button_textHex').value;
    const button_text_hoverHex = document.getElementById('button_text_hoverHex').value;
    const button_border_colorHex = document.getElementById('button_border_colorHex').value;
    const button_border_color_hoverHex = document.getElementById('button_border_color_hoverHex').value;
    const button_space_above = document.getElementById('button_space_above').value;
    const button_width = document.getElementById('button_width').value;
    const button_radius = document.getElementById('button_radius').value;
    const button_padding_top = document.getElementById('button_padding_top').value;
    const button_padding_right = document.getElementById('button_padding_right').value;
    const button_padding_bottom = document.getElementById('button_padding_bottom').value;
    const button_padding_left = document.getElementById('button_padding_left').value;
    const button_font_size = document.getElementById('button_font_size').value;
    const button_font_weight = document.getElementById('button_font_weight').value;

    const is_forgot_disabled = document.getElementById('is_forgot_disabled').checked;
    const forgot_text_decoration = document.getElementById('forgot_text_decoration').value;
    const forgot_text_decoration_hover = document.getElementById('forgot_text_decoration_hover').value;
    const forgot_font_size = document.getElementById('forgot_font_size').value;
    const forgot_space_above = document.getElementById('forgot_space_above').value;
    const forgot_link_colorHex = document.getElementById('forgot_link_colorHex').value;
    const forgot_link_color_hoverHex = document.getElementById('forgot_link_color_hoverHex').value;

    const is_signup_disabled = document.getElementById('is_signup_disabled').checked;
    const signup_font_size = document.getElementById('signup_font_size').value;
    const signup_font_weight = document.getElementById('signup_font_weight').value;
    const signup_space_above = document.getElementById('signup_space_above').value;
    const signup_link_colorHex = document.getElementById('signup_link_colorHex').value;
    const signup_link_color_hoverHex = document.getElementById('signup_link_color_hoverHex').value;
    const signup_text_decoration = document.getElementById('signup_text_decoration').value;
    const signup_text_decoration_hover = document.getElementById('signup_text_decoration_hover').value;
    const signup_text_colorHex = document.getElementById('signup_text_colorHex').value;

    fetch(`/admin/templates/login/edit/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            layout: layout,
            is_logo_disabled: is_logo_disabled,
            loginLogoURLInput: loginLogoURLInput,
            loginLogoImageDisplay: loginLogoImageDisplay,
            logo_width: logo_width,
            logo_height: logo_height,
            logo_space_bottom: logo_space_bottom,
            logo_url: logo_url,
            is_background_disabled: is_background_disabled,
            loginBackgroundURLInput: loginBackgroundURLInput,
            loginBackgroundImageDisplay: loginBackgroundImageDisplay,
            background_colorHex: background_colorHex,
            background_repeat: background_repeat,
            background_position: background_position,
            background_size: background_size,
            form_enable_transparency: form_enable_transparency,
            form_background_colorHex: form_background_colorHex,
            formBackgroundURLInput: formBackgroundURLInput,
            formBackgroundImageDisplay: formBackgroundImageDisplay,
            form_max_width: form_max_width,
            form_radius: form_radius,
            form_shadow: form_shadow,
            form_shadow_opacity: form_shadow_opacity,
            form_padding_top: form_padding_top,
            form_padding_right: form_padding_right,
            form_padding_bottom: form_padding_bottom,
            form_padding_left: form_padding_left,
            form_border_width: form_border_width,
            form_border_style: form_border_style,
            form_border_colorHex: form_border_colorHex,
            input_background_colorHex: input_background_colorHex,
            input_text_colorHex: input_text_colorHex,
            input_padding_top: input_padding_top,
            input_padding_right: input_padding_right,
            input_padding_bottom: input_padding_bottom,
            input_padding_left: input_padding_left,
            input_width: input_width,
            input_border_color: input_border_color,
            input_radius: input_radius,
            input_font_size: input_font_size,
            input_space_between: input_space_between,
            label_color: label_color,
            label_font_size: label_font_size,
            label_font_weight: label_font_weight,
            label_space_bottom: label_space_bottom,
            button_colorHex: button_colorHex,
            button_color_hoverHex: button_color_hoverHex,
            button_textHex: button_textHex,
            button_text_hoverHex: button_text_hoverHex,
            button_border_colorHex: button_border_colorHex,
            button_border_color_hoverHex: button_border_color_hoverHex,
            button_space_above: button_space_above,
            button_width: button_width,
            button_radius: button_radius,
            button_padding_top: button_padding_top,
            button_padding_right: button_padding_right,
            button_padding_bottom: button_padding_bottom,
            button_padding_left: button_padding_left,
            button_font_size: button_font_size,
            button_font_weight: button_font_weight,
            is_forgot_disabled: is_forgot_disabled,
            forgot_font_size: forgot_font_size,
            forgot_space_above: forgot_space_above,
            forgot_text_decoration: forgot_text_decoration,
            forgot_text_decoration_hover: forgot_text_decoration_hover,
            forgot_link_colorHex: forgot_link_colorHex,
            forgot_link_color_hoverHex: forgot_link_color_hoverHex,
            is_signup_disabled: is_signup_disabled,
            signup_font_size: signup_font_size,
            signup_font_weight: signup_font_weight,
            signup_space_above: signup_space_above,
            signup_link_colorHex: signup_link_colorHex,
            signup_link_color_hoverHex: signup_link_color_hoverHex,
            signup_text_decoration: signup_text_decoration,
            signup_text_decoration_hover: signup_text_decoration_hover,
            signup_text_colorHex: signup_text_colorHex,
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
            // Update the DOM elements with the new values

            displayValidationMessage('Portal updated successfully', true);
        } else {
            displayValidationMessage('Failed to update header', false);
        }
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
    });
}

const validationMessageContainer = document.getElementById('validation-message-container');
const validationMessageInner = document.getElementById('validation-message-inner');
const validationMessage = document.getElementById('validation-message');
const validationIcon = document.getElementById('validation-icon');

function displayValidationMessage(message, isSuccess) {
    validationMessage.textContent = message;
    validationMessageContainer.style.display = 'flex';
    setTimeout(() => {
        validationMessageContainer.className = isSuccess ? 'alert-container animate-alert-container' : 'alert-container animate-alert-container';
    }, 100);
    validationMessageInner.className = isSuccess ? 'alert alert-success' : 'alert alert-error';
    setTimeout(() => {
        validationMessageContainer.classList.remove('animate-alert-container');
    }, 10000);
    if(isSuccess){
        validationIcon.className = 'fa-solid fa-circle-check';
    }else{
        validationIcon.className = 'fa-solid fa-triangle-exclamation';
    }
}

function initializeExternalLinks() {
    const linkInputs = document.querySelectorAll('.external-link-input');

    linkInputs.forEach(input => {
        const visitLinkBtn = input.nextElementSibling;

        function visitExternalLink() {
            const url = input.value.trim();

            if (url) {
                window.open(url, '_blank');
            } else {
                displayValidationMessage('Please enter a valid URL', false);
            }
        }

        if (visitLinkBtn) {
            visitLinkBtn.addEventListener('click', visitExternalLink);
        }
    });
}

function updateColorInfo(inputId) {
    const colorInput = document.getElementById(inputId);
    const hexInput = document.getElementById(inputId + 'Hex');
    const colorSample = document.getElementById(inputId + 'Sample');

    // Update the hex input field and color sample
    hexInput.value = colorInput.value;
    colorSample.style.backgroundColor = colorInput.value;
    hexInput.classList.remove('form-error-field');
}


function initializeColorListeners(){
    // Attach event listeners to color inputs
    const colorInputs = document.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
        const inputId = input.id;
        const hexInputId = inputId + 'Hex';
        const sampleId = inputId + 'Sample';

        // Update color info when color input value changes
        input.addEventListener('input', () => {
            updateColorInfo(inputId);
        });

        updateColorInfo(inputId);
    });

    // Handle click on color sample to trigger color picker
    document.querySelectorAll('.course-content-input').forEach(inputContainer => {
        const colorSample = inputContainer.querySelector('label[id$="Sample"]');
        const colorInput = inputContainer.querySelector('input[type="color"]');

        if (colorSample && colorInput) {
            colorSample.addEventListener('click', () => {
                colorInput.click();
            });
        }
    });
}

function updateColorFromText(inputId) {
    const hexInput = document.getElementById(inputId);
    const colorInput = document.getElementById(inputId.replace('Hex', '')); // Assuming the id structure follows the pattern
    const colorSample = document.getElementById(inputId.replace('Hex', 'Sample'));

    // Update the color input and color sample if the hex is valid
    if (isValidHex(hexInput.value)) {
        colorInput.value = hexInput.value;
        colorSample.style.backgroundColor = hexInput.value;
        hexInput.classList.remove('form-error-field');
    }else{
        displayValidationMessage('Please enter a valid Hex value (e.g., #000000)', false);
        hexInput.classList.add('form-error-field');
    }
}

function initializeTextColorListeners() {
    // Attach event listeners to hex text inputs
    const hexInputs = document.querySelectorAll('input[type="text"][id$="Hex"]');

    hexInputs.forEach(hexInput => {
        hexInput.addEventListener('input', () => {
            updateColorFromText(hexInput.id);
        });

        // Initialize the color fields on page load
        updateColorFromText(hexInput.id);
    });
}

function isValidHex(hex) {
    // Check if the hex code matches the valid 6-digit hex pattern
    return /^#[0-9A-F]{6}$/i.test(hex);
}

function checkBannerPosition() {
    const loginBackgroundImage = checkBackgroundPositionItems;
    const matchingInput = document.querySelector(`input[name="position-selection"][data-position="${loginBackgroundImage}"]`);

    if (matchingInput) {
        matchingInput.checked = true;
    }
};

function checkLayout() {
    const selectedLayout = checkLayoutItems;
    const matchingInput = document.querySelector(`input[name="layout-selection"][data-layout="${selectedLayout}"]`);

    if (matchingInput) {
        matchingInput.checked = true;
    }
};

// Listening for changes made in the editor and applying them to the login page
// When Sliders get changed
function initializeSliderChanges(){
    const sliders = document.querySelectorAll('.custom-range-slider');

    sliders.forEach(slider => {
        const rangeInput = slider.querySelector('input[type=range]');
        const textInput = slider.querySelector('.custom-range-value');
        const resetButton = slider.querySelector('.reset-custom-range-value');
        const customRangeValue = slider.querySelector('.custom-range-value');

        rangeInput.addEventListener('input', function() {
            updateLoginForm(customRangeValue.getAttribute('data-update-item'), 'slider', customRangeValue.value, customRangeValue.getAttribute('data-update-type')); 
        });
        textInput.addEventListener('input', function() {
            updateLoginForm(customRangeValue.getAttribute('data-update-item'), 'slider', customRangeValue.value, customRangeValue.getAttribute('data-update-type'));
        });
        resetButton.addEventListener('click', function() {
            updateLoginForm(customRangeValue.getAttribute('data-update-item'), 'slider', customRangeValue.value, customRangeValue.getAttribute('data-update-type'));
        });
    });
}
// When URL Inputs get changed
function initializeURLChanges(){
    const urlInputs = document.querySelectorAll('.login-form-sidebar .external-link-input');

    urlInputs.forEach(input => {
        input.addEventListener('input', function() {
            updateLoginForm(input.getAttribute('data-update-item'), 'url', input.value, input.getAttribute('data-update-type'));
        });
    });
}

// When Text Inputs get changed (Padding Amounts)
function initializeTextChanges(){
    const urlInputs = document.querySelectorAll('.login-form-sidebar .custom-text-value');

    urlInputs.forEach(input => {
        input.addEventListener('input', function() {
            updateLoginForm(input.getAttribute('data-update-item'), 'slider', input.value, input.getAttribute('data-update-type'));
        });
    });
}

// When Images get changed
function initializeImageChanges() {
    const imageInputs = document.querySelectorAll('.login-form-sidebar .custom-file-upload-container input[type="hidden"]');

    const handleMutation = (mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                const input = mutation.target;
                updateLoginForm(input.getAttribute('data-update-item'), 'image', input.value, input.getAttribute('data-update-type'));
            }
        });
    };

    imageInputs.forEach(input => {
        const observer = new MutationObserver(handleMutation);
        observer.observe(input, {
            attributes: true,
            attributeFilter: ['value']
        });

        input.observer = observer;
    });
}
// When Color Inputs get changed
function initializeColorChanges(){
    const colorInputs = document.querySelectorAll('.login-form-sidebar .color-picker-container input[type="color"]');
    const textColorInputs = document.querySelectorAll('.login-form-sidebar .color-picker-container input[type="text"]');

    colorInputs.forEach(input => {
        input.addEventListener('input', function() {
            updateLoginForm(input.getAttribute('data-update-item'), 'color', input.value, input.getAttribute('data-update-type'));
        });
    });

    textColorInputs.forEach(input => {
        input.addEventListener('input', function() {
            updateLoginForm(input.getAttribute('data-update-item'), 'color', input.value, input.getAttribute('data-update-type'));
        });
    });
}
// When the position Inputs get changed (arrows)
function initializePositionChanges(){
    const positionInputs = document.querySelectorAll('.login-form-sidebar .position-selection-item');

    positionInputs.forEach(input => {
        const positionValue = input.querySelector('input[name="position-selection"]');

        input.addEventListener('click', function() {
            updateLoginForm(positionValue.getAttribute('data-update-item'), 'position', positionValue.getAttribute('data-position'), positionValue.getAttribute('data-update-type'));
        });
    });
}
// When Select Inputs get changed
function initializeSelectChanges() {
    const selectInputs = document.querySelectorAll('.login-form-sidebar .select-selected');

    const handleMutation = (mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                const input = mutation.target;
                updateLoginForm(input.getAttribute('data-update-item'), 'position', input.value, input.getAttribute('data-update-type'));
            }
        });
    };

    selectInputs.forEach(input => {
        const observer = new MutationObserver(handleMutation);
        observer.observe(input, {
            attributes: true,
            attributeFilter: ['value']
        });

        input.observer = observer;
    });
}

// When Checkbox Inputs get changed
function initializeCheckboxChanges(){
    const urlInputs = document.querySelectorAll('.login-form-sidebar .toggle-switch input[type="checkbox"]');

    urlInputs.forEach(input => {
        input.addEventListener('change', function() {
            updateLoginForm(input.getAttribute('data-update-item'), 'checkbox', input.checked, input.getAttribute('data-update-type'), input);
        });
    });
}

// When the layout Inputs get changed
function initializeLayoutChanges(){
    const layoutInputs = document.querySelectorAll('.login-form-sidebar .lesson-selection-item');

    layoutInputs.forEach(input => {
        const layoutValue = input.querySelector('input[name="layout-selection"]');

        input.addEventListener('click', function() {
            updateLoginForm(layoutValue.getAttribute('data-update-item'), 'layout', layoutValue.getAttribute('data-layout'), layoutValue.getAttribute('data-update-type'));
            const currentDevice = checkSelectedDevice();
            if (currentDevice) {
                console.log('Currently selected device:', currentDevice);
                adjustPreview(currentDevice);
            }
        });
    });
}

// Function to actually update the items inside of the login form (data-update-item)
function updateLoginForm(id, type, value, style, clickedElement){
    let itemToUpdate = document.querySelectorAll(`[data-item-to-update='${id}']`);
    console.log(itemToUpdate);

    itemToUpdate.forEach(element => {
        console.log('Updating element:', element);
        if (type == 'slider') {
            if(style == 'boxShadow'){
                const shadow = document.getElementById('form_shadow').value;
                const shadowOpacity = document.getElementById('form_shadow_opacity').value;
                const opacityDecimal = shadowOpacity / 100;
                element.style[style] = `0px 0px ${shadow}px rgba(0, 0, 0, ${opacityDecimal})`;
            }else if(style == 'inputWidth'){
                element.style.width = value + '%';
            }else{
                element.style[style] = value + 'px';
            }
        }
        if(type == 'url'){
            element.href = value
        }
        if(type == 'color'){
            element.style[style] = value;
            updateHoverableColors();
        }
        if(type == 'image'){
            element.style[style] = `url(${value})`;
        }
        if(type == 'position'){
            element.style[style] = value;
            updateHoverableColors();
        }
        if(type == 'checkbox'){
            if(id == 'logo'){
                element.classList.toggle(style);
            }else if(id == 'background'){
                if(clickedElement.checked){
                    const loginBackgroundURLInput = document.getElementById('loginBackgroundURLInput').value;
                    element.style[style] = `url(${loginBackgroundURLInput})`;
                }else{
                    element.style[style] = '';
                }
            }else if(id == 'loginform'){
                if(clickedElement.checked){
                    element.style.backgroundColor = style;
                }else{
                    const form_background_colorHex = document.getElementById('form_background_colorHex').value;
                    element.style.backgroundColor = form_background_colorHex;
                }
            }else if(id == 'forgetLink'){
                element.classList.toggle(style);
            }else if(id == 'signupContainer'){
                element.classList.toggle(style);
            }
        }
        if(type == 'layout'){
            const loginFormElement = element.querySelector('.login-form-content');
            loginFormElement.className = '';
            if(value == 'layout1'){
                element.style[style] = 'row-reverse';
                loginFormElement.className = 'login-form-content layout1';
            }else if(value == 'layout2'){
                element.style[style] = '';
                loginFormElement.className = 'login-form-content layout2';
            }else if(value == 'layout3'){
                element.style[style] = 'row';
                loginFormElement.className = 'login-form-content layout3';
            }
        }
    });

    console.log(id, type, value, style);
}

function deleteImage(imageContainer, previewImage, element){
    const mainContainer = document.querySelector(`div[for=${imageContainer}]`)
    const previewContainer = document.getElementById(previewImage);

    console.log(mainContainer, previewContainer);

    element.style.display = 'none';
    previewContainer.src = '';
    previewContainer.setAttribute('hidden', true);
    mainContainer.querySelector('.file-name-display').innerText = 'No File Selected';
    mainContainer.querySelector('.file-url-input-hidden').value = '';  
}

function updateHoverableColors(){
    buttonBackground = document.getElementById('button_colorHex').value;
    buttonBackgroundHover = document.getElementById('button_color_hoverHex').value;
    buttonColor = document.getElementById('button_textHex').value;
    buttonColorHover = document.getElementById('button_text_hoverHex').value;
    buttonBorder = document.getElementById('button_border_colorHex').value;
    buttonBorderHover = document.getElementById('button_border_color_hoverHex').value;

    forgetColor = document.getElementById('forgot_link_colorHex').value;
    forgetColorHover = document.getElementById('forgot_link_color_hoverHex').value;
    forgotTextDecoration = document.getElementById('forgot_text_decoration').value;
    forgotTextDecorationHover = document.getElementById('forgot_text_decoration_hover').value;

    signupColor = document.getElementById('signup_link_colorHex').value;
    signupColorHover = document.getElementById('signup_link_color_hoverHex').value;
    signupTextDecoration = document.getElementById('signup_text_decoration').value;
    signupTextDecorationHover = document.getElementById('signup_text_decoration_hover').value;
}

function initializeDeviceOptions(){
    const deviceOptions = document.querySelectorAll('.device-selection-item input[type="radio"]');

    deviceOptions.forEach(option => {
        option.addEventListener('change', function() {
            if(this.checked) {
                adjustPreview(this.dataset.device);
            }
        });
    });
}

function adjustPreview(device) {
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.className = '';
    switch(device) {
        case 'desktop':
            previewContainer.className = 'login-form-body-wrapper scrollable-content';
            addLayout2Styles();
            break;
        case 'tablet':
            previewContainer.className = 'login-form-body-wrapper scrollable-content tablet-dimensions';
            addLayout2Styles();
            break;
        case 'mobile':
            previewContainer.className = 'login-form-body-wrapper scrollable-content mobile-dimensions';
            removeLayout2Styles();
            break;
    }
}

function addLayout2Styles(){
    const layout2Login = document.querySelector('.login-form-content.layout2');
    if(layout2Login && layout2Login.classList.contains('remove-layout-style')){
        layout2Login.classList.remove('remove-layout-style');
    }
}

function removeLayout2Styles(){
    const layout2Login = document.querySelector('.login-form-content.layout2');
    if(layout2Login){
        layout2Login.classList.add('remove-layout-style');
    }
}

function checkSelectedDevice() {
    const selectedDevice = document.querySelector('.device-selection-item input[type="radio"]:checked');
    if (selectedDevice) {
        return selectedDevice.dataset.device;
    } else {
        return null;
    }
}
