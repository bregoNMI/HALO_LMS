// document.addEventListener("DOMContentLoaded", function () {
//     /* Select Table Options */
//     const tableOptions = document.querySelectorAll('.table-select-option');
//     console.log(tableOptions);

//     tableOptions.forEach(option => {
//         option.addEventListener('click', function() {
//             const radio = this.querySelector('input[type="radio"]');

//             if (radio) {
//                 // Uncheck all radios in the same group
//                 const groupName = radio.name;
//                 const allRadiosInGroup = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);

//                 allRadiosInGroup.forEach(radioInGroup => {
//                     radioInGroup.checked = false;
//                     radioInGroup.closest('.table-select-option').classList.remove('selected-option');
//                 });

//                 // Check the clicked radio
//                 radio.checked = true;
//                 option.classList.add('selected-option');
//                 console.log(option);
//             }

//             countSelectedOptions();
//         });
//     });

//     function countSelectedOptions() {
//         const selectedOptions = document.querySelectorAll('.table-select-option input[type="radio"]:checked');
//         const selectedOptionsList = Array.from(selectedOptions).map(radio => radio.closest('.table-select-option'));
//         if(selectedOptionsList[0].classList.contains('folder-card')){
//             console.log('folder');
//         }else if(selectedOptionsList[0].classList.contains('file-card')){
//             console.log('file');
//         }
//         console.log(selectedOptionsList);

//         const selectFileBtn = document.getElementById('selectFileBtn');
//         if(selectedOptionsList.length >= 1){
//             selectFileBtn.classList.remove('disabled');
//             selectFileBtn.removeAttribute('disabled', true);
//         }else{
//             selectFileBtn.classList.add('disabled');
//             selectFileBtn.setAttribute('disabled', true);
//         }
//     }
// });

// Function to check if the URL points to an image
function isImage(url) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const extension = url.split('.').pop().toLowerCase();
    return imageExtensions.includes(extension);
}

// Function to check if the URL points to a PDF
function isPDF(url) {
    const imageExtensions = ['pdf'];
    const extension = url.split('.').pop().toLowerCase();
    return imageExtensions.includes(extension);
}

// Selecting a file to be updated into a lesson
function selectFile(popupId, referenceId = null, assignmentId = null) {
    const selectedOption = document.querySelector('.table-select-option input[type="radio"]:checked');

    if (selectedOption) {
        const selectedRow = selectedOption.closest('.table-select-option');
        const selectedFileURL = selectedRow.getAttribute('data-file-url');
        const selectedFileTitle = selectedRow.querySelector('.real-file-title').value;
        const selectedFileType = selectedRow.querySelector('.real-file-type').value;

        console.log('selectedFileURL:', selectedFileURL);

        if (popupId === 'editLesson') {
            const editFileURLInput = document.getElementById('editFileURLInput');
            const editLessonFileDisplay = document.getElementById('editLessonFileDisplay');
            editFileURLInput.value = selectedFileURL;
            editLessonFileDisplay.innerText = selectedFileTitle;
            closeFileLibrary('editLesson');
        } else if (popupId === 'certificateSource') {
            const certificateURLInput = document.getElementById('certificateURLInput');
            const certificateSourceDisplay = document.getElementById('certificateSourceDisplay');
            if (isPDF(selectedFileURL)) {
                certificateURLInput.value = selectedFileURL;
                certificateSourceDisplay.innerText = selectedFileTitle;
                closePopup('fileLibrary');
            } else {
                displayMessage('Please Select a PDF for Certificate Source', false);
            }
        } else if (popupId === 'thumbnail') {
            const ThumbnailImagePreview = document.getElementById('ThumbnailImagePreview');
            if (isImage(selectedFileURL)) {
                ThumbnailImagePreview.src = selectedFileURL;
                imagePreview.style.display = "flex";
                thumbnailDelete.style.display = "flex";
                closePopup('fileLibrary');
            } else {
                displayMessage('Please Select an Image for Course Thumbnail', false);
            }
        }else if(popupId === 'dashboardHeader'){
            // Dashboard Banner Image
            const dashboardURLInput = document.getElementById('dashboardURLInput');
            const dashboardSourceDisplay = document.getElementById('headerEditBackgroundImageDisplay');
            if (isImage(selectedFileURL)) {
                dashboardURLInput.value = selectedFileURL;
                dashboardSourceDisplay.innerText = selectedFileTitle;
                closePopup('fileLibrary');
            } else {
                displayMessage('Please Select an Image for Banner', false);
            }
        }else if(popupId === 'loginLogo'){
            // Login page logo Image
            const loginLogoURLInput = document.getElementById('loginLogoURLInput');
            const loginLogoSourceDisplay = document.getElementById('loginLogoImageDisplay');
            const loginLogoPreview = document.getElementById('loginLogoPreview');
            if (isImage(selectedFileURL)) {
                loginLogoURLInput.value = selectedFileURL;
                loginLogoSourceDisplay.innerText = selectedFileTitle;
                loginLogoPreview.src = selectedFileURL;
                closePopup('fileLibrary');
            } else {
                displayMessage('Please Select an Image for your Logo', false);
            }
        } else if(popupId === 'loginBackground'){
            // Login page background Image
            const loginBackgroundURLInput = document.getElementById('loginBackgroundURLInput');
            const loginBackgroundImageDisplay = document.getElementById('loginBackgroundImageDisplay');
            const loginBackgroundPreview = document.getElementById('loginBackgroundPreview');
            if (isImage(selectedFileURL)) {
                loginBackgroundURLInput.value = selectedFileURL;
                loginBackgroundImageDisplay.innerText = selectedFileTitle;
                loginBackgroundPreview.src = selectedFileURL;
                loginBackgroundPreview.removeAttribute('hidden', true);
                closePopup('fileLibrary');
            } else {
                displayMessage('Please Select an Image for your Background Image', false);
            }
        }else if(popupId === 'formBackground'){
            // Login form background Image
            const formBackgroundURLInput = document.getElementById('formBackgroundURLInput');
            const formBackgroundImageDisplay = document.getElementById('formBackgroundImageDisplay');
            const formBackgroundPreview = document.getElementById('formBackgroundPreview');
            if (isImage(selectedFileURL)) {
                formBackgroundURLInput.value = selectedFileURL;
                formBackgroundImageDisplay.innerText = selectedFileTitle;
                formBackgroundPreview.src = selectedFileURL;
                formBackgroundPreview.removeAttribute('hidden', true);
                // Showing the option to delete the image
                document.getElementById('formBackgroundPreviewDelete').style.display = 'flex';
                closePopup('fileLibrary');
            } else {
                displayMessage('Please Select an Image for your Background Image', false);
            }
        } else if (popupId === 'referenceSource' && referenceId !== null) {
            const referenceURLInput = document.querySelector(`#referenceURLInput-${referenceId}`);
            const referenceTypeInput = document.querySelector(`#referenceTypeInput-${referenceId}`);
            const referenceSourceDisplay = document.querySelector(`#referenceSourceDisplay-${referenceId}`);
            referenceURLInput.value = selectedFileURL;
            referenceTypeInput.value = selectedFileType;
            referenceSourceDisplay.innerText = selectedFileTitle;
            closePopup('fileLibrary');
        } else if(popupId === 'assignmentSource' && assignmentId !== null){
            const assignmentURLInput = document.querySelector(`#assignmentURLInput-${assignmentId}`);
            const assignmentTypeInput = document.querySelector(`#assignmentTypeInput-${assignmentId}`);
            const assignmentSourceDisplay = document.querySelector(`#assignmentSourceDisplay-${assignmentId}`);
            console.log('assignmentSourceDisplay:', assignmentSourceDisplay, 'assignmentId:', assignmentId);
            assignmentURLInput.value = selectedFileURL;
            assignmentTypeInput.value = selectedFileType;
            assignmentSourceDisplay.innerText = selectedFileTitle;
            closePopup('fileLibrary');
        }else if(popupId === 'header_logo'){
            // Header Image
            const header_logo = document.getElementById('header_logo');
            const header_logoDisplay = document.getElementById('header_logoDisplay');
            if (isImage(selectedFileURL)) {
                header_logo.value = selectedFileURL;
                header_logoDisplay.value = selectedFileTitle;
                document.getElementById('header_logo_name_display').innerText = selectedFileTitle;
                document.getElementById('logoImagePreview').src = selectedFileURL;
                document.querySelector('.logo-image-preview').style.display = 'block';
                openLibraryPopup("editHeaderPopup");
            } else {
                displayMessage('Please Select an Image for Header Logo', false);
            }
        }else if(popupId === 'quizQuestionMedia'){
            // Quiz Question Media
            displayMediaThumbnail(selectedFileURL, 'library', {
                file_name: selectedFileTitle,
                title: selectedFileTitle,
                url_from_library: selectedFileURL,
                type_from_library: selectedFileType
            });
            closePopup('fileLibrary');
        }else if(popupId === 'quizReferences'){
            if (isImage(selectedFileURL) || isPDF(selectedFileURL)) {
                // Quiz References
                displayReferenceItem(selectedFileURL, {
                    id: null,  // Optional: set if needed
                    name: selectedFileTitle,
                    url_from_library: selectedFileURL,
                    type_from_library: selectedFileType,
                    source_type: 'library'
                });
                closePopup('fileLibrary');
            }else{
                displayMessage('Please Select an Image or PDF for Quiz Reference', false);
            }
        }else {
            const fileURLInput = document.getElementById('fileURLInput');
            const lessonFileDisplay = document.getElementById('lessonFileDisplay');
            fileURLInput.value = selectedFileURL;
            lessonFileDisplay.innerText = selectedFileTitle;
            checkLessonFileFields();
            closeFileLibrary();
        }

        console.log('Selected File URL:', selectedFileURL);
        console.log('Selected File Title:', selectedFileTitle);
        console.log('Selected File Type:', selectedFileType);
    } else {
        console.log('No file selected');
    }
}

