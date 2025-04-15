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

// Function to check if the URL points to an image
function isImage(url) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const extension = url.split('.').pop().toLowerCase();
    return imageExtensions.includes(extension);
}

// Selecting a file to be updated into a lesson
function selectFile(popupId, referenceId = null) {
    const selectedOption = document.querySelector('.table-select-option input[type="radio"]:checked');
    
    if (selectedOption) {
        const selectedRow = selectedOption.closest('.table-select-option');
        const selectedFileURL = selectedRow.getAttribute('data-file-url');
        const selectedFileTitle = selectedRow.querySelector('.file-title').textContent;
        const selectedFileType = selectedRow.querySelector('.file-type').textContent;

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
            if (isImage(selectedFileURL)) {
                certificateURLInput.value = selectedFileURL;
                certificateSourceDisplay.innerText = selectedFileTitle;
                closePopup('fileLibrary');
            } else {
                displayMessage('Please Select an Image for Certificate Source', false);
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
                displayMessage('Please Select an Image for your Logo', false);
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
                displayMessage('Please Select an Image for your Logo', false);
            }
        } else if (popupId === 'referenceSource' && referenceId !== null) {
            const referenceURLInput = document.querySelector(`#referenceURLInput-${referenceId}`);
            const referenceTypeInput = document.querySelector(`#referenceTypeInput-${referenceId}`);
            const referenceSourceDisplay = document.querySelector(`#referenceSourceDisplay-${referenceId}`);
            referenceURLInput.value = selectedFileURL;
            referenceTypeInput.value = selectedFileType;
            referenceSourceDisplay.innerText = selectedFileTitle;
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
                openLibraryPopup("editHeaderPopup");
            } else {
                displayMessage('Please Select an Image for Header Logo', false);
            }
        } else {         
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

function openFileLibrary(popupId, referenceId = null) {
    const closeFileLibraryBtn = document.getElementById('closeFileLibraryBtn');
    const closeFileLibrary = document.getElementById('closeFileLibrary');

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
    } else if (popupId === 'certificateSource') {
        const checkbox = document.querySelector('.container .filter[data-type="image"]');
        if (checkbox && !checkbox.checked) {
            const container = checkbox.closest('.container');
            if (container) {
                container.click();
                console.log('The container has been clicked because the checkbox was not checked');
            }
        }
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("certificateSource")');
    } else if (popupId === 'thumbnail') {
        const checkbox = document.querySelector('.container .filter[data-type="image"]');
        if (checkbox && !checkbox.checked) {
            const container = checkbox.closest('.container');
            if (container) {
                container.click();
                console.log('The container has been clicked because the checkbox was not checked');
            }
        }
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("thumbnail")');
    } else if (popupId === 'referenceSource' && referenceId !== null) {
        uncheckLibraryFilters();
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', `selectFile("referenceSource", "${referenceId}")`);
    } else if (popupId === 'dashboardHeader') {
        const checkbox = document.querySelector('.container .filter[data-type="image"]');
        if (checkbox && !checkbox.checked) {
            const container = checkbox.closest('.container');
            if (container) {
                container.click();
            }
        }
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("dashboardHeader")');
    }else if(popupId === 'loginLogo'){
        const checkbox = document.querySelector('.container .filter[data-type="image"]');
        if (checkbox && !checkbox.checked) {
            const container = checkbox.closest('.container');
            if (container) {
                container.click();
            }
        }
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("loginLogo")');
    } else if(popupId === 'loginBackground'){
        const checkbox = document.querySelector('.container .filter[data-type="image"]');
        if (checkbox && !checkbox.checked) {
            const container = checkbox.closest('.container');
            if (container) {
                container.click();
            }
        }
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("loginBackground")');
    }else if(popupId === 'formBackground'){
        const checkbox = document.querySelector('.container .filter[data-type="image"]');
        if (checkbox && !checkbox.checked) {
            const container = checkbox.closest('.container');
            if (container) {
                container.click();
            }
        }
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary")');
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile("formBackground")');
    }else if(popupId === 'header_logo'){
        closeLibraryPopup('editHeaderPopup');
        closeFileLibraryBtn.setAttribute('onclick', 'closePopup("fileLibrary"), openLibraryPopup("editHeaderPopup")');
        closeFileLibrary.setAttribute('onclick', 'closePopup("fileLibrary"), openLibraryPopup("editHeaderPopup")');
        document.getElementById('selectFileBtn').setAttribute('onclick', `selectFile("header_logo", "${referenceId}")`);
        document.getElementById('editHeaderPopup').style.display = 'none';
    }else{
        closeFileLibraryBtn.setAttribute('onclick', 'closeFileLibrary()');
        closeFileLibrary.setAttribute('onclick', 'closeFileLibrary()');
        const lessonCreationPopup = document.getElementById('lessonCreationPopup');
        const popupContent = lessonCreationPopup.querySelector('.popup-content');
        popupContent.classList.remove('animate-popup-content');
        lessonCreationPopup.style.display = "none";
        document.getElementById('selectFileBtn').setAttribute('onclick', 'selectFile()');
    }

    const fileLibrary = document.getElementById('fileLibrary');
    const popupContent2 = fileLibrary.querySelector('.popup-content');
    fileLibrary.style.display = "flex";
    setTimeout(() => {
        popupContent2.classList.add('animate-popup-content');
    }, 100);
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

document.getElementById('fileInput').addEventListener('change', function(event) {
    const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
    document.getElementById('fileNameDisplay').textContent = fileName;
    const fileUploadSubmit = document.getElementById('fileUploadSubmit');
    fileUploadSubmit.classList.remove('disabled');
    fileUploadSubmit.removeAttribute('disabled', true);
});

const uploadMessageContainer = document.getElementById('upload-message-container');
const uploadMessageInner = document.getElementById('upload-message-inner');
const uploadMessage = document.getElementById('upload-message');

function displayMessage(message, isSuccess) {
    uploadMessage.textContent = message;
    uploadMessageContainer.style.display = 'flex';
    setTimeout(() => {
        uploadMessageContainer.className = isSuccess ? 'alert-container animate-alert-container' : 'alert-container animate-alert-container';
    }, 100);
    uploadMessageInner.className = isSuccess ? 'alert alert-success' : 'alert alert-error';
    setTimeout(() => {
        uploadMessageContainer.classList.remove('animate-alert-container');
    }, 8000);
}

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
            loadingResults();
            // Parse the JSON response from the server
            const response = JSON.parse(xhr.responseText);

            if (response.success) {
                displayMessage(response.message, true); // Display success message
                // Construct a new row with the file data returned from the server
                const newFileRow = `
                    <tr class="table-select-option">
                        <td>
                            <label class="custom-radio">
                                <input type="radio" name="file_library_select">
                                <span class="custom-radio-button"></span>
                            </label>
                        </td>
                        <td class="file-title">${response.file.title}</td>
                        <td class="file-type">${response.file.file_type}</td>                   
                        <td>${response.file.uploaded_at}</td>
                    </tr>
                `;
                
                // Add the new row to the file list table
                document.getElementById('fileList').append(newFileRow);
                assignTableOptionListeners();
                document.getElementById('librarySearch').value = "";
                performSearch();
            } else {
                displayMessage(response.message, false); // Display error message
                console.error('Failed to upload file:', response.error);
            }
        } else {
            console.error('File upload failed');
            displayMessage('An unexpected error occurred. Please try again later.', false);
        }
    };

    closeFileUpload();
    xhr.send(formData);
    fileUploadSubmit.classList.remove('disabled');
    fileUploadSubmit.removeAttribute('disabled', true);
    assignTableOptionListeners();
});

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
}

