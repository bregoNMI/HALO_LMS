document.addEventListener("DOMContentLoaded", function() {
    initializeQuill();
    initializeModuleDragAndDrop();
    initializeLessonDragAndDrop();
    testModuleCount();
    assignModuleHeaderListeners();
    addDeleteEventListeners();
});

// Function to initialize Quill editor
function initializeQuill() {
    var icons = Quill.import('ui/icons');
    icons['bold'] = '<i class="fa-solid fa-bold"></i>';
    icons['italic'] = '<i class="fa-solid fa-italic"></i>';
    icons['underline'] = '<i class="fa-solid fa-underline"></i>';
    icons['link'] = '<i class="fa-solid fa-link"></i>';
    icons['image'] = '<i class="fa-regular fa-image"></i>';

    new Quill('#editor-container', {
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
    Sortable.create(document.querySelector('.lesson-container'), {
        animation: 200, // Optional: animation duration in ms
        handle: '.lesson-drag-icon',
        ghostClass: 'sortable-ghost', // Optional: class for the ghost element
    });
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
                <div class="lesson-card">
                    <div class="lesson-header-left">
                        <i class="fa-light fa-grip-dots-vertical lesson-drag-icon"></i>
                        <span class="lesson-title"> Lesson 1: </span>
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
                </div>
            </div>
            <div onclick="openPopup('lessonCreationPopup', 'createLesson', this)" id="addLesson" class="secondary-add-btn">
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
}

// Function to open the popup
function openPopup(popupId, action = null, context = null) {
    const currentPopup = document.getElementById(popupId);
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "flex";
    setTimeout(() => {
        popupContent.classList.add('animate-popup-content');
    }, 100);

    // Perform specific actions based on the provided action parameter
    switch(action) {
        case 'deleteModule':
            // Store the module to be deleted in a global variable or data attribute
            window.moduleToDelete = context.closest('.module-card');
            break;
        case 'createLesson':
            // Store the context for creating a lesson as an object with multiple values
            window.lessonContext = context;
            // Pre-fill the popup with the context values
            if (context && context.title && context.description) {
                document.getElementById('lessonTitle').value = context.title;
                document.getElementById('lessonDescription').value = context.description;
            }
            break;
        // Add more cases as needed
    }
}

// Function to close the popup
function closePopup(popupId) {
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
function createLesson() {
    if (window.lessonContext) {
        const title = document.getElementById('lessonTitle').value;
        const description = document.getElementById('lessonDescription').value;
        const file = document.getElementById('lessonFile').files[0];

        // Implement lesson creation logic here using the context values and formData
        console.log("Creating lesson with title:", title, "description:", description, "and file:", file);
    }
    closePopup('lessonCreationPopup');
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
