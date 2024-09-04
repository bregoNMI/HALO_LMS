document.addEventListener("DOMContentLoaded", function() {
    
});

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for setting the main dashboard
    document.querySelectorAll('.set-main-dashboard').forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const dashboardId = this.dataset.id;

            fetch(`/admin/templates/dashboard/set_main/${dashboardId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: new URLSearchParams({
                    'dashboard_id': dashboardId
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect_url;  // Redirect to the referring page
                } else {
                    console.error('Failed to set main dashboard:', data.error);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
            });
        });
    });

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
});

document.getElementById('create-dashboard-btn').addEventListener('click', function() {
    const name = document.getElementById('dashboard-name').value;
    const layout = document.querySelector('input[name="lesson-selection"]:checked').id;  // Get selected layout ID
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    if (name) {
        fetch('/admin/templates/dashboards/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                name: name,
                layout: layout
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = `/admin/templates/dashboards/${data.dashboard_id}/edit/`;  // Redirect to dashboard edit page
            } else {
                console.error('Failed to create dashboard:', data.error);
                alert('Failed to create dashboard. Please try again.');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            alert('An error occurred. Please try again.');
        });
    } else {
        alert('Title is required.');
    }
});

// Clearing disabled status on create template button
document.getElementById('dashboard-name').addEventListener('keyup', function() {
    const createDashboardBtn = document.getElementById('create-dashboard-btn');
    if(this.value.length >= 1){
        createDashboardBtn.classList.remove('disabled');
        createDashboardBtn.removeAttribute('disabled');
    }else{
        createDashboardBtn.classList.add('disabled');
        createDashboardBtn.setAttribute('disabled', true);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.template-card .card-item-options').forEach(optionButton => {
        optionButton.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default action of the link
            event.stopPropagation(); // Stop the click from bubbling up to the anchor
        });
    });

    document.querySelectorAll('.card-item-options').forEach(optionButton => {
        optionButton.addEventListener('click', function(event) {
            // Prevent the click event from bubbling up to parent elements
            event.stopPropagation();
            
            // Toggle the dropdown menu
            const dropdownMenu = this.querySelector('.options-dropdown-menu');
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
    });
    
    // Close the dropdown menu if the user clicks outside of it
    document.addEventListener('click', function(event) {
        document.querySelectorAll('.options-dropdown-menu').forEach(menu => {
            if (!menu.contains(event.target)) {
                menu.style.display = 'none';
            }
        });
    });

    const confirmDelete = document.getElementById('confirmDelete');
    let currentDashboardId = null; // To keep track of the dashboard ID to delete

    // Function to open the modal
    function openDeleteModal(dashboardId) {
        currentDashboardId = dashboardId;
        openPopup('confirmDashboardDeletePopup')
    }

    // Handle delete button click
    document.querySelectorAll('.delete-dashboard').forEach(button => {
        button.addEventListener('click', function () {
            const dashboardId = this.dataset.id;
            openDeleteModal(dashboardId);
        });
    });

    // Confirm delete
    confirmDelete.addEventListener('click', function () {
        if (currentDashboardId) {
            fetch(`/admin/templates/dashboards/${currentDashboardId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Optionally, remove the dashboard element from the DOM
                    document.querySelector(`[data-id="${currentDashboardId}"]`).closest('a').remove();
                    closePopup('confirmDashboardDeletePopup');
                } else {
                    alert('Failed to delete dashboard.');
                }
            });
        }
    });

    // Variables for the edit title modal and buttons
    const confirmEditTitleButton = document.getElementById('confirm-edit-title');
    const editTitleInput = document.getElementById('edit-title-input');

    let currentEditDashboardId = null; // To keep track of the dashboard ID being edited
    let currentEditLayout = null;      // To keep track of the layout associated with the dashboard

    // Function to open the edit title modal
    function openEditTitleModal(dashboardId, title, layout) {
        currentEditDashboardId = dashboardId;
        currentEditLayout = layout;
        if (editTitleInput) {
            editTitleInput.value = title; // Set value for input field in the popup
        }
        openPopup('editDashboardTitle'); // Open the popup
    }

    // Handle edit dashboard button click
    document.querySelectorAll('.edit-dashboard').forEach(button => {
        button.addEventListener('click', function () {
            const dashboardId = this.dataset.id;
            const titleElement = document.querySelector(`.edit-dashboard-title[data-id="${dashboardId}"]`);
            const title = titleElement ? titleElement.innerText : ''; // Use innerText to get the text content
            const layout = titleElement ? titleElement.dataset.layout : '';

            openEditTitleModal(dashboardId, title, layout);
        });
    });

    // Confirm edit title
    confirmEditTitleButton.addEventListener('click', function () {
        if (currentEditDashboardId) {
            const newTitle = editTitleInput ? editTitleInput.value : ''; // Check if editTitleInput is not null

            fetch(`/admin/templates/dashboards/${currentEditDashboardId}/edit/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ name: newTitle, layout: currentEditLayout })
            })
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to update title:', response);
                    throw new Error('Failed to update title.');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update the title on the page
                    const titleElement = document.querySelector(`.edit-dashboard-title[data-id="${currentEditDashboardId}"]`);
                    if (titleElement) {
                        titleElement.innerText = newTitle; // Update the text content
                    }
                    closePopup('editDashboardTitle');
                } else {
                    console.error('Form errors:', data.errors);  // Debugging line
                    alert('Failed to update title.');
                }
            })
            .catch(error => {
                console.error('Error:', error.message);  // Debugging line
                alert(error.message);
            });
        }
    });

    
});

// Helper function to get CSRF token
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