function openFileUpload(){
    // Hide File Library
    // const fileLibrary = document.getElementById('fileLibrary');
    // const popupContent = fileLibrary.querySelector('.popup-content');
    // popupContent.classList.remove('animate-popup-content');
    // fileLibrary.style.display = "none";
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
    // const fileLibrary = document.getElementById('fileLibrary');
    // const popupContent2 = fileLibrary.querySelector('.popup-content');
    // fileLibrary.style.display = "flex";
    // setTimeout(() => {
    //     popupContent2.classList.add('animate-popup-content');
    // }, 100);
}

function openFileLibrary(popupId, referenceId = null, assignmentId = null) {
    const closeFileLibraryBtn = document.getElementById('closeFileLibraryBtn');
    const closeFileLibrary = document.getElementById('closeFileLibrary');
    const selectedFileDestination = document.getElementById('selectedFileDestination');
    const fileDestination = document.getElementById('fileDestination');

    selectedFileDestination.style.display = 'flex';
    document.getElementById('selectFileBtn').setAttribute('onclick', '');
    // uncheckLibraryFilters();

    if (popupId === 'editLesson') {
        closeFileLibraryBtn.setAttribute('onclick', 'closeFileLibrary("editLesson")');
        closeFileLibrary.setAttribute('onclick', 'closeFileLibrary("editLesson")');
        const lessonEditPopup = document.getElementById('editLesson');
        const popupContent = lessonEditPopup.querySelector('.popup-content');
        popupContent.classList.remove('animate-popup-content');
        lessonEditPopup.style.display = "none";
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("editLesson")');
        fileDestination.innerText = 'Lesson File';
    } else if (popupId === 'certificateSource') {
        checkPDFFilterCheckbox();

        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("certificateSource")');
        fileDestination.innerText = 'Certificate Source';
    } else if (popupId === 'thumbnail') {
        checkImageFilterCheckbox();

        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("thumbnail")');
        fileDestination.innerText = 'Course Thumbnail';
    } else if (popupId === 'referenceSource' && referenceId !== null) {
        uncheckLibraryFilters();
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', `selectFile("referenceSource", "${referenceId}")`);
        fileDestination.innerText = 'Reference Source';
    } else if(popupId === 'assignmentSource' && assignmentId !== null){
        uncheckLibraryFilters();
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', `selectFile("assignmentSource", "", "${assignmentId}")`);
        fileDestination.innerText = 'Assignment Source';
    } else if (popupId === 'dashboardHeader') {
        checkImageFilterCheckbox();

        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("dashboardHeader")');
        fileDestination.innerText = 'Banner Image';
    }else if(popupId === 'loginLogo'){
        checkImageFilterCheckbox();

        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("loginLogo")');
        fileDestination.innerText = 'Login Portal Logo';
    } else if(popupId === 'loginBackground'){
        checkImageFilterCheckbox();

        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("loginBackground")');
        fileDestination.innerText = 'Login Portal Background';
    }else if(popupId === 'formBackground'){
        checkImageFilterCheckbox();

        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("formBackground")');
        fileDestination.innerText = 'Login Form Background';
    }else if(popupId === 'header_logo'){
        closeLibraryPopup('editHeaderPopup');
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary"), openLibraryPopup("editHeaderPopup")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary"), openLibraryPopup("editHeaderPopup")');
        document.getElementById('selectFileBtn').setAttribute('onclick', `selectFile("header_logo", "${referenceId}")`);
        document.getElementById('editHeaderPopup').style.display = 'none';
        fileDestination.innerText = 'Header Logo';
    }else if(popupId === 'quizQuestionMedia'){
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("quizQuestionMedia")');
        fileDestination.innerText = 'Question Media';
    }else if(popupId === 'quizReferences'){
        checkImageFilterCheckbox();
        checkPDFFilterCheckbox();

        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("quizReferences")');
        fileDestination.innerText = 'Quiz References';
    }else{
        closeFileLibraryBtn.setAttribute('onclick', 'closeFileLibrary()');
        closeFileLibrary.setAttribute('onclick', 'closeFileLibrary()');
        const lessonCreationPopup = document.getElementById('lessonCreationPopup');
        const popupContent = lessonCreationPopup.querySelector('.popup-content');
        popupContent.classList.remove('animate-popup-content');
        lessonCreationPopup.style.display = "none";
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile()');
        fileDestination.innerText = 'Lesson File';
    }

    const fileLibrary = document.getElementById('fileLibrary');
    const popupContent2 = fileLibrary.querySelector('.popup-content');
    fileLibrary.style.display = "flex";
    setTimeout(() => {
        popupContent2.classList.add('animate-popup-content');
    }, 100);

    // Apply saved layout from localStorage and this is also initial fetch
    if (currentLayout === 'grid') {
        switchTableLayout('gridLayout');
    } else {
        switchTableLayout('listLayout');
    }
}

function checkPDFFilterCheckbox(){
    const checkbox = document.querySelector('.container .filter[data-type="pdf"]');
    if (checkbox && !checkbox.checked) {
        const container = checkbox.closest('.container');
        if (container) {
            container.click();
        }
    }
}

function checkImageFilterCheckbox(){
    const checkbox = document.querySelector('.container .filter[data-type="image"]');
    if (checkbox && !checkbox.checked) {
        const container = checkbox.closest('.container');
        if (container) {
            container.click();
        }
    }
}

function uncheckLibraryFilters(){
    const checkbox = document.querySelectorAll('.container .filter');

    checkbox.forEach(item => {
        if (item && item.checked) {
            const container = item.closest('.container');
            if (container) {
                container.click();
            }
        }
    })
}

function closeFileLibrary(popupId){
    if(popupId == 'editLesson'){
        // Show Lesson Edit
        const lessonEditPopup = document.getElementById('editLesson');
        const popupContent = lessonEditPopup.querySelector('.popup-content');
        lessonEditPopup.style.display = "flex";
        setTimeout(() => {
            popupContent.classList.add('animate-popup-content');
        }, 100);
    }else{
        // Show Lesson Creation
        const lessonCreationPopup = document.getElementById('lessonCreationPopup');
        const popupContent2 = lessonCreationPopup.querySelector('.popup-content');
        lessonCreationPopup.style.display = "flex";
        setTimeout(() => {
            popupContent2.classList.add('animate-popup-content');
        }, 100);
    }
    // Hide File Library
    const fileLibrary = document.getElementById('fileLibrary');
    const popupContent = fileLibrary.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    fileLibrary.style.display = "none";
}

const dropzone = document.getElementById('fileLibraryDropzone');
const dropzoneText = document.getElementById('dropzoneText');
const dropzoneIcon = document.getElementById('dropzoneIcon');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const fileUploadSubmit = document.getElementById('fileUploadSubmit');

function handleFileReady() {
    const fileDisplayContainer = document.getElementById('fileDisplayContainer');
    fileDisplayContainer.innerHTML = ''; // Clear previous content
    fileDisplayContainer.classList.add('show-assignment-upload-file');

    const file = fileInput.files[0];
    if (file) {
        // Enable the upload button
        fileUploadSubmit.disabled = false;
        fileUploadSubmit.classList.remove('disabled');

        const fileType = getFileTypeFromName(file.name);
        const previewURL = URL.createObjectURL(file);
        const fileIcon = getFileTypeIcon(fileType, previewURL);

        const fileDisplay = document.createElement('div');
        fileDisplay.classList.add('uploaded-file-preview');
        fileDisplay.innerHTML = `
            <div class="file-preview-left">
                <span class="file-icon">${fileIcon}</span>
                <span id="liveFileNamePreview" class="file-name">${
                    (() => {
                        const customName = fileName.value.trim();
                        const originalExt = file.name.split('.').pop().toLowerCase();
                        const hasExt = new RegExp(`\\.${originalExt}$`, 'i').test(customName);
                        return customName !== ''
                            ? hasExt
                                ? customName
                                : `${customName}.${originalExt}`
                            : file.name;
                    })()
                }</span>
            </div>
            <div class="file-preview-right">
                <button type="button" class="remove-file-btn tooltip" aria-label="Remove File">
                    <i class="fa-light fa-trash-can"></i>
                    <span class="tooltiptext"> Remove File</span>
                </button>
            </div>
        `;

        // Add the display element to container
        fileDisplayContainer.appendChild(fileDisplay);

        // Handle remove
        const removeBtn = fileDisplay.querySelector('.remove-file-btn');
        removeBtn.addEventListener('click', () => {
            fileInput.value = '';
            fileDisplayContainer.innerHTML = '';
            fileUploadSubmit.disabled = true;
            fileUploadSubmit.classList.add('disabled');
            fileDisplayContainer.classList.remove('show-assignment-upload-file');
        });

        const fileNamePreview = document.getElementById('liveFileNamePreview');

        fileName.addEventListener('input', () => {
            const typedName = fileName.value.trim();
            const originalExt = file.name.split('.').pop();
            const hasExt = new RegExp(`\\.${originalExt}$`, 'i').test(typedName);

            if (typedName !== '') {
                fileNamePreview.textContent = hasExt ? typedName : `${typedName}.${originalExt}`;
            } else {
                fileNamePreview.textContent = file.name;
            }
        });

    } else {
        // No file selected
        fileDisplayContainer.innerHTML = '';
        fileUploadSubmit.disabled = true;
        fileUploadSubmit.classList.add('disabled');
    }
}

