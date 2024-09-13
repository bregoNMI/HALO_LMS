document.addEventListener('DOMContentLoaded', function() {
    // Call the function to initialize text color listeners
    initializeTextColorListeners();
});

document.getElementById('update-header-btn').addEventListener('click', function(event) {
    event.preventDefault();  // Prevent default form submission

    // Gather the data from the input fields
    const headerData = {
        header_logo_display: document.getElementById('header_logoDisplay').value,
        header_logo: document.getElementById('header_logo').value,
        header_background_color: document.getElementById('header_background_colorHex').value,
        header_text_color: document.getElementById('header_text_colorHex').value,
        header_text_hover_color: document.getElementById('header_text_hover_colorHex').value,
        header_text_background_color: document.getElementById('header_text_background_colorHex').value,
    };

    // Send the data via a POST request
    fetch('/admin/templates/update-header/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken'),  // Include CSRF token
        },
        body: new URLSearchParams(headerData),  // Convert the data to URL-encoded format
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayValidationMessage('Header updated successfully', true);
            closePopup('editHeaderPopup');  // Close the popup after successful update
            // Optionally, refresh or update the header on the page
        } else {
            displayValidationMessage('Header failed to update', false);
            console.log('Failed to update header: ' + data.error);
        }
    })
    .catch(error => {
        displayValidationMessage('Failed to update header', false);
        console.error('Error:', error);
    });
});

document.getElementById('update-footer-btn').addEventListener('click', function(event) {
    event.preventDefault();  // Prevent default form submission

    // Gather the data from the input fields
    const footerData = {
        footer_background_color: document.getElementById('footer_background_colorHex').value,
        footer_text_color: document.getElementById('footer_text_colorHex').value,
    };

    // Send the data via a POST request
    fetch('/admin/templates/update-footer/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams(footerData),  // Convert the data to URL-encoded format
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayValidationMessage('Footer updated successfully', true);
            closePopup('editFooterPopup');  // Close the popup after successful update
            // Optionally, refresh or update the footer on the page
        } else {
            displayValidationMessage('Failed to update footer', false);
            console.log('Failed to update footer: ' + data.error);
        }
    })
    .catch(error => {
        displayValidationMessage('Failed to update footer', false);
        console.error('Error:', error);
    });
});

// Helper function to get CSRF token
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

        // Initialize the color fields on page load
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