// Function to perform the search
function performSearch() {
    // Show Loading Symbol
    loadingResults();
    const query = document.getElementById('librarySearch').value;

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/requests/file-upload/?q=${encodeURIComponent(query)}`, true);

    xhr.onload = function() {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);

            if (response.success) {
                updateFileList(response.files);
            } else {
                console.error('Search failed');
            }
        }
    };

    xhr.send();
}

// Add event listener with debounce
document.getElementById('librarySearch').addEventListener('input', debounce(performSearch, 300));

function updateFileList(files) {
    const fileListContainer = document.getElementById('fileList');
    fileListContainer.innerHTML = '';
    if(files.length > 0){
        files.forEach(file => {
            const row = document.createElement('tr');
            row.setAttribute('data-file-url', file.file_url);
            row.className = 'table-select-option';
            
            row.innerHTML = `
                <td><label class="custom-radio"><input type="radio" name="file_library_select"><span class="custom-radio-button"></span></label></td>
                <td class="file-title">${file.title}</td>
                <td class="file-type">${file.file_type}</td>                   
                <td>${file.uploaded_at}</td>
            `;
    
            fileListContainer.appendChild(row);
        });
        assignTableOptionListeners()
    }else{
        fileListContainer.innerHTML = `
        <td style="padding: 0; border-bottom: 0;" colspan="100%">
            <div style="border-bottom: 0;" class="no-results-found">
                <img src="/static/client_admin/Images/HALO%20LMS%20No%20Graphic%20Test-28.png" alt="HALO Graphic">
                <span><b>No Uploads Found</b></span>
            </div>
        </td>`;
    }
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
    selectFileBtn.classList.add('disabled');
    selectFileBtn.setAttribute('disabled', true);

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
            countSelectTableOptions();
        });
    });
}

function countSelectTableOptions(){
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

// Infinite Scrolling
document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    let hasNext = true;
    let isLoading = false;
    const selectedFilters = new Set();
    const searchInput = document.querySelector('#librarySearch');
    const fileListContainer = document.getElementById('fileList');
    const selectFileBtn = document.getElementById('selectFileBtn'); // Ensure you have this button element

    function loadMoreFiles() {
        if (isLoading || !hasNext) return;
        isLoading = true;

        fetchFiles(currentPage);
    }

    function fetchFiles(page) {
        const filterParams = Array.from(selectedFilters).join(',');
        const searchQuery = searchInput.value;
        const url = `/requests/file-upload/?filters=${encodeURIComponent(filterParams)}&q=${encodeURIComponent(searchQuery)}&page=${page}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateFileList(data.files);
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
    }

    function updateFileList(files) {
        if (currentPage === 1) {
            fileListContainer.innerHTML = ''; // Clear existing files if it's the first page
        }

        if (files.length === 0 && currentPage === 1) {
            fileListContainer.innerHTML = `
            <td style="padding: 0; border-bottom: 0;" colspan="100%">
                <div style="border-bottom: 0;" class="no-results-found">
                    <img src="/static/client_admin/Images/HALO%20LMS%20No%20Graphic%20Test-28.png" alt="HALO Graphic">
                    <span><b>No Uploads Found</b></span>
                </div>
            </td>
        `;
        } else {
            files.forEach(file => {
                const row = document.createElement('tr');
                row.className = 'table-select-option';
                row.setAttribute('data-file-url', file.file_url);
                row.innerHTML = `
                    <td><label class="custom-radio"><input type="radio" name="file_library_select"><span class="custom-radio-button"></span></label></td>
                    <td class="file-title">${file.title}</td>
                    <td class="file-type">${file.file_type}</td>
                    <td>${file.uploaded_at}</td>
                `;
                fileListContainer.appendChild(row);
            });
        }

        assignTableOptionListeners(); // Re-assign event listeners after update
    }

    function updateFilters(newFilters) {
        selectedFilters.clear();
        newFilters.forEach(filter => selectedFilters.add(filter));
        currentPage = 1; // Reset to page 1
        fetchFiles(currentPage); // Fetch files with updated filters
    }

    function handleFilterChange() {
        const newFilters = Array.from(document.querySelectorAll('.library-filter-options input[type="checkbox"]:checked'))
            .map(cb => cb.getAttribute('data-type').toLowerCase().trim());
        updateFilters(newFilters);
    }

    function handleSearchChange() {
        currentPage = 1; // Reset to page 1
        fetchFiles(currentPage); // Fetch files with updated search query
    }

    // Event listeners for filter changes
    document.querySelectorAll('.library-filter-options input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });

    // Event listener for search input
    searchInput.addEventListener('input', handleSearchChange);

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

    // Initial fetch
    if (!fileListContainer.hasChildNodes()) {
        fetchFiles(currentPage);
    }
});