document.addEventListener("DOMContentLoaded", function () {
    const courseFooterTabs = document.getElementById('courseFooterTabs');
    setTimeout(() => {
        initializeTabs(courseFooterTabs);
    }, 100);

    document.getElementById('toggleCourseSidebar').addEventListener('click', () => {
        toggleCourseSidebar();
    })
    if (window.innerWidth <= 768) {
        toggleCourseSidebar();
    }  
});

function toggleCourseSidebar(){
    const courseSidebar = document.getElementById('courseSidebar');
    const toggleCourseSidebar = document.getElementById('toggleCourseSidebar');
    const sidebarToggleWrapper = courseSidebar.querySelector('.sidebar-toggle-wrapper');

    courseSidebar.classList.toggle('toggle-sidebar');

    if(courseSidebar.classList.contains('toggle-sidebar')){
        setTimeout(() => {
            toggleCourseSidebar.innerHTML = `<span style="left: -70%;" class="tooltiptext">Show Sidebar</span><i class="fa-regular fa-angle-left"></i>`;
        }, 200);
    }else{
        setTimeout(() => {
            toggleCourseSidebar.innerHTML = `<span class="tooltiptext">Hide Sidebar</span><i class="fa-regular fa-angle-right"></i>`;                 
        }, 200);
    }
}

let previousHeight;
let isExpanded = false;

function openCourseDetails(){
    if(isExpanded == true){
        return;
    }
    const toggleFooterBtn = document.getElementById('toggleFooterBtn');
    toggleFooterBtn.innerHTML = `<i class="fa-light fa-arrows-to-dotted-line"></i><span>Collapse</span>`;
    toggleFooterBtn.setAttribute('onclick', 'closeCourseDetails()');
    const footer = document.querySelector('.course-footer-container');
    previousHeight = footer.getBoundingClientRect().height + 'px';

    footer.classList.add('expanded');
    footer.style.position = 'absolute';
    footer.style.maxHeight = '80dvh';
    isExpanded = true;
}

function closeCourseDetails() {
    const toggleFooterBtn = document.getElementById('toggleFooterBtn');
    toggleFooterBtn.innerHTML = `<i class="fa-light fa-arrows-from-dotted-line"></i><span>Expand</span>`;
    toggleFooterBtn.setAttribute('onclick', 'openCourseDetails()');
    const footer = document.querySelector('.course-footer-container');
    
    footer.style.maxHeight = previousHeight;

    setTimeout(() => {
        footer.style.position = 'relative';
        footer.classList.remove('expanded');
    }, 350);
    isExpanded = false;
}

