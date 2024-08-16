document.addEventListener("DOMContentLoaded", function() {
    initializeQuill();
    initializeModuleDragAndDrop();
    initializeLessonDragAndDrop();
    testModuleCount();
    assignModuleHeaderListeners();
    addDeleteEventListeners();
    assignDeleteHandlers();
    assignEditHandlers();
    selectLessonType();
    initializeTopRowNav(); 
    initializeToggleOptions();
    initializeRadioOptions();
    initializeThumbnailPreview();
});

function initializeTopRowNav(){
    const detailsTopRow = document.getElementById('mainNavBar');

    // IntersectionObserver callback
    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                document.getElementById('stickyNavBar').style.display = 'flex';
            } else {
                document.getElementById('stickyNavBar').style.display = 'none';
            }
        });
    };

    // Create a new IntersectionObserver instance
    const observer = new IntersectionObserver(observerCallback, {
        threshold: [0]  // Trigger the callback when 0% of the element is visible
    });

    // Observe the target element
    observer.observe(detailsTopRow);
}

function syncNavBarWidth() {
    const adminBody = document.querySelector('.admin-body');
    const stickyNavBar = document.querySelector('#stickyNavBar');
    const sidebarContainer = document.querySelector('.admin-sidebar-container');

    if (adminBody && stickyNavBar && sidebarContainer) {
        // Set the width of #stickyNavBar to match .admin-body
        stickyNavBar.style.width = `${adminBody.clientWidth}px` - (50 + 'px');
        
        // Set the margin-left of #stickyNavBar to the width of .admin-sidebar-container
        stickyNavBar.style.marginLeft = `${sidebarContainer.clientWidth}px`;
    }
}

// Sync widths on page load and window resize
window.addEventListener('load', syncNavBarWidth);
window.addEventListener('resize', syncNavBarWidth);

// Declare quillEditors as a global variable to store all Quill instances
let quillEditors = [];

function initializeQuill() {
    var icons = Quill.import('ui/icons');
    icons['bold'] = '<i class="fa-solid fa-bold"></i>';
    icons['italic'] = '<i class="fa-solid fa-italic"></i>';
    icons['underline'] = '<i class="fa-solid fa-underline"></i>';
    icons['link'] = '<i class="fa-solid fa-link"></i>';
    icons['image'] = '<i class="fa-regular fa-image"></i>';

    // Select all elements with a specific class that should have a Quill editor
    const editors = document.querySelectorAll('.editor-container');

    // Clear the quillEditors array to remove previous references
    quillEditors = [];

    // Initialize a new Quill editor for each editor container and store the instance
    editors.forEach(function(editor) {
        const quill = new Quill(editor, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link', 'image']
                    ],
                    handlers: {
                        // Add custom handlers here
                    }
                }
            }
        });

        // Push the instance to the quillEditors array
        quillEditors.push(quill);
    });
}

