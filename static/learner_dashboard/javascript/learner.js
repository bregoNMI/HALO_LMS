// JavaScript to set custom tooltip text
document.querySelectorAll('.tooltip').forEach(function(elem) {
    const tooltipText = elem.getAttribute('data-tooltip');
    const tooltipSpan = elem.querySelector('.tooltiptext');
    tooltipSpan.textContent = tooltipText;
});

function toggleDropdown() {
    document.getElementById("learnerDropdownContent").classList.toggle("show");
}

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
    if (!event.target.matches('.learner-dropdown-menu-icon, .learner-dropdown-menu-icon *, .learner-impersonate *')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// Proccessing the correct Django variables
document.addEventListener('DOMContentLoaded', function() {
    initializeHeaderVariables();
    initializeCurrentURL();
    initializeCardListeners();
    initializeAlertMessages();
    initializeProfileInputListeners();
    initializeEnrollmentTextListener();

    flatpickr(".date-picker", {
        altInput: true,
        altFormat: "F j, Y",  // Display format (e.g., "July 27, 1986")
        dateFormat: flatpickr_format,   // Format used for submission (e.g., "1986-07-27")
        allowInput: true       // Allow manual input
    });

    const changePasswordForm = document.getElementById('change-password-form');
    if(changePasswordForm){
        document.getElementById('change-password-form').addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent form from submitting the usual way
            console.log('testing');
        
            const formData = new FormData(this);
        
            fetch("/change-password/", {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
            })
            .then(response => response.json())    
            .then(data => {
        
                if (data.success) {
                    // Display success message
                    displayValidationMessage(`${data.message}`, true);
        
                    // Optionally close the popup after a successful password update
                    setTimeout(() => {
                        closePopup('changePasswordPopup');
                    }, 2000);
                } else {
                    // Display error message
                    displayValidationMessage(`${data.message}`, false);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                displayValidationMessage('An error occurred. Please try again', false);
            });
        });
    }

    // When clicking on the flatpickr icon, trigger the input click to open the picker
    const flatpickrIcons = document.querySelectorAll('.input-group-addon');
    flatpickrIcons.forEach(icon => {
        icon.addEventListener("click", function () {
            const input = icon.previousElementSibling || icon.parentElement.querySelector('input');
            if (input) input.click();
        });
    });

    const flatPickrInputs = document.querySelectorAll('.flatpickr-input, .time-picker');

    flatPickrInputs.forEach(input => {
        const container = input.parentElement;

        if (container) {
            // Create clear button
            const clearBtn = document.createElement('div');
            clearBtn.className = 'flatpickr-clear-input';
            clearBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
            container.appendChild(clearBtn);

            // Basic styling (or use your own CSS)
            clearBtn.style.cursor = 'pointer';
            clearBtn.style.visibility = 'hidden';
            clearBtn.style.opacity = '0';
            clearBtn.style.transition = 'opacity 0.2s ease';

            // Hover show/hide behavior
            container.addEventListener('mouseenter', () => {
                clearBtn.style.visibility = 'visible';
                clearBtn.style.opacity = '1';
            });

            container.addEventListener('mouseleave', () => {
                clearBtn.style.visibility = 'hidden';
                clearBtn.style.opacity = '0';
            });

            // Clear button click handler
            clearBtn.addEventListener('click', () => {
                if (input._flatpickr) {
                    input._flatpickr.clear();
                    input.value = '';               
                } else {
                    input.value = '';
                    input.previousElementSibling.value = '';
                }
            });
        }
    });

    document.querySelectorAll('.tab-content-description').forEach(container => {
        const content = container.querySelector('.description-content');
        const toggle = container.querySelector('.read-more-toggle');
        const wrapper = container.querySelector('.description-wrapper');

        if (content.scrollHeight > 200) {
            // Content exceeds 200px, limit it and show "Read More"
            wrapper.classList.add('collapsed');
            toggle.style.display = 'block';
        } else {
            // Content fits, hide toggle
            toggle.style.display = 'none';
        }
    });

    // Animating Resume Course progress bar
    setTimeout(() => {
        document.querySelectorAll('.progress-bar').forEach(bar => {
            const progress = bar.getAttribute('data-progress');
            bar.style.width = progress + '%';
        });
    }, 200);
});

