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
    if (!event.target.matches('.learner-dropdown-menu-icon, .learner-dropdown-menu-icon *')) {
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

    flatpickr(".date-picker", {
        altInput: true,
        altFormat: "F j, Y",  // Display format (e.g., "July 27, 1986")
        dateFormat: "Y-m-d",   // Format used for submission (e.g., "1986-07-27")
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

    const validationMessageContainer = document.getElementById('validation-message-container');
    const validationMessageInner = document.getElementById('validation-message-inner');
    const validationMessage = document.getElementById('validation-message');
    const validationIcon = document.getElementById('validation-icon');

    function displayValidationMessage(message, isSuccess) {
        validationMessage.textContent = message;
        validationMessageContainer.style.display = 'flex';
        setTimeout(() => {
            validationMessageContainer.className = isSuccess ? 'alert-container animate-alert-container' : 'alert-container animate-alert-container';
        }, 100);
        validationMessageInner.className = isSuccess ? 'alert alert-success' : 'alert alert-error';
        setTimeout(() => {
            validationMessageContainer.classList.remove('animate-alert-container');
        }, 10000);
        if(isSuccess){
            validationIcon.className = 'fa-solid fa-circle-check';
        }else{
            validationIcon.className = 'fa-solid fa-triangle-exclamation';
        }
    }
});

function initializeHeaderVariables(){
    // Process header title
    var headerTitleElement = document.getElementById('headerTitle');
    if(headerTitleElement){
        var headerTitle = headerTitleElement.getAttribute('data-header-title');
        var firstName = headerTitleElement.getAttribute('data-first-name');
        var lastName = headerTitleElement.getAttribute('data-last-name');

        // Replace placeholders with actual values
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

        // Replace placeholders with actual values
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
                console.log('input detected in:', input);
            });
            input.addEventListener('change', function () {
                showsaveButtonPlatform();
                console.log('change detected in:', input);
            });
        }
        
        // For custom select boxes (dropdowns)
        if (input.classList.contains('select-selected')) {
            input.addEventListener('click', function () {
                // Add listener for when user selects an option from the dropdown
                input.closest('.custom-select').querySelectorAll('.select-item').forEach(item => {
                    item.addEventListener('click', function() {
                        showsaveButtonPlatform();
                        console.log('change detected in custom dropdown:', input);
                    });
                });
            });
        }
    });
}

function showsaveButtonPlatform(){
    const saveButtonPlatform = document.getElementById('saveButtonPlatform');
    saveButtonPlatform.classList.add('animate-save-button-platform');
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