function getFileTypeFromName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(extension)) return 'pdf';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'video';
    if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) return 'document';
    return 'default';
}

function getFileTypeIcon(fileType, fileURL) {
    switch (fileType) {
        case 'pdf':
            return '<i class="fa-light fa-file-pdf"></i>';
        case 'audio':
            return '<i class="fa-light fa-volume"></i>';
        case 'image':
            return `<div class="file-image-display"><img src="${fileURL}" alt="Uploaded image preview" loading="lazy"></div>`;
        case 'video':
            return '<i class="fa-light fa-film"></i>';
        case 'document':
            return '<i class="fa-light fa-file-doc"></i>';
        default:
            return '<i class="fa-light fa-file"></i>'; // fallback icon
    }
}

// Handle file selection
fileInput.addEventListener('change', handleFileReady);

// Drag-over highlight
['dragenter', 'dragover'].forEach(event =>
    dropzone.addEventListener(event, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
        dropzoneIcon.className = 'fa-light fa-arrow-down-to-bracket';
        dropzoneText.textContent = 'Drop File';
    })
);

// Remove highlight
['dragleave', 'drop'].forEach(event =>
    dropzone.addEventListener(event, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        dropzoneIcon.className = 'fa-light fa-cloud-arrow-up';
        dropzoneText.innerHTML = 'Drag & drop your file here or <u>click to browse</u>';
    })
);

// Drop file support
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileInput.files = e.dataTransfer.files;
    handleFileReady();
});

const uploadMessageContainer = document.getElementById('upload-message-container');
const uploadMessageInner = document.getElementById('upload-message-inner');

function displayMessage(message, isSuccess) {
    uploadMessageInner.innerHTML = `
        <i class="fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
        <span>${message}</span>
    `;

    uploadMessageContainer.style.display = 'flex';
    setTimeout(() => {
        uploadMessageContainer.className = 'alert-container animate-alert-container';
    }, 100);

    uploadMessageInner.className = isSuccess ? 'alert alert-success' : 'alert alert-error';

    setTimeout(() => {
        uploadMessageContainer.classList.remove('animate-alert-container');
    }, 8000);
}

let currentLayout = localStorage.getItem('fileLibraryLayout') || 'list';
let folderPath = [];
let currentParentFolderId = null;
let selectedFilterCourseIds = [];

document.getElementById('fileUploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    addUploadLoading();

    const fileDisplayContainer = document.getElementById('fileDisplayContainer');
    const fileUploadSubmit = document.getElementById('fileUploadSubmit');
    fileUploadSubmit.classList.add('disabled');
    fileUploadSubmit.setAttribute('disabled', true);

    const removeBtn = fileDisplayContainer.querySelector('.remove-file-btn');
    removeBtn.classList.add('disabled');
    removeBtn.setAttribute('disabled', true);

    const fileName = document.getElementById('fileName');
    const fileInput = document.getElementById('fileInput');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const liveFileNamePreview = document.getElementById('liveFileNamePreview');
    const customTitle = liveFileNamePreview.innerText.trim();
    if (customTitle) {
        formData.append('title', customTitle);
    }

    // Attach parent_id if we're inside a folder
    if (currentParentFolderId) {
        formData.append('parent_id', currentParentFolderId);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/requests/file-upload/', true);
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));

    xhr.onload = function() {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && response.success) {
            displayMessage(response.message, true);
            currentPage = 1;
            // console.log('fetch');
            // fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);
            uncheckLibraryFilters();
        } else {
            const message = response.message || 'Upload failed. Please try again.';
            displayMessage(message, false);
        }

        removeUploadLoading(fileInput, customTitle, fileDisplayContainer, fileName);
    };

    xhr.onerror = function() {
        console.error('File upload failed');
        displayMessage('An unexpected error occurred. Please try again later.', false);
        removeUploadLoading(fileInput, customTitle, fileDisplayContainer, fileName);
    };

    xhr.send(formData);

    assignTableOptionListeners();
    initializeDropdownMenus();
});

// Adding the loading symbol to file upload popup
function addUploadLoading(){
    const loadingSymbols = document.querySelectorAll('.loading-symbol-blue-sm');
    // Showing the loading symbol
    for (const symbol of loadingSymbols) {
        symbol.style.display = 'flex'; // Show each loading symbol
    }
    // Blocking all of the inputs and buttons
    const popupBtns = document.querySelectorAll('.close-popup-btn');
    for (const btn of popupBtns) {
        btn.classList.add('disabled');
        btn.setAttribute('disabled', true);
    }
    const closePopupIcon = document.querySelectorAll('.close-popup-icon');
    for (const btn of closePopupIcon) {
        btn.classList.add('disabled');
        btn.setAttribute('disabled', true);
    }
}

// Removing the loading symbol from file upload popup and others
function removeUploadLoading(fileInput, customFileName, fileDisplayContainer, fileName){
    const loadingSymbols = document.querySelectorAll('.loading-symbol-blue-sm');
    // Showing the loading symbol
    for(const symbol of loadingSymbols){
        symbol.style.display = 'none';
    }

    // Unblocking all of the inputs and buttons
    const popupBtns = document.querySelectorAll('.close-popup-btn');
    for (const btn of popupBtns) {
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
    }
    const closePopupIcon = document.querySelectorAll('.close-popup-icon');
    for (const btn of closePopupIcon) {
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
    }
    closeFileUpload();
    fileInput.value = '';
    customFileName.value = '';
    fileName.value = '';
    fileDisplayContainer.innerHTML = ``;
}

// Debounce function
function debounce(func, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

function loadingResults(){
    const fileListContainer = document.getElementById('fileList');
    fileListContainer.innerHTML = `
    <td style="padding: 0; border-bottom: 0;" colspan="100%">
        <div class="no-results-found">
            <svg viewBox="0 0 240 240" height="240" width="240" class="pl">
                <circle stroke-linecap="round" stroke-dashoffset="-330" stroke-dasharray="0 660" stroke-width="20" stroke="#000" fill="none" r="105" cy="120" cx="120" class="pl__ring pl__ring--a"></circle>
                <circle stroke-linecap="round" stroke-dashoffset="-110" stroke-dasharray="0 220" stroke-width="20" stroke="#000" fill="none" r="35" cy="120" cx="120" class="pl__ring pl__ring--b"></circle>
                <circle stroke-linecap="round" stroke-dasharray="0 440" stroke-width="20" stroke="#000" fill="none" r="70" cy="120" cx="85" class="pl__ring pl__ring--c"></circle>
                <circle stroke-linecap="round" stroke-dasharray="0 440" stroke-width="20" stroke="#000" fill="none" r="70" cy="120" cx="155" class="pl__ring pl__ring--d"></circle>
            </svg>
        </div>
    </td>
    `;
    selectFileBtn.classList.add('disabled');
    selectFileBtn.setAttribute('disabled', true);
    selectFolderBtn.classList.add('disabled');
    selectFolderBtn.setAttribute('disabled', true);
}

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
    const selectFileBtn = document.getElementById('selectFileBtn');
    const selectFolderBtn = document.getElementById('selectFolderBtn');

    selectFileBtn.classList.add('disabled');
    selectFileBtn.setAttribute('disabled', true);
    selectFolderBtn.classList.add('disabled');
    selectFolderBtn.setAttribute('disabled', true);

    const tableOptions = document.querySelectorAll('.table-select-option');

    tableOptions.forEach(option => {
        option.addEventListener('click', function () {
            const radio = this.querySelector('input[type="radio"]');
            if (!radio) return;

            // Clear others in group
            const groupName = radio.name;
            const allRadiosInGroup = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
            allRadiosInGroup.forEach(radioInGroup => {
                radioInGroup.checked = false;
                radioInGroup.closest('.table-select-option').classList.remove('selected-option');
            });

            // Select clicked
            radio.checked = true;
            option.classList.add('selected-option');

            // Now handle buttons
            if (option.classList.contains('folder-card') || option.classList.contains('folder-list')) {
                selectFileBtn.style.display = 'none';
                selectFolderBtn.style.display = 'flex';

                const fileId = option.getAttribute('data-id');
                const fileTitle = option.getAttribute('data-title');

                if (fileId && fileTitle) {
                    selectFolderBtn.classList.remove('disabled');
                    selectFolderBtn.removeAttribute('disabled');

                    // ✅ Assign action with closure values
                    selectFolderBtn.onclick = () => {
                        const parentId = parseInt(fileId, 10);  // ensure ID is a number for comparison
                        folderPath.push({ id: parentId, title: fileTitle });
                        currentParentFolderId = parentId;
                        currentPage = 1;
                        console.log('fetch');
                        fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

                        renderBreadcrumbs();
                        console.log('selectFolderBtn:', 'folderPath:', folderPath);
                    };

                } else {
                    console.warn('❌ Missing data-id or data-title on selected folder.');
                }
            } else if (option.classList.contains('file-card') || option.classList.contains('file-list')) {
                selectFileBtn.style.display = 'flex';
                selectFolderBtn.style.display = 'none';

                selectFileBtn.classList.remove('disabled');
                selectFileBtn.removeAttribute('disabled');

                // Clear folder button
                selectFolderBtn.onclick = null;
            }
        });
    });
}

