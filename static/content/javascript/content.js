document.addEventListener("DOMContentLoaded", function() {
    initializeQuill();
    initializeModuleDragAndDrop();
    initializeLessonDragAndDrop();
    initializeReferenceDragAndDrop();
    initializeUploadDragAndDrop();
    testModuleCount();
    assignModuleHeaderListeners();
    addDeleteEventListeners();
    addReferenceDeleteEventListeners();
    assignDeleteHandlers();
    assignEditHandlers();
    selectLessonType();
    initializeToggleOptions();
    initializeRadioOptions();
    initializeThumbnailPreview();
    assignReferenceHeaderListeners();
    assignUploadHeaderListeners();
    testErrorFields();
    handleFileUploadErrorRemoval();
    initializeSubtextListeners();
    initializeRequiredQuizFields();
    // Add event listeners to quiz fields
    document.getElementById('quizlessonTitle').addEventListener('input', checkQuizLessonFields);
    document.querySelectorAll('input[name="create_quiz_from"]').forEach(radio =>
        radio.addEventListener('change', checkQuizLessonFields)
    );
    observeAttributeChange('selectedQuizTemplate', checkQuizLessonFields);
    observeAttributeChange('selectedQuiz', checkQuizLessonFields);
});

function getEditorContent(editorId) {
    const editorElement = document.getElementById(editorId);

    // Check if the editor element exists
    if (!editorElement) {
        console.warn(`Editor with id ${editorId} does not exist`);
        return ''; // Return an empty string if the editor doesn't exist
    }

    // Assuming Quill editor is being used, ensure the editor is initialized
    const quillInstance = Quill.find(editorElement);
    
    if (quillInstance) {
        return quillInstance.root.innerHTML.trim(); // Return the editor content
    } else {
        console.warn(`Quill instance not found for editor ${editorId}`);
        return ''; // Return an empty string if Quill instance isn't found
    }
}

// Function to test if there is more than one module-card
function testModuleCount() {
    const moduleCards = document.querySelectorAll('.module-card');
    if (moduleCards.length >= 1) {
        hidenoModulesCreated();
    } else {
        shownoModulesCreated();
    }
}

function testReferenceCount() {
    const referenceCards = document.querySelectorAll('.reference-card');
    if (referenceCards.length >= 1) {
        hidenoReferencesCreated();
    } else {
        shownoReferencesCreated();
    }
}

function testUploadCount() {
    const referenceCards = document.querySelectorAll('.upload-card');
    if (referenceCards.length >= 1) {
        hidenoUploadsCreated();
    } else {
        shownoUploadsCreated();
    }
}

function hidenoModulesCreated() {
    const noModulesCreated = document.getElementById('noModulesCreated');
    noModulesCreated.style.display = "none";
}
function shownoModulesCreated() {
    const noModulesCreated = document.getElementById('noModulesCreated');
    noModulesCreated.style.display = "flex";
}

function hidenoReferencesCreated() {
    const noReferencesCreated = document.getElementById('noReferencesCreated');
    noReferencesCreated.style.display = "none";
}
function shownoReferencesCreated() {
    const noReferencesCreated = document.getElementById('noReferencesCreated');
    noReferencesCreated.style.display = "inline-block";
}

function hidenoUploadsCreated() {
    const noUploadsCreated = document.getElementById('noUploadsCreated');
    noUploadsCreated.style.display = "none";
}
function shownoUploadsCreated() {
    const noUploadsCreated = document.getElementById('noUploadsCreated');
    noUploadsCreated.style.display = "inline-block";
}

// Function to initialize reference drag and drop
function initializeReferenceDragAndDrop() {
    Sortable.create(document.querySelector('.reference-container'), {
        animation: 200, // Optional: animation duration in ms
        handle: '.reference-drag-icon',
        ghostClass: 'sortable-ghost', // Optional: class for the ghost element

        onStart: function (evt) {
            // Remove the sortable-drag class from all elements
            document.querySelectorAll('.reference-card').forEach(item => {
                item.classList.remove('sortable-drag');
            });
        },

        onEnd: function (evt) {
            // Remove the class after dragging ends
            document.querySelectorAll('.reference-card').forEach(item => {
                item.classList.remove('sortable-chosen');
            });
        },

        onChoose: function (evt) {
            // Ensure the class is not added to the reference-card
            if (evt.item.classList.contains('reference-card')) {
                evt.item.classList.remove('sortable-drag');
            } else {
                evt.item.classList.add('sortable-drag');
            }
        },

        onUnchoose: function (evt) {
            // Ensure the class is removed when the item is no longer chosen
            evt.item.classList.remove('sortable-drag');
        }
    });
}

// Function to initialize upload drag and drop
function initializeUploadDragAndDrop() {
    Sortable.create(document.querySelector('.upload-container'), {
        animation: 200, // Optional: animation duration in ms
        handle: '.upload-drag-icon',
        ghostClass: 'sortable-ghost', // Optional: class for the ghost element

        onStart: function (evt) {
            // Remove the sortable-drag class from all elements
            document.querySelectorAll('.upload-card').forEach(item => {
                item.classList.remove('sortable-drag');
            });
        },

        onEnd: function (evt) {
            // Remove the class after dragging ends
            document.querySelectorAll('.upload-card').forEach(item => {
                item.classList.remove('sortable-chosen');
            });
        },

        onChoose: function (evt) {
            // Ensure the class is not added to the upload-card
            if (evt.item.classList.contains('upload-card')) {
                evt.item.classList.remove('sortable-drag');
            } else {
                evt.item.classList.add('sortable-drag');
            }
        },

        onUnchoose: function (evt) {
            // Ensure the class is removed when the item is no longer chosen
            evt.item.classList.remove('sortable-drag');
        }
    });
}

// Function to initialize module drag and drop
function initializeModuleDragAndDrop() {
    Sortable.create(document.querySelector('.module-container'), {
        animation: 200, // Optional: animation duration in ms
        handle: '.module-drag-icon',
        ghostClass: 'sortable-ghost', // Optional: class for the ghost element

        onStart: function (evt) {
            // Remove the sortable-drag class from all elements
            document.querySelectorAll('.module-card').forEach(item => {
                item.classList.remove('sortable-drag');
            });
        },

        onEnd: function (evt) {
            // Remove the class after dragging ends
            document.querySelectorAll('.module-card').forEach(item => {
                item.classList.remove('sortable-chosen');
            });
        },

        onChoose: function (evt) {
            // Ensure the class is not added to the module-card
            if (evt.item.classList.contains('module-card')) {
                evt.item.classList.remove('sortable-drag');
            } else {
                evt.item.classList.add('sortable-drag');
            }
        },

        onUnchoose: function (evt) {
            // Ensure the class is removed when the item is no longer chosen
            evt.item.classList.remove('sortable-drag');
        }
    });
}

// Function to initialize lesson drag and drop
function initializeLessonDragAndDrop() {
    // Select all lesson containers
    const lessonContainers = document.querySelectorAll('.lesson-container');

    // Initialize SortableJS for each container
    lessonContainers.forEach(container => {
        Sortable.create(container, {
            animation: 200, // Optional: animation duration in ms
            handle: '.lesson-drag-icon',
            ghostClass: 'sortable-ghost', // Optional: class for the ghost element
            onEnd: function (evt) {
                // Update the lesson numbers for the specific container
                updateLessonNumbers(container);
            }
        });
    });
}

function updateLessonNumbers(container) {
    // Get all lesson cards within the specified container
    const lessonCards = container.querySelectorAll('.lesson-card');

    // Iterate through each lesson card and update its title
    lessonCards.forEach((card, index) => {
        // Find the lesson title element
        const lessonTitleElement = card.querySelector('.lesson-title');

        // Update the text with the new index
        lessonTitleElement.textContent = `Lesson ${index + 1}: ${lessonTitleElement.textContent.split(': ')[1]}`;
    });

    // Check if there are no lesson cards
    if (lessonCards.length === 0) {
        // Add the "no lessons" message if no lessons are present
        if (!container.querySelector('.no-lessons-container')) {
            const noLessonsMessage = document.createElement('div');
            noLessonsMessage.className = 'no-lessons-container';
            noLessonsMessage.innerHTML = '<span>This Module currently has no lessons.</span>';
            container.appendChild(noLessonsMessage);
        }
    } else {
        // Remove the "no lessons" message if lessons exist
        const noLessonsMessage = container.querySelector('.no-lessons-container');
        if (noLessonsMessage) {
            noLessonsMessage.remove();
        }
    }
    assignDeleteHandlers();
    assignEditHandlers();
}

// Function to create a new module
let tempModuleId = 1;
function createNewModule() {
    const moduleContainer = document.getElementById('moduleContainer');

    const newModuleCard = `
    <div class="module-card" data-temp-id='${tempModuleId}'>
        <div class="info-card-header collapsable-header">
            <div class="card-header-left">
                <i class="fa-thin fa-grip-dots-vertical module-drag-icon"></i>
                <input class="module-title" type="text" placeholder="New Module">
            </div>
            <div class="module-header-right">
                <div onclick="openPopup('moduleDeleteConfirmation', 'deleteModule', this)" id="deleteModule" class="module-delete tooltip" data-tooltip="Delete Module">
                    <span class="tooltiptext">Delete Module</span>
                    <i class="fa-regular fa-trash-can"></i>
                </div>
                <div class="module-dropdown">
                    <i class="fa-regular fa-angle-down"></i>
                </div>
            </div>
        </div>
        <div class="module-card-body">
            <!-- Lessons -->
            <div class="lesson-container">
                <div class="no-lessons-container"><span>This Module currently has no lessons.</span></div>
            </div>
            <div onclick="openPopup('lessonSelectionPopup', 'createLesson', this)" id="addLesson" class="secondary-add-btn">
                <i class="fa-regular fa-plus"></i>
                <span> Add Lesson </span>
            </div>
        </div>
    </div>`;

    moduleContainer.insertAdjacentHTML('beforeend', newModuleCard);
    tempModuleId++;

    // Reassign event listeners to include the new module
    assignModuleHeaderListeners();
    addDeleteEventListeners();
    testModuleCount();
    addCreateLessonEventListeners();
    assignDeleteHandlers();
    assignEditHandlers();
}

function createNewReference() {
    const referenceContainer = document.getElementById('referenceContainer');
    const referenceCards = referenceContainer.querySelectorAll('.reference-card');

    // Helper function to check if an ID exists
    function idExists(id) {
        return document.getElementById(`referenceCard-${id}`) !== null;
    }

    // Generate a new unique ID
    let newReferenceId = referenceCards.length + 1;
    while (idExists(newReferenceId)) {
        newReferenceId++; // Keep incrementing if the ID already exists
    }

    // Define the new reference card HTML template
    const newReferenceCard = `
    <div class="reference-card" id="referenceCard-${newReferenceId}" data-temp-id="${newReferenceId}">
        <div class="info-card-header collapsable-header">
            <div class="card-header-left">
                <i class="fa-thin fa-grip-dots-vertical reference-drag-icon"></i>
                <input class="reference-title" type="text" placeholder="New Reference">
            </div>
            <div class="reference-header-right">
                <div onclick="openPopup('referenceDeleteConfirmation', 'deleteReference', this)" id="deleteReference" class="reference-delete tooltip" data-tooltip="Delete Reference">
                    <span class="tooltiptext">Delete Reference</span>
                    <i class="fa-regular fa-trash-can"></i>
                </div>
                <div class="reference-dropdown">
                    <i class="fa-regular fa-angle-down"></i>
                </div>
            </div>
        </div>
        <div class="reference-card-body">
            <div class="right-column-file-wrapper">
                <h5 class="right-column-option-header">Reference Source <span class="required-asterisk">*</span></h5>
                <div onclick="openFileLibrary('referenceSource', '${newReferenceId}')" class="custom-file-upload-container">
                    <div class="custom-file-upload">
                        <input type="file" id="referenceSource-${newReferenceId}" name="referenceSource" style="display: none;" readonly="">
                        <i class="fa-regular fa-folder-open" aria-hidden="true"></i> Choose File
                    </div>
                    <div class="custom-file-title">
                        <span id="referenceSourceDisplay-${newReferenceId}" class="file-name-display">No file selected</span>
                    </div>
                    <input type="hidden" id="referenceURLInput-${newReferenceId}" name="referenceURL">
                    <input type="hidden" id="referenceTypeInput-${newReferenceId}" name="referenceType">
                </div>
            </div>
            <div class="reference-card-content">
                <label class="edit-user-label" for="referenceDescription-${newReferenceId}">Reference Description</label>
                <div class="editor-container" id="referenceDescription-${newReferenceId}"></div>
                <div class="quill-character-counter">
                    <div class="quill-current-counter">0</div>
                    <span>/</span>
                    <div class="quill-max-counter">2000</div>
                </div>
            </div>
        </div>
    </div>`;

    // Append the new reference card to the container
    referenceContainer.insertAdjacentHTML('beforeend', newReferenceCard);

    // Reassign event listeners and initialize any components for the new card
    assignReferenceHeaderListeners(); // Event listeners for collapsable and delete buttons
    testReferenceCount(); // Update reference count or perform any validation logic
    initializeQuill(`#referenceDescription-${newReferenceId}`); // Initialize Quill for the new description field
    detectCharacterCounters();
    initializeClearImageFields();
}