async function openAssignment(assignmentId, lessonId = null) {
    const scormContentIframe = document.getElementById('scormContentIframe');
    setTimeout(() => {
        scormContentIframe.style.visibility = 'hidden';
    }, 450);
    const courseId = document.getElementById('courseId').value;

    let url = `/course_player/assignments/${assignmentId}/detail/`;
    if (lessonId) {
        url += `?lesson_id=${lessonId}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
        alert("Failed to fetch assignment.");
        return;
    }

    const data = await res.json();
    const container = document.querySelector('#courseAssignmentsViewer');
    container.innerHTML = ''; // clear previous if needed
    container.classList.remove('hide-assignments');
    const courseFooterContainer = document.querySelector('.course-footer-container');
    if(courseFooterContainer.classList.contains('expanded')){
        closeCourseDetails();
    }

    let instructionsHtml = '';
    if (data.description && data.description.trim() !== '' && data.description.trim() !== '<p><br></p>') {
        instructionsHtml = `<b>Instructions:</b> ${data.description}`;
    }

    document.querySelectorAll('.assignment-item.active').forEach(el => {
        el.classList.remove('active');
    });

    // Create a selector that targets the clicked assignment in both footer and sidebar
    let selector = `.assignment-item[data-assignment-id="${assignmentId}"]`;
    if (lessonId) {
        selector += `[data-lesson-id="${lessonId}"]`;
    }

    // Add active class to all matching buttons
    document.querySelectorAll(selector).forEach(el => {
        el.classList.add('active');
    });

    const html = `
        <div class="course-assignments-viewer-inner scrollable-content">
            <div class="assignment-detail-card max-width-2">
                <div class="assignment-detail-header">
                    <div class="course-player-icon-main pastel-purple">
                        <i class="fa-light fa-flag"></i>
                    </div>
                    <h3>${data.title}</h3>
                    <div class="assignment-instructions">
                        ${instructionsHtml}
                    </div>          
                </div>
                
                ${data.url ? `
                    <div class="assignment-upload-header">
                        <label>Assignment Reference</label>
                    </div>
                    <a href="${data.url}" target="_blank" class="reference-item assignment-reference-item">
                    <div class="reference-item-left">
                        <div class="reference-icon pastel-blue">                      
                            ${getFileTypeIcon(data.file_type)}                    
                        </div>
                        <div class="reference-text">
                            <h4>${data.file_title}</h4>
                        </div>
                    </div>
                    <div class="reference-item-right">
                        <i class="fa-regular fa-arrow-up-right-from-square"></i>
                    </div>                             
                </a>
                ` : ''}
                ${data.status == 'rejected' ? `
                    <div class="alert alert-error new-alert-container animate-alert-container">
                        <i class="fa-light fa-triangle-exclamation"></i>
                        <div class="new-alert-container-right">
                            <span>Assignment Rejected</span>
                            ${data.review_notes ? `
                                <span class="new-alert-container-subtext">Please read the reviewer notes below and re-submit your assignment</span>` 
                            : `<span class="new-alert-container-subtext">Please re-submit your assignment</span>`}
                        </div>                    
                    </div>` 
                : ''}
                ${data.review_notes ? `
                    <div class="assignment-instructions margin-bottom-10">
                        <b>Reviewer Notes:</b>${data.review_notes}
                    </div> ` 
                : ''}

                <div class="assignment-upload-header">
                    <label for="assignmentFileInput">Upload Assignment</label>
                </div>
                <form id="assignment-upload-form" enctype="multipart/form-data">
                    <input type="hidden" name="assignment_id" value="${assignmentId}">
                    <input type="hidden" name="course_id" value="${courseId}">
                    ${lessonId ? `<input type="hidden" name="lesson_id" value="${lessonId}">` : ''}
                    <div class="dropzone" id="assignmentDropzone">
                        <i id="dropzoneIcon" class="fa-light fa-cloud-arrow-up"></i>
                        <p id="dropzoneText">Drag & drop your assignment here or <u>click to browse</u></p>
                        <input type="file" name="file" id="assignmentFileInput" required>
                    </div>
                    <div class="assignment-upload-file" id="fileDisplayContainer"></div>
                    <div class="assignment-upload-header margin-top-10">
                        <label for="student_notes">Notes</label>
                    </div>
                    <textarea id="student_notes" class="scrollable-content" placeholder="Enter additional notes here..."></textarea>
                    <button id="assignmentUploadBtn" class="disabled course-button-primary upload-btns" type="submit" disabled>
                        <i class="fa-light fa-paper-plane"></i>
                        <span>Submit Assignment</span>
                    </button>
                </form>

                <div class="assignment-upload-footer">
                    ${data.completed ? `
                        <div class="assignment-submitted-message">
                            <i class="fa-solid fa-envelope-circle-check"></i>
                            <span>Submitted on ${data.formatted_completed_at}</span>
                        </div>` 
                    : ''}
                    ${data.status ? `
                        <div class="assignment-submitted-message assignment-upload-footer-status">
                            ${data.status == 'approved' ? `
                                <div class="assignment-complete-icon">
                                    <i class="fa-regular fa-circle-check"></i>
                                </div>                          
                                <span> Approved </span>
                            ` : ''}
                            ${data.status == 'submitted' ? `
                                <div class="assignment-submitted-icon">
                                    <i class="fa-regular fa-clock"></i>
                                </div>                          
                                <span> Pending </span>
                            ` : ''}
                            ${data.status == 'rejected' ? `
                                <div class="assignment-rejected-icon">
                                    <i class="fa-regular fa-circle-xmark"></i>
                                </div>                          
                                <span> Rejected </span>
                            ` : ''}
                        </div>` 
                    : ''}
                    ${data.formatted_reviewed_at ? `
                        <div class="assignment-submitted-message assignment-upload-footer-status">
                            <span>Reviewed on ${data.formatted_reviewed_at}</span>
                        </div>` 
                    : ''}
                </div>
            </div>
        </div>
        <div onclick="closeAssignment()" class="close-assignment-detail-card">
            <span> Close Assignment</span>
            <i class="fa-regular fa-angle-down"></i>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);

    const form = document.getElementById('assignment-upload-form');

    const dropzone = document.getElementById('assignmentDropzone');
    const dropzoneText = document.getElementById('dropzoneText');
    const dropzoneIcon = document.getElementById('dropzoneIcon');
    const fileInput = document.getElementById('assignmentFileInput');
    const uploadBtn = document.getElementById('assignmentUploadBtn');

    function isImageFile(file) {
        if (file?.type) return file.type.startsWith('image/');
        const ext = (file?.name?.split('.').pop() || '').toLowerCase();
        return ['jpg','jpeg','png','gif','webp','svg','avif','heic'].includes(ext);
    }

    function handleFileReady() {
        const fileDisplayContainer = document.getElementById('fileDisplayContainer');
        fileDisplayContainer.innerHTML = '';
        fileDisplayContainer.classList.add('show-assignment-upload-file');

        const file = fileInput.files[0];
        if (!file) {
            uploadBtn.disabled = true;
            uploadBtn.classList.add('disabled');
            return;
        }

        // Enable the upload button
        uploadBtn.disabled = false;
        uploadBtn.classList.remove('disabled');

        const fileType = getFileTypeFromName(file.name);
        const fileIcon = getFileTypeIcon(fileType);

        const fileDisplay = document.createElement('div');
        fileDisplay.classList.add('uploaded-file-preview');

        // base layout
        fileDisplay.innerHTML = `
            <div class="file-preview-left">
            <span class="file-icon">
                <span class="file-generic-icon">${fileIcon}</span>
                <span class="file-image-display" style="display:none">
                <img alt="Uploaded image preview" loading="lazy">
                </span>
            </span>
            <span class="file-name">${file.name}</span>
            </div>
            <div class="file-preview-right">
            <button type="button" class="remove-file-btn tooltip" aria-label="Remove File">
                <i class="fa-light fa-trash-can"></i>
                <span class="tooltiptext"> Remove Assignment</span>
            </button>
            </div>
        `;

        fileDisplayContainer.appendChild(fileDisplay);

        const imgWrap = fileDisplay.querySelector('.file-image-display');
        const imgEl   = imgWrap.querySelector('img');
        const iconEl  = fileDisplay.querySelector('.file-generic-icon');

        let objectUrl = null;
        if (isImageFile(file)) {
            objectUrl = URL.createObjectURL(file);
            imgEl.src = objectUrl;
            imgWrap.style.display = '';     // show image
            iconEl.style.display = 'none';  // hide icon
            imgEl.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
        }

        // Handle remove
        const removeBtn = fileDisplay.querySelector('.remove-file-btn');
        removeBtn.addEventListener('click', () => {
            if (objectUrl) { try { URL.revokeObjectURL(objectUrl); } catch {}
            }
            fileInput.value = '';
            fileDisplayContainer.innerHTML = '';
            uploadBtn.disabled = true;
            uploadBtn.classList.add('disabled');
            fileDisplayContainer.classList.remove('show-assignment-upload-file');
        });
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

    function getFileTypeIcon(fileType) {
        switch (fileType) {
            case 'pdf':
                return '<i class="fa-light fa-file-pdf"></i>';
            case 'audio':
                return '<i class="fa-light fa-volume"></i>';
            case 'image':
                return '<i class="fa-light fa-image"></i>';
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
            dropzoneText.textContent = 'Drop Assignment';
        })
    );

    // Remove highlight
    ['dragleave', 'drop'].forEach(event =>
        dropzone.addEventListener(event, (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            dropzoneIcon.className = 'fa-light fa-cloud-arrow-up';
            dropzoneText.innerHTML = 'Drag & drop your assignment here or <u>click to browse</u>';
        })
    );

    // Drop file support
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileInput.files = e.dataTransfer.files;
        handleFileReady();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setDisabledUploadBtns();

        const formData = new FormData(form);
        formData.append("student_notes", document.getElementById("student_notes").value);

        const uploadRes = await fetch('/course_player/assignments/submit/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'), // assume a helper exists
            },
            body: formData
        });

        const result = await uploadRes.json();

        if (uploadRes.ok) {
            openAssignment(assignmentId, lessonId); // Refresh view
            displayValidationMessage('Assignment Submitted Successfully.', true);
            removeDisabledUploadBtns();
            updateAssignmentStatus(assignmentId, lessonId, result.final_status);
            // saveLessonProgress();
        } else {
            displayValidationMessage('Assignment Upload Failed.', false);
            removeDisabledUploadBtns();
        }
    });
}

