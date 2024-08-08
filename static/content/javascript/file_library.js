document.addEventListener("DOMContentLoaded", function () {
    /* Select Table Options */
    const tableOptions = document.querySelectorAll('.table-select-option');

    tableOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');

            if (radio) {
                // Uncheck all radios in the same group
                const groupName = radio.name;
                const allRadiosInGroup = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
                
                allRadiosInGroup.forEach(radioInGroup => {
                    radioInGroup.checked = false;
                    radioInGroup.closest('.table-select-option').classList.remove('selected-option');
                });

                // Check the clicked radio
                radio.checked = true;
                option.classList.add('selected-option');
            }

            countSelectedOptions();
        });
    });

    function countSelectedOptions() {
        const selectedOptions = document.querySelectorAll('.table-select-option input[type="radio"]:checked');
        const selectedOptionsList = Array.from(selectedOptions).map(radio => radio.closest('.table-select-option'));

        const selectFileBtn = document.getElementById('selectFileBtn');
        if(selectedOptionsList.length >= 1){
            selectFileBtn.classList.remove('disabled');
            selectFileBtn.removeAttribute('disabled', true);
        }else{
            selectFileBtn.classList.add('disabled');
            selectFileBtn.setAttribute('disabled', true);
        }
    }
});

function openFileUpload(){
    // Hide File Library 
    const fileLibrary = document.getElementById('fileLibrary');
    const popupContent = fileLibrary.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    fileLibrary.style.display = "none";
    // Show File Upload
    const fileUpload = document.getElementById('fileUpload');
    const popupContent2 = fileUpload.querySelector('.popup-content');
    fileUpload.style.display = "flex";
    setTimeout(() => {
        popupContent2.classList.add('animate-popup-content');
    }, 100);
}

function closeFileUpload(){
    // Hide File Upload 
    const fileUpload = document.getElementById('fileUpload');
    const popupContent = fileUpload.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    fileUpload.style.display = "none";
    // Show File Library
    const fileLibrary = document.getElementById('fileLibrary');
    const popupContent2 = fileLibrary.querySelector('.popup-content');
    fileLibrary.style.display = "flex";
    setTimeout(() => {
        popupContent2.classList.add('animate-popup-content');
    }, 100);
}

document.getElementById('fileInput').addEventListener('change', function(event) {
    const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
    document.getElementById('fileNameDisplay').textContent = fileName;
    const fileUploadSubmit = document.getElementById('fileUploadSubmit');
    fileUploadSubmit.classList.remove('disabled');
    fileUploadSubmit.removeAttribute('disabled', true);
});

document.getElementById('fileUploadForm').addEventListener('submit', function(event) {
    const fileUploadSubmit = document.getElementById('fileUploadSubmit');
    fileUploadSubmit.classList.add('disabled');
    fileUploadSubmit.setAttribute('disabled', true);
    event.preventDefault();

    const fileInput = document.getElementById('fileInput');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/requests/file-upload/', true);
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));

    xhr.onload = function() {
        if (xhr.status === 200) {
            // Parse the JSON response from the server
            const response = JSON.parse(xhr.responseText);

            if (response.success) {
                // Construct a new row with the file data returned from the server
                const newFileRow = `
                    <tr class="table-select-option">
                        <td>
                            <label class="custom-radio">
                                <input type="radio" name="file_library_select">
                                <span class="custom-radio-button"></span>
                            </label>
                        </td>
                        <td>${response.file.title}</td>
                        <td>PDF</td>                   
                        <td>${response.file.uploaded_at}</td>
                    </tr>
                `;
                
                // Add the new row to the file list table
                document.getElementById('fileList').insertAdjacentHTML('beforeBegin', newFileRow);
                assignTableOptionListeners();
                console.log('File uploaded successfully');
            } else {
                console.error('Failed to upload file:', response.error);
            }
        } else {
            console.error('File upload failed');
        }
    };

    closeFileUpload();
    xhr.send(formData);
    fileUploadSubmit.classList.remove('disabled');
    fileUploadSubmit.removeAttribute('disabled', true);
    countSelectedOptions();
});

// Function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function assignTableOptionListeners() {
    const tableOptions = document.querySelectorAll('.table-select-option');

    tableOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');

            if (radio) {
                // Uncheck all radios in the same group
                const groupName = radio.name;
                const allRadiosInGroup = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
                
                allRadiosInGroup.forEach(radioInGroup => {
                    radioInGroup.checked = false;
                    radioInGroup.closest('.table-select-option').classList.remove('selected-option');
                });

                // Check the clicked radio
                radio.checked = true;
                option.classList.add('selected-option');
            }

            countSelectedOptions();
        });
    });
}