function initializeHeaderVariables(){
    // Process header title
    var headerTitleElement = document.getElementById('headerTitle');
    if(headerTitleElement){
        var headerTitle = headerTitleElement.getAttribute('data-header-title');
        var firstName = headerTitleElement.getAttribute('data-first-name');
        var lastName = headerTitleElement.getAttribute('data-last-name');

        if (headerTitle.includes('{{ first_name }}')) {
            headerTitle = headerTitle.replace('{{ first_name }}', firstName);
        }
        if (headerTitle.includes('{{ last_name }}')) {
            headerTitle = headerTitle.replace('{{ last_name }}', lastName);
        }
        headerTitleElement.textContent = headerTitle;
    }   

    // Process header subtext
    var headerSubtextElement = document.getElementById('headerSubtext');
    if(headerSubtextElement){
        var headerSubtext = headerSubtextElement.getAttribute('data-header-subtext');

        if (headerSubtext.includes('{{ first_name }}')) {
            headerSubtext = headerSubtext.replace('{{ first_name }}', firstName);
        }
        if (headerSubtext.includes('{{ last_name }}')) {
            headerSubtext = headerSubtext.replace('{{ last_name }}', lastName);
        }
        headerSubtextElement.innerHTML = headerSubtext;
    }
}

function initializeCurrentURL(){
    const sidebarOptions = document.querySelectorAll(".learner-sidebar-option");
        
    const currentPath = window.location.pathname;

    sidebarOptions.forEach(function(option) {
        if (option.getAttribute("href") === currentPath) {
            option.classList.add("active");
        }
    });
}

function initializeCardListeners(){
    // Hiding / Showing User Card
    const cardHeaders = document.querySelectorAll('.card-header-right');

    cardHeaders.forEach(header => {
        header.addEventListener('click', function() {

            // Toggle 'active' class on the clicked element
            header.classList.toggle('active');

            console.log('yurrr');

            // Find the nearest .info-card-body and toggle its visibility
            const cardBody = header.closest('.details-info-card').querySelector('.info-card-body');
            if (cardBody) {
                cardBody.classList.toggle('hidden'); // 'hidden' class should be styled with display: none;
            }
        });
    });
}

function initializeAlertMessages(){
    // Select all elements with the class 'alert'
    var alerts = document.querySelectorAll('.alert-container');

    // Loop through each alert and add a new class if the alert is visible
    alerts.forEach(function(alert) {
        // Check if the alert is visible (you can customize this condition)
        if (window.getComputedStyle(alert).display !== 'none') {
            // Add a class to the active alert
            alert.classList.add('animate-alert-container');
            setTimeout(() => {
                alert.classList.remove('animate-alert-container');
            }, 8000);
        }
    });
}

function initializeProfileInputListeners() {
    // Select all relevant input fields and custom select elements
    const inputs = document.querySelectorAll('.edit-user-input input:not([readonly]):not(.password-field), .select-selected');
    
    inputs.forEach(input => {
        // For input elements (text fields, etc.)
        if (input.tagName === 'INPUT') {
            input.addEventListener('input', function () {
                showsaveButtonPlatform();
            });
            input.addEventListener('change', function () {
                showsaveButtonPlatform();
            });
        }
        
        // For custom select boxes (dropdowns)
        if (input.classList.contains('select-selected')) {
            input.addEventListener('click', function () {
                // Add listener for when user selects an option from the dropdown
                input.closest('.custom-select').querySelectorAll('.select-item').forEach(item => {
                    item.addEventListener('click', function() {
                        showsaveButtonPlatform();
                    });
                });
            });
        }
    });
}

function showsaveButtonPlatform(){
    const saveButtonPlatform = document.getElementById('saveButtonPlatform');
    if(saveButtonPlatform){saveButtonPlatform.classList.add('animate-save-button-platform');}
}