function countSelectTableOptions() {
    const selectedOptions = document.querySelectorAll('.table-select-option input[type="radio"]:checked');
    const selectedOptionsList = Array.from(selectedOptions).map(radio => radio.closest('.table-select-option'));
    const selectFileBtn = document.getElementById('selectFileBtn');
    const selectFolderBtn = document.getElementById('selectFolderBtn');

    // Reset buttons by default
    selectFileBtn.classList.add('disabled');
    selectFileBtn.setAttribute('disabled', true);
    selectFileBtn.style.display = 'none';

    selectFolderBtn.classList.add('disabled');
    selectFolderBtn.setAttribute('disabled', true);
    selectFolderBtn.style.display = 'none';
    selectFolderBtn.onclick = null;

    if (selectedOptionsList.length === 0) return;

    const selected = selectedOptionsList[0];

    if (selected.classList.contains('folder-card')) {
        selectFolderBtn.style.display = 'flex';
    } else if (selected.classList.contains('file-card')) {
        selectFileBtn.style.display = 'flex';
    }
}

// File, Folder Fetching and rendering + Infinite Scrolling
document.addEventListener('DOMContentLoaded', function() {
    monitorFileLibraryScroll();
    let currentPage = 1;
    let hasNext = true;
    let isLoading = false;
    const selectedFilters = new Set();
    const searchInput = document.querySelector('#librarySearch');
    let layoutJustSwitched = false;
    let isSwitchingLayout = false;
    let layoutInitialized = false;
    let folderMovePath = [];
    let moveItemId = null;
    let moveItemType = null;
    let selectedTargetFolderId = null;

    function loadMoreFiles() {
        if (isLoading || !hasNext || layoutJustSwitched) return;
        isLoading = true;
        console.log('fetch');
        fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

    }

    window.fetchFiles = function(page, layout = currentLayout, parentId = currentParentFolderId, courseIds = null) {
        if (!parentId) {
            folderPath = [];
        } else {
            const matchIndex = folderPath.findIndex(folder => String(folder.id) === String(parentId));
            if (matchIndex !== -1) {
                folderPath = folderPath.slice(0, matchIndex + 1);
            }
        }

        renderBreadcrumbs();

        const filterParams = Array.from(selectedFilters).join(',');
        const searchQuery = searchInput.value;
        const courseParams = courseIds.map(id => `&course_ids[]=${id}`).join('');

        const url = `/requests/file-upload/?filters=${encodeURIComponent(filterParams)}&q=${encodeURIComponent(searchQuery)}&page=${page}&layout=${layout}` +
                    (parentId ? `&parent=${parentId}` : '') +
                    courseParams;

        console.log('page:', page, 'layout:', layout, 'filterParams:', filterParams, 'searchQuery:',searchQuery, 'courseParams:', courseParams, 'courseIds:', courseIds);

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateFileList(data.items, data.layout);
                    hasNext = data.has_next;
                    currentPage = data.has_next ? page + 1 : page;
                } else {
                    console.error('Failed to load files');
                }
                isLoading = false;
            })
            .catch(error => {
                console.error('Error:', error);
                isLoading = false;
            });
    };

    function updateFileList(files, layout) {
        const gridContainer = document.getElementById('fileLibraryGrid');
        const tableContainer = document.getElementById('fileListTable');
        const fileListContainer = layout === 'grid' ? gridContainer : tableContainer;
        if (currentPage === 1) {
            gridContainer.innerHTML = '';
            tableContainer.innerHTML = '';
        }

        assignTableOptionListeners();
        document.querySelector('thead').style.display = 'table-header-group';

        if (files.length === 0 && currentPage === 1) {
            const insideFolder = folderPath.length > 0;

            if (layout === 'grid') {
                fileListContainer.innerHTML = `
                ${insideFolder ? 
                    `<div class="no-results-found-grid">
                        <div class="no-results-found-folder">
                            <div class="dropzone custom-dropzone" id="folderLibraryDropzone">
                                <i class="dropzone-icon fa-light fa-cloud-arrow-up"></i>
                                <p class="dropzone-text">Drag & drop a file here or <u>click to browse</u></p>
                                <input type="file" name="folderFileInput" id="folderFileInput" required hidden>
                            </div>
                        </div>
                    </div>` 
                    : 
                    `<div class="no-results-found-grid">
                        <div style="border-bottom: 0; border-top: 0;" class="no-results-found">
                            <img src="/static/client_admin/Images/HALO%20LMS%20No%20Graphic%20Test-28.png" alt="HALO Graphic">
                            <span>No files found</span>
                        </div>
                    </div>`
                    }`;
            } else if (layout === 'list') {
                fileListContainer.innerHTML = `
                    ${insideFolder ?
                        `
                        <div class="no-results-found-grid">
                            <div class="no-results-found-folder">
                                <div class="dropzone custom-dropzone" id="folderLibraryDropzone">
                                    <i class="dropzone-icon fa-light fa-cloud-arrow-up"></i>
                                    <p class="dropzone-text">Drag & drop a file here or <u>click to browse</u></p>
                                    <input type="file" name="folderFileInput" id="folderFileInput" required hidden>
                                </div>
                            </div>
                        </div>` 
                        : 
                        `<td style="padding: 0; border-bottom: 0; border-top: 0; pointer-events: none;" colspan="100%">
                            <div style="border-bottom: 0;" class="no-results-found">
                                <img src="/static/client_admin/Images/HALO%20LMS%20No%20Graphic%20Test-28.png" alt="HALO Graphic">
                                <span>No files found</span>
                            </div>
                        </td>`
                        }`;
                if(insideFolder){
                    document.querySelector('thead').style.display = 'none';
                }
            }

            initializeListDragAndDrop();
            initializeFileDragAndDrop();
            setupFolderDropzone();
            return;
        }

        files.forEach(file => {
            let item;

            if (file.type === 'folder') {
                // FOLDER DISPLAY
                if (layout === 'grid') {
                    item = document.createElement('div');
                    item.className = 'grid-item file-card folder-card table-select-option';
                    item.setAttribute('data-id', file.id);
                    item.setAttribute('data-title', file.title)
                    item.innerHTML = `
                        <input class="real-file-title" type="hidden" value="${file.title}">
                        <input class="real-file-type" type="hidden" value="folder">
                        <div class="grid-item-top">
                            <label class="custom-radio file-card-radio">
                                <input type="radio" name="file_library_select">
                                <span class="custom-radio-button"></span>
                            </label>
                            <div class="file-card-icon folder-grid-icon"><i class="fa-solid fa-folder"></i></div>
                        </div>
                        <div class="grid-item-bottom">
                            <div class="file-card-title">${file.title}</div>
                            <div class="file-card-footer">Folder • ${file.created_at}</div>
                            <div class="file-options-container quiz-builder-dropdown-container">
                                <div class="fade-overlay"></div>
                                <div class="quiz-builder-dropdown-toggle tooltip" data-tooltip="More">
                                    <span class="tooltiptext">More</span>
                                    <div class="question-editor-action-icon"><i class="fa-solid fa-ellipsis"></i></div>
                                </div>
                                <div class="quiz-builder-dropdown-options width-3">
                                    <div onclick="openRenamePrompt(${file.id}, '${file.title.replace(/'/g, "\\'")}', 'folder')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-input-pipe"></i></div>
                                        <span>Rename</span>
                                    </div>
                                    <div onclick="moveFile(${file.id}, 'folder')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-arrows-up-down-left-right"></i></div>
                                        <span>Move</span>
                                    </div>
                                    <div onclick="openFileDeleteConfirmation(${file.id}, '${file.title}', 'folder')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-trash-can"></i></div>
                                        <span>Delete</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    item = document.createElement('tr');
                    item.className = 'table-select-option folder-row folder-list';
                    item.setAttribute('data-id', file.id);
                    item.setAttribute('data-title', file.title)
                    item.innerHTML = `
                        <input class="real-file-title" type="hidden" value="${file.title}">
                        <input class="real-file-type" type="hidden" value="folder">
                        <td><label class="custom-radio"><input type="radio" name="file_library_select"><span class="custom-radio-button"></span></label></td>
                        <td class="file-title">
                            <div class="file-title-inner">
                                <div class="file-list-icon folder-list-icon"><i class="fa-solid fa-folder"></i></div>
                                <div class="table-ellipsis">${file.title}</div>
                            </div>
                        </td>
                        <td>Folder</td>
                        <td>${file.created_at}</td>
                        <td>
                            <div class="file-options-container quiz-builder-dropdown-container">
                                <div class="fade-overlay"></div>
                                <div class="quiz-builder-dropdown-toggle tooltip" data-tooltip="More">
                                    <span class="tooltiptext">More</span>
                                    <div class="question-editor-action-icon"><i class="fa-solid fa-ellipsis"></i></div>
                                </div>
                                <div class="quiz-builder-dropdown-options width-3">
                                    <div onclick="openRenamePrompt(${file.id}, '${file.title.replace(/'/g, "\\'")}', 'folder')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-input-pipe"></i></div>
                                        <span>Rename</span>
                                    </div>
                                    <div onclick="moveFile(${file.id}, 'folder')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-arrows-up-down-left-right"></i></div>
                                        <span>Move</span>
                                    </div>
                                    <div onclick="openFileDeleteConfirmation(${file.id}, '${file.title}', 'folder')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-trash-can"></i></div>
                                        <span>Delete</span>
                                    </div>
                                </div>
                            </div>
                        </td>
                    `;
                }

                // Double-click to open folder
                item.addEventListener('dblclick', () => {
                    folderPath.push({ id: file.id, title: file.title });
                    currentParentFolderId = file.id;
                    currentPage = 1;
                    fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

                    renderBreadcrumbs();  // ← Important
                    console.log('dbclick:', 'folderPath:', folderPath);
                });

            } else {
                let fileType = getFileTypeFromName(file.title || '');
                let fileIcon = getFileTypeIcon(fileType, file.file_url);

                if (layout === 'grid') {
                    item = document.createElement('div');
                    item.className = 'grid-item file-card table-select-option';
                    item.setAttribute('data-file-url', file.file_url);
                    item.setAttribute('data-id', file.id);
                    item.innerHTML = `
                        <input class="real-file-title" type="hidden" value="${file.title}">
                        <input class="real-file-type" type="hidden" value="${file.file_type}">
                        <div class="grid-item-top">
                            <label class="custom-radio file-card-radio">
                                <input type="radio" name="file_library_select">
                                <span class="custom-radio-button"></span>
                            </label>
                            <div class="file-card-icon">${fileIcon}</div>
                        </div>
                        <div class="grid-item-bottom">
                            <div class="file-card-title">${file.title}</div>
                            <div class="file-card-footer">
                                ${file.file_type.toLowerCase() === 'pdf' ? 'PDF' : file.file_type.charAt(0).toUpperCase() + file.file_type.slice(1)} • ${file.uploaded_at}
                            </div>
                            <div class="file-options-container quiz-builder-dropdown-container">
                                <div class="fade-overlay"></div>
                                <div class="quiz-builder-dropdown-toggle tooltip" data-tooltip="More">
                                    <span class="tooltiptext">More</span>
                                    <div class="question-editor-action-icon"><i class="fa-solid fa-ellipsis"></i></div>
                                </div>
                                <div class="quiz-builder-dropdown-options width-3">
                                    <div class="quiz-builder-type-option" onclick="previewFile('${file.file_url}')">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-eye"></i></div>
                                        <span>Preview</span>
                                    </div>
                                    <div onclick="downloadMedia('${file.file_url}')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-arrow-down-to-bracket"></i></div>
                                        <span>Download</span>
                                    </div>
                                    <div onclick="copyLink('${file.file_url}')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-link"></i></div>
                                        <span>Copy Link</span>
                                    </div>
                                    <div onclick="openRenamePrompt(${file.id}, '${file.title.replace(/'/g, "\\'")}', 'file')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-input-pipe"></i></div>
                                        <span>Rename</span>
                                    </div>
                                    <div onclick="moveFile(${file.id}, 'file')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-arrows-up-down-left-right"></i></div>
                                        <span>Move</span>
                                    </div>
                                    <div onclick="openFileDeleteConfirmation(${file.id}, '${file.title}', 'file')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-trash-can"></i></div>
                                        <span>Delete</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    item = document.createElement('tr');
                    item.className = 'table-select-option file-list';
                    item.setAttribute('data-file-url', file.file_url);
                    item.setAttribute('data-id', file.id);
                    let iconMarkup = fileType === 'image'
                        ? `<div class="file-image-display"><img src="${file.file_url}" alt="Image file" loading="lazy" /></div>`
                        : `<div class="file-list-icon">${fileIcon}</div>`;
                    item.innerHTML = `
                        <input class="real-file-title" type="hidden" value="${file.title}">
                        <input class="real-file-type" type="hidden" value="${file.file_type}">
                        <td><label class="custom-radio"><input type="radio" name="file_library_select"><span class="custom-radio-button"></span></label></td>
                        <td class="file-title"><div class="file-title-inner">${iconMarkup}<div class="table-ellipsis">${file.title}</div></div></td>
                        <td class="file-type">${file.file_type.toLowerCase() === 'pdf' ? 'PDF' : file.file_type.charAt(0).toUpperCase() + file.file_type.slice(1)}</td>
                        <td>${file.uploaded_at}</td>
                        <td>
                            <div class="file-options-container quiz-builder-dropdown-container">
                                <div class="fade-overlay"></div>
                                <div class="quiz-builder-dropdown-toggle tooltip" data-tooltip="More">
                                    <span class="tooltiptext">More</span>
                                    <div class="question-editor-action-icon"><i class="fa-solid fa-ellipsis"></i></div>
                                </div>
                                <div class="quiz-builder-dropdown-options width-3">
                                    <div class="quiz-builder-type-option" onclick="previewFile('${file.file_url}')">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-eye"></i></div>
                                        <span>Preview</span>
                                    </div>
                                    <div onclick="downloadMedia('${file.file_url}')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-arrow-down-to-bracket"></i></div>
                                        <span>Download</span>
                                    </div>
                                    <div onclick="copyLink('${file.file_url}')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-link"></i></div>
                                        <span>Copy Link</span>
                                    </div>
                                    <div onclick="openRenamePrompt(${file.id}, '${file.title.replace(/'/g, "\\'")}')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-input-pipe"></i></div>
                                        <span>Rename</span>
                                    </div>
                                    <div onclick="moveFile(${file.id}, 'file')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-arrows-up-down-left-right"></i></div>
                                        <span>Move</span>
                                    </div>
                                    <div onclick="openFileDeleteConfirmation(${file.id}, '${file.title}')" class="quiz-builder-type-option">
                                        <div class="question-item-icon pastel-gray"><i class="fa-regular fa-trash-can"></i></div>
                                        <span>Delete</span>
                                    </div>
                                </div>
                            </div>
                        </td>
                    `;
                }
            }

            fileListContainer.appendChild(item);
            addCustomDragPreview(item, file.title);
        });

        assignTableOptionListeners();
        initializeDropdownMenus();
        setupFolderDropzone();
        observeCourseCheckboxes();
        initializeFileDragAndDrop();
        initializeListDragAndDrop();
    }

    function addFolderLoadingSymbol(){
        const dropzone = document.getElementById('folderLibraryDropzone');
        dropzone.innerHTML = `
        <div class="loading-symbol-blue-sm" style="display: flex;">
            <svg class="loading-symbol-sm-inner" viewBox="25 25 50 50">
                <circle r="20" cy="50" cx="50"></circle>
            </svg>
            <span>Uploading File, please wait...</span>
        </div>
        `;
    }

    function setupFolderDropzone() {
        const dropzone = document.getElementById('folderLibraryDropzone');
        const fileInput = document.getElementById('folderFileInput');

        // Exit early if essential elements aren't available yet
        if (!dropzone || !fileInput) {
            return;
        }

        const dropzoneText = dropzone.querySelector('.dropzone-text');
        const dropzoneIcon = dropzone.querySelector('.dropzone-icon');

        dropzone.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover'].forEach(event =>
            dropzone.addEventListener(event, e => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
                if (dropzoneIcon) dropzoneIcon.className = 'fa-light fa-arrow-down-to-bracket';
                if (dropzoneText) dropzoneText.textContent = 'Drop File';
            })
        );

        ['dragleave', 'drop'].forEach(event =>
            dropzone.addEventListener(event, e => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                if (dropzoneIcon) dropzoneIcon.className = 'fa-light fa-cloud-arrow-up';
                if (dropzoneText) dropzoneText.innerHTML = 'Drag & drop your file here or <u>click to browse</u>';
            })
        );

        dropzone.addEventListener('drop', e => {
            fileInput.files = e.dataTransfer.files;
            uploadFileToFolder(fileInput.files[0]);
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                uploadFileToFolder(fileInput.files[0]);
            }
        });
    }

    function uploadFileToFolder(file) {
        if (!file) return;
        addFolderLoadingSymbol();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('parent_id', currentParentFolderId); // <- important

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/requests/file-upload/', true);
        xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));

        xhr.onload = function () {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    displayMessage(response.message, true);
                    uncheckLibraryFilters();
                    console.log('fetch');
                    fetchFiles(1, currentLayout, currentParentFolderId, selectedFilterCourseIds);

                } else {
                    displayMessage(response.message, false);
                }
            } else {
                displayMessage('Upload failed. Try again.', false);
            }
        };

        xhr.send(formData);
    }

    function updateFilters(newFilters) {
        selectedFilters.clear();
        newFilters.forEach(filter => selectedFilters.add(filter));
        currentPage = 1; // Reset to page 1
        console.log('fetch');
        fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

    }

    function handleFilterChange() {
        const newFilters = Array.from(document.querySelectorAll('.library-filter-options input[type="checkbox"]:checked'))
            .map(cb => cb.getAttribute('data-type').toLowerCase().trim());

        selectedFilters.clear();
        newFilters.forEach(filter => selectedFilters.add(filter));
        currentPage = 1;
        console.log('fetch');
        fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);
    }

    function handleSearchChange() {
        currentPage = 1; // Reset to page 1
        console.log('fetch');
        fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

    }

    function handleCourseFilterChange() {
        const updatedFilterCourseIds = Array.from(document.querySelectorAll('.course-checkbox:checked'))
            .map(cb => cb.value);
        
        selectedFilterCourseIds = updatedFilterCourseIds;
        currentPage = 1;
        console.log('fetch');
        fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);
    }

    // Setup MutationObserver to detect checkbox state changes
    function observeCourseCheckboxes() {
        document.querySelectorAll('#courseDropdownFileLibrary .course-checkbox').forEach(cb => {
            cb.removeEventListener('change', handleCourseFilterChange);
            cb.addEventListener('change', handleCourseFilterChange);
        });
    }

    function observeSelectedCoursesChanges() {
        localStorage.removeItem('selectedCourseIds');
        const selectedCoursesContainer = document.querySelector('.selectedCourses');
        if (!selectedCoursesContainer) return;

        const observer = new MutationObserver(() => {
            handleCourseFilterChange();  // Re-run the filter if any course selection changes
        });

        observer.observe(selectedCoursesContainer, {
            childList: true,
            subtree: false
        });
    }
    observeSelectedCoursesChanges();

    // Event listeners for filter changes
    document.querySelectorAll('.library-filter-options input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });

    // Event listener for search input
    searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

    }, 500));

    // Intersection Observer to load more files on scroll
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            loadMoreFiles();
        }
    }, { threshold: 1.0 });

    const sentinel = document.getElementById('sentinel');
    if (sentinel) {
        observer.observe(sentinel);
    } else {
        console.error('Sentinel element not found');
    }

    window.previewFile = function(fileUrl) {
        if (!fileUrl) {
            console.warn('No file URL provided for preview.');
            return;
        }

        const viewableTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const lowerUrl = fileUrl.toLowerCase();

        const isViewable = viewableTypes.some(ext => lowerUrl.endsWith(ext));

        if (isViewable) {
            window.open(fileUrl, '_blank');
        } else {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = ''; // Let browser infer filename
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    window.deleteFile = function(fileId, type = 'file') {
        const endpoint = type === 'folder' ? '/requests/folder-delete/' : '/requests/file-delete/';
        const successMessage = type === 'folder' ? 'Folder deleted successfully.' : 'File deleted successfully.';

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ id: fileId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayMessage(successMessage, true);
                currentPage = 1;
                fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

            } else {
                displayMessage(`Failed to delete ${type}: ` + (data.message || 'Unknown error.'), false);
            }
            closePopup('fileDeleteConfirmation');
        })
        .catch(error => {
            console.error('Delete failed:', error);
            displayMessage(`An unexpected error occurred deleting ${type}.`, false);
        });
    }

    window.renameFile = function(fileId, newTitle, type = 'file') {
        const endpoint = type === 'folder' ? '/requests/folder-rename/' : '/requests/file-rename/';
        const successMessage = type === 'folder' ? 'Folder renamed successfully.' : 'File renamed successfully.';

        const fileRenameLoadingSymbol = document.getElementById('fileRenameLoadingSymbol');
        const fileLibraryRenameBtn = document.getElementById('fileLibraryRenameBtn');
        const newFileName = document.getElementById('newFileName');
        newFileName.readonly = true;
        newFileName.classList.add('disabled');
        fileLibraryRenameBtn.classList.add('disabled');
        fileLibraryRenameBtn.disabled = true;
        fileRenameLoadingSymbol.style.display = 'flex';

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ id: fileId, title: newTitle })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayMessage(successMessage, true);
                currentPage = 1;
                fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

            } else {
                displayMessage(`Failed to rename ${type}: ` + (data.message || 'Unknown error.'), false);
            }
            fileRenameLoadingSymbol.style.display = 'none';
            closePopup('fileRename');
        })
        .catch(error => {
            console.error('Rename failed:', error);
            displayMessage(`An unexpected error occurred renaming ${type}.`, false);
            fileRenameLoadingSymbol.style.display = 'none';
            closePopup('fileRename');
        });
    }

    window.switchTableLayout = function(layoutType) {
        const targetLayout = layoutType === 'gridLayout' ? 'grid' : 'list';
        if (currentLayout === targetLayout && layoutInitialized) return;
        if (isSwitchingLayout) return;

        isSwitchingLayout = true;
        layoutJustSwitched = true;
        isLoading = true;

        const fileLibraryTable = document.getElementById('fileLibraryTable');
        const fileLibraryGrid = document.getElementById('fileLibraryGrid');
        const layoutOptions = document.querySelectorAll('.file-library-layout-option');

        // Fade out effect
        fileLibraryTable.classList.add('fade-table-up');
        fileLibraryGrid.classList.add('fade-table-up');
        layoutOptions.forEach(option => option.classList.add('active-layout'));

        setTimeout(() => {
            layoutJustSwitched = false;
            layoutOptions.forEach(option => option.classList.remove('active-layout'));
            document.getElementById(layoutType).classList.add('active-layout');

            currentLayout = targetLayout;
            localStorage.setItem('fileLibraryLayout', currentLayout);

            // Hide/show containers
            fileLibraryTable.style.display = currentLayout === 'list' ? 'table' : 'none';
            fileLibraryGrid.style.display = currentLayout === 'grid' ? 'flex' : 'none';

            // Fetch data
            currentPage = 1;
            fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);


            setTimeout(() => {
                fileLibraryTable.classList.remove('fade-table-up');
                fileLibraryGrid.classList.remove('fade-table-up');
                isSwitchingLayout = false;
                layoutInitialized = true;
                isLoading = false;
            }, 50);
        }, 400);
    };


    window.createFolder = function(title, parentId = null) {
        const formData = new FormData();
        formData.append('title', title);
        if (parentId) {
            formData.append('parent', parentId);
        }

        fetch('/requests/folder-create/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayMessage("Folder created successfully.", true);
                currentPage = 1;
                fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

            } else {
                displayMessage(data.message || "Failed to create folder.", false);
            }
        })
        .catch(err => {
            console.error('Error creating folder:', err);
            displayMessage("Unexpected error creating folder.", false);
        });
    }

    const folderNameInput = document.getElementById('newFolderName');
    const folderCreateBtn = document.getElementById('folderCreateBtn');
    folderNameInput.addEventListener('input', () => {
        const hasValue = folderNameInput.value.trim().length > 0;
        folderCreateBtn.disabled = !hasValue;
        folderCreateBtn.classList.toggle('disabled', !hasValue);
    });

    window.handleCreateFolder = function() {
        const folderName = folderNameInput.value.trim();
        const loadingSymbol = document.getElementById('folderCreateLoadingSymbol');

        if (!folderName) {
            displayMessage("Please enter a folder name.", false);
            return;
        }

        // Show loading indicator
        loadingSymbol.style.display = 'flex';
        folderNameInput.disabled = true;
        folderCreateBtn.disabled = true;
        folderCreateBtn.classList.add('disabled');

        // Optional: pass currentParentFolderId if you’re in a nested folder view
        createFolder(folderName, currentParentFolderId);

        // Close popup and reset input after a small delay (let createFolder fetch first)
        setTimeout(() => {
            closePopup('folderCreate');
            folderNameInput.value = '';
            folderNameInput.disabled = false;
            loadingSymbol.style.display = 'none';
        }, 1000);
    };

    window.renderBreadcrumbs = function() {
        const container = document.getElementById('folderBreadcrumbs');
        const header = document.getElementById('fileLibraryHeader');

        // Clear and reset
        container.innerHTML = '';
        container.style.display = folderPath.length === 0 ? 'none' : 'flex';

        if (folderPath.length === 0) {
            header.textContent = 'All Files';
            return;
        }

        const currentFolder = folderPath[folderPath.length - 1];
        header.innerHTML = `<div class="file-library-header-icon"><i class="fa-solid fa-folder-open"></i><span>${currentFolder.title}</span></div>`;

        // Add "All Files" root crumb
        const rootCrumb = document.createElement('span');
        rootCrumb.className = 'breadcrumb-item';
        rootCrumb.textContent = 'All Files';

        rootCrumb.addEventListener('click', () => {
            currentParentFolderId = null;
            folderPath = [];
            currentPage = 1;
            fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

        });

        addBreadcrumbDropHandlers(rootCrumb, null);

        container.appendChild(rootCrumb);
        if (folderPath.length > 1) {
            container.appendChild(makeSeparator());
        }

        // Add intermediate breadcrumbs
        folderPath.slice(0, -1).forEach((folder, index) => {
            const crumb = document.createElement('span');
            crumb.className = 'breadcrumb-item';
            crumb.textContent = folder.title;

            crumb.addEventListener('click', () => {
                folderPath = folderPath.slice(0, index + 1);
                currentParentFolderId = folder.id;
                currentPage = 1;
                fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

            });

            addBreadcrumbDropHandlers(crumb, folder.id);

            container.appendChild(crumb);

            const isLast = index === folderPath.length - 2;
            if (!isLast) {
                container.appendChild(makeSeparator());
            }
        });
    };

    function addBreadcrumbDropHandlers(crumbEl, targetFolderId) {
        crumbEl.addEventListener('dragover', e => {
            e.preventDefault();
            crumbEl.classList.add('drag-target');
        });

        crumbEl.addEventListener('dragleave', () => {
            crumbEl.classList.remove('drag-target');
        });

        crumbEl.addEventListener('drop', e => {
            e.preventDefault();
            crumbEl.classList.remove('drag-target');

            const draggedEl = document.querySelector('.sortable-ghost')?.closest('[data-id]');
            if (!draggedEl) return;

            const draggedId = draggedEl.dataset.id;
            const draggedType = draggedEl.classList.contains('folder-card') || draggedEl.classList.contains('folder-row')
                ? 'folder' : 'file';

            // Prevent dropping a folder into itself
            if (draggedType === 'folder' && draggedId === String(targetFolderId)) return;

            moveItemToFolder(draggedId, draggedType, targetFolderId);
        });
    }

    function makeSeparator() {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-separator';
        sep.textContent = ' / ';
        return sep;
    }
    
    // Drag & Drop
    function initializeFileDragAndDrop() {
        if (currentLayout !== 'grid') return;

        const container = document.getElementById('fileLibraryGrid');
        if (!container) return;

        let lastTarget = null;

        Sortable.create(container, {
            group: 'file-library',
            animation: 150,
            ghostClass: 'sortable-ghost',
            draggable: '.file-card',
            sort: false,
            fallbackOnBody: true,
            swapThreshold: 1,

            onMove: function(evt) {
                const pointerX = evt.originalEvent.clientX;
                const pointerY = evt.originalEvent.clientY;
                const newTarget = document.elementFromPoint(pointerX, pointerY)?.closest('.folder-card');

                // Remove old highlight
                if (lastTarget && lastTarget !== newTarget) {
                    lastTarget.classList.remove('drag-target');
                }

                // Add new highlight if valid
                if (newTarget && newTarget !== evt.dragged) {
                    newTarget.classList.add('drag-target');
                    lastTarget = newTarget;
                }

                return false; // Prevent reordering
            },

            onEnd: function(evt) {
                // Cleanup all targets
                document.querySelectorAll('.folder-card.drag-target').forEach(el =>
                    el.classList.remove('drag-target')
                );

                const draggedEl = evt.item;
                const dropTarget = document.elementFromPoint(
                    evt.originalEvent.clientX,
                    evt.originalEvent.clientY
                )?.closest('.folder-card');

                if (!dropTarget || dropTarget === draggedEl) return;

                const draggedId = draggedEl.dataset.id;
                const draggedType = draggedEl.classList.contains('folder-card') ? 'folder' : 'file';
                const targetFolderId = dropTarget.dataset.id;

                if (draggedType === 'folder' && draggedId === targetFolderId) return;

                moveItemToFolder(draggedId, draggedType, targetFolderId);
            }
        });
    }
    
    function initializeListDragAndDrop() {
        if (currentLayout !== 'list') return;

        const container = document.getElementById('fileListTable'); // tbody element
        if (!container) return;

        let lastTarget = null;

        Sortable.create(container, {
            group: 'file-library',
            animation: 150,
            ghostClass: 'sortable-ghost',
            draggable: '.table-select-option', // your <tr> rows
            sort: false,
            fallbackOnBody: true,
            swapThreshold: 1,

            onMove: function(evt) {
                const pointerX = evt.originalEvent.clientX;
                const pointerY = evt.originalEvent.clientY;
                const newTarget = document.elementFromPoint(pointerX, pointerY)?.closest('.folder-row');

                if (lastTarget && lastTarget !== newTarget) {
                    lastTarget.classList.remove('drag-target');
                }

                if (newTarget && newTarget !== evt.dragged) {
                    newTarget.classList.add('drag-target');
                    lastTarget = newTarget;
                }

                return false; // Prevent row reordering
            },

            onEnd: function(evt) {
                document.querySelectorAll('.folder-row.drag-target').forEach(el =>
                    el.classList.remove('drag-target')
                );

                const draggedEl = evt.item;
                const dropTarget = document.elementFromPoint(
                    evt.originalEvent.clientX,
                    evt.originalEvent.clientY
                )?.closest('.folder-row');

                if (!dropTarget || dropTarget === draggedEl) return;

                const draggedId = draggedEl.dataset.id;
                const draggedType = draggedEl.querySelector('.real-file-type')?.value === 'folder' ? 'folder' : 'file';
                const targetFolderId = dropTarget.dataset.id;

                if (draggedType === 'folder' && draggedId === targetFolderId) return;

                moveItemToFolder(draggedId, draggedType, targetFolderId);
            }
        });
    }

    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    function addCustomDragPreview(el, title) {
        el.addEventListener('dragstart', function (event) {
            const dragPreview = document.createElement('div');
            dragPreview.classList.add('custom-drag-preview');  // 👈 Add your class
            dragPreview.textContent = title;

            document.body.appendChild(dragPreview);
            event.dataTransfer.setDragImage(dragPreview, 0, 0);

            setTimeout(() => document.body.removeChild(dragPreview), 0);
        });
    }

    function moveItemToFolder(itemId, itemType, targetFolderId) {
        const formData = new FormData();
        formData.append('item_id', itemId);
        formData.append('item_type', itemType); // 'file' or 'folder'
        formData.append('target_folder_id', targetFolderId);
        console.log(`📤 Sending move request: ${itemType} #${itemId} → folder #${targetFolderId}`);


        fetch('/requests/move-to-folder/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayMessage('Item moved successfully', true);
                currentPage = 1;
                fetchFiles(currentPage, currentLayout, currentParentFolderId, selectedFilterCourseIds);

            } else {
                displayMessage(data.message || 'Move failed.', false);
            }
        })
        .catch(err => {
            console.error('Move error:', err);
            displayMessage('Unexpected error moving item.', false);
        });
    }

    function monitorFileLibraryScroll() {
        const scrollContainer = document.querySelector('.file-library-main-container');
        const targetElement = document.querySelector('.file-library-top-row');

        if (!scrollContainer || !targetElement) return;

        function checkScroll() {
            if (scrollContainer.scrollTop > 0) {
                targetElement.classList.add('library-scrolled-down');
            } else {
                targetElement.classList.remove('library-scrolled-down');
            }
        }

        scrollContainer.addEventListener('scroll', checkScroll);
        checkScroll(); // Check on load
    }

    window.moveFile = function(itemId, itemType) {
        moveItemId = itemId;
        moveItemType = itemType;
        folderMovePath = [];
        selectedTargetFolderId = null;
        openPopup('fileMove');
        fetchFolderHierarchy(); // Start from root
        renderMoveBreadcrumbs();
    }

    function fetchFolderHierarchy(parentId = null) {
        fetch(`/requests/get-folder-children/?parent_id=${parentId || ''}`)
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('entireFolderList'); // Should be a <tbody>
                list.innerHTML = '';

                if (data.folders.length === 0) {
                    const row = document.createElement('tr');
                    row.style.pointerEvents = 'none';
                    row.innerHTML = `
                        <td style="padding: 0; border-bottom: 0; border-top: 0;" colspan="100%">
                            <div style="border-bottom: 0; border-top: 0;" class="no-results-found">
                                <img src="/static/client_admin/Images/HALO%20LMS%20No%20Graphic%20Test-28.png" alt="HALO Graphic">
                                <span>No other folders in here.</span>
                            </div>
                        </td>`;
                    list.appendChild(row);
                }

                data.folders.forEach(folder => {
                    if (folder.id === moveItemId) return; // Prevent moving into self

                    const row = document.createElement('tr');
                    row.className = 'folder-row';
                    row.dataset.id = folder.id;
                    row.dataset.title = folder.title;

                    const arrowIcon = folder.has_children
                        ? '<i class="fa-solid fa-angle-right"></i>'
                        : '';

                    row.innerHTML = `
                        <input class="real-file-title" type="hidden" value="${folder.title}">
                        <input class="real-file-type" type="hidden" value="folder">
                        <td class="file-title">
                            <div class="file-title-inner">
                                <div class="file-list-icon folder-list-icon"><i class="fa-solid fa-folder" aria-hidden="true"></i></div>
                                <div class="table-ellipsis">${folder.title}</div>
                            </div>
                        </td>
                        <td class="folder-arrow-cell">${arrowIcon}</td>
                    `;

                    row.addEventListener('click', () => {
                        const index = folderMovePath.findIndex(f => f.id === folder.id);
                        if (index !== -1) {
                            folderMovePath = folderMovePath.slice(0, index + 1);
                        } else {
                            folderMovePath.push({ id: folder.id, title: folder.title });
                        }

                        selectedTargetFolderId = folder.id;
                        fetchFolderHierarchy(folder.id);
                        renderMoveBreadcrumbs();
                    });

                    list.appendChild(row);
                });

                highlightSelectedFolder();
            });
    }

    function renderMoveBreadcrumbs() {
        const container = document.getElementById('moveFolderBreadcrumbs');
        container.innerHTML = '';

        const root = document.createElement('span');
        root.className = 'breadcrumb-item';
        if (folderMovePath.length === 0) {
            root.classList.add('current'); // Add active class if in root
        }
        root.textContent = 'All Files';
        root.addEventListener('click', () => {
            folderMovePath = [];
            selectedTargetFolderId = null;
            fetchFolderHierarchy(null);
            renderMoveBreadcrumbs();
        });
        container.appendChild(root);

        if (folderMovePath.length > 0) {
            container.appendChild(createSeparator());
        }

        folderMovePath.forEach((folder, index) => {
            const crumb = document.createElement('span');
            crumb.className = 'breadcrumb-item';
            crumb.textContent = folder.title;

            // Add 'current' class to the last crumb
            if (index === folderMovePath.length - 1) {
                crumb.classList.add('current');
            }

            crumb.addEventListener('click', () => {
                folderMovePath = folderMovePath.slice(0, index + 1);
                selectedTargetFolderId = folder.id;
                fetchFolderHierarchy(folder.id);
                renderMoveBreadcrumbs();
            });

            container.appendChild(crumb);

            if (index < folderMovePath.length - 1) {
                container.appendChild(createSeparator());
            }
        });
    }

    function createSeparator() {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-separator';
        sep.textContent = ' / ';
        return sep;
    }

    function highlightSelectedFolder() {
        document.querySelectorAll('.folder-select-row').forEach(row => {
            row.classList.toggle('selected', row.dataset.id == selectedTargetFolderId);
        });
    }

    document.getElementById('fileMoveBtn').addEventListener('click', () => {
        if (!selectedTargetFolderId && moveItemType === 'folder') {
            displayMessage('Cannot move a folder to the root.', false);
            return;
        }

        if (moveItemId && moveItemType && selectedTargetFolderId !== null) {
            moveItemToFolder(moveItemId, moveItemType, selectedTargetFolderId);
            closePopup('fileMove');
        } else {
            displayMessage('Please select a folder to move into.', false);
        }
    });

    window.copyLink = function(url) {
        navigator.clipboard.writeText(url)
            .then(() => {
                displayMessage('Link copied to clipboard.', true);
            })
            .catch(err => {
                console.error("Failed to copy link: ", err);
                displayMessage('Failed to copy the link.', false);
            });
    }

});