function updateAssignmentStatus(assignmentId, lessonId, status) {
    // Build selector that matches both footer and sidebar assignments
    let selector = `.assignment-item[data-assignment-id="${assignmentId}"]`;
    if (lessonId) {
        selector += `[data-lesson-id="${lessonId}"]`;
    }

    // Select all matching assignment buttons
    const assignmentItems = document.querySelectorAll(selector);
    if (!assignmentItems.length) return;

    assignmentItems.forEach(assignmentItem => {
        const rightEl = assignmentItem.querySelector('.assignment-item-right');
        if (!rightEl) return;

        // Remove any old status classes/icons
        assignmentItem.classList.remove('submitted', 'completed');
        rightEl.innerHTML = ''; // Clear existing icons if needed

        let assignmentIcon;
        if (status === 'approved') {
            assignmentItem.classList.add('completed');
            assignmentIcon = `<i class="fa-solid fa-circle-check"></i>`;
            rightEl.innerHTML = `
                <div class="assignment-complete-icon">
                    ${assignmentIcon}
                </div>
            `;
        } else if (status === 'submitted') {
            assignmentItem.classList.add('submitted');
            assignmentIcon = `<i class="fa-regular fa-clock"></i>`;
            rightEl.innerHTML = `
                <div class="assignment-submitted-icon">
                    ${assignmentIcon}
                </div>
            `;
        }
    });
}