/* My Courses Page JS */
function openCourseItemPopup(courseItem) {
    const currentPopup = courseItem.nextElementSibling;  // Find the nearest sibling (the popup)
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "flex";
    setTimeout(() => {
        popupContent.classList.add('animate-popup-content');
    }, 100);
    setTimeout(() => {
        initializeTabs(currentPopup);
    }, 400);
    checkOverflow();
}

// Function to close a specific popup
function closeCourseItemPopup(popup) {
    const popupContent = popup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    setTimeout(() => {
        popup.style.display = "none";
    }, 200);
}

// Add event listeners to all course items to trigger the popup
document.addEventListener('DOMContentLoaded', function() {
    const courseItems = document.querySelectorAll('.course-item');
    courseItems.forEach(courseItem => {
        courseItem.addEventListener('click', function() {
            openCourseItemPopup(courseItem);  // Pass the clicked course-item to openPopup
        });
    });
});

function initializeTabs(popup) {
    const tabsContainer = popup.querySelector('.tabs');
    const tabContents = popup.querySelectorAll('.tab-content');
    const activeTab = tabsContainer.querySelector('.tab.active');
    updateIndicator(activeTab);
    console.log(tabsContainer);
    
    const tabs = tabsContainer.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));  // Remove 'active' class from all tabs
            this.classList.add('active');  // Add 'active' class to the clicked tab
            updateIndicator(this);  // Update the indicator position
            
            const target = this.getAttribute('data-target');  // Get the target content ID
            tabContents.forEach(content => {
                if (content.id === target) {
                    content.classList.add('active');  // Show the correct tab content
                } else {
                    content.classList.remove('active');  // Hide other tab contents
                }
            });
            checkOverflow();
        });
    });
}

function updateIndicator(activeTab) {
    const tabIndicator = activeTab.closest('.tabs').querySelector('.tab-indicator');
    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = activeTab.closest('.tabs').getBoundingClientRect();
    
    tabIndicator.style.width = `${tabRect.width}px`;
    tabIndicator.style.transform = `translateX(${tabRect.left - containerRect.left}px)`;
}

function toggleDescription(event) {
    event.preventDefault();

    const descriptionWrapper = event.target.previousElementSibling;
    
    if (descriptionWrapper.classList.contains('expanded')) {
        descriptionWrapper.classList.remove('expanded');
        event.target.textContent = 'Read More';
    } else {
        descriptionWrapper.classList.add('expanded');
        event.target.textContent = 'Read Less';
    }
}

// Function to check if the description is overflowing and show/hide the read more button
function checkOverflow() {
    const descriptions = document.querySelectorAll('.description-wrapper');
    descriptions.forEach(wrapper => {
        const content = wrapper.querySelector('.description-content');
        const readMoreToggle = wrapper.nextElementSibling;
        const fadeOverlay = wrapper.querySelector('.fade-overlay');

        // Checking if the content is overflowing
        if (content.scrollHeight > wrapper.clientHeight + 1) {
            readMoreToggle.style.display = 'block';  // Show the "Read More" button
            fadeOverlay.style.display = 'block';     // Show the fade overlay
        } else if(!wrapper.classList.contains('expanded')){
            readMoreToggle.style.display = 'none';   // Hide the "Read More" button
            fadeOverlay.style.display = 'none';      // Hide the fade overlay
        }
    });
}

function launchCourse(lessonId){
    setDisabledSaveBtns();

    if (!lessonId) {
        console.log("LessonID: ", lessonId)
        console.error("Lesson ID is missing!");
        return;
    }

    // Sending request to update last_opened_course
    fetch('/requests/opened-course-data/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams({
            'lesson_id': lessonId,
        }),
    })
    .then(async response => {
        const data = await response.json();
    
        if (!response.ok) {
            displayValidationMessage(data.error || 'Failed to open.', false);            
            return;
        }
    
        console.log(`Launching course with Lesson ID: ${lessonId}`);
        // This is what actually launches the course
        window.location.href = `/launch_scorm_file/${lessonId}/`;
         
    })    
    .catch(error => {
        console.error('Unexpected error:', error);
        displayValidationMessage('Something went wrong. Please try again.', false);
    }); 
}