function createNewUpload(){
    const uploadContainer = document.getElementById('uploadContainer');
    const uploadCards = uploadContainer.querySelectorAll('.upload-card');

    function idExists(id) {
        return document.getElementById(`uploadCard-${id}`) !== null;
    }

    let newUploadId = uploadCards.length + 1;
    while (idExists(newUploadId)) {
        newUploadId++; // Increment the ID until a unique one is found
    }

    const newUploadCard = `
    <div class="upload-card" id="uploadCard-${newUploadId}" data-temp-id="${newUploadId}">
        <div class="info-card-header collapsable-header">
            <div class="card-header-left">
                <i class="fa-thin fa-grip-dots-vertical upload-drag-icon"></i>
                <input class="upload-title" type="text" placeholder="New Assignment">
            </div>
            <div class="upload-header-right">
                <div onclick="openPopup('uploadDeleteConfirmation', 'deleteUpload', this)" id="deleteUpload" class="upload-delete tooltip" data-tooltip="Delete Assignment">
                    <span class="tooltiptext">Delete Assignment</span>
                    <i class="fa-regular fa-trash-can"></i>
                </div>
                <div class="upload-dropdown">
                    <i class="fa-regular fa-angle-down"></i>
                </div>
            </div>
        </div>
        <div class="upload-card-body">
            <div class="right-column-file-wrapper">
                <h5 class="right-column-option-header">Assignment Reference</h5>
                <div onclick="openFileLibrary('assignmentSource', '', '${newUploadId}')" class="custom-file-upload-container">
                    <div class="custom-file-upload">
                        <input type="file" id="assignmentSource-${newUploadId}" name="assignmentSource" style="display: none;" readonly="">
                        <i class="fa-regular fa-folder-open"></i> Choose File
                    </div>
                    <div class="custom-file-title">
                        <span id="assignmentSourceDisplay-${newUploadId}" class="file-name-display">No file selected</span>
                    </div>
                    <input type="hidden" id="assignmentURLInput-${newUploadId}" name="assignmentURL">
                    <input type="hidden" id="assignmentTypeInput-${newUploadId}" name="assignmentType">
                </div>
                <span class="course-content-input-subtext"> Provide a file that Learners can access with this assignment. </span>
            </div>
            <div class="upload-card-content">
                <label class="edit-user-label" for="assignmentDescription-${newUploadId}">Assignment Instructions</label>
                <div class="editor-container" id="assignmentDescription-${newUploadId}"></div>
                <div class="quill-character-counter">
                    <div class="quill-current-counter">0</div>
                    <span>/</span>
                    <div class="quill-max-counter">2000</div>
                </div>
            </div>
            <div class="course-content-input">
                <label class="edit-user-label">Assignment Approval</label>
                <div class="content-input-options-row">
                    <label class="custom-radio">
                        <input class="radio-option" type="radio" name="upload_approval${newUploadId}" data-target="uploadApprovalNone${newUploadId}" value="None" checked="">
                        <span class="custom-radio-button"></span>
                        None
                    </label>
                    <label class="custom-radio">
                        <input class="radio-option" type="radio" name="upload_approval${newUploadId}" data-target="uploadApprovalInstructor${newUploadId}" value="instructor">
                        <span class="custom-radio-button"></span>
                        Instructor
                    </label>
                    <label class="custom-radio">
                        <input class="radio-option" type="radio" name="upload_approval${newUploadId}" data-target="uploadApprovalAdmin${newUploadId}" value="admin">
                        <span class="custom-radio-button"></span>
                        Admin
                    </label>
                    <label class="custom-radio">
                        <input class="radio-option" type="radio" name="upload_approval${newUploadId}" data-target="uploadApprovalOther${newUploadId}" value="other">
                        <span class="custom-radio-button"></span>
                        Other
                    </label>
                </div>
            </div>
            <!-- None Approval -->
            <div id="uploadApprovalNone${newUploadId}" class="toggle-option-details show-toggle-option-details">
                <span class="course-content-input-subtext"> No approval is required for the course assignment. </span>
            </div>
            <!-- Instructor Approval -->
            <div id="uploadApprovalInstructor${newUploadId}" class="toggle-option-details">
                <span class="course-content-input-subtext"> An Instructor must approve the course assignment. </span>
            </div>
            <!-- Admin Approval -->
            <div id="uploadApprovalAdmin${newUploadId}" class="toggle-option-details">
                <span class="course-content-input-subtext"> An Admin must approve the course assignment. </span>
            </div>
            <!-- Other Approval -->
            <div id="uploadApprovalOther${newUploadId}" class="toggle-option-details">
                <span class="course-content-input-subtext"> Please select the User(s) who will approve the course assignment. </span>
                <div class="right-column-file-wrapper">
                    <div id="userDropdownupload_approval${newUploadId}" class="user-dropdown course-content-input">
                        <input type="text" class="userSearch" placeholder="Search users...">
                        <i class="fa-regular fa-magnifying-glass search-icon"></i>
                        <div class="userList scrollable-content"></div>
                        <div class="loadingIndicator" style="display:none;">Loading...</div>
                        <div class="selectedUsers"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    uploadContainer.insertAdjacentHTML('beforeend', newUploadCard);

    // Reassign event listeners to include the new reference card
    assignUploadHeaderListeners();
    testUploadCount();
    initializeRadioOptions();
    initializeClearImageFields();
    initializeQuill(`#assignmentDescription-${newUploadId}`);
    // Initialize dropdown for all containers on the page
    document.querySelectorAll('.user-dropdown').forEach(dropdown => {
        initializeUserDropdown(dropdown.id);
    });
}

// Function to open the popup
function openPopup(popupId, action = null, context = null) {
    const currentPopup = document.getElementById(popupId);
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "flex";
    setTimeout(() => {
        popupContent.classList.add('animate-popup-content');
    }, 100);

    window.activeLessonPopup = currentPopup;

    if(action == 'createLesson'){
        // Determine the closest lesson-container based on the clicked element
        const parentElement = context.closest('.module-card-body');  // Get the parent of the addLesson button
        window.closestLessonContainer = parentElement.querySelector('.lesson-container');  // Find the sibling lesson-container
    }

    if(action == 'selectType'){
        const currentPopup = document.getElementById('lessonSelectionPopup');
        const popupContent = currentPopup.querySelector('.popup-content');
        popupContent.classList.remove('animate-popup-content');
        currentPopup.style.display = "none";
        resetQuizLessonState();
    }

    switch(action) {
        case 'deleteModule':
            window.moduleToDelete = context.closest('.module-card');
            break;
        case 'createLesson':
            window.lessonContext = context;
            break;
        case 'deleteReference':
            window.referenceToDelete = context.closest('.reference-card');
        case 'deleteUpload':
            window.uploadToDelete = context.closest('.upload-card');
        // Add more cases as needed
    }

    // Re-Initializing the assignments to show the updated list within the lesson popups
    document.querySelectorAll('.assignment-dropdown').forEach(dropdown => {
        updateAssignmentDropdown(dropdown.id);
    });
}

function closeCreateLessonPopup(popupId){
    const currentPopup = document.getElementById(popupId);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    currentPopup.style.display = "none";
    // Show Select Lesson Type
    const fileLibrary = document.getElementById('lessonSelectionPopup');
    const popupContent2 = fileLibrary.querySelector('.popup-content');
    fileLibrary.style.display = "flex";
    setTimeout(() => {
        popupContent2.classList.add('animate-popup-content');
    }, 100);
}

// Function to close the popup
function closePopup(popupId) {
    if(popupId === 'moduleDeleteConfirmation'){window.moduleToDelete = null};
    if(popupId === 'referenceDeleteConfirmation'){window.referenceToDelete = null};
    if(popupId === 'uploadDeleteConfirmation'){window.uploadToDelete = null};
    if(popupId === 'editLesson'){
        // Clearing all assignment dropdowns
        setTimeout(() => {
            document.querySelectorAll('.assignment-dropdown').forEach(dropdown => {
                clearSelectedAssignments(dropdown.id);
            });
        }, 300);
    };
    const currentPopup = document.getElementById(popupId);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    setTimeout(() => {
        currentPopup.style.display = "none";
    }, 200);
    clearQuizLessonInputs();
}

// Function to confirm the deletion of a module
function confirmDelete() {
    if (window.moduleToDelete) {
        let moduleId = window.moduleToDelete.getAttribute('data-id');
        if(moduleId){deleteObject('Module', moduleId);}
        window.moduleToDelete.remove();
        window.moduleToDelete = null;
        testModuleCount();
    }
    closePopup('moduleDeleteConfirmation');
}

function confirmReferenceDelete() {
    if (window.referenceToDelete) {
        const section = window.referenceToDelete.closest('.toggle-option-details');
        let referenceId = window.referenceToDelete.getAttribute('data-id');
        if(referenceId){deleteObject('Resources', referenceId);}
        window.referenceToDelete.remove();
        window.referenceToDelete = null;
        testReferenceCount();

        // Select all error fields within the section
        const formErrorFields = section.querySelectorAll('.form-error-field');

        // If no error fields are found, remove the 'form-error-section' class from the section
        if (formErrorFields.length === 0) {
            section.classList.remove('form-error-section');
        }

        closePopup('referenceDeleteConfirmation');
    }
}

function confirmUploadDelete(){
    if (window.uploadToDelete) {
        const section = window.uploadToDelete.closest('.toggle-option-details');
        let uploadId = window.uploadToDelete.getAttribute('data-id');
        if(uploadId){deleteObject('Upload', uploadId);}
        window.uploadToDelete.remove();
        window.uploadToDelete = null;
        testUploadCount();

        // Select all error fields within the section
        const formErrorFields = section.querySelectorAll('.form-error-field');

        // If no error fields are found, remove the 'form-error-section' class from the section
        if (formErrorFields.length === 0) {
            section.classList.remove('form-error-section');
        }

        closePopup('uploadDeleteConfirmation');
    }   
}

// Function to handle creating a lesson
async function createLesson(lessonType) {
    let title;
    let description;
    let fileInput; // This can be a file or a URL
    let fileName;
    let popupToClose;
    let quizData = {};
    let lessonAssignmentsToggle;
    let lessonAssignmentsList = [];

    // Determine the title, description, and file input based on lesson type
    if (lessonType === 'file' && window.closestLessonContainer) {
        title = document.getElementById('lessonTitle').value;
        description = getEditorContent('lessonDescription');
        fileInput = document.getElementById('fileURLInput').value; // This is a a URL from the File Library
        fileName = document.getElementById('lessonFileDisplay').innerText;  
        popupToClose = 'lessonCreationPopup';
    } else if (lessonType === 'SCORM1.2' && window.closestLessonContainer) {
        title = document.getElementById('SCORM1.2lessonTitle').value;
        description = getEditorContent('SCORM12lessonDescription');
        fileInput = document.getElementById('SCORM1.2fileInput').files[0];
        fileName = document.getElementById('SCORM1.2fileNameDisplay').innerText;
        popupToClose = 'scorm1.2Popup';
    } else if (lessonType === 'SCORM2004' && window.closestLessonContainer) {
        title = document.getElementById('SCORM2004lessonTitle').value;
        description = getEditorContent('SCORM2004lessonDescription');
        fileInput = document.getElementById('SCORM2004fileInput').files[0];
        fileName = document.getElementById('SCORM2004fileNameDisplay').innerText;
        popupToClose = 'scorm2004Popup';
    }

    lessonAssignmentsToggle = document.getElementById('lessonAssignmentsToggle').checked;
       

    if (window.closestLessonContainer) {
        const lessonCards = window.closestLessonContainer.querySelectorAll('.lesson-card');
        const index = lessonCards.length + 1; // Index starts at 1

        let fileURL = '';

        // Case: lessonType is 'file' and fileInput is a URL
        if (lessonType === 'file' && typeof fileInput === 'string' && fileInput.startsWith('http')) {
            // Use the URL directly
            fileURL = fileInput;
            createAndAppendLessonCard(index, title, description, fileURL, fileName, lessonType, '', lessonAssignmentsToggle);
        }
        // Case: fileInput is a File object
        else if (fileInput instanceof File) {
            const fileId = await uploadFile(fileInput); // Upload the file and get the ID
            if (fileId) {
                createAndAppendLessonCard(index, title, description, fileId, fileName, lessonType, '', lessonAssignmentsToggle); // Use fileId
            } else {
                console.error('File upload failed, lesson not created');
            }
        } 
        // Handle invalid file input
        else if (lessonType !== 'quiz') {
            console.error('No valid file input provided');
        }        
    }

    closePopup(popupToClose);
    initializeLessonDragAndDrop();
    assignDeleteHandlers();
    assignEditHandlers();

    // Resetting the input fields
    setTimeout(() => {
        if (lessonType === 'file' && window.closestLessonContainer) {
            clearFileLessonInputs();
        } else if (lessonType === 'SCORM1.2' && window.closestLessonContainer) {
            clearSCORM12LessonInputs();
        } else if (lessonType === 'SCORM2004' && window.closestLessonContainer) {
            clearSCORM2004LessonInputs();
        }
    }, 300);
}

function createQuizLesson() {
    const title = document.getElementById('quizlessonTitle').value;
    const description = getEditorContent('quizlessonDescription');
    const quizSource = document.querySelector('input[name="create_quiz_from"]:checked')?.value;
    const selectedQuizTemplateId = document.getElementById('selectedQuizTemplate')?.getAttribute('data-id');
    const selectedQuizTemplateName = document.getElementById('selectedQuizTemplate').value;
    const selectedQuizId = document.getElementById('selectedQuiz')?.getAttribute('data-id');
    const selectedQuizname = document.getElementById('selectedQuiz').value;
    const quizType = document.querySelector('input[name="quiz_type"]:checked')?.value;

    const quizData = {
        create_quiz_from: quizSource,
        quiz_template_id: quizSource === 'create_quiz_from1' ? selectedQuizTemplateId : null,
        selectedQuizTemplateName: selectedQuizTemplateName,
        quiz_id: quizSource === 'create_quiz_from2' ? selectedQuizId : null,
        selectedQuizname: selectedQuizname,
        quiz_type: quizType,
        passing_score: document.getElementById('quiz_passing_score').value,
        require_passing: document.getElementById('quiz_require_passing').checked,
        quiz_duration: document.getElementById('quiz_duration').value,
        quiz_attempts: document.getElementById('quiz_attempts').value,
        maximum_warnings: document.getElementById('quiz_maximum_warnings').value,
        randomize_order: document.getElementById('quiz_randomize_order').checked,
        reveal_answers: document.getElementById('quiz_reveal_answers').checked
    };

    const lessonCards = window.closestLessonContainer.querySelectorAll('.lesson-card');
    const index = lessonCards.length + 1;
    createAndAppendLessonCard(index, title, description, '', '', 'quiz', quizData);

    closePopup('quizSettingsPopup');
    resetQuizLessonState();
    clearQuizLessonInputs();
    console.log(quizData);
}