function closeAssignment(){ 
    const scormContentIframe = document.getElementById('scormContentIframe');
    scormContentIframe.style.visibility = 'visible';
    const courseAssignmentsViewer = document.getElementById('courseAssignmentsViewer');
    courseAssignmentsViewer.classList.add('hide-assignments');

    document.querySelectorAll('.assignment-item.active').forEach(el => {
        el.classList.remove('active');
    });
}

function setDisabledUploadBtns() {
    const courseSaveBtns = document.querySelectorAll('.upload-btns');
    for (const btn of courseSaveBtns) {
        setTimeout(() => {
            btn.setAttribute('disabled', true);
        }, 100);
        btn.classList.add('disabled');

        if (!btn.dataset.originalHtml) {
            btn.dataset.originalHtml = btn.innerHTML;
        }

        const savedWidth = btn.offsetWidth + "px";
        const savedHeight = btn.offsetHeight + "px";

        btn.style.width = savedWidth;
        btn.style.height = savedHeight;

        btn.innerHTML = `<i class="fa-regular fa-spinner-third fa-spin" style="--fa-animation-duration: 1s;">`;
    }
}

function removeDisabledUploadBtns() {
    setTimeout(() => {
        const courseSaveBtns = document.querySelectorAll('.upload-btns');
        for (const btn of courseSaveBtns) {

            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }

            btn.style.width = "";
            btn.style.height = "";
        }
    }, 400);
}

// Function to get CSRF token
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