function setDisabledWidget() {
    let learnerSaveBtns = document.querySelectorAll('.resume-course');
    
    for (const btn of learnerSaveBtns) {
        setTimeout(() => {
            btn.setAttribute('disabled', true);
        }, 100);
        btn.classList.add('disabled');
        btn.style.opacity = '0.6';
        btn.style.color = 'var(--primary-blue)';

        if (!btn.dataset.originalHtml) {
            btn.dataset.originalHtml = btn.innerHTML;
        }

        const savedWidth = btn.offsetWidth + "px";
        const savedHeight = btn.offsetHeight + "px";

        btn.style.width = savedWidth;
        btn.style.height = savedHeight;

        btn.innerHTML += `<i class="fa-regular fa-spinner-third fa-spin" style="--fa-animation-duration: 1s; position: absolute; top: 50%;left: 50%; transform: translate(-50%, -50%); font-size: 1.4rem;">`;
    }
    removeDisabledSaveBtns();
}

function setDisabledSaveBtns() {
    let learnerSaveBtns = document.querySelectorAll('.learner-save-btns');

    for (const btn of learnerSaveBtns) {
        setTimeout(() => {
            btn.setAttribute('disabled', true);
        }, 100);
        btn.classList.add('disabled');
        btn.style.justifyContent = 'center';
        btn.style.alignItems = 'center';

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

function removeDisabledSaveBtns() {
    setTimeout(() => {
        const learnerSaveBtns = document.querySelectorAll('.learner-save-btns');
        for (const btn of learnerSaveBtns) {
            btn.classList.remove('disabled');
            btn.removeAttribute('disabled');

            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }

            btn.style.width = "";
            btn.style.height = "";
        }
    }, 400);
}

// Enrollment Key logic
function initializeEnrollmentTextListener(){
    const enrollmentKeyName = document.getElementById('enrollment_key_name');
    if(enrollmentKeyName){
        enrollmentKeyName.addEventListener('keyup', function() {
            const enrollmentKeyBtn = document.getElementById('enrollmentKeyBtn');
            if(this.value.length >= 1){
                enrollmentKeyBtn.classList.remove('disabled');
                enrollmentKeyBtn.removeAttribute('disabled');
            }else{
                enrollmentKeyBtn.classList.add('disabled');
                enrollmentKeyBtn.setAttribute('disabled', true);
            }
        });
    }
}

// Function to create a submit enrollment key
function submitEnrollmentKey() {
    
    setDisabledSaveBtns();
    document.getElementById('validation-text').innerHTML = '';

    const keyName = document.getElementById('enrollment_key_name').value.trim();
    console.log(keyName);
    fetch('/requests/submit-enrollment-key/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams({
            'key_name': keyName,
        }),
    })
    .then(async response => {
        const data = await response.json();
    
        if (!response.ok) {
            removeDisabledSaveBtns();
            displayValidationText(data.error || 'Failed to submit key.', false);            
            return;
        }
    
        if (data.enrolled_courses?.length > 0) {
            const count = data.enrolled_courses.length;
            const label = count === 1 ? 'course' : 'courses';
        
            const courseList = document.createElement('ul');
            data.enrolled_courses.forEach(course => {
                const li = document.createElement('li');
                li.textContent = course;
                courseList.appendChild(li);
            });
        
            displayValidationText(`You have been enrolled in the following ${label}:`, true, courseList);
            showViewCourseBtn();
        } else {
            displayValidationText('You are already enrolled in all associated courses.', true);
            showViewCourseBtn();
        }        
    })    
    .catch(error => {
        console.error('Unexpected error:', error);
        displayValidationText('Something went wrong. Please try again.', false);
    });
}

function showViewCourseBtn(){
    removeDisabledSaveBtns();
    const keyName = document.getElementById('enrollment_key_name');
    const enrollmentKeyBtn = document.getElementById('enrollmentKeyBtn');
    const viewCoursesBtn = document.getElementById('viewCoursesBtn');

    enrollmentKeyBtn.style.display = 'none';
    viewCoursesBtn.style.display = 'flex';
    keyName.setAttribute('readonly', true);
    keyName.classList.add('disabled');
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