async function downloadMedia(fileUrl) {
    try {
        const response = await fetch(fileUrl, {
            method: 'GET',
            headers: {
                // Optional: add auth headers if needed
            }
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileUrl.split('/').pop(); // fallback filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error('Error downloading file:', err);
        displayMessage('Unable to download file', false);
    }
}

function openFileDeleteConfirmation(fileId, fileName, type = 'file') {
    const fileLibraryDeleteConfirmationBtn = document.getElementById('fileLibraryDeleteConfirmationBtn');
    const fileDeletionName = document.getElementById('fileDeletionName');

    const fileDeletionHeading = document.getElementById('fileDeletionHeading');

    if (type === 'file') {
        fileDeletionHeading.innerText = 'Are you sure you want to delete this file?';
        fileLibraryDeleteConfirmationBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i> Delete File ';
        
    }else if(type === 'folder'){
        fileDeletionHeading.innerText = 'Are you sure you want to delete this folder?';
        fileLibraryDeleteConfirmationBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i> Delete Folder ';

    }

    fileDeletionName.innerText = fileName;
    fileLibraryDeleteConfirmationBtn.setAttribute('onclick', `deleteFile(${fileId}, '${type}')`);
    openPopup('fileDeleteConfirmation');
}

function openRenamePrompt(fileId, currentTitle, type = 'file') {
    const newFileName = document.getElementById('newFileName');
    const extensionDisplay = document.getElementById('fileExtensionDisplay');
    const fileLibraryRenameBtn = document.getElementById('fileLibraryRenameBtn');

    const newFileNameHeading = document.getElementById('newFileNameHeading');
    const newFileNameLabel = document.getElementById('newFileNameLabel');

    if (type === 'file') {
        newFileNameHeading.innerText = 'Rename File';
        newFileNameLabel.innerText = 'File Name';
        newFileName.placeholder = 'File Name';
    }else if(type === 'folder'){
        newFileNameHeading.innerText = 'Rename Folder';
        newFileNameLabel.innerText = 'Folder Name';
        newFileName.placeholder = 'Folder Name';
    }

    fileLibraryRenameBtn.classList.remove('disabled');
    fileLibraryRenameBtn.disabled = false;
    newFileName.readonly = false;
    newFileName.classList.remove('disabled');

    newFileName.addEventListener('input', () => {
        const hasValue = newFileName.value.trim().length > 0;
        fileLibraryRenameBtn.disabled = !hasValue;
        fileLibraryRenameBtn.classList.toggle('disabled', !hasValue);
    });

    // Extract extension and base name
    const lastDotIndex = currentTitle.lastIndexOf('.');
    let baseName = currentTitle;
    let ext = '';

    if (type === 'file' && lastDotIndex > 0) {
        baseName = currentTitle.substring(0, lastDotIndex);
        ext = currentTitle.substring(lastDotIndex);
    }

    newFileName.value = baseName;
    extensionDisplay.textContent = ext;
    extensionDisplay.style.display = type === 'folder' ? 'none' : 'inline';

    fileLibraryRenameBtn.setAttribute('onclick', `sendRenamePromptData(${fileId}, '${type}')`);

    openPopup('fileRename');
}

function sendRenamePromptData(fileId, type = 'file') {
    const newFileName = document.getElementById('newFileName');
    const extensionDisplay = document.getElementById('fileExtensionDisplay');

    let inputName = newFileName.value.trim();
    let updatedFileName = inputName;

    if (type === 'file') {
        const extension = extensionDisplay.innerText.trim();
        if (!inputName.toLowerCase().endsWith(extension.toLowerCase())) {
            updatedFileName += extension;
        }
    }

    console.log(`Renaming ${type} to:`, updatedFileName);

    renameFile(fileId, updatedFileName, type);
}



function initializeDropdownMenus() {
    const dropdownToggles = document.querySelectorAll('.quiz-builder-dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        if (toggle.dataset.dropdownInitialized === 'true') return;

        toggle.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent bubbling to document

            const container = toggle.closest('.quiz-builder-dropdown-container');
            
            if(container){
                const dropdown = container.querySelector('.quiz-builder-dropdown-options');
                dropdown.classList.toggle('visible');

                // Close other open dropdowns
                document.querySelectorAll('.quiz-builder-dropdown-options.visible').forEach(other => {
                    if (other !== dropdown) {
                        other.classList.remove('visible');
                        showToolTips();
                    }
                });
                hideToolTips();
            }          
        });

        toggle.dataset.dropdownInitialized = 'true'; // Mark as initialized
    });

    // Ensure only one global click listener is attached
    if (!document.body.dataset.globalDropdownListenerAttached) {
        document.addEventListener('click', function (e) {
            document.querySelectorAll('.quiz-builder-dropdown-options.visible').forEach(dropdown => {
                if (!dropdown.closest('.quiz-builder-dropdown-container').contains(e.target)) {
                    dropdown.classList.remove('visible');
                    showToolTips();
                }
            });
        });

        document.body.dataset.globalDropdownListenerAttached = 'true';
    }
}

function hideToolTips(){
    const toolTips = document.querySelectorAll('.tooltiptext');
    toolTips.forEach(tooltip => {
        tooltip.classList.add('hidden');
    });
}

function showToolTips(){
    const toolTips = document.querySelectorAll('.tooltiptext');
    toolTips.forEach(tooltip => {
        tooltip.classList.remove('hidden');
    });
}