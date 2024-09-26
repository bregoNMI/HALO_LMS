document.addEventListener('DOMContentLoaded', function () {
    // Get all checkboxes with the 'on_login_course' class or a unique selector
    const onLoginCourseCheckboxes = document.querySelectorAll('.toggle-hidden-settings-input');
    
    // Function to toggle the visibility of the corresponding hidden input
    function toggleHiddenInput(checkbox) {
        const hiddenSettingsInput = checkbox.closest('.edit-settings-input').nextElementSibling;

        if (checkbox.checked) {
            hiddenSettingsInput.style.display = 'block';
        } else {
            hiddenSettingsInput.style.display = 'none';
        }
    }

    // Run on page load and add event listeners for all checkboxes
    onLoginCourseCheckboxes.forEach(function (checkbox) {
        toggleHiddenInput(checkbox);  // Run this on page load in case any checkbox is pre-checked
        
        // Add event listener to toggle the hidden input when the checkbox changes
        checkbox.addEventListener('change', function () {
            toggleHiddenInput(checkbox);
        });
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
});

const default_course_thumbnail_image = document.getElementById('default_course_thumbnail_image');
if(default_course_thumbnail_image){
    default_course_thumbnail_image.addEventListener('change', function(event) {
        const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
        document.getElementById('thumbNailImageDisplay').textContent = fileName;
    });
}
const default_certificate_image = document.getElementById('default_certificate_image');
if(default_certificate_image){
    default_certificate_image.addEventListener('change', function(event) {
        const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
        document.getElementById('certificateImageDisplay').textContent = fileName;
    });
}
const portal_favicon = document.getElementById('portal_favicon');
const faviconPreview = document.getElementById('faviconPreview');

if (portal_favicon) {
    portal_favicon.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const fileName = file.name;
            document.getElementById('faviconImageDisplay').textContent = fileName;

            // Create a URL for the selected file and update the image preview
            const reader = new FileReader();
            reader.onload = function(e) {
                faviconPreview.src = e.target.result; // Update the src with the file's data URL
            };
            reader.readAsDataURL(file); // Read the file as a data URL
        } else {
            document.getElementById('faviconImageDisplay').textContent = 'No file selected';
            faviconPreview.src = ''; // Reset the image preview if no file is selected
        }
    });
}
