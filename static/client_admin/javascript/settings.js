document.addEventListener('DOMContentLoaded', function () {
    // Get all checkboxes with the 'on_login_course' class or a unique selector
    const onLoginCourseCheckboxes = document.querySelectorAll('.toggle-hidden-settings-input');
    
    // Function to toggle the visibility of the corresponding hidden input
    function toggleHiddenInput(checkbox) {
        const hiddenSettingsInput = checkbox.closest('.edit-settings-input').nextElementSibling;

        if (checkbox.checked) {
            hiddenSettingsInput.style.display = 'block';
        } else {
            hiddenSettingsInput.style.display = 'none';
        }
    }

    // Run on page load and add event listeners for all checkboxes
    onLoginCourseCheckboxes.forEach(function (checkbox) {
        toggleHiddenInput(checkbox);  // Run this on page load in case any checkbox is pre-checked
        
        // Add event listener to toggle the hidden input when the checkbox changes
        checkbox.addEventListener('change', function () {
            toggleHiddenInput(checkbox);
        });
    });

    // Select all elements with the class 'alert'
    var alerts = document.querySelectorAll('.alert-container');

    // Loop through each alert and add a new class if the alert is visible
    alerts.forEach(function(alert) {
        // Check if the alert is visible
        if (window.getComputedStyle(alert).display !== 'none') {
            // Add a class to the active alert
            alert.classList.add('animate-alert-container');
            setTimeout(() => {
                alert.classList.remove('animate-alert-container');
            }, 8000);
        }
    });

    const default_course_thumbnail_image = document.getElementById('default_course_thumbnail_image');
    if(default_course_thumbnail_image){
        default_course_thumbnail_image.addEventListener('change', function(event) {
            const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
            document.getElementById('thumbNailImageDisplay').textContent = fileName;
        });
    }
    const default_certificate_template = document.getElementById('default_certificate_template');
    if(default_certificate_template){
        const existingPDF = default_certificate_template.value;
        default_certificate_template.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file && file.type !== 'application/pdf') {
                showRealTimeAlert(false, 'error', 'Only PDF files are allowed.')
                event.target.value = existingPDF;
                return;
            }

            const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
            document.getElementById('certificateImageDisplay').textContent = fileName;
        });
    }

    const portal_favicon = document.getElementById('portal_favicon');
    const faviconPreview = document.getElementById('faviconPreview');
    const learning_credits_icon = document.getElementById('learning_credits_icon');
    const creditsIconPreview = document.getElementById('creditsIconPreview');

    function previewFile(inputEl, imgEl, labelId) {
        inputEl?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        const labelEl = document.getElementById(labelId);
        if (file) {
            if (labelEl) labelEl.textContent = file.name;
            const objectUrl = URL.createObjectURL(file);
            imgEl.src = objectUrl;
            imgEl.style.display = '';
            imgEl.onload = () => URL.revokeObjectURL(objectUrl);
        } else {
            if (labelEl) labelEl.textContent = 'No file selected';
            imgEl.src = '';
            imgEl.style.display = 'none';
        }
        });
    }

    if (portal_favicon && faviconPreview) {
        previewFile(portal_favicon, faviconPreview, 'faviconImageDisplay');
    }
    if (learning_credits_icon && creditsIconPreview) {
        previewFile(learning_credits_icon, creditsIconPreview, 'creditsIconImageDisplay');
    }

    testCreateField();
    testEditField();
    initiateEditIdPhoto();
    initiateDeleteIdPhoto();
});

function testCreateField(){
    const newIdPhotoName = document.getElementById('newIdPhotoName');
    const createAllowedIdPhotoBtn = document.getElementById('createAllowedIdPhotoBtn');
    newIdPhotoName.addEventListener('input', () => {
        if(newIdPhotoName.value.length > 0 ){
            createAllowedIdPhotoBtn.removeAttribute('disabled', true);
            createAllowedIdPhotoBtn.classList.remove('disabled');
        }else{
            createAllowedIdPhotoBtn.setAttribute('disabled', true);
            createAllowedIdPhotoBtn.classList.add('disabled');
        }
    })
}


const form = document.querySelector('#adminSettingsForm');

function submitSettingsForm() {
    setDisabledSaveBtns();
    document.getElementById('terms_and_conditions_text').value = getEditorContent('terms_editor');

    const inSessionChecks = document.getElementById('in_session_checks');
    const minutesInput = document.getElementById('check_frequency_minutes');
    const hoursInput = document.getElementById('check_frequency_hours');

    const minutes = parseInt(minutesInput.value || 0, 10);
    const hours = parseInt(hoursInput.value || 0, 10);

    if (inSessionChecks.checked) {
        if (isNaN(minutes) || minutes < 1 || minutes > 60) {
            displayValidationMessage('Check Frequency minutes must be between 1 and 60', false);
            document.querySelector('.tab[data-target="tab4"]').click();
            minutesInput.focus();
            removeDisabledSaveBtns();
            return;
        }

        if (isNaN(hours) || hours < 0) {
            displayValidationMessage('Check Frequency hours cannot be negative', false);
            document.querySelector('.tab[data-target="tab4"]').click();
            hoursInput.focus();
            removeDisabledSaveBtns();
            return;
        }
    }

    const pickerChecks = document.querySelectorAll('#badgePickerGrid .badge-toggle');
    if (pickerChecks.length > 0) {
        const chosen = [...pickerChecks]
        .filter(el => el.checked)
        .map(el => el.dataset.slug);
        document.getElementById('selected_badges').value = JSON.stringify(chosen);
    }

    form.submit();
}

