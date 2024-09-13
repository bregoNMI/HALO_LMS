document.addEventListener('DOMContentLoaded', function() {
    flatpickr(".time-picker", {
        enableTime: true,       // Enable time picker
        noCalendar: true,       // Disable the calendar
        dateFormat: "h:i K",    // 12-hour format with A.M./P.M.
        time_24hr: false        // Use 12-hour time format        // Use 24-hour time format
    });

    flatpickr(".date-picker", {
        altInput: true,
        altFormat: "F j, Y",  // Display format (e.g., "July 27, 1986")
        dateFormat: "Y-m-d",   // Format used for submission (e.g., "1986-07-27")
        allowInput: true       // Allow manual input
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

    // JavaScript to set custom tooltip text
    document.querySelectorAll('.tooltip').forEach(function(elem) {
        const tooltipText = elem.getAttribute('data-tooltip');
        const tooltipSpan = elem.querySelector('.tooltiptext');
        tooltipSpan.textContent = tooltipText;
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