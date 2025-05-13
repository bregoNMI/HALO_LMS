document.addEventListener("DOMContentLoaded", function () {
    /* Sidebar Toggle */
    const headers = document.querySelectorAll(".collapsible-header");

    headers.forEach(header => {
        header.addEventListener("click", function () {
            const content = this.nextElementSibling;
            this.classList.toggle("active");

            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    const contentToggles = document.querySelectorAll(".sidebar-body-item");

    contentToggles.forEach(toggle => {
        toggle.addEventListener("click", function () {
            // Deactivate all toggles
            contentToggles.forEach(item => item.classList.remove("active"));

            this.classList.add("active");
        });
    });

    // Get the current URL path
    var currentPath = window.location.pathname;
    
    // Select all link elements with the class 'test-current-page'
    var linkElements = document.querySelectorAll(".test-current-page");

    // Loop through each link element
    linkElements.forEach(function(linkElement) {
        // Get the href attribute of the link element
        var linkPath = linkElement.getAttribute("href");
        
        // Compare the current URL path with the link path
        if (currentPath.includes(linkPath)) {
            // Add a class to the link element if the paths match
            linkElement.classList.add("current-page");

            // Find the closest 'collapsible-content' parent of this link
            var collapsibleContent = linkElement.closest('.collapsible-content');
            
            // If collapsibleContent is found, find the previous sibling which should be the header
            if (collapsibleContent) {
                var headerElement = collapsibleContent.previousElementSibling;

                // Check if the header element has the 'collapsible-header' class and add 'active'
                if (headerElement && headerElement.classList.contains('collapsible-header')) {
                    headerElement.click();
                }
            }
        }
    });

    document.querySelectorAll('.collapsible-section').forEach(section => {
        const collapsibleHeader = section.querySelector('.collapsible-header');
        const collapsibleContent = section.querySelector('.collapsible-content');
    
        // Ensure both the header and content exist before proceeding
        if (collapsibleHeader && collapsibleContent) {
            if (collapsibleContent.querySelector('a.current-page')) {
                collapsibleHeader.classList.add('highlight'); // Add your desired class to the header
            }
        }
    });  
    
    updateBreadcrumbTrail();
    initializeToggleKeyboardNav();
    setTimeout(detectCharacterCounters, 300);
});

function updateBreadcrumbTrail() {
    const currentPath = window.location.pathname;
    let trail = JSON.parse(sessionStorage.getItem('breadcrumbTrail')) || [];

    if (trail[trail.length - 1] !== currentPath) {
        trail.push(currentPath);
    }

    sessionStorage.setItem('breadcrumbTrail', JSON.stringify(trail));
} 

function handleBackButton() {
    let trail = JSON.parse(sessionStorage.getItem('breadcrumbTrail')) || [];

    if (trail.length > 1) {
        trail.pop();

        const previousPage = trail[trail.length - 1];
        sessionStorage.setItem('breadcrumbTrail', JSON.stringify(trail));

        window.location.href = previousPage;
    } else {
        // Default fallback if no history
        window.location.href = '/admin/dashboard/';
    }
} 

function checkDropdownMenu(){
    document.querySelectorAll('.collapsible-section').forEach(section => {
        const collapsibleHeader = section.querySelector('.collapsible-header');
        const collapsibleContent = section.querySelector('.collapsible-content');
    
        // Check if any 'a' tag inside the collapsible content has the 'current-page' class
        if (collapsibleContent.querySelector('a.current-page')) {
            collapsibleHeader.classList.add('highlight'); // Add your desired class to the header
        }
    });
}

/* Header Dropdown */
function toggleDropdown(event) {
    event.stopPropagation(); // Prevent the event from bubbling up to the window

    var dropdown = document.getElementById("adminDropdownContent");
    dropdown.classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.addEventListener('click', function(event) {
    var dropdown = document.getElementById("adminDropdownContent");
    var toggleButton = document.querySelector('.admin-header-user-icon');

    // Check if the click was outside the dropdown and the toggle button
    if (!event.target.matches('.admin-header-user-icon') && !dropdown.contains(event.target)) {
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});


// Global JS Actions
function initializeToggleKeyboardNav(){
    document.querySelectorAll('.toggle-switch').forEach(switchEl => {
        switchEl.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                const input = this.querySelector('input[type="checkbox"]');
                input.checked = !input.checked;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                this.setAttribute('aria-checked', input.checked.toString());
            }
        });
    });
}

function detectCharacterCounters() {
    const editors = document.querySelectorAll('.editor-container');
    let MAX_LENGTH;

    editors.forEach((editorEl) => {
        const editorId = editorEl.id;
        if (!editorId) return;

        let quillEditor;
        try {
            quillEditor = Quill.find(editorEl);
        } catch (err) {
            console.warn(`No Quill instance found for editor ID: ${editorId}`);
            return;
        }

        const counterContainer = editorEl.parentElement.querySelector('.quill-character-counter');
        const currentCounter = counterContainer?.querySelector('.quill-current-counter');
        const maxCounter = counterContainer?.querySelector('.quill-max-counter');

        if (!currentCounter || !maxCounter) return;
        MAX_LENGTH = maxCounter.innerText;

        // Set initial counter
        const updateCount = () => {
            const textLength = quillEditor.getText().trim().length;
            currentCounter.textContent = textLength;
        };

        updateCount();

        if (!editorEl.dataset.listenerAdded) {
            // Enforce max character limit
            quillEditor.on('text-change', function (delta, oldDelta, source) {
                const currentLength = quillEditor.getLength(); // includes trailing newline
                const trimmedLength = quillEditor.getText().trim().length;

                // Prevent further input beyond max
                if (trimmedLength > MAX_LENGTH) {
                    quillEditor.deleteText(MAX_LENGTH, currentLength);
                }

                updateCount();
            });

            editorEl.dataset.listenerAdded = 'true';
        }
    });
}