// Function to upload a file and return the file ID
async function uploadFile(file, isUpdate = false) {
    const formData = new FormData();
    formData.append('file', file); // Attach the file

    try {
        showFileUploadLoading(isUpdate);
        console.log('Uploading file');
        const response = await fetch('/requests/upload-lesson-file/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        if (!response.ok) {
            throw new Error('File upload failed');
        }

        const data = await response.json();
        console.log('Uploaded file ID:', data.file_id);

        // If isUpdate is true, update the editFileURLInput field (used in edit mode)
        if (isUpdate) {
            document.getElementById('editFileURLInput').value = data.file_id; // Set file ID in the edit field
        }

        console.log('Upload finished');
        removeFileUploadLoading(isUpdate);
        return data.file_id; // Return the file ID from the response
    } catch (error) {
        removeFileUploadLoading(isUpdate);
        console.error('Error uploading file:', error);
        return null; // Handle error case as needed
    }
}

function showFileUploadLoading(isUpdate){
    const loadingSymbols = document.querySelectorAll('.loading-symbol-blue-sm');
    // Showing the loading symbol
    for (const symbol of loadingSymbols) {
        symbol.style.display = 'flex'; // Show each loading symbol
    }
    // Blocking all of the inputs and buttons
    const popupBtns = document.querySelectorAll('.popup-btn');
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

function removeFileUploadLoading(isUpdate){
    const loadingSymbols = document.querySelectorAll('.loading-symbol-blue-sm');
    // Showing the loading symbol
    for(const symbol of loadingSymbols){
        symbol.style.display = 'none';
    }

    // Unblocking all of the inputs and buttons
    const popupBtns = document.querySelectorAll('.popup-btn');
    for (const btn of popupBtns) {
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
    }
    const closePopupIcon = document.querySelectorAll('.close-popup-icon');
    for (const btn of closePopupIcon) {
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
    }
    if(isUpdate){
        const finishedLoadingSymbols = document.querySelectorAll('.file-upload-finished');
        // Showing the loading symbol
        for(const symbol of finishedLoadingSymbols){
            symbol.style.display = 'flex';
            symbol.style.opacity = '1';
            setTimeout(() => {
                symbol.style.opacity = '0';
            }, 3000);
            setTimeout(() => {
                symbol.style.display = 'none';
            }, 3400);
        }   
    }
}

function clearFileLessonInputs(){
    const createFileLessonBtn = document.getElementById('createFileLessonBtn');
    document.getElementById('lessonTitle').value = '';
    document.querySelector('#lessonDescription .ql-editor p').innerHTML = '';
    document.getElementById('fileURLInput').value = '';
    document.getElementById('lessonFileDisplay').innerText = 'No file selected';
    // Resetting Create BTN
    createFileLessonBtn.classList.add('disabled');
    createFileLessonBtn.setAttribute('disabled', true);
}
function clearSCORM12LessonInputs(){
    const createFileLessonBtn = document.getElementById('create12LessonBtn');
    document.getElementById('SCORM1.2lessonTitle').value = '';
    document.querySelector('#SCORM12lessonDescription .ql-editor p').innerHTML = '';
    document.getElementById('SCORM1.2fileInput').value = '';
    document.getElementById('SCORM1.2fileNameDisplay').innerText = 'No file selected';
    // Resetting Create BTN
    createFileLessonBtn.classList.add('disabled');
    createFileLessonBtn.setAttribute('disabled', true);
}
function clearSCORM2004LessonInputs(){
    const createFileLessonBtn = document.getElementById('create2004LessonBtn');
    document.getElementById('SCORM2004lessonTitle').value = '';
    document.querySelector('#SCORM2004lessonDescription .ql-editor p').innerHTML = '';
    document.getElementById('SCORM2004fileInput').value = '';
    document.getElementById('SCORM2004fileNameDisplay').innerText = 'No file selected';
    // Resetting Create BTN
    createFileLessonBtn.classList.add('disabled');
    createFileLessonBtn.setAttribute('disabled', true);
}
function clearQuizLessonInputs() {
    setTimeout(() => {
        const quizLessonFirstBtn = document.getElementById('quizLessonFirstBtn');

        // Title and description
        const titleInput = document.getElementById('quizlessonTitle');
        if (titleInput) titleInput.value = '';
        const editor = document.querySelector('#quizlessonDescription .ql-editor');
        if (editor) editor.innerHTML = '<p><br></p>';

        // Reset quiz source selection
        const quizTemplateInput = document.getElementById('selectedQuizTemplate');
        if (quizTemplateInput) {
            quizTemplateInput.value = '';
            quizTemplateInput.removeAttribute('data-id');
        }
        const quizInput = document.getElementById('selectedQuiz');
        if (quizInput) {
            quizInput.value = '';
            quizInput.removeAttribute('data-id');
        }
        document.querySelectorAll('input[name="create_quiz_from"]').forEach(r => r.checked = false);
        const defaultCreateFrom = document.querySelector('input[name="create_quiz_from"][value="create_quiz_from1"]');
        if (defaultCreateFrom) defaultCreateFrom.checked = true;

        // Reset quiz type radio
        document.querySelectorAll('input[name="quiz_type"]').forEach(r => r.checked = false);
        const defaultQuizType = document.querySelector('input[name="quiz_type"][value="standard_quiz"]');
        if (defaultQuizType) defaultQuizType.checked = true;

        const passingScoreInput = document.getElementById('quiz_passing_score');
        if (passingScoreInput) passingScoreInput.value = '70';
        
        const requirePassingInput = document.getElementById('quiz_require_passing');
        if (requirePassingInput) requirePassingInput.checked = false;
        
        const durationInput = document.getElementById('quiz_duration');
        if (durationInput) durationInput.value = '120';
        
        const warningsInput = document.getElementById('quiz_maximum_warnings');
        if (warningsInput) warningsInput.value = '10';
        
        const randomizeInput = document.getElementById('quiz_randomize_order');
        if (randomizeInput) randomizeInput.checked = false;
        
        const revealInput = document.getElementById('quiz_reveal_answers');
        if (revealInput) revealInput.checked = false;    

        // Reset quiz attempts custom dropdown
        const attemptsInput = document.getElementById('quiz_attempts');
        if (attemptsInput) attemptsInput.value = 'Unlimited';

        // Reset Create/Next button state
        if (quizLessonFirstBtn) {
            quizLessonFirstBtn.classList.add('disabled');
            quizLessonFirstBtn.setAttribute('disabled', true);
        }

        // Reset quiz settings button to default mode (creation)
        const createBtn = document.getElementById('createQuizLessonBtn');
        if (createBtn) {
            createBtn.removeAttribute('data-editing');
            createBtn.setAttribute('onclick', 'createQuizLesson()');
            createBtn.innerText = 'Create Lesson';
        }

        // Optional: Reset quiz popup title
        const mainTitle = document.getElementById('quizPopupMainTitle');
        if (mainTitle) mainTitle.innerText = 'Create New Lesson';

        console.log('Quiz lesson inputs cleared to default.');
    }, 300);
}

let tempLessonId = 1;
function createAndAppendLessonCard(index, title, description, fileURL, fileName, lessonType, quizData = {}, lessonAssignmentsToggle) {
    const newLesson = document.createElement('div');
    newLesson.className = 'lesson-card';
    newLesson.setAttribute('data-temp-id', tempLessonId);

    let hiddenInputs = `
        <input class="lesson-file-name" type="hidden" value="${fileName}">
        <input class="lesson-type" type="hidden" value="${lessonType}">
        <input class="lesson-file" type="hidden" value="${fileURL}">
        <input class="lesson-description" type="hidden" value="${description}">
        <input class="lesson-assignments-toggle" type="hidden" value="${lessonAssignmentsToggle}">
    `;

    if (lessonAssignmentsToggle && window.activeLessonPopup) {
        const assignmentDropdown = window.activeLessonPopup.querySelector('.assignment-dropdown');
    
        if (assignmentDropdown) {
            const selectedAssignments = assignmentDropdown.querySelectorAll('.selected-assignment');
    
            selectedAssignments.forEach((assignmentEl, index) => {
                const assignmentId = assignmentEl.getAttribute('data-assignment-id');
                if (!assignmentId) {
                    console.warn(`⚠ Assignment element is missing data-assignment-id`);
                    return;
                }
    
                console.log('assignmentId:', assignmentId);
                const uploadCard = document.querySelector(`.upload-card[data-id='${assignmentId}'], .upload-card[data-temp-id='${assignmentId}']`);
                if (!uploadCard) {
                    console.warn(`⚠ Could not find upload card for assignmentId: ${assignmentId}`);
                    return;
                }
    
                const realId = uploadCard.getAttribute('data-id') || '';
                const tempId = uploadCard.getAttribute('data-temp-id') || '';
    
                hiddenInputs += `
                    <input type="hidden" class="lesson-assignment-id" name="lesson_assignment_id_${index}" value="${realId}">
                    <input type="hidden" class="lesson-assignment-temp-id" name="lesson_assignment_temp_id_${index}" value="${tempId}">
                `;
            });
    
            hiddenInputs += `
                <input type="hidden" class="lesson-assignment-count" value="${selectedAssignments.length}">
            `;
        }
    }       

    // Separate quiz fields
    if (lessonType === 'quiz') {
        hiddenInputs += `
            <input class="lesson-create-quiz-from" type="hidden" value="${quizData.create_quiz_from || ''}">
            <input class="lesson-quiz-template-id" type="hidden" value="${quizData.quiz_template_id || ''}">
            <input class="lesson-selected-quiz-template-name" type="hidden" value="${quizData.selectedQuizTemplateName || ''}">
            <input class="lesson-quiz-id" type="hidden" value="${quizData.quiz_id || ''}">
            <input class="lesson-selected-quiz-name" type="hidden" value="${quizData.selectedQuizname || ''}">
            <input class="lesson-quiz-type" type="hidden" value="${quizData.quiz_type || ''}">
            <input class="lesson-quiz-passing-score" type="hidden" value="${quizData.passing_score}">
            <input class="lesson-quiz-require-passing" type="hidden" value="${quizData.require_passing}">
            <input class="lesson-quiz-duration" type="hidden" value="${quizData.quiz_duration}">
            <input class="lesson-quiz-attempts" type="hidden" value="${quizData.quiz_attempts}">
            <input class="lesson-quiz-maximum-warnings" type="hidden" value="${quizData.maximum_warnings}">
            <input class="lesson-quiz-randomize-order" type="hidden" value="${quizData.randomize_order}">
            <input class="lesson-quiz-reveal-answers" type="hidden" value="${quizData.reveal_answers}">
        `;
    }       

    newLesson.innerHTML = `
        ${hiddenInputs}
        <div class="lesson-header-left">
            <i class="fa-thin fa-grip-dots-vertical lesson-drag-icon"></i>
            <span class="lesson-title"> Lesson ${index}: ${title}</span>
        </div>
        <div class="lesson-header-right">
            <div class="lesson-edit tooltip" data-tooltip="Edit Lesson">
                <span class="tooltiptext">Edit Lesson</span>
                <i class="fa-solid fa-pen"></i>
            </div>
            <div class="lesson-delete tooltip" data-tooltip="Delete Lesson">
                <span class="tooltiptext">Delete Lesson</span>
                <i class="fa-regular fa-trash-can"></i>
            </div>
        </div>
    `;

    window.closestLessonContainer.appendChild(newLesson);
    updateLessonNumbers(window.closestLessonContainer);
    tempLessonId++;
}

function updateQuizLesson() {
    const title = document.getElementById('quizlessonTitle').value;
    const description = getEditorContent('quizlessonDescription');
    const quizType = document.querySelector('input[name="quiz_type"]:checked')?.value;

    const quizData = {
        quiz_type: quizType,
        create_quiz_from: document.querySelector('input[name="create_quiz_from"]:checked')?.value,
        quiz_template_id: document.getElementById('selectedQuizTemplate')?.getAttribute('data-id'),
        selectedQuizTemplateName: document.getElementById('selectedQuizTemplate').value,
        quiz_id: document.getElementById('selectedQuiz')?.getAttribute('data-id'),
        selectedQuizname: document.getElementById('selectedQuiz').value,
        passing_score: document.getElementById('quiz_passing_score').value,
        require_passing: document.getElementById('quiz_require_passing').checked,
        quiz_duration: document.getElementById('quiz_duration').value,
        quiz_attempts: document.getElementById('quiz_attempts').value,
        maximum_warnings: document.getElementById('quiz_maximum_warnings').value,
        randomize_order: document.getElementById('quiz_randomize_order').checked,
        reveal_answers: document.getElementById('quiz_reveal_answers').checked
    };

    updateLessonCard(window.lessonToEdit, title, description, '', '', quizData);

    closePopup('quizSettingsPopup');
    resetQuizLessonState();
}

function resetQuizLessonState() {
    const btn = document.getElementById('createQuizLessonBtn');
    btn.setAttribute('data-editing', 'false');
    btn.setAttribute('onclick', 'createQuizLesson()');
    btn.innerText = 'Create Lesson';
    document.getElementById('quizLessonBackBtn').setAttribute('onclick', 'closeCreateLessonPopup("quizPopup")');
    document.getElementById('quizLessonBackIcon').setAttribute('onclick', 'closeCreateLessonPopup("quizPopup")');
    document.getElementById('quizPopupMainTitle').innerText = 'Create New Lesson';
    window.lessonToEdit = null;
}

function selectLessonType(){
    const selectLessonType = document.getElementById('selectLessonType');
    const lessonTypeOptions = document.querySelectorAll('.lesson-selection-item');

    lessonTypeOptions.forEach(button => {
        button.addEventListener('click', function () {
            selectLessonType.setAttribute('onclick', `openPopup("${button.id}", "selectType", this)`);
        });
    });
}

// Add event listeners for delete buttons
function addDeleteEventListeners() {
    const deleteButtons = document.querySelectorAll('.module-delete');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function () {
            openPopup('moduleDeleteConfirmation', 'deleteModule', button);
        });
    });
}