const catalog = JSON.parse(document.getElementById('badge-catalog-json').textContent);
const enabledFromServer = JSON.parse(document.getElementById('enabled-slugs-json').textContent || '[]');
const selectedHidden = document.getElementById('selected_badges');

// --- helpers: read/write the selection from the hidden field (single source of truth) ---
function getSelectedSlugsSet() {
  try { return new Set(JSON.parse(selectedHidden.value || '[]')); }
  catch { return new Set(); }
}
function setSelectedSlugs(slugsArray) {
  selectedHidden.value = JSON.stringify(slugsArray);
}

// --- render the inline “enabled badges” chip list from the current hidden value ---
function renderEnabledList() {
    const list = document.getElementById('enabledBadgeList');
    const selected = getSelectedSlugsSet();
    list.innerHTML = '';
    if (selected.size === 0) {
        list.innerHTML = `<div class="custom-list-options-container" style="width: 100%; margin-top: 0;">
            <div class="custom-list-option">
                <span class="no-disapprovals"> No badges selected yet. </span>
            </div>
        </div>`;
        return;
    }
    const learning_credits_icon = JSON.parse(
        document.getElementById('learning-credits-icon').textContent
        );
    const bySlug = Object.fromEntries(catalog.map(c => [c.slug, c]));
    selected.forEach(slug => {
        const item = bySlug[slug];
        if (!item) return;
        const credits = (item?.criteria?.reward?.credits ?? 0);
        const chip = document.createElement('div');
        chip.className = 'badge-chip';
        chip.innerHTML = `
            <div class="badge-credits-total pastel-purple">
                ${
                learning_credits_icon
                    ? `<img src="${learning_credits_icon}" alt="Credits Icon" class="credits-icon">`
                    : `<img src="/static/images/gamification/credits/LMS_Credit.png" alt="Credits Icon" class="credits-icon">`
                }
                <span>${credits}</span>
            </div>
            <div class="badge-icon">
                <img src="${'/static/' + item.icon_static}" alt="Badge Icon">
            </div>
            <div class="badge-chip-text">
                <div class="name">${item.name}</div>
                <div class="desc">${item.description}</div>
            </div>
            `;
        list.appendChild(chip);
    });
}

// --- render the popup picker based on the current hidden value (NOT the initial server set) ---
function renderPicker() {
    const grid = document.getElementById('badgePickerGrid');
    const current = getSelectedSlugsSet(); // ← live selection
    const learning_credits_icon = JSON.parse(
        document.getElementById('learning-credits-icon').textContent
    );
    grid.innerHTML = '';
    catalog.forEach(item => {
        const checked = current.has(item.slug);
        const el = document.createElement('label');
        const credits = (item?.criteria?.reward?.credits ?? 0);
        el.className = 'badge-chip select-badge-chip container';
        el.innerHTML = `
        <input class="badge-toggle"
         type="checkbox"
         id="badge-${item.slug}"
         name="${item.slug}"
         data-slug="${item.slug}"
         ${checked ? 'checked' : ''}><div class="checkmark" aria-hidden="true"></div>
        <div class="badge-credits-total pastel-purple">
            ${
            learning_credits_icon
                ? `<img src="${learning_credits_icon}" alt="Credits Icon" class="credits-icon">`
                : `<img class="credits-icon" src="/static/images/gamification/credits/LMS_Credit.png" alt="Credits Icon">`
            }
            <span>${credits}</span>
        </div>
        <div class="badge-icon">
            <img src="${'/static/' + item.icon_static}" alt="Badge Icon">
        </div>
        <div class="badge-chip-text">
            <div class="name">${item.name}</div>
            <div class="desc">${item.description}</div>
        </div>
    `;
    grid.appendChild(el);
  });
}

// Called by your popup open hook
window.renderBadges = (id) => {
    console.log(id);
    if (id === 'selectBadgeOptions') {
      renderPicker();
    }
};

window.selectBadgeOptions = () => {
    const chosen = [...document.querySelectorAll('#badgePickerGrid .badge-toggle:checked')].map(el => el.dataset.slug);
    setSelectedSlugs(chosen);
    renderEnabledList();
    closePopup('selectBadgeOptions');
};

