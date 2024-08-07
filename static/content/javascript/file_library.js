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
    setTimeout(() => {
        fileLibrary.style.display = "none";
    }, 200);
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
    setTimeout(() => {
        fileUpload.style.display = "none";
    }, 200);
    // Show File Library
    const fileLibrary = document.getElementById('fileLibrary');
    const popupContent2 = fileLibrary.querySelector('.popup-content');
    fileLibrary.style.display = "flex";
    setTimeout(() => {
        popupContent2.classList.add('animate-popup-content');
    }, 100);
}

document.getElementById('fileUploadForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    const fileInput = document.getElementById('fileInput');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/file-upload/', true); // Change '/upload/' to your view's URL
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken')); // Add CSRF token for Django

    xhr.onload = function() {
        if (xhr.status === 200) {
            console.log('File uploaded successfully');
        } else {
            console.error('File upload failed');
        }
    };

    xhr.send(formData);
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