function addReferenceDeleteEventListeners() {
    const deleteButtons = document.querySelectorAll('.reference-delete');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function () {
            openPopup('referenceDeleteConfirmation', 'deleteReference', button);
        });
    });
}

function addUploadDeleteEventListeners() {
    const deleteButtons = document.querySelectorAll('.upload-delete');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function () {
            openPopup('uploadDeleteConfirmation', 'deleteUpload', button);
        });
    });
}

// Add event listeners for create lesson buttons
function addCreateLessonEventListeners() {
    const createLessonButtons = document.querySelectorAll('.create-lesson-button');

    createLessonButtons.forEach(button => {
        button.addEventListener('click', function () {
            openPopup('lessonCreationPopup', 'createLesson', {
                title: 'New Lesson',
                description: 'Lesson Description'
            });
        });
    });

}

// Function to assign event listeners to upload headers
function assignUploadHeaderListeners() {
    const uploadHeaders = document.querySelectorAll('.upload-dropdown');
    uploadHeaders.forEach(reference => {
        reference.removeEventListener('click', toggleUpload); // Remove existing listeners to prevent duplication
        reference.addEventListener('click', toggleUpload); // Add event listener
    });
}

// Function to assign event listeners to reference headers
function assignReferenceHeaderListeners() {
    const referenceHeaders = document.querySelectorAll('.reference-dropdown');
    referenceHeaders.forEach(reference => {
        reference.removeEventListener('click', toggleReference); // Remove existing listeners to prevent duplication
        reference.addEventListener('click', toggleReference); // Add event listener
    });
}

// Function to toggle upload visibility
function toggleUpload(event) {
    const reference = event.currentTarget;
    reference.classList.toggle('active');
    const cardBody = reference.closest('.upload-card').querySelector('.upload-card-body');
    if (cardBody) {
        cardBody.classList.toggle('hidden');
    }
}

// Function to toggle module visibility
function toggleReference(event) {
    const reference = event.currentTarget;
    reference.classList.toggle('active');
    const cardBody = reference.closest('.reference-card').querySelector('.reference-card-body');
    if (cardBody) {
        cardBody.classList.toggle('hidden');
    }
}

// Function to assign event listeners to module headers
function assignModuleHeaderListeners() {
    const moduleHeaders = document.querySelectorAll('.module-dropdown');
    moduleHeaders.forEach(module => {
        module.removeEventListener('click', toggleModule); // Remove existing listeners to prevent duplication
        module.addEventListener('click', toggleModule); // Add event listener
    });
}

// Function to toggle module visibility
function toggleModule(event) {
    const module = event.currentTarget;
    module.classList.toggle('active');
    const cardBody = module.closest('.module-card').querySelector('.module-card-body');
    if (cardBody) {
        cardBody.classList.toggle('hidden');
    }
}

// Function to add event listeners to all module-delete elements
function addDeleteEventListeners() {
    const deleteButtons = document.querySelectorAll('.module-delete');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Show the custom confirmation popup
            openPopup('moduleDeleteConfirmation', this);
        });
    });
}

// Event listener for the "Add Module" button
document.getElementById('addModule').addEventListener('click', createNewModule);

// Event listener for the "Add Reference" button
document.getElementById('addReference').addEventListener('click', createNewReference);

// Event listener for the "Add Upload" button
document.getElementById('addUpload').addEventListener('click', createNewUpload);

// Lessons
function assignDeleteHandlers() {
    const deleteButtons = document.querySelectorAll('.lesson-delete');

    deleteButtons.forEach(button => {
        button.onclick = function () {
            // Store the lesson to be deleted
            window.lessonToDelete = button.closest('.lesson-card');
            openPopup('lessonDeleteConfirmation');
        };
    });
}

function assignEditHandlers() {
    const editButtons = document.querySelectorAll('.lesson-edit');

    editButtons.forEach(button => {
        button.onclick = function () {
            // Get the lesson card to be edited
            const lessonCard = button.closest('.lesson-card');
            window.lessonToEdit = lessonCard; // Store it globally if needed

            // Extract the title, description, and file URL
            const lessonTitleElement = lessonCard.querySelector('.lesson-title').textContent;
            const title = lessonTitleElement.split(': ')[1]; // Extract title after "Lesson X: "
            const descriptionElement = lessonCard.querySelector('.lesson-description');
            const description = descriptionElement ? descriptionElement.value : '';
            const lessonAssignmentToggle = lessonCard.querySelector('.lesson-assignments-toggle').value;
            let fileURLElement;
            let fileURL;
            
            // Check for and retrieve the lesson type if it exists
            const lessonTypeElement = lessonCard.querySelector('.lesson-type');
            const lessonType = lessonTypeElement ? lessonTypeElement.value : '';  
            
            // Check for and retrieve the file URL if it exists
            if(lessonType === 'file'){
                fileURLElement = lessonCard.querySelector('.lesson-file');
                fileURL = fileURLElement ? fileURLElement.value : '';
            } else if (lessonType === 'SCORM1.2' || lessonType === 'SCORM2004') {
                fileURL = lessonCard.querySelector('.lesson-file').value;
                // Elelemnt we want for file upload editFileURLInput
            }

            // Populate the edit form fields
            document.getElementById('editLessonTitle').value = title;
            document.querySelector('#editLessonDescription .ql-editor').innerHTML = description;
            document.getElementById('editFileURLInput').value = fileURL;
            document.getElementById('editLessonType').className = 'selected-lesson-type';
            
            if (lessonAssignmentToggle === 'true') {
                // Reverse logic, were setting it to false first then clicking the element to have the search assignments fields show up beneath it
                document.getElementById('editLessonAssignmentsToggle').checked = false;
                document.getElementById('editLessonAssignmentsToggle').click();
                const assignmentCount = parseInt(lessonCard.querySelector('.lesson-assignment-count')?.value || 0);
                const selectedAssignments = [];
            
                for (let i = 0; i < assignmentCount; i++) {
                    const id = lessonCard.querySelector(`.lesson-assignment-id[name="lesson_assignment_id_${i}"]`)?.value;
                    const tempId = lessonCard.querySelector(`.lesson-assignment-temp-id[name="lesson_assignment_temp_id_${i}"]`)?.value;
                    const assignmentId = id || tempId;
            
                    if (assignmentId) {
                        // Find the corresponding upload title
                        const card = document.querySelector(`.upload-card[data-id="${assignmentId}"], .upload-card[data-temp-id="${assignmentId}"]`);
                        const titleInput = card?.querySelector('.upload-title');
                        const assignmentTitle = titleInput?.value?.trim() || 'New Assignment';
            
                        selectedAssignments.push({ id: assignmentId, title: assignmentTitle });
                    }
                }
            
                // Now insert them into the assignment dropdown (if it's already rendered)
                const dropdown = document.querySelector('#editLesson .assignment-dropdown'); // adjust selector if needed
                const selectedList = dropdown?.querySelector('.selectedAssignments');
            
                if (dropdown && selectedList) {
                    selectedAssignments.forEach(({ id, title }) => {
                        appendSelectedAssignment(id, title, selectedList);
                    });
                    
                }
            }else{
                document.getElementById('editLessonAssignmentsToggle').checked = true;
                document.getElementById('editLessonAssignmentsToggle').click();
            }
            
            // document.getElementById('lessonFileUploadBtn').setAttribute('onclick', '');

            const editFileUploadSection = document.getElementById('editFileUploadSection');
            if (lessonType === 'file') {
                editFileUploadSection.innerHTML = `
                    <div id="lessonFileUploadBtn" for="lessonFile" class="custom-file-upload-container">
                        <div class="custom-file-upload">
                            <input type="file" id="lessonFile" name="file" style="display: none;" readonly>
                            <i class="fa-solid fa-arrow-up-from-bracket"></i> Choose File
                        </div>
                        <div class="custom-file-title">
                            <span id="editLessonFileDisplay" class="file-name-display">No file selected</span>
                        </div>
                    </div>
                `
                document.getElementById('editLessonType').innerText = 'file';
                document.getElementById('editLessonType').classList.add('pastel-orange');  
                document.getElementById('lessonFileUploadBtn').setAttribute('onclick', 'openFileLibrary("editLesson")');
            } else if (lessonType === 'SCORM1.2') {
                editFileUploadSection.innerHTML = `
                    <label for="SCORM12FileEditInput" class="custom-file-upload-container">
                        <div class="custom-file-upload">
                            <input type="file" id="SCORM12FileEditInput" name="file" style="display: none;" accept=".zip">
                            <i class="fa-solid fa-arrow-up-from-bracket"></i> Choose File
                        </div>
                        <div class="custom-file-title">
                            <span id="editLessonFileDisplay" class="file-name-display">No file selected</span>
                        </div>  
                    </label>
                `
                document.getElementById('editLessonType').innerText = 'SCORM 1.2';
                document.getElementById('editLessonType').classList.add('pastel-purple'); 
                assignFIleInputListeners();
                // document.getElementById('lessonFileUploadBtn').setAttribute('onclick', '');
            } else if (lessonType === 'SCORM2004') {
                editFileUploadSection.innerHTML = `
                    <label for="SCORM2004FileEditInput" class="custom-file-upload-container">
                        <div class="custom-file-upload">
                            <input type="file" id="SCORM2004FileEditInput" name="file" style="display: none;" accept=".zip">
                            <i class="fa-solid fa-arrow-up-from-bracket"></i> Choose File
                        </div>
                        <div class="custom-file-title">
                            <span id="editLessonFileDisplay" class="file-name-display">No file selected</span>
                        </div>  
                    </label>
                `

                document.getElementById('editLessonType').innerText = 'SCORM 2004'; 
                document.getElementById('editLessonType').classList.add('pastel-blue');
                assign2004FIleInputListeners(); 
            } else if (lessonType === 'quiz') {
                openPopup('quizPopup', 'selectType', this);
            
                const btn = document.getElementById('createQuizLessonBtn');
                btn.setAttribute('data-editing', 'true');
                btn.setAttribute('onclick', 'updateQuizLesson()');
                btn.innerText = 'Save Lesson';
            
                document.getElementById('quizLessonBackBtn').setAttribute('onclick', 'closePopup("quizPopup")');
                document.getElementById('quizLessonBackIcon').setAttribute('onclick', 'closePopup("quizPopup")');
                document.getElementById('quizPopupMainTitle').innerText = 'Edit Lesson';
                window.lessonToEdit = lessonCard;
            
                // Fill title and description
                document.getElementById('quizlessonTitle').value = title;
                document.querySelector('#quizlessonDescription .ql-editor').innerHTML = description;
            
                // Pull quiz settings from hidden inputs
                const quizType = lessonCard.querySelector('.lesson-quiz-type')?.value;
                const createFrom = lessonCard.querySelector('.lesson-create-quiz-from')?.value;
                const passingScore = lessonCard.querySelector('.lesson-quiz-passing-score')?.value;
                const requirePassing = lessonCard.querySelector('.lesson-quiz-require-passing')?.value === 'true';
                const duration = lessonCard.querySelector('.lesson-quiz-duration')?.value;
                const attempts = lessonCard.querySelector('.lesson-quiz-attempts')?.value;
                const warnings = lessonCard.querySelector('.lesson-quiz-maximum-warnings')?.value;
                const randomize = lessonCard.querySelector('.lesson-quiz-randomize-order')?.value === 'true';
                const reveal = lessonCard.querySelector('.lesson-quiz-reveal-answers')?.value === 'true';
            
                // Recheck radios
                const quizTypeRadio = document.querySelector(`input[name="quiz_type"][value="${quizType}"]`);
                if (quizTypeRadio) quizTypeRadio.checked = true;
            
                const createFromRadio = document.querySelector(`input[name="create_quiz_from"][value="${createFrom}"]`);
                if (createFromRadio) createFromRadio.checked = true;
            
                // Fill inputs
                document.getElementById('quiz_passing_score').value = passingScore;
                document.getElementById('quiz_require_passing').checked = requirePassing;
                document.getElementById('quiz_duration').value = duration;
                document.getElementById('quiz_attempts').value = attempts;
                document.getElementById('quiz_maximum_warnings').value = warnings;
                document.getElementById('quiz_randomize_order').checked = randomize;
                document.getElementById('quiz_reveal_answers').checked = reveal;
            
                // Restore Quiz Template name + ID
                const selectedTemplateName = lessonCard.querySelector('.lesson-selected-quiz-template-name')?.value || '';
                const selectedTemplateId = lessonCard.querySelector('.lesson-quiz-template-id')?.value || '';
                const templateInput = document.getElementById('selectedQuizTemplate');
                templateInput.value = selectedTemplateName;
                templateInput.setAttribute('data-id', selectedTemplateId);
            
                // Restore Quiz name + ID
                const selectedQuizName = lessonCard.querySelector('.lesson-selected-quiz-name')?.value || '';
                const selectedQuizId = lessonCard.querySelector('.lesson-quiz-id')?.value || '';
                const quizInput = document.getElementById('selectedQuiz');
                quizInput.value = selectedQuizName;
                quizInput.setAttribute('data-id', selectedQuizId);
                initializeSubtextListeners();
            
                return;
            }            
                            
            // Display the file name if you have a display element
            console.log(lessonCard, document.getElementById('editLessonFileDisplay'));
            if (fileURL !== 'undefined' && fileURL !== '') {
                document.getElementById('editLessonFileDisplay').innerText = lessonCard.querySelector('.lesson-file-name').value;
            } else {
                document.getElementById('editLessonFileDisplay').innerText = 'No file selected';
            }

            // Open the edit lesson popup
            openPopup('editLesson');
        };
    });
}