function getEditorContent(editorId) {
    const quillEditor = new Quill(`#${editorId}`);
    return quillEditor.root.innerHTML; // or quillEditor.getText() for plain text
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

function hidenoModulesCreated() {
    const noModulesCreated = document.getElementById('noModulesCreated');
    noModulesCreated.style.display = "none";
}

function shownoModulesCreated() {
    const noModulesCreated = document.getElementById('noModulesCreated');
    noModulesCreated.style.display = "flex";
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
function createNewModule() {
    const moduleContainer = document.getElementById('moduleContainer');

    const newModuleCard = `
    <div class="module-card">
        <div class="info-card-header collapsable-header">
            <div class="card-header-left">
                <i class="fa-light fa-grip-dots-vertical module-drag-icon"></i>
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

    // Reassign event listeners to include the new module
    assignModuleHeaderListeners();
    addDeleteEventListeners();
    testModuleCount();
    addCreateLessonEventListeners();
    assignDeleteHandlers();
    assignEditHandlers();
}

// Function to open the popup
function openPopup(popupId, action = null, context = null) {
    const currentPopup = document.getElementById(popupId);
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "flex";
    setTimeout(() => {
        popupContent.classList.add('animate-popup-content');
    }, 100);

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
    }

    switch(action) {
        case 'deleteModule':
            window.moduleToDelete = context.closest('.module-card');
            break;
        case 'createLesson':
            window.lessonContext = context;
            break;
        // Add more cases as needed
    }
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
    const currentPopup = document.getElementById(popupId);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    setTimeout(() => {
        currentPopup.style.display = "none";
    }, 200);
}

// Function to confirm the deletion of a module
function confirmDelete() {
    if (window.moduleToDelete) {
        window.moduleToDelete.remove();
        window.moduleToDelete = null;
        testModuleCount();
    }
    closePopup('moduleDeleteConfirmation');
}

// Function to handle creating a lesson
function createLesson(lessonType) {
    let title;
    let description;
    let fileURLInput;
    let fileName;
    let popupToClose;

    if (lessonType === 'file' && window.closestLessonContainer) {
        title = document.getElementById('lessonTitle').value;
        description = getEditorContent('lessonDescription');
        fileURLInput = document.getElementById('fileURLInput').value;
        fileName = document.getElementById('lessonFileDisplay').innerText;  
        popupToClose = 'lessonCreationPopup';
    } else if (lessonType === 'SCORM1.2' && window.closestLessonContainer) {
        title = document.getElementById('SCORM1.2lessonTitle').value;
        description = getEditorContent('SCORM12lessonDescription');
        fileURLInput = document.getElementById('SCORM1.2fileInput').files[0];
        fileName = document.getElementById('SCORM1.2fileNameDisplay').innerText;
        popupToClose = 'scorm1.2Popup';
    } else if (lessonType === 'SCORM2004' && window.closestLessonContainer) {
        title = document.getElementById('SCORM2004lessonTitle').value;
        description = getEditorContent('SCORM2004lessonDescription');
        fileURLInput = document.getElementById('SCORM2004fileInput').files[0];
        fileName = document.getElementById('SCORM2004fileNameDisplay').innerText;
        popupToClose = 'scorm2004Popup';
    }

    if (window.closestLessonContainer) {
        const lessonCards = window.closestLessonContainer.querySelectorAll('.lesson-card');
        const index = lessonCards.length + 1; // Index starts at 1

        let fileURL = '';

        // Handle file inputs
        if (fileURLInput instanceof File) {
            const reader = new FileReader();
            reader.onload = function (event) {
                fileURL = event.target.result;
                createAndAppendLessonCard(index, title, description, fileURL, fileName, lessonType);
            };
            reader.readAsDataURL(fileURLInput);
        } else {
            fileURL = fileURLInput;
            createAndAppendLessonCard(index, title, description, fileURL, fileName, lessonType);
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

function clearFileLessonInputs(){
    document.getElementById('lessonTitle').value = '';
    document.querySelector('#lessonDescription .ql-editor p').innerHTML = '';
    document.getElementById('fileURLInput').value = '';
    document.getElementById('lessonFileDisplay').innerText = 'No file selected';
    // Resetting Create BTN
    createFileLessonBtn.classList.add('disabled');
    createFileLessonBtn.setAttribute('disabled', true);
}
function clearSCORM12LessonInputs(){
    document.getElementById('SCORM1.2lessonTitle').value = '';
    document.querySelector('#SCORM12lessonDescription .ql-editor p').innerHTML = '';
    document.getElementById('SCORM1.2fileInput').value = '';
    document.getElementById('SCORM1.2fileNameDisplay').innerText = 'No file selected';
    // Resetting Create BTN
    createFileLessonBtn.classList.add('disabled');
    createFileLessonBtn.setAttribute('disabled', true);
}
function clearSCORM2004LessonInputs(){
    document.getElementById('SCORM2004lessonTitle').value = '';
    document.querySelector('#SCORM2004lessonDescription .ql-editor p').innerHTML = '';
    document.getElementById('SCORM2004fileInput').value = '';
    document.getElementById('SCORM2004fileNameDisplay').innerText = 'No file selected';
    // Resetting Create BTN
    createFileLessonBtn.classList.add('disabled');
    createFileLessonBtn.setAttribute('disabled', true);
}

function createAndAppendLessonCard(index, title, description, fileURL, fileName, lessonType) {
    const newLesson = document.createElement('div');
    newLesson.className = 'lesson-card';
    newLesson.innerHTML = `
        <input class="lesson-file-name" type="hidden" value="${fileName}">
        <input class="lesson-type" type="hidden" value="${lessonType}">
        <input class="lesson-file" type="hidden" value="${fileURL}">
        <input class="lesson-description" type="hidden" value='${description}'>

        <div class="lesson-header-left">
            <i class="fa-light fa-grip-dots-vertical lesson-drag-icon"></i>
            <span class="lesson-title"> Lesson ${index}: ${title}</span>
        </div>
        <div class="lesson-header-right">
            <div class="lesson-edit tooltip" data-tooltip="Edit Lesson">
                <span class="tooltiptext">Edit Lesson</span>
                <i class="fa-regular fa-pencil"></i>
            </div>
            <div class="lesson-delete tooltip" data-tooltip="Delete Lesson">
                <span class="tooltiptext">Delete Lesson</span>
                <i class="fa-regular fa-trash-can"></i>
            </div>
        </div>
    `;

    window.closestLessonContainer.appendChild(newLesson);
    updateLessonNumbers(window.closestLessonContainer);
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

// Add event listeners for create lesson buttons
function addCreateLessonEventListeners() {
    const createLessonButtons = document.querySelectorAll('.create-lesson-button');

    createLessonButtons.forEach(button => {
        button.addEventListener('click', function () {
            openPopup('lessonCreationPopup', 'createLesson', {
                title: 'New Lesson',
                description: 'Lesson Description'
            });
            console.log(button);
        });
    });

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
            // document.getElementById('lessonFileUploadBtn').setAttribute('onclick', '');

            const editFileUploadSection = document.getElementById('editFileUploadSection');
            if (lessonType === 'file') {
                editFileUploadSection.innerHTML = `
                    <div id="lessonFileUploadBtn" for="lessonFile" class="custom-file-upload-container">
                        <div class="custom-file-upload">
                            <input type="file" id="lessonFile" name="file" style="display: none;" readonly>
                            <i class="fa-solid fa-upload"></i> Choose File
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
                            <i class="fa-solid fa-upload"></i> Choose File
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
                            <i class="fa-solid fa-upload"></i> Choose File
                        </div>
                        <div class="custom-file-title">
                            <span id="editLessonFileDisplay" class="file-name-display">No file selected</span>
                        </div>  
                    </label>
                `

                document.getElementById('editLessonType').innerText = 'SCORM 2004'; 
                document.getElementById('editLessonType').classList.add('pastel-blue');
                assign2004FIleInputListeners(); 
            }     

            // Display the file name if you have a display element
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

    // Update the lesson with the edited data
    updateLessonCard(window.lessonToEdit, newTitle, newDescription, fileName, newFileURL);

    // Close the edit popup
    closePopup('editLesson');
});

function updateLessonCard(lessonCard, newTitle, newDescription, fileName, newFileURL) {
    // Update the title in the lesson card
    const lessonTitleElement = lessonCard.querySelector('.lesson-title');
    const lessonIndex = lessonTitleElement.textContent.split(': ')[0]; // Keep "Lesson X:"
    lessonTitleElement.textContent = `${lessonIndex}: ${newTitle}`;

    // Update the hidden inputs for description and file URL
    lessonCard.querySelector('.lesson-file-name').value = fileName;
    lessonCard.querySelector('.lesson-description').value = newDescription;
    lessonCard.querySelector('.lesson-file').value = newFileURL;
}

document.getElementById('confirmDeleteButton').addEventListener('click', function () {
    if (window.lessonToDelete) {
        // Get the parent container of the lesson to be deleted
        const container = window.lessonToDelete.closest('.lesson-container');

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
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                document.getElementById('editFileURLInput').value = base64Data; // Store base64 data in the input field
                document.getElementById('editLessonFileDisplay').textContent = file.name; // Update file display name
            };
            reader.readAsDataURL(file);
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
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                document.getElementById('editFileURLInput').value = base64Data; // Store base64 data in the input field
                document.getElementById('editLessonFileDisplay').textContent = file.name; // Update file display name
            };
            reader.readAsDataURL(file);
        } else {
            document.getElementById('editLessonFileDisplay').textContent = 'No file selected';
            document.getElementById('editFileURLInput').value = ''; // Clear the input field if no file is selected
        }
    });
}

// Clearing disabled status on create lesson buttons
document.getElementById('lessonTitle').addEventListener('keyup', function() {
    const createFileLessonBtn = document.getElementById('createFileLessonBtn');
    if(this.value.length >= 1){
        createFileLessonBtn.classList.remove('disabled');
        createFileLessonBtn.removeAttribute('disabled');
    }else{
        createFileLessonBtn.classList.add('disabled');
        createFileLessonBtn.setAttribute('disabled', true);
    }
});

document.getElementById('SCORM2004lessonTitle').addEventListener('keyup', function() {
    const createFileLessonBtn = document.getElementById('create2004LessonBtn');
    if(this.value.length >= 1){
        createFileLessonBtn.classList.remove('disabled');
        createFileLessonBtn.removeAttribute('disabled');
    }else{
        createFileLessonBtn.classList.add('disabled');
        createFileLessonBtn.setAttribute('disabled', true);
    }
});

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


function generateCourseData() {
    const courseData = {
        title: document.getElementById('title').value,
        description: getEditorContent('courseDescription'),
        category_id: 1,
        type: "online",
        modules: []
    };

    const moduleContainers = document.querySelectorAll('.module-card');
    moduleContainers.forEach((moduleContainer, moduleIndex) => {
        // Ensure .module-title is correctly selected
        const moduleTitleElement = moduleContainer.querySelector('.module-title');
        const moduleTitle = moduleTitleElement ? moduleTitleElement.value : 'Untitled Module';

        const moduleDescriptionElement = moduleContainer.querySelector('.module-description');
        const moduleDescription = moduleDescriptionElement ? moduleDescriptionElement.value : '';

        const moduleData = {
            title: moduleTitle,
            description: moduleDescription,
            order: moduleIndex + 1,
            lessons: []
        };

        const lessonCards = moduleContainer.querySelectorAll('.lesson-card');
        lessonCards.forEach((lessonCard, lessonIndex) => {
            const lessonTitle = lessonCard.querySelector('.lesson-title').textContent.trim();
            const lessonType = lessonCard.querySelector('.lesson-type').value;
            const lessonFile = lessonCard.querySelector('.lesson-file').value;
            const lessonDescription = lessonCard.querySelector('.lesson-description').value;

            const lessonData = {
                title: lessonTitle,
                description: lessonDescription,
                order: lessonIndex + 1,
                content_type: lessonType,
                content: {
                    file: lessonFile
                }
            };

            moduleData.lessons.push(lessonData);
        });

        courseData.modules.push(moduleData);
    });

    console.log(JSON.stringify(courseData, null, 2));

    // Send courseData to Django view
    fetch('/requests/modify-course/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')  // Include CSRF token for security
        },
        body: JSON.stringify(courseData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        // Handle success
    })
    .catch((error) => {
        console.error('Error:', error);
        // Handle error
    });
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

function initializeToggleOptions(){
    // Get all toggle-option checkboxes
    const toggleOptions = document.querySelectorAll('.toggle-option');
    
    // Add change event listener to each checkbox
    toggleOptions.forEach(function(toggleOption) {
        toggleOption.addEventListener('change', function() {
            // Find the closest .course-content-input container
            const courseContentInput = toggleOption.closest('.course-content-input');
            
            if (courseContentInput) {
                // Find the next .toggle-option-details sibling
                const toggleOptionDetails = courseContentInput.nextElementSibling;
                
                if (toggleOptionDetails && toggleOptionDetails.classList.contains('toggle-option-details')) {
                    // Add or remove the 'show' class based on checkbox state
                    if (toggleOption.checked) {
                        toggleOptionDetails.classList.add('show-toggle-option-details');
                    } else {
                        toggleOptionDetails.classList.remove('show-toggle-option-details');
                    }
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
                if (targetId && showOptionRadio.checked) {
                    const relatedDetailsElement = document.getElementById(targetId);
                    if (relatedDetailsElement) {
                        relatedDetailsElement.classList.add('show-toggle-option-details');
                    }
                }
            }
        });
    });
}

function initializeThumbnailPreview(){
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const thumbnailDelete = document.getElementById('thumbnailDelete');

    // Open file dialog when dropzone is clicked
    dropzone.addEventListener('click', () => fileInput.click());

    // Remove Current Thumbnail
    thumbnailDelete.addEventListener('click', (e) => {
        e.preventDefault();
        imagePreview.style.display = "none";
        thumbnailDelete.style.display = "none";
        const ThumbnailImagePreview = document.getElementById('ThumbnailImagePreview');
        ThumbnailImagePreview.src = ''; // Clear the image
    });

    // Handle file selection
    fileInput.addEventListener('change', handleFile);

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
                alert('Please select a valid image file.');
            }
        } else {
            // Do nothing if no file is selected (e.g., the user clicked "Cancel")
            console.log('No file selected');
        }
    }
}