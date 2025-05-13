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

    if (portal_favicon) {
        portal_favicon.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const fileName = file.name;
                document.getElementById('faviconImageDisplay').textContent = fileName;

                const reader = new FileReader();
                reader.onload = function(e) {
                    faviconPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                document.getElementById('faviconImageDisplay').textContent = 'No file selected';
                faviconPreview.src = '';
            }
        });
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

function submitSettingsForm(){
    document.getElementById('terms_and_conditions_text').value = getEditorContent('terms_editor');
    console.log(getEditorContent('terms_editor'));
    form.submit();
}

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
                    <i class="fa-regular fa-trash"></i>
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