document.getElementById('editLessonBtn').addEventListener('click', function () {
    // Capture the edited data
    const newTitle = document.getElementById('editLessonTitle').value;
    const newDescription = document.querySelector('#editLessonDescription .ql-editor').innerHTML;
    const newFileURL = document.getElementById('editFileURLInput').value;
    const fileName = document.getElementById('editLessonFileDisplay').innerText;

    console.log(newFileURL);

    // Update the lesson with the edited data
    updateLessonCard(window.lessonToEdit, newTitle, newDescription, fileName, newFileURL);

    // Close the edit popup
    closePopup('editLesson');
});


function updateQuizLessonCard(){
    const newTitle = document.getElementById('QuizLessonTitle').value;
    const newDescription = document.querySelector('#QuizLessonDescription .ql-editor').innerHTML;
    const quizType = document.querySelector('input[name="quiz_type"]:checked')?.value;

    const quizData = {
        quiz_type: quizType,
        passing_score: document.getElementById('quiz_passing_score').value,
        require_passing: document.getElementById('quiz_require_passing').checked,
        quiz_duration: document.getElementById('quiz_duration').value,
        quiz_attempts: document.getElementById('quiz_attempts').value,
        maximum_warnings: document.getElementById('quiz_maximum_warnings').value,
        randomize_order: document.getElementById('quiz_randomize_order').checked,
        reveal_answers: document.getElementById('quiz_reveal_answers').checked
    };

    updateLessonCard(window.lessonToEdit, newTitle, newDescription, '', '', quizData);

    closePopup('quizSettingsPopup');
}

function updateLessonCard(lessonCard, newTitle, newDescription, fileName, newFileURL, quizData = {}) {
    const lessonTitleElement = lessonCard.querySelector('.lesson-title');
    const lessonIndex = lessonTitleElement.textContent.split(': ')[0];
    lessonTitleElement.textContent = `${lessonIndex}: ${newTitle}`;

    lessonCard.querySelector('.lesson-description').value = newDescription;

    const lessonType = lessonCard.querySelector('.lesson-type')?.value;
    if (lessonType === 'file' || lessonType === 'SCORM1.2' || lessonType === 'SCORM2004') {
        if (fileName) lessonCard.querySelector('.lesson-file-name').value = fileName;
        if (newFileURL) lessonCard.querySelector('.lesson-file').value = newFileURL;
    }

    if (lessonType === 'quiz') {
        lessonCard.querySelector('.lesson-create-quiz-from').value = quizData.create_quiz_from || '';
        lessonCard.querySelector('.lesson-quiz-template-id').value = quizData.quiz_template_id || '';
        lessonCard.querySelector('.lesson-selected-quiz-template-name').value = quizData.selectedQuizTemplateName || '';
        lessonCard.querySelector('.lesson-quiz-id').value = quizData.quiz_id || '';
        lessonCard.querySelector('.lesson-selected-quiz-name').value = quizData.selectedQuizname || '';
        lessonCard.querySelector('.lesson-quiz-type').value = quizData.quiz_type || '';
        lessonCard.querySelector('.lesson-quiz-passing-score').value = quizData.passing_score || '';
        lessonCard.querySelector('.lesson-quiz-require-passing').value = quizData.require_passing;
        lessonCard.querySelector('.lesson-quiz-duration').value = quizData.quiz_duration || '';
        lessonCard.querySelector('.lesson-quiz-attempts').value = quizData.quiz_attempts || '';
        lessonCard.querySelector('.lesson-quiz-maximum-warnings').value = quizData.maximum_warnings || '';
        lessonCard.querySelector('.lesson-quiz-randomize-order').value = quizData.randomize_order;
        lessonCard.querySelector('.lesson-quiz-reveal-answers').value = quizData.reveal_answers;
    }

    // Remove old assignment-related inputs
    lessonCard.querySelectorAll('.lesson-assignment-id, .lesson-assignment-temp-id, .lesson-assignment-count')
    .forEach(el => el.remove());

    // Recreate inputs from the currently selected assignments
    const assignmentDropdown = document.querySelector('#editLesson .assignment-dropdown');
    if (assignmentDropdown) {
        const selectedAssignments = assignmentDropdown.querySelectorAll('.selected-assignment');

        selectedAssignments.forEach((assignmentEl, index) => {
            const assignmentId = assignmentEl.getAttribute('data-assignment-id');
            if (!assignmentId) return;

            const uploadCard = document.querySelector(`.upload-card[data-id='${assignmentId}'], .upload-card[data-temp-id='${assignmentId}']`);
            if (!uploadCard) return;

            const realId = uploadCard.getAttribute('data-id') || '';
            const tempId = uploadCard.getAttribute('data-temp-id') || '';

            // Create and append updated hidden inputs
            const inputReal = document.createElement('input');
            inputReal.type = 'hidden';
            inputReal.className = 'lesson-assignment-id';
            inputReal.name = `lesson_assignment_id_${index}`;
            inputReal.value = realId;

            const inputTemp = document.createElement('input');
            inputTemp.type = 'hidden';
            inputTemp.className = 'lesson-assignment-temp-id';
            inputTemp.name = `lesson_assignment_temp_id_${index}`;
            inputTemp.value = tempId;

            lessonCard.appendChild(inputReal);
            lessonCard.appendChild(inputTemp);
        });

        // Also add updated count
        const countInput = document.createElement('input');
        countInput.type = 'hidden';
        countInput.className = 'lesson-assignment-count';
        countInput.value = selectedAssignments.length;

        lessonCard.appendChild(countInput);

        // Update the toggle hidden input as well
        const toggleInput = lessonCard.querySelector('.lesson-assignments-toggle');
        if (toggleInput) {
            toggleInput.value = selectedAssignments.length > 0 ? 'true' : 'false';
        }
    }

}

document.getElementById('confirmDeleteButton').addEventListener('click', function () {
    if (window.lessonToDelete) {
        // Get the parent container of the lesson to be deleted
        const container = window.lessonToDelete.closest('.lesson-container');
        let lessonId = window.lessonToDelete.getAttribute('data-id');
        if(lessonId){deleteObject('Lesson', lessonId);}

        // Remove the lesson
        window.lessonToDelete.remove();
        // Re-number the lessons in that specific container
        updateLessonNumbers(container);

        // Close the delete confirmation popup
        closePopup('lessonDeleteConfirmation');
    }
});

// Changing file name for uploads
document.getElementById('cancelDeleteButton').addEventListener('click', function () {
    closePopup('lessonDeleteConfirmation');
    window.lessonToDelete = null; // Clear the stored lesson
});

document.getElementById('SCORM1.2fileInput').addEventListener('change', function(event) {
    const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
    document.getElementById('SCORM1.2fileNameDisplay').textContent = fileName;
});

document.getElementById('SCORM2004fileInput').addEventListener('change', function(event) {
    const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
    document.getElementById('SCORM2004fileNameDisplay').textContent = fileName;
});

function assignFIleInputListeners(){
    document.getElementById('SCORM12FileEditInput').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('editLessonFileDisplay').textContent = file.name; // Update file display name
            uploadFile(file, true);
        } else {
            document.getElementById('editLessonFileDisplay').textContent = 'No file selected';
            document.getElementById('editFileURLInput').value = ''; // Clear the input field if no file is selected
        }
    });
}

function assign2004FIleInputListeners(){
    document.getElementById('SCORM2004FileEditInput').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('editLessonFileDisplay').textContent = file.name; // Update file display name
            uploadFile(file, true);
        } else {
            document.getElementById('editLessonFileDisplay').textContent = 'No file selected';
            document.getElementById('editFileURLInput').value = ''; // Clear the input field if no file is selected
        }
    });
}

// Clearing disabled status on create lesson buttons
function checkLessonFileFields() {
    const lessonTitle = document.getElementById('lessonTitle');
    const fileURLInput = document.getElementById('fileURLInput');
    const createFileLessonBtn = document.getElementById('createFileLessonBtn');

    // Check if both fields have values
    if (lessonTitle.value.length > 0 && fileURLInput.value.length > 0) {
        createFileLessonBtn.classList.remove('disabled');
        createFileLessonBtn.removeAttribute('disabled');
    } else {
        createFileLessonBtn.classList.add('disabled');
        createFileLessonBtn.setAttribute('disabled', true);
    }
}
// Add event listeners to both fields
document.getElementById('lessonTitle').addEventListener('keyup', checkLessonFileFields);

function check2004FileFields() {
    const lessonTitle = document.getElementById('SCORM2004lessonTitle');
    const fileInput = document.getElementById('SCORM2004fileInput');
    const createFileLessonBtn = document.getElementById('create2004LessonBtn');

    // Check if both fields have valid values
    if (lessonTitle.value.length > 0 && fileInput.files.length > 0) {
        createFileLessonBtn.classList.remove('disabled');
        createFileLessonBtn.removeAttribute('disabled');
    } else {
        createFileLessonBtn.classList.add('disabled');
        createFileLessonBtn.setAttribute('disabled', true);
    }
}
// Add event listener to the lessonTitle field (user types in it)
document.getElementById('SCORM2004lessonTitle').addEventListener('keyup', check2004FileFields);
// Add event listener to the file input field (detects file selection)
document.getElementById('SCORM2004fileInput').addEventListener('change', check2004FileFields);

function checkQuizLessonFields() {
    const lessonTitle = document.getElementById('quizlessonTitle');
    const quizLessonFirstBtn = document.getElementById('quizLessonFirstBtn');

    const selectedCreateQuizFrom = document.querySelector('input[name="create_quiz_from"]:checked')?.value;

    const selectedQuizTemplate = document.getElementById('selectedQuizTemplate');
    const selectedQuiz = document.getElementById('selectedQuiz');

    const titleFilled = lessonTitle?.value.trim().length > 0;
    const quizTemplateValid = isValidDataId(selectedQuizTemplate);
    const quizValid = isValidDataId(selectedQuiz);

    let allowProceed = false;

    if (selectedCreateQuizFrom === 'create_quiz_from1') {
        allowProceed = titleFilled && quizTemplateValid;
    } else if (selectedCreateQuizFrom === 'create_quiz_from2') {
        allowProceed = titleFilled && quizValid;
    }

    if (allowProceed) {
        quizLessonFirstBtn.classList.remove('disabled');
        quizLessonFirstBtn.removeAttribute('disabled');
    } else {
        quizLessonFirstBtn.classList.add('disabled');
        quizLessonFirstBtn.setAttribute('disabled', true);
    }
}

function observeAttributeChange(targetId, callback) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-id') {
                callback();
            }
        }
    });

    observer.observe(target, { attributes: true });
}

document.getElementById('SCORM1.2lessonTitle').addEventListener('keyup', function() {
    const createFileLessonBtn = document.getElementById('create12LessonBtn');
    if(this.value.length >= 1){
        createFileLessonBtn.classList.remove('disabled');
        createFileLessonBtn.removeAttribute('disabled');
    }else{
        createFileLessonBtn.classList.add('disabled');
        createFileLessonBtn.setAttribute('disabled', true);
    }
});
document.getElementById('editLessonTitle').addEventListener('keyup', function() {
    const editLessonBtn = document.getElementById('editLessonBtn');
    if(this.value.length >= 1){
        editLessonBtn.classList.remove('disabled');
        editLessonBtn.removeAttribute('disabled');
    }else{
        editLessonBtn.classList.add('disabled');
        editLessonBtn.setAttribute('disabled', true);
    }
});
document.getElementById('newCategoryName').addEventListener('keyup', function() {
    const createCategoryButton = document.getElementById('createCategoryButton');
    if(this.value.length >= 1){
        createCategoryButton.classList.remove('disabled');
        createCategoryButton.removeAttribute('disabled');
    }else{
        createCategoryButton.classList.add('disabled');
        createCategoryButton.setAttribute('disabled', true);
    }
});


