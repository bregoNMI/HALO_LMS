document.addEventListener('DOMContentLoaded', function() {
    // Call the function to initialize text color listeners
    initializeTextColorListeners();
    initializeHeaderBackgroundTextures();
    initializeFooterBackgroundTextures();
    reselectSavedTexture();
    reselectSavedFooterTexture();
});

document.getElementById('update-header-btn').addEventListener('click', function(event) {
    setDisabledSaveBtns();
    event.preventDefault();  // Prevent default form submission
    const selectedTextureInput = document.querySelector('input[name="texture-selection"]:checked');
    const selectedTexture = selectedTextureInput ? selectedTextureInput.id : 'none';

    // Gather the data from the input fields
    const headerData = {
        header_logo_display: document.getElementById('header_logoDisplay').value,
        header_logo: document.getElementById('header_logo').value,
        header_background_color: document.getElementById('header_background_colorHex').value,
        header_text_color: document.getElementById('header_text_colorHex').value,
        header_text_hover_color: document.getElementById('header_text_hover_colorHex').value,
        header_text_background_color: document.getElementById('header_text_background_colorHex').value,
        header_texture: selectedTexture,
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
        removeDisabledSaveBtns();
    })
    .catch(error => {
        displayValidationMessage('Failed to update header', false);
        console.error('Error:', error);
        removeDisabledSaveBtns();
    });
});

document.getElementById('update-footer-btn').addEventListener('click', function(event) {
    setDisabledSaveBtns();
    event.preventDefault();  // Prevent default form submission
    const selectedTextureInput = document.querySelector('input[name="footer-texture-selection"]:checked');
    const selectedTexture = selectedTextureInput ? selectedTextureInput.id : 'none';

    // Gather the data from the input fields
    const footerData = {
        footer_background_color: document.getElementById('footer_background_colorHex').value,
        footer_text_color: document.getElementById('footer_text_colorHex').value,
        footer_texture: selectedTexture,
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
        removeDisabledSaveBtns();
    })
    .catch(error => {
        displayValidationMessage('Failed to update footer', false);
        console.error('Error:', error);
        removeDisabledSaveBtns();
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
    initializeHeaderBackgroundTextures();
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
        initializeHeaderBackgroundTextures();
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

function initializeHeaderBackgroundTextures() {
    const textureContainers = document.querySelectorAll('.textures-container .icon-selection-item');
    const headerBackgroundColor = document.getElementById('header_background_colorHex').value;

    // Convert to lighter color
    const lighterColor = lightenColor(headerBackgroundColor, 30); // Lighten by 30%

    textureContainers.forEach(container => {
        if (container.classList.contains('horizontal-stripes-texture')) {
            container.style.background = `repeating-linear-gradient(
                45deg,
                ${headerBackgroundColor},
                ${headerBackgroundColor} 10px,
                ${lighterColor} 10px,
                ${lighterColor} 20px
            )`;
        }else if(container.classList.contains('dotted-texture')){
            container.style.backgroundImage = `radial-gradient(${lighterColor} 2px, ${headerBackgroundColor} 2px)`;
            container.style.backgroundSize = `10px 10px`;
        }else if (container.classList.contains('weave-texture')) {
            container.style.backgroundColor = headerBackgroundColor;
            container.style.backgroundImage = `
                linear-gradient(90deg, ${lighterColor} 1px, transparent 1px),
                linear-gradient(${lighterColor} 1px, transparent 1px)
            `;
            container.style.backgroundSize = `10px 10px`;
        }else if(container.classList.contains('wave-texture')){
            const svg = `
                <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path fill="${lighterColor}" d="M0,64L48,69.3C96,75,192,85,288,96C384,107,480,117,576,133.3C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
                </svg>
            `.trim();

            const svgEncoded = encodeURIComponent(svg);
            container.style.backgroundImage = `url("data:image/svg+xml,${svgEncoded}")`;
            container.style.backgroundColor = headerBackgroundColor;
            container.style.backgroundSize = '100% 100%';
            container.style.backgroundRepeat = 'no-repeat';
            container.style.backgroundPosition = 'bottom';
        }
    });
}

function initializeFooterBackgroundTextures() {
    const textureContainers = document.querySelectorAll('.footer-textures-container .icon-selection-item');
    const footerBackgroundColor = document.getElementById('footer_background_colorHex').value;

    // Convert to lighter color
    const lighterColor = lightenColor(footerBackgroundColor, 30); // Lighten by 30%

    textureContainers.forEach(container => {
        if (container.classList.contains('horizontal-stripes-texture')) {
            container.style.background = `repeating-linear-gradient(
                45deg,
                ${footerBackgroundColor},
                ${footerBackgroundColor} 10px,
                ${lighterColor} 10px,
                ${lighterColor} 20px
            )`;
        }else if(container.classList.contains('dotted-texture')){
            container.style.backgroundImage = `radial-gradient(${lighterColor} 2px, ${footerBackgroundColor} 2px)`;
            container.style.backgroundSize = `10px 10px`;
        }else if (container.classList.contains('weave-texture')) {
            container.style.backgroundColor = footerBackgroundColor;
            container.style.backgroundImage = `
                linear-gradient(90deg, ${lighterColor} 1px, transparent 1px),
                linear-gradient(${lighterColor} 1px, transparent 1px)
            `;
            container.style.backgroundSize = `10px 10px`;
        }else if(container.classList.contains('wave-texture')){
            const svg = `
                <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path fill="${lighterColor}" d="M0,64L48,69.3C96,75,192,85,288,96C384,107,480,117,576,133.3C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
                </svg>
            `.trim();

            const svgEncoded = encodeURIComponent(svg);
            container.style.backgroundImage = `url("data:image/svg+xml,${svgEncoded}")`;
            container.style.backgroundColor = footerBackgroundColor;
            container.style.backgroundSize = '100% 100%';
            container.style.backgroundRepeat = 'no-repeat';
            container.style.backgroundPosition = 'bottom';
        }
    });
}

function lightenColor(hex, percent) {
    // Normalize hex
    hex = hex.replace(/^#/, '').toLowerCase();

    // Special case: white
    if (hex === 'ffffff') {
        return '#e0e0e0'; // fallback gray
    }

    // Parse r, g, b
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Increase each channel toward 255
    r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    const isNearWhite = (r + g + b) > (255 * 3 - 15); // within 15 of full white
    if (isNearWhite) return '#eaeaea';

    // Convert back to hex
    const toHex = (val) => val.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function reselectSavedTexture() {
    const savedTexture = window.savedTexture || 'texture0';
    const savedInput = document.getElementById(savedTexture);
    if (savedInput) {
        savedInput.checked = true;
    }
}

function reselectSavedFooterTexture() {
    const savedTexture = window.savedFooterTexture || 'footer-texture0';
    const savedInput = document.getElementById(savedTexture);
    if (savedInput) {
        savedInput.checked = true;
    }
}