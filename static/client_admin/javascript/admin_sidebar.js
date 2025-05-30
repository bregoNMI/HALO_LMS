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
    if (dropdown && !event.target.matches('.admin-header-user-icon') && !dropdown.contains(event.target)) {
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
        console.log(editorEl, maxCounter);

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

function toggleAdminSidebar(){
    const adminSidebar = document.querySelector('.admin-sidebar-container');
    const sidebarBody = document.querySelector('.sidebar-body');
    const createMenuSection= document.querySelector('.create-menu-section');
    const sidebarToggle = adminSidebar.querySelector('.sidebar-toggle');
    const sidebarToggleWrapper = adminSidebar.querySelector('.sidebar-toggle-wrapper');

    const stickyNavBar = document.getElementById('stickyNavBar');

    adminSidebar.classList.toggle('toggle-sidebar');

    if(adminSidebar.classList.contains('toggle-sidebar')){
        sidebarBody.style.overflow = 'hidden';
        createMenuSection.style.overflow = 'hidden';
        sidebarToggle.innerHTML = `<i class="fa-light fa-sidebar-flip"></i>`;
        setTimeout(() => {
            sidebarToggle.innerHTML = `<span style="top: -60px; left: 130%;" class="tooltiptext">Expand Sidebar</span><i class="fa-light fa-sidebar-flip"></i>`;
        }, 300);
        if(stickyNavBar){stickyNavBar.style.marginLeft = '58.79px';}
    }else{
        sidebarToggle.innerHTML = `<i class="fa-light fa-sidebar"></i>`; 
        sidebarToggleWrapper.style.justifyContent = 'flex-end';   
        setTimeout(() => {
            sidebarBody.style.overflow = 'unset';
            createMenuSection.style.overflow = 'unset';
            sidebarToggle.innerHTML = `<span style="top: -60px; left: 50%;" class="tooltiptext">Collapse Sidebar</span><i class="fa-light fa-sidebar"></i>`;   
                
        }, 300);
        if(stickyNavBar){stickyNavBar.style.marginLeft = '222px';}
    }
    
}

let wasAdminOpen = null; // Store outside function for state persistence

function toggleCreateSidebar() {
    const adminSidebar = document.querySelector('.admin-sidebar-container');
    const createAdminSidebar = document.querySelector('.create-sidebar-container');

    const isCreateOpen = createAdminSidebar.classList.contains('create-sidebar-toggle');

    if (!isCreateOpen) {
        // About to OPEN create sidebar
        wasAdminOpen = !adminSidebar.classList.contains('toggle-sidebar'); // true if admin sidebar is expanded

        // If admin sidebar is collapsed, expand it
        if (adminSidebar.classList.contains('toggle-sidebar')) {
            toggleAdminSidebar();
        }

        createAdminSidebar.classList.add('create-sidebar-toggle');

    } else {
        // About to CLOSE create sidebar
        createAdminSidebar.classList.remove('create-sidebar-toggle');

        // Restore previous state of admin sidebar
        if (!wasAdminOpen && !adminSidebar.classList.contains('toggle-sidebar')) {
            toggleAdminSidebar();
        }
    }
}

function setDisabledSaveBtns() {
    const courseSaveBtns = document.querySelectorAll('.course-save-btns');
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

function removeDisabledSaveBtns() {
    setTimeout(() => {
        const courseSaveBtns = document.querySelectorAll('.course-save-btns');
        for (const btn of courseSaveBtns) {
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