function generateCourseData(isSave) {
    setDisabledSaveBtns();
    // Validate data
    const errors = validateCourseData();
    if (errors.length > 0) {
        console.log("Validation Errors:", errors);
        // Errors are being displayed from validateCourseData
        removeDisabledSaveBtns();
        return;
    }

    const formData = new FormData(); // Create FormData object

    if(isSave){formData.append('is_save', true);}

    // Formatting Completion Time
    const hours = document.getElementById('completion_hours').value || 0;
    const minutes = document.getElementById('completion_seconds').value || 0;

    let rawCategory = document.getElementById('category')?.getAttribute('data-id');
    const category = rawCategory && rawCategory !== 'null' ? parseInt(rawCategory) : null;

    // Initialize courseData
    const courseData = {
        id: document.getElementById('courseId') ? document.getElementById('courseId').value : null, // Check for the course ID,
        title: document.getElementById('title').value,
        description: getEditorContent('courseDescription'),
        category_id: category,
        type: 'online',
        status: document.getElementById('status').value,
        estimated_completion_time: `${hours}h ${minutes}m`,
        modules: [],
        credentials: [],
        event_dates: [],
        media: [],
        resources: [],
        uploads: [],
    };

    // Append course ID only if it's not null
    if (courseData.id) {
        formData.append('id', courseData.id); 
    }

    if (courseData.category_id !== null) {
        formData.append('category_id', courseData.category_id);
    }
    // Append basic course data to FormData
    
    formData.append('title', courseData.title);
    formData.append('description', courseData.description);
    formData.append('type', courseData.type);
    formData.append('status', courseData.status);
    formData.append('estimated_completion_time', courseData.estimated_completion_time);

    // Handle certificate credentials
    const certificateCheckbox = document.getElementById('certificate');
    if (certificateCheckbox && certificateCheckbox.checked) {
        const certificateData = {
            type: 'certificate',
            source: document.getElementById('certificateURLInput').value,
            source_title: document.getElementById('certificateSourceDisplay').innerText,
            title: document.getElementById('certTitle').value.trim(),
        };
        courseData.credentials.push(certificateData);
        formData.append('credentials', JSON.stringify(courseData.credentials));
    }

    // Handle Reference Materials
    const referenceMaterialsCheckbox = document.getElementById('referenceMaterials');
    if (referenceMaterialsCheckbox && referenceMaterialsCheckbox.checked) {
        // Get all reference cards
        const referenceCards = document.querySelectorAll('.reference-card');
        referenceCards.forEach((referenceCard, index) => {
            // Extract the dynamic ID from the reference card's ID
            const referenceId = referenceCard.id.split('-')[1]; // Extract the part after 'referenceCard-'

            // Now construct the IDs for other elements based on this referenceId
            const referenceURLInput = document.getElementById(`referenceURLInput-${referenceId}`);
            const referenceTypeInput = document.getElementById(`referenceTypeInput-${referenceId}`);
            const fileTitle = document.getElementById(`referenceSourceDisplay-${referenceId}`);
            const referenceDescriptionEditor = document.getElementById(`referenceDescription-${referenceId}`);
            // This is from already created references
            const realId = referenceCard.getAttribute('data-id') || null;
            const tempId = referenceCard.getAttribute('data-temp-id') || null;

            console.log('realId', realId, 'tempId', tempId);

            // Check if the URL input exists before proceeding
            if (referenceURLInput) {
                const referenceData = {
                    id: realId,
                    temp_id: tempId,
                    type: 'reference',
                    source: referenceURLInput.value,
                    title: referenceCard.querySelector('.reference-title').value.trim(),
                    file_type: referenceTypeInput.value,
                    file_title: fileTitle.innerText,
                    description: getEditorContent(`referenceDescription-${referenceId}`), // This will return an empty string if the editor does not exist
                    order: index + 1,
                };
                courseData.resources.push(referenceData);
            }
        });

        formData.append('resources', JSON.stringify(courseData.resources));
    }

    // Handle Upload Instructions
    const uploadInstructions = getEditorContent('uploadInstructions');  // Assuming you have a getEditorContent function to get the content of the editor

    // Add upload instructions to courseData
    courseData.upload_instructions = uploadInstructions;

    // Append upload instructions to formData
    formData.append('upload_instructions', uploadInstructions);

    // Handle Uploads
    const uploadsCheckbox = document.getElementById('courseUploads');
    if (uploadsCheckbox && uploadsCheckbox.checked) {
        const uploadCards = document.querySelectorAll('.upload-card');
        uploadCards.forEach((uploadCard, index) => {
            const uploadId = uploadCard.getAttribute('data-id') || null;
            const tempId = uploadCard.getAttribute('data-temp-id') || null;

            console.log('uploadId', uploadId, 'tempId', tempId);
            let assignmentURLInput;
            let assignmentTypeInput;
            let fileTitle;

            let approvalType;
            if(uploadId && !tempId){
                approvalType = uploadCard.querySelector(`input[name="upload_approval${uploadId}"]:checked`).value;
                assignmentURLInput = uploadCard.querySelector(`#assignmentURLInput-${uploadId}`);
                assignmentTypeInput = uploadCard.querySelector(`#assignmentTypeInput-${uploadId}`);
                fileTitle = uploadCard.querySelector(`#assignmentSourceDisplay-${uploadId}`);
            }else{
                approvalType = uploadCard.querySelector(`input[name="upload_approval${tempId}"]:checked`).value;
                assignmentURLInput = uploadCard.querySelector(`#assignmentURLInput-${tempId}`);
                assignmentTypeInput = uploadCard.querySelector(`#assignmentTypeInput-${tempId}`);
                fileTitle = uploadCard.querySelector(`#assignmentSourceDisplay-${tempId}`);
            }

            console.log('assignmentURLInput:', assignmentURLInput, 'uploadId:', uploadId, 'tempId:', tempId);
            
            const uploadData = {
                id: uploadId,
                temp_id: tempId,
                type: 'upload',
                title: uploadCard.querySelector('.upload-title').value.trim(),
                description: getEditorContent(`assignmentDescription-${uploadId || tempId}`),
                source: assignmentURLInput?.value || '',
                file_type: assignmentTypeInput?.value || '',
                file_title: fileTitle?.innerText || '',
                approval_type: approvalType,
            };

            // Handle special case for 'Other' approval type (if additional users are selected)
            if (uploadData.approval_type === 'other') {
                const selectedUsers = [];          
                // Query the correct user-item elements inside the uploadCard
                const userList = uploadCard.querySelectorAll('.selected-user');        
                // Extract the data-user-id for each selected user
                userList.forEach(user => {
                    const userId = user.dataset.userId;
                    if (userId) {
                        selectedUsers.push(userId); // Add the user ID to the array
                    }
                });        
                uploadData.selected_approvers = selectedUsers; // Add selected approvers to the upload data
            }

            courseData.uploads.push(uploadData); // Push the upload data into the course resources array
        });
    }

    // Append uploads data to formData
    formData.append('uploads', JSON.stringify(courseData.uploads));

    // Handle Event Dates
    const eventDateSections = [
        {
            name: 'start_date',
            detailsId: 'startDateDetails',
            dateField: 'start_date',
            timeField: 'start_time',
        },
        {
            name: 'expiration_date',
            detailsId: 'selectDateDetails',
            dateField: 'expires_on_date',
            timeField: 'expires_on_time',
            enrollmentFields: {
                years: 'expiration_year',
                months: 'expiration_months',
                days: 'expiration_days',
            }
        },
        {
            name: 'due_date',
            detailsId: 'selectDateDueDate',
            dateField: 'due_on_date',
            timeField: 'due_on_time',
            enrollmentFields: {
                years: 'due_years',
                months: 'due_months',
                days: 'due_days',
            }
        },
        {
            name: 'certificate_expiration_date',
            detailsId: 'selectDateCertificateDetails',
            dateField: 'certificate_expires_on_date',
            timeField: 'certificate_expires_on_time',
            enrollmentFields: {
                years: 'certificate_expiration_year',
                months: 'certificate_expiration_months',
                days: 'certificate_expiration_days',
            }
        }
    ];

    const termsAndConditionsCheckbox = document.getElementById('terms');
    courseData.terms_and_conditions = termsAndConditionsCheckbox.checked;
    formData.append('terms_and_conditions', termsAndConditionsCheckbox.checked);

    courseData.referencesEnabled = referenceMaterialsCheckbox.checked;
    formData.append('referencesEnabled', referenceMaterialsCheckbox.checked);

    courseData.uploadsEnabled = uploadsCheckbox.checked;
    formData.append('uploadsEnabled', uploadsCheckbox.checked);

    const mustComplete = document.querySelector('input[name="must_complete"]:checked').value;
    formData.append('must_complete', mustComplete);

    const isLocked = mustComplete === 'in_order';  // this means by_chapter
    formData.append('locked', isLocked.toString());  // string "true"/"false"

    eventDateSections.forEach((section) => {
        const selectedOption = document.querySelector(`input[name="${section.name}"]:checked`);
        if (selectedOption) {
            const selectedValue = selectedOption.value;

            // Handle "Time From Enrollment" option
            if (section.enrollmentFields && selectedValue === `${section.name}2`) {
                const years = document.getElementById(section.enrollmentFields.years)?.value || 0;
                const months = document.getElementById(section.enrollmentFields.months)?.value || 0;
                const days = document.getElementById(section.enrollmentFields.days)?.value || 0;

                courseData.event_dates.push({
                    type: section.name,
                    from_enrollment: { years, months, days },
                });

                formData.append('event_dates', JSON.stringify(courseData.event_dates));
            }

            // Handle "Select Date" option
            if (selectedValue === `${section.name}3` || selectedValue === `${section.name}2` && section.name === 'start_date') {
                const date = document.getElementById(section.dateField)?.value || '';
                const time = document.getElementById(section.timeField)?.value || '';

                if (date) {  // Only push if the date is provided
                    courseData.event_dates.push({
                        type: section.name,
                        date: date,
                        time: time,
                    });

                    formData.append('event_dates', JSON.stringify(courseData.event_dates));
                }
            }
        }
    });

    // Handle modules and lessons
    const moduleContainers = document.querySelectorAll('.module-card');

    moduleContainers.forEach((moduleContainer, moduleIndex) => {
        const moduleData = {
            id: moduleContainer.getAttribute('data-id') || null,
            temp_id: moduleContainer.getAttribute('data-temp-id') || null,
            title: moduleContainer.querySelector('.module-title')?.value || 'Untitled Module',
            description: moduleContainer.querySelector('.module-description')?.value || '',
            order: moduleIndex + 1,
            lessons: [],
        };

        const lessonCards = moduleContainer.querySelectorAll('.lesson-card');
        lessonCards.forEach((lessonCard, lessonIndex) => {
            const lessonType = lessonCard.querySelector('.lesson-type')?.value || '';
            const lessonData = {
                id: lessonCard.getAttribute('data-id') || null,
                temp_id: lessonCard.getAttribute('data-temp-id') || null,
                title: lessonCard.querySelector('.lesson-title')?.textContent.split(':').slice(1).join(':').trim(),
                description: lessonCard.querySelector('.lesson-description')?.value || '',
                order: lessonIndex + 1,
                content_type: lessonType,
            };

            const assignmentToggle = lessonCard.querySelector('.lesson-assignments-toggle')?.value === 'true';
            lessonData.assignment_toggle = assignmentToggle;

            if (assignmentToggle) {
                const assignmentCount = parseInt(lessonCard.querySelector('.lesson-assignment-count')?.value || '0');
                lessonData.assignments = [];

                for (let i = 0; i < assignmentCount; i++) {
                    const realId = lessonCard.querySelector(`input[name="lesson_assignment_id_${i}"]`)?.value;
                    const tempId = lessonCard.querySelector(`input[name="lesson_assignment_temp_id_${i}"]`)?.value;

                    lessonData.assignments.push({
                        id: realId || null,
                        temp_id: tempId || null,
                    });
                }
            }

            const lessonFileInput = lessonCard.querySelector('.lesson-file');
            const lessonFileName = lessonCard.querySelector('.lesson-file-name').value;

            // Check if it's a file type
            if (lessonType === 'file') {
                lessonData['file_url'] = lessonCard.querySelector('.lesson-file')?.value || '';
                lessonData['file_name'] = lessonCard.querySelector('.lesson-file-name')?.value || '';
            } else if (lessonType.startsWith('SCORM')) {
                lessonData['file_id'] = lessonCard.querySelector('.lesson-file')?.value || '';
            } else if (lessonType === 'quiz') {
                lessonData['create_quiz_from'] = lessonCard.querySelector('.lesson-create-quiz-from')?.value || '';
                const rawTemplateId = lessonCard.querySelector('.lesson-quiz-template-id')?.value;
                lessonData['quiz_template_id'] = rawTemplateId && rawTemplateId.trim() !== '' ? parseInt(rawTemplateId, 10) : null;
                lessonData['selected_quiz_template_name'] = lessonCard.querySelector('.lesson-selected-quiz-template-name')?.value || '';
                const rawQuizId = lessonCard.querySelector('.lesson-quiz-id')?.value;
                lessonData['quiz_id'] = rawQuizId && rawQuizId.trim() !== '' ? parseInt(rawQuizId, 10) : null;
                lessonData['selected_quiz_name'] = lessonCard.querySelector('.lesson-selected-quiz-name')?.value || '';
            
                // QuizConfig values
                lessonData['quiz_type'] = lessonCard.querySelector('.lesson-quiz-type')?.value || '';
                lessonData['passing_score'] = lessonCard.querySelector('.lesson-quiz-passing-score')?.value || '';
                lessonData['require_passing'] = lessonCard.querySelector('.lesson-quiz-require-passing')?.value === 'true';
                lessonData['quiz_duration'] = lessonCard.querySelector('.lesson-quiz-duration')?.value || '';
                lessonData['quiz_attempts'] = lessonCard.querySelector('.lesson-quiz-attempts')?.value || '';
                lessonData['maximum_warnings'] = lessonCard.querySelector('.lesson-quiz-maximum-warnings')?.value || '';
                lessonData['randomize_order'] = lessonCard.querySelector('.lesson-quiz-randomize-order')?.value === 'true';
                lessonData['reveal_answers'] = lessonCard.querySelector('.lesson-quiz-reveal-answers')?.value === 'true';
            }
                        

            // Add lessonData to moduleData
            moduleData.lessons.push(lessonData);
        });

        courseData.modules.push(moduleData); // Add moduleData to courseData.modules array
    });

    // formData.append('courseData', JSON.stringify(courseData));
    formData.append('modules', JSON.stringify(courseData.modules));

    // Handle Media (Thumbnail)
    const thumbnailInput = document.getElementById('thumbnailFileInput');
    const ThumbnailImagePreview = document.getElementById('ThumbnailImagePreview');
    const thumbnailId = document.getElementById('thumbnailId');

    if (ThumbnailImagePreview.src.startsWith('https://')) {
        courseData.media.push({
            id: thumbnailId,
            type: 'thumbnail',
            thumbnail_link: ThumbnailImagePreview.src,
            thumbnail_image: '' // Leave empty if using link
        });
    } else if (thumbnailInput && thumbnailInput.files.length > 0) {
        // Append thumbnail_image file separately
        formData.append('media[0][type]', 'thumbnail');
        formData.append('media[0][thumbnail_image]', thumbnailInput.files[0]);

        // Adjust courseData to reflect the presence of the file
        courseData.media.push({
            type: 'thumbnail',
            thumbnail_link: '',
            thumbnail_image: 'thumbnail_image' // Placeholder, will be handled in view
        });
    }

    formData.append('media', JSON.stringify(courseData.media));

    // Log FormData contents
    for (let [key, value] of formData.entries()) {
        console.log(key, value);
    }

    // Send FormData to Django view
    fetch('/requests/modify-course/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')  // Include CSRF token for security
        },
        body: formData // Send FormData object
    })
    .then(response => response.json())
    .then(data => {
        if(isSave){
            displayValidationMessage('Course saved successfully', true);
            document.getElementById('courseId').value = data.course_id;
        }else{
            window.location.href = data.redirect_url;
            console.log('publish');
        }
        console.log(data, data.modules);

        data.modules.forEach(module => {
            // Try to match by temp_id first (new modules), then fallback to data-id (existing modules)
            let moduleSelector = module.temp_id ? `[data-temp-id='${module.temp_id}']` : `[data-id='${module.id}']`;
        
            const moduleContainer = document.querySelector(moduleSelector);
        
            if (moduleContainer) {
                moduleContainer.setAttribute('data-id', module.id); // Ensure real ID is set
                moduleContainer.removeAttribute('data-temp-id');     // Clean up temp-id if it was there
        
                module.lessons.forEach(lesson => {
                    if (!lesson.temp_id) return;  // Skip if not newly created
                    const lessonCard = moduleContainer.querySelector(`[data-temp-id='${lesson.temp_id}']`);
                    if (lessonCard) {
                        lessonCard.setAttribute('data-id', lesson.id);
                        lessonCard.removeAttribute('data-temp-id'); // Optional cleanup
                    }
                });
            }
        });                

        data.references.forEach(reference => {
            console.log(`Processing reference: temp_id: ${reference.temp_id}, id: ${reference.id}`);
            const referenceContainer = document.querySelector(`.reference-card[data-temp-id='${reference.temp_id}']`);
            if (referenceContainer) {
                referenceContainer.setAttribute('data-id', reference.id);
                console.log(`Updated reference card with temp_id ${reference.temp_id} to ID ${reference.id}`);
            } else {
                console.log(`No reference card found with temp_id ${reference.temp_id}`);
            }
        });

        data.uploads.forEach(upload => {
            console.log(`Processing upload: temp_id: ${upload.temp_id}, id: ${upload.id}`);
            const uploadContainer = document.querySelector(`.upload-card[data-temp-id='${upload.temp_id}']`);
            if (uploadContainer) {
                uploadContainer.setAttribute('data-id', upload.id);
                console.log(`Updated upload card with temp_id ${upload.temp_id} to ID ${upload.id}`);
            } else {
                console.log(`No upload card found with temp_id ${upload.temp_id}`);
            }

            const matchingLessons = document.querySelectorAll(`input.lesson-assignment-temp-id[value='${upload.temp_id}']`);
            matchingLessons.forEach(input => {
                const idInput = input.previousElementSibling;
                if (idInput && idInput.classList.contains('lesson-assignment-id')) {
                    idInput.value = upload.id;
                }
                input.remove();  // Remove temp field if desired
            });
            
        });        

        // Handle success
        removeDisabledSaveBtns();
    })
    .catch((error) => {
        console.error('Error:', error);
        // Handle error
        removeDisabledSaveBtns();
    });
}