function testEditField(){
    const editIdPhotoName = document.getElementById('editIdPhotoName');
    const editAllowedIdPhotoBtn = document.getElementById('editAllowedIdPhotoBtn');
    editIdPhotoName.addEventListener('input', () => {
        if(editIdPhotoName.value.length > 0 ){
            editAllowedIdPhotoBtn.removeAttribute('disabled', true);
            editAllowedIdPhotoBtn.classList.remove('disabled');
        }else{
            editAllowedIdPhotoBtn.setAttribute('disabled', true);
            editAllowedIdPhotoBtn.classList.add('disabled');
        }
    })
}

if (!(selectedHidden.value && selectedHidden.value.length > 2)) {
    setSelectedSlugs(enabledFromServer);
}
renderEnabledList();

function createAllowedIdPhoto() {
    const name = document.getElementById('newIdPhotoName');

    fetch('/admin/settings/create-allowed-id/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({name: name.value})
    })
    .then(response => response.json())
    .then(data => {
        if (data.id) {
            name.value = '';
            getAllowedPhotos();
            closePopup('createAllowedId');
            showRealTimeAlert(true, 'success', 'Created successfully')
        } else {
            showRealTimeAlert(false, 'error', data.error)
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function getAllowedPhotos() {
    fetch('/admin/settings/get-allowed-ids/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        const container = document.querySelector('#identificationPhotos');
        container.innerHTML = '';
        if (Array.isArray(data) && data.length > 0) {
            data.forEach(photoId => {
                container.innerHTML += createphotoIdHTML(photoId);
            });
            initiateEditIdPhoto();
            initiateDeleteIdPhoto();
        } else if (Array.isArray(data) && data.length === 0) {
            handleNoIdPhoto();
        } else {
            console.error('Expected an array of photoIds, but got:', data);
        }
    })
    .catch(error => console.error('Error:', error));
}

function handleNoIdPhoto() {
    const container = document.querySelector('#identificationPhotos');
    container.innerHTML = `
    <div class="custom-list-option">
        <span class="no-disapprovals"> No disapproval reasonings available. </span>
    </div>`;
}

function createphotoIdHTML(photoId) {
    return `
        <div class="custom-list-option">
            <div class="custom-list-option-left">
                <span>${photoId.name}</span>
            </div>
            <div class="custom-list-option-right">
                <div class="class-action-icon edit-icon tooltip" data-id="${photoId.id}" data-name="${photoId.name}" data-tooltip="Edit">
                    <i class="fa-regular fa-pen"></i>
                    <span class="tooltiptext">Edit</span>
                </div>
                <div class="class-action-icon custom-list-option-delete delete-icon tooltip" data-id="${photoId.id}" data-tooltip="Delete">
                    <i class="fa-regular fa-trash-can"></i>
                    <span class="tooltiptext">Delete</span>
                </div>
            </div>
        </div>`;
}

function initiateDeleteIdPhoto(){
    document.querySelectorAll('.delete-icon').forEach(item => {
        item.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            fetch('/admin/settings/delete-allowed-ids/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: `id=${id}`
            })
            .then(response => response.json())
            .then(data => {
                getAllowedPhotos();
                showRealTimeAlert(true, 'success', 'Deleted successfully')
            })
            .catch(error => showRealTimeAlert(false, 'error', error));
        });
    });
}

function initiateEditIdPhoto(){
    document.querySelectorAll('.edit-icon').forEach(item => {
        item.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');

            const editNameInput = document.getElementById('editIdPhotoName');

            editNameInput.setAttribute('data-id', id);
            editNameInput.value = name;

            openPopup('editAllowedId');
        });
    });
}

function updateIdPhoto() {
    const nameInput = document.getElementById('editIdPhotoName');

    const id = nameInput.getAttribute('data-id');
    const name = nameInput.value;

    fetch('/admin/settings/edit-allowed-ids/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: `id=${id}&name=${name}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            closePopup('editAllowedId');
            getAllowedPhotos();
            showRealTimeAlert(true, 'success', 'Updated successfully')
        } else {
            alert('Error: ' + data.msg);
        }
    })
    .catch(error => console.error('Error:', error));
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

function showRealTimeAlert(isSuccess, tags, message){
    const realTimeAlert = document.getElementById('realTimeAlert');
    let icon;
    if(isSuccess){icon = '<i class="fa-solid fa-circle-check"></i>';}else{icon = '<i class="fa-solid fa-circle-x"></i>';}
    realTimeAlert.innerHTML = `
        <div class="alert alert-${tags}">
            ${icon}
            ${message}
        </div>
    `
    realTimeAlert.classList.remove('hidden');
    setTimeout(() => {
        realTimeAlert.classList.add('animate-alert-container');
    }, 200);
    setTimeout(() => {
        realTimeAlert.classList.remove('animate-alert-container');
    }, 10000);
}

function getEditorContent(editorId) {
    const quillEditor = new Quill(`#${editorId}`);
    return quillEditor.root.innerHTML;
}