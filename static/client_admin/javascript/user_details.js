document.addEventListener('DOMContentLoaded', function() {
    flatpickr(".time-picker", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        time_24hr: false
    });
    
    flatpickr(".date-picker", {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
    });

    // Select all elements with the class 'alert'
    var alerts = document.querySelectorAll('.alert-container');

    // Loop through each alert and add a new class if the alert is visible
    alerts.forEach(function(alert) {
        // Check if the alert is visible
        if (window.getComputedStyle(alert).display !== 'none') {
            // Add a class to the active alert
            alert.classList.add('animate-alert-container');
            setTimeout(() => {
                alert.classList.remove('animate-alert-container');
            }, 8000);
        }
    });

    // JavaScript to set custom tooltip text
    document.querySelectorAll('.tooltip').forEach(function(elem) {
        const tooltipText = elem.getAttribute('data-tooltip');
        const tooltipSpan = elem.querySelector('.tooltiptext');
        tooltipSpan.textContent = tooltipText;
    });

    // Making the User Enrollments clickable
    const rows = document.querySelectorAll(".clickable-row");
    rows.forEach(row => {
        row.addEventListener("click", function () {
            const url = this.getAttribute("data-href");
            if (url) {
                window.location.href = url;
            }
        });
    });

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
});

const passportPhoto = document.getElementById('passportphoto');
if(passportPhoto){
    passportPhoto.addEventListener('change', function(event) {
        const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
        document.getElementById('passportphotoNameDisplay').textContent = fileName;
    });
}

const photoid = document.getElementById('photoid');
if(photoid){
    photoid.addEventListener('change', function(event) {
        const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
        document.getElementById('photoidNameDisplay').textContent = fileName;
    });
}

function enrollUserBtn(){
    let selectedIds = []; 
    selectedIds.push(userId);
    // Store the User's ID in local storage
    localStorage.setItem('selectedUserIds', JSON.stringify(selectedIds));          
    // Redirect to Enrollment Page
    window.location.href = '/admin/users/enroll-users/';
}

function messageUserBtn(){
    let selectedIds = []; 
    selectedIds.push(userId);
    // Store the User's ID in local storage
    localStorage.setItem('selectedUserIds', JSON.stringify(selectedIds));          
    // Redirect to Message Page
    window.location.href = '/admin/users/message-users/';
}