// Checking to Ensure that all the required fields and filled in
function validateCourseData() {
    const errors = [];

    // Validate Course Title 
    const title = document.getElementById('title');
    if(!title.value.trim()) {
        displayValidationMessage('Course Title is required', false);
        errors.push('Course Title is required');
        title.classList.add('form-error-field');
    }

    // Validate Reference Materials
    const referenceMaterialsCheckbox = document.getElementById('referenceMaterials');
    if (referenceMaterialsCheckbox && referenceMaterialsCheckbox.checked) {
        // Get all reference cards
        const referenceCards = document.querySelectorAll('.reference-card');

        referenceCards.forEach((referenceCard) => {
            // Extract index from the reference card ID
            const referenceCardId = referenceCard.id; // Example: 'referenceCard-4'
            const referenceIndex = referenceCardId.split('-')[1]; // Gets '4'

            if (!referenceIndex) {
                console.warn(`Reference index not found for card: ${referenceCardId}`);
                return; // Skip this card if the index is undefined
            }

            const referenceSource = document.getElementById(`referenceURLInput-${referenceIndex}`);
            const referenceTitle = referenceCard.querySelector('.reference-title');
            const referenceDescription = getEditorContent(`referenceDescription-${referenceIndex}`);

            // Check if the referenceSource exists
            if (referenceSource) {
                // Validate Reference Source
                if (!referenceSource.value) {
                    displayValidationMessage(`Reference ${referenceIndex} Source is required`, false);
                    errors.push(`Reference ${referenceIndex} Source is required`);
                    referenceSource.closest('.custom-file-upload-container').classList.add('form-error-field');
                    highlightErrorFields(referenceSource.closest('.custom-file-upload-container'));
                }
            } else {
                console.warn(`Reference source for index ${referenceIndex} not found.`);
            }

            // Validate Reference Title
            if (referenceTitle && !referenceTitle.value.trim()) {
                displayValidationMessage(`Reference ${referenceIndex} Title is required`, false);
                errors.push(`Reference ${referenceIndex} Title is required`);
                referenceTitle.classList.add('form-error-field');
                highlightErrorFields(referenceTitle);
            } else if (!referenceTitle) {
                console.warn(`Reference title element not found for index ${referenceIndex}`);
            }
        });
    }

    // Validate Reference Materials
    const courseUploadsCheckbox = document.getElementById('courseUploads');
    if (courseUploadsCheckbox && courseUploadsCheckbox.checked) {
        // Get all reference cards
        const uploadsCards = document.querySelectorAll('.upload-card');

        uploadsCards.forEach((uploadCard) => {
            // Extract index from the reference card ID
            const uploadCardId = uploadCard.id; // Example: 'referenceCard-4'
            const uploadIndex = uploadCardId.split('-')[1]; // Gets '4'

            if (!uploadIndex) {
                console.warn(`Reference index not found for card: ${uploadCardId}`);
                return; // Skip this card if the index is undefined
            }

            const uploadTitle = uploadCard.querySelector('.upload-title');

            // Validate Reference Title
            if (uploadTitle && !uploadTitle.value.trim()) {
                displayValidationMessage(`Upload ${uploadIndex} Title is required`, false);
                errors.push(`Upload ${uploadIndex} Title is required`);
                uploadTitle.classList.add('form-error-field');
                highlightErrorFields(uploadTitle);
            } else if (!uploadTitle) {
                console.warn(`Upload title element not found for index ${uploadIndex}`);
            }
        });
    }


    // Validate start_date - Select Date
    const startDate = document.querySelector('input[name="start_date"]:checked').value;
    if (startDate === 'start_date2' || startDate === 'start_date3') {
        const startDateValue = document.getElementById('start_date');
        if (!startDateValue.value.trim()) {
            displayValidationMessage('Start date is required', false);
            errors.push('Start date is required');
            highlightErrorFields(startDateValue);
        }
    }

    // Validate expiration_date - Select Date
    const expirationStartDate = document.querySelector('input[name="expiration_date"]:checked').value;
    if (expirationStartDate === 'expiration_date3') {
        const expirationStartDateValue = document.getElementById('expires_on_date');
        if (!expirationStartDateValue.value.trim()) {
            displayValidationMessage('Expiration date is required', false);
            errors.push('Expiration date is required');
            highlightErrorFields(expirationStartDateValue);
        }
    }

    // Validate due_date - Select Date
    const dueStartDate = document.querySelector('input[name="due_date"]:checked').value;
    if (dueStartDate === 'due_date3') {
        const dueStartDateValue = document.getElementById('due_on_date');
        if (!dueStartDateValue.value.trim()) {
            displayValidationMessage('Due date is required', false);
            errors.push('Due date is required.');
            highlightErrorFields(dueStartDateValue);
        }
    }

    // Validate expiration_date - Select Date
    const certExpirationStartDate = document.querySelector('input[name="certificate_expiration_date"]:checked').value;
    if (certExpirationStartDate === 'certificate_expiration_date3') {
        const expirationStartDateValue = document.getElementById('certificate_expires_on_date');
        if (!expirationStartDateValue.value.trim()) {
            displayValidationMessage('Expiration date is required', false);
            errors.push('Expiration date is required');
            highlightErrorFields(expirationStartDateValue);
        }
    }

    // Validate expires_on_date
    const expiresOnDateOption = document.querySelector('input[name="expiration_date"]:checked').value;
    if (expiresOnDateOption === 'expiration_date2') {
        const expiresYears = document.getElementById('expiration_year');
        const expiresMonths = document.getElementById('expiration_months').value.trim();
        const expiresDays = document.getElementById('expiration_days').value.trim();
        if (!expiresYears.value.trim() && !expiresMonths && !expiresDays) {
            displayValidationMessage('At least one field for Expiration Date is required', false);
            errors.push('At least one field for Expiration Date is required');
            highlightErrorFields(expiresYears);
        }
        if (expiresYears.value.trim() < 0 || expiresMonths < 0 || expiresDays < 0) {
            displayValidationMessage('Expiration Date may not be a negative number', false);
            errors.push('Expiration Date may not be a negative number');
            highlightErrorFields(expiresYears);
        }
    }

    // Validate Certificate expires_on_date
    const certExpiresOnDateOption = document.querySelector('input[name="certificate_expiration_date"]:checked').value;
    if (certExpiresOnDateOption === 'certificate_expiration_date2') {
        const expiresYears = document.getElementById('certificate_expiration_year');
        const expiresMonths = document.getElementById('certificate_expiration_months').value.trim();
        const expiresDays = document.getElementById('certificate_expiration_days').value.trim();
        if (!expiresYears.value.trim() && !expiresMonths && !expiresDays) {
            displayValidationMessage('At least one field for Expiration Date is required', false);
            errors.push('At least one field for Expiration Date is required');
            highlightErrorFields(expiresYears);
        }
        if (expiresYears.value.trim() < 0 || expiresMonths < 0 || expiresDays < 0) {
            displayValidationMessage('Expiration Date may not be a negative number', false);
            errors.push('Expiration Date may not be a negative number');
            highlightErrorFields(expiresYears);
        }
    }

    // Validate due_on_date
    const dueOnDateOption = document.querySelector('input[name="due_date"]:checked').value;
    if (dueOnDateOption === 'due_date2') {
        const dueYears = document.getElementById('due_years');
        const dueMonths = document.getElementById('due_months').value.trim();
        const dueDays = document.getElementById('due_days').value.trim();
        if (!dueYears.value.trim() && !dueMonths && !dueDays) {
            displayValidationMessage('At least one field for Due Date is required', false);
            errors.push('At least one field for Due Date is required');
            highlightErrorFields(dueYears);
        }
        if (dueYears.value.trim() < 0 || dueMonths < 0 || dueDays < 0) {
            displayValidationMessage('Due Date may not be a negative number', false);
            errors.push('Due Date may not be a negative number');
            highlightErrorFields(dueYears);
        }
    }

    if(errors.length > 1){displayValidationMessage('Please correct the highlighted errors below', false);}

    testErrorFields();
    return errors;
}

function highlightErrorFields(field) {
    
    // Add error classes to the field
    const errorField = field.closest('.edit-user-input');
    const resourceErrorField = field.closest('.reference-card');
    const uploadErrorField = field.closest('.upload-card');

    if(resourceErrorField){
        resourceErrorField.closest('.toggle-option-details').classList.add('form-error-section');
    }
    if(uploadErrorField){
        uploadErrorField.closest('.toggle-option-details').classList.add('form-error-section');
    }
    
    if (errorField) {
        const formControl = errorField.querySelector('.form-control');
        const errorIcon = errorField.querySelector('.input-group-addon');

        // Add the error field class immediately
        formControl.classList.add('form-error-field');
        errorField.closest('.toggle-option-details').classList.add('form-error-section');
        

        // Add the error icon class
        if (errorIcon) {
            errorIcon.classList.add('form-error-icon');
        }
    }
}

function testErrorFields() {
    // Select all elements with the class 'form-error-field'
    const formErrorFields = document.querySelectorAll('.form-error-field');
    console.log(formErrorFields);

    // Iterate through each element
    formErrorFields.forEach(field => {
        const errorSection = field.closest('.toggle-option-details');
        const errorFieldWrapper = field.closest('.edit-user-input');
        const errorIcon = errorFieldWrapper ? errorFieldWrapper.querySelector('.input-group-addon') : null;

        // Add event listeners to handle changes in the input field
        field.addEventListener('input', handleInputChange);
        field.addEventListener('change', handleInputChange);
        field.addEventListener('paste', handleInputChange);
        field.addEventListener('focus', handleInputChange);

        function handleInputChange() {
            // Check the field's value
            if (field.value.trim().length > 0) {
                // Remove the 'form-error-field' class
                field.classList.remove('form-error-field');
                if (errorIcon) {
                    errorIcon.classList.remove('form-error-icon');
                }
            } else {
                // If the field is empty, apply the 'form-error-field' class
                field.classList.add('form-error-field');
                if (errorIcon) {
                    errorIcon.classList.add('form-error-icon');
                }
            }

            // After updating the individual field, check all fields again
            checkAllErrorFields(errorSection);
        }
    });
    handleFileUploadErrorRemoval();
}

function checkAllErrorFields(errorSection) {
    // Check if any fields within the reference section still have the 'form-error-field' class
    if(errorSection){
        const errorFields = errorSection.querySelectorAll('.form-error-field');
        console.log(errorFields, errorSection);

        // If no error fields are present, remove the 'form-error-section' class
        if (errorFields.length === 0) {
            errorSection.classList.remove('form-error-section');
        } else {
            // If there are error fields, ensure the 'form-error-section' class is applied
            errorSection.classList.add('form-error-section');
        }
    }
}

function handleFileUploadErrorRemoval() {
    document.querySelectorAll('input[type="hidden"][id^="referenceURLInput"]').forEach(input => {
        // Listen for changes to the hidden input
        const observer = new MutationObserver(() => {
            // Check if the hidden input has a value (i.e., file uploaded)
            if (input.value.trim().length > 0) {
                const errorSection = input.closest('.toggle-option-details');
                const uploadContainer = input.closest('.custom-file-upload-container');
    
                // Remove the error class if a file has been selected
                if (uploadContainer) {
                    uploadContainer.classList.remove('form-error-field');
                }
                // After updating the individual field, check all fields again
                checkAllErrorFields(errorSection);
            }
        });
    
        // Observe the input field for changes to its value attribute
        observer.observe(input, { attributes: true, attributeFilter: ['value'] });
    });    
}

// Function to convert base64 string to Blob
function base64ToBlob(base64String, mimeType) {
    const byteCharacters = atob(base64String.split(',')[1]); // Remove the data URL prefix
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
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

function initializeToggleOptions() {
    const toggleOptions = document.querySelectorAll('.toggle-option');

    toggleOptions.forEach(function (toggleOption) {
        const courseContentInput = toggleOption.closest('.course-content-input');
        const toggleOptionDetails = courseContentInput?.nextElementSibling;

        // === INITIALIZE BASED ON CURRENT STATE ===
        if (toggleOptionDetails?.classList.contains('toggle-option-details')) {
            toggleOptionDetails.classList.toggle('show-toggle-option-details', toggleOption.checked);
        }

        if (toggleOption.id === 'courseUploads') {
            const editBtn = document.getElementById('editUploadInstructionBtn');
            if (editBtn) {
                editBtn.style.display = toggleOption.checked ? 'flex' : 'none';
            }
        }

        // === ON CHANGE EVENT ===
        toggleOption.addEventListener('change', function () {
            if (toggleOptionDetails?.classList.contains('toggle-option-details')) {
                toggleOptionDetails.classList.toggle('show-toggle-option-details', toggleOption.checked);
            }

            if (toggleOption.id === 'courseUploads') {
                const editBtn = document.getElementById('editUploadInstructionBtn');
                if (editBtn) {
                    editBtn.style.display = toggleOption.checked ? 'flex' : 'none';
                }
            }
        });
    });
}


function initializeRadioOptions() {
    // Get all radio buttons with the class radio-option
    const showOptionRadios = document.querySelectorAll('.radio-option');

    // Add change event listener to each radio button
    showOptionRadios.forEach(function(showOptionRadio) {
        showOptionRadio.addEventListener('change', function() {
            // Get the value of the data-target attribute
            const targetId = showOptionRadio.getAttribute('data-target');
            
            // Find the closest .course-content-input container (which contains the radio buttons)
            const contentInputContainer = showOptionRadio.closest('.course-content-input');

            if (contentInputContainer) {
                // Find all radio buttons within this .course-content-input container
                const relatedRadioButtons = contentInputContainer.querySelectorAll('.radio-option[data-target]');
                
                // Hide only the associated .toggle-option-details for the current group of radio buttons
                relatedRadioButtons.forEach(function(radio) {
                    const relatedId = radio.getAttribute('data-target');
                    const relatedDetailsElement = document.getElementById(relatedId);
                    if (relatedDetailsElement) {
                        relatedDetailsElement.classList.remove('show-toggle-option-details');
                    }
                });

                // Show the relevant .toggle-option-details if this radio is checked
                console.log(targetId);
                if (targetId && showOptionRadio.checked) {
                    const relatedDetailsElement = document.getElementById(targetId);
                    if (relatedDetailsElement) {
                        relatedDetailsElement.classList.add('show-toggle-option-details');
                    }
                }
            }
        });

        // Find the closest .course-content-input container (which contains the radio buttons)
        const contentInputContainer = showOptionRadio.closest('.course-content-input');
            
        if (contentInputContainer) {
           // Find all radio buttons within this .course-content-input container
           const relatedRadioButtons = contentInputContainer.querySelectorAll('.radio-option');
           
           // Hide all the toggle-option-details for the current group of radio buttons
           relatedRadioButtons.forEach(function(radio) {
               const relatedId = radio.getAttribute('data-target');
               const relatedDetailsElement = document.getElementById(relatedId);
               if (relatedDetailsElement) {
                   relatedDetailsElement.classList.remove('show-toggle-option-details');
               }
           });

           // Loop through all radio buttons to find the checked one and show its details
           relatedRadioButtons.forEach(function(radio) {
               if (radio.checked) {
                   const relatedId = radio.getAttribute('data-target');
                   const relatedDetailsElement = document.getElementById(relatedId);
                   if (relatedDetailsElement) {
                       relatedDetailsElement.classList.add('show-toggle-option-details');
                   }
               }
           });
       }
    });
}

function initializeThumbnailPreview(){
    const dropzone = document.getElementById('dropzone');
    const thumbnailFileInput = document.getElementById('thumbnailFileInput');
    const imagePreview = document.getElementById('imagePreview');
    const thumbnailDelete = document.getElementById('thumbnailDelete');
    const thumbnailConfirmDelete = document.getElementById('thumbnailConfirmDelete');

    // Open file dialog when dropzone is clicked
    dropzone.addEventListener('click', () => thumbnailFileInput.click());

    // Remove Current Thumbnail
    thumbnailConfirmDelete.addEventListener('click', (e) => {
        if(document.getElementById('thumbnailId')){
            let thumbnailId = document.getElementById('thumbnailId').value;
            if(thumbnailId){deleteObject('Media', thumbnailId);}
        }
        
        e.preventDefault();
        imagePreview.style.display = "none";
        thumbnailDelete.style.display = "none";
        const ThumbnailImagePreview = document.getElementById('ThumbnailImagePreview');
        ThumbnailImagePreview.src = ''; // Clear the image
        thumbnailFileInput.value = ''; // This clears the selected file

        closePopup('thumbnailDeleteConfirmation');
    });

    // Handle file selection
    thumbnailFileInput.addEventListener('change', handleFile);

    // Handle drag over event
    dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropzone.classList.add('dragging');
    });

    // Handle drag leave event
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragging');
    });

    // Handle file drop
    dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropzone.classList.remove('dragging');
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            handleFile({ target: { files } });
        }
    });

    function handleFile(event) {
        const file = event.target.files[0];

        // Only process if a file is selected
        if (file) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const ThumbnailImagePreview = document.getElementById('ThumbnailImagePreview');
                    ThumbnailImagePreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
                imagePreview.style.display = "flex";
                thumbnailDelete.style.display = "flex";
            } else {
                displayValidationMessage('Please Select an Image for Course Thumbnail', false);
            }
        } else {
            // Do nothing if no file is selected (e.g., the user clicked "Cancel")
            console.log('No file selected');
        }
    }
}

document.getElementById('createCategoryButton').addEventListener('click', function() {
    const parentCategory = document.getElementById('parentCategory').getAttribute('data-id');
    const categoryName = document.getElementById('newCategoryName').value.trim();
    const categoryDescription = getEditorContent('categoryDescription');
    if (categoryName) {
        createCategory(parentCategory, categoryName, categoryDescription, false);

        document.getElementById('newCategoryName').value = ''; // Clear input field
        document.getElementById('parentCategory').setAttribute('data-id', '');
        document.getElementById('parentCategory').value = '';
        closePopup('createCategory');       

        const createCategoryButton = document.getElementById('createCategoryButton');
        createCategoryButton.classList.add('disabled');
        createCategoryButton.setAttribute('disabled', true);
    } else {
        displayValidationMessage('Please enter a category name.', false);
    }
});

const deleteObject = async (type, id) => {
    const url = '/requests/delete-course-object/';
    const data = {
        type: type,  // e.g., 'Course' or 'Certificate'
        id: id      // e.g., 123 (the ID of the object you want to delete)
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')  // If using CSRF protection in Django
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (response.ok) {
            console.log(result.message);
        } else {
            console.error('Error:', result);
        }
    } catch (error) {
        console.error('Request failed:', error);
    }
};

function initializeSubtextListeners() {
    const subtexts = {
        create_quiz_from1: "Select a Quiz Template to attach to this lesson.",
        create_quiz_from2: "Select an existing Quiz to attach to this lesson.",
        standard_quiz: "Standard Quizzes will be taken directly within the course.",
        monitored_quiz: "AI Monitored Quizzes will require webcam and mic access. Quizzes will be taken using our monitored examination environment."
    };

    const quizTypeSubtext = document.querySelector(
        'input[name="quiz_type"]'
    ).closest(".course-content-input").querySelector(".course-content-input-subtext");

    // Toggle visible container based on selected radio
    function toggleQuizFromDetails(value) {
        const container = document.getElementById('quizFromOptions');
        if (!container) return;
    
        container.querySelectorAll(".toggle-option-details").forEach((el) => {
            const target = el.getAttribute("data-target");
            if (target === value) {
                el.classList.add("show-toggle-option-details");
            } else {
                el.classList.remove("show-toggle-option-details");
            }
        });
    }    

    // Initial state setup
    const currentQuizFrom = document.querySelector('input[name="create_quiz_from"]:checked');
    if (currentQuizFrom) {
        toggleQuizFromDetails(currentQuizFrom.value);
    }

    // Add listeners for 'Create Quiz From'
    document.querySelectorAll('input[name="create_quiz_from"]').forEach((input) => {
        input.addEventListener("change", () => {
            toggleQuizFromDetails(input.value);
        });
    });

    // Add listeners for 'Quiz Type'
    document.querySelectorAll('input[name="quiz_type"]').forEach((input) => {
        input.addEventListener("change", () => {
            quizTypeSubtext.textContent = subtexts[input.value];
        });
    });
}

function nextPopupSlide(slideId, currentSlideId){
    if(slideId == 'quiz'){
        let checkedValue = null;
        document.querySelectorAll('input[name="quiz_type"]').forEach(radio => {
            if (radio.checked) {
                checkedValue = radio.value;
            }
        });
        const quizSettingsSubtext = document.getElementById('quizSettingsSubtext');
        if(checkedValue == 'monitored_quiz'){
            quizSettingsSubtext.innerText = 'AI Monitored Quiz';
        }else if(checkedValue == 'standard_quiz'){
            quizSettingsSubtext.innerText = 'Standard Quiz';
        }
        openQuizSettingsSlide(checkedValue);
    }

    const currentPopup = document.getElementById(currentSlideId);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    currentPopup.style.display = "none";

    
}

function previousPopupSlide(slideId, previousSlideId){
    const currentPopup = document.getElementById(slideId);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    currentPopup.style.display = "none";

    openPopup(previousSlideId);
}

function openQuizSettingsSlide(checkedValue){
    openPopup('quizSettingsPopup');
    const standardQuizSettings = document.getElementById('standardQuizSettings');
    const monitoredQuizSettings = document.getElementById('monitoredQuizSettings');
    if(checkedValue == 'monitored_quiz'){
        standardQuizSettings.style.display = 'none';
        monitoredQuizSettings.style.display = 'flex';
        monitoredQuizSettings.style.flexDirection = 'column';
    }else if(checkedValue == 'standard_quiz'){
        monitoredQuizSettings.style.display = 'none';
        standardQuizSettings.style.display = 'flex';
        standardQuizSettings.style.flexDirection = 'column';
    }
    validateQuizSettingsForm();
}

function initializeRequiredQuizFields(){
    const fieldsToWatch = [
        'quiz_passing_score',
        'quiz_duration',
        'quiz_maximum_warnings',
        'quizlessonTitle'
    ];

    fieldsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', validateQuizSettingsForm);
            el.addEventListener('change', validateQuizSettingsForm); // extra safety
        }
    });

    // If quiz type changes, re-validate
    document.querySelectorAll('input[name="quiz_type"]').forEach(radio =>
        radio.addEventListener('change', () => {
            validateQuizSettingsForm();
        })
    );

    // If using a custom dropdown for attempts, track that as well
    document.querySelectorAll('.select-item[data-name="quiz_attempts"]').forEach(item =>
        item.addEventListener('click', () => {
            const attemptsInput = document.getElementById('quiz_attempts');
            if (attemptsInput) {
                attemptsInput.value = item.dataset.value;
                validateQuizSettingsForm();
            }
        })
    );
}

function validateQuizSettingsForm() {
    const createBtn = document.getElementById('createQuizLessonBtn');
    const lessonTitle = document.getElementById('quizlessonTitle').value.trim();
    const quizType = document.querySelector('input[name="quiz_type"]:checked')?.value;
    const createQuizFrom = document.querySelector('input[name="create_quiz_from"]:checked')?.value;

    const passingScore = document.getElementById('quiz_passing_score')?.value;

    const selectedTemplate = document.getElementById('selectedQuizTemplate');
    const selectedQuiz = document.getElementById('selectedQuiz');

    console.log("🏁 Starting validation...");
    console.log("Title:", lessonTitle);
    console.log("Quiz Type:", quizType);
    console.log("Create From:", createQuizFrom);
    console.log("Passing Score:", passingScore);
    console.log("Selected Template ID:", selectedTemplate?.getAttribute('data-id'));
    console.log("Selected Quiz ID:", selectedQuiz?.getAttribute('data-id'));

    let isValid = lessonTitle.length > 0 && passingScore !== '';

    if (quizType === 'monitored_quiz') {
        const duration = document.getElementById('quiz_duration')?.value;
        const warnings = document.getElementById('quiz_maximum_warnings')?.value;
        const attempts = document.getElementById('quiz_attempts')?.value;

        console.log("Monitored Quiz Fields -> Duration:", duration, "Warnings:", warnings, "Attempts:", attempts);

        isValid = isValid &&
            duration !== '' && parseInt(duration) >= 0 &&
            warnings !== '' && parseInt(warnings) >= 0 &&
            attempts !== '';
    }

    if (createQuizFrom === 'create_quiz_from1') {
        const validTemplate = isValidDataId(selectedTemplate);
        console.log("📘 Template valid?", validTemplate);
        isValid = isValid && validTemplate;
    } else if (createQuizFrom === 'create_quiz_from2') {
        const validQuiz = isValidDataId(selectedQuiz);
        console.log("📙 Quiz valid?", validQuiz);
        isValid = isValid && validQuiz;
    }

    console.log("✅ Final validation result:", isValid);

    if (isValid) {
        createBtn.classList.remove('disabled');
        createBtn.removeAttribute('disabled');
    } else {
        createBtn.classList.add('disabled');
        createBtn.setAttribute('disabled', true);
    }
}

function isValidDataId(element) {
    if (!element) return false;
    const dataId = element.getAttribute('data-id');
    return dataId && dataId.trim() !== '' && dataId.trim().toLowerCase() !== 'none' && dataId.trim().toLowerCase() !== 'null';
}