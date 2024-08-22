document.addEventListener('DOMContentLoaded', function() {
    // Handle adding widgets
    const addWidgetButton = document.getElementById('add-widget');
    if (addWidgetButton) {
        addWidgetButton.addEventListener('click', function() {
            const dashboardIdInput = document.getElementById('dashboard-id');
            if (dashboardIdInput) {
                const dashboardId = dashboardIdInput.value;
                const title = prompt('Enter widget title:');
                const content = prompt('Enter widget content:');
                
                if (title && content) {
                    fetch(`/admin/templates/widgets/add/${dashboardId}/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'X-CSRFToken': getCookie('csrftoken'),
                        },
                        body: new URLSearchParams({
                            'title': title,
                            'content': content
                        }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Add widget to the DOM
                            const widgetsContainer = document.getElementById('widgets-container');
                            if (widgetsContainer) {
                                const widgetDiv = document.createElement('div');
                                widgetDiv.className = 'widget';
                                widgetDiv.dataset.id = data.widget_id;
                                widgetDiv.innerHTML = `
                                    <h3>${title}</h3>
                                    <p>${content}</p>
                                    <button class="edit-widget" data-id="${data.widget_id}">Edit</button>
                                `;
                                widgetsContainer.appendChild(widgetDiv);
                            }
                        } else {
                            console.error('Failed to add widget:', data.error);
                        }
                    })
                    .catch(error => {
                        console.error('Fetch error:', error);
                    });
                }
            }
        });
    }

    // Handle editing widgets
    const widgetsContainer = document.getElementById('widgets-container');
    if (widgetsContainer) {
        widgetsContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('edit-widget')) {
                const widgetId = event.target.dataset.id;
                // Need to change these prompts to editable fields
                const title = prompt('Enter new widget title:');
                const content = prompt('Enter new widget content:');
                
                if (title && content) {
                    fetch('/admin/templates/widgets/update/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'X-CSRFToken': getCookie('csrftoken'),
                        },
                        body: new URLSearchParams({
                            'widget_id': widgetId,
                            'title': title,
                            'content': content
                        }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Update widget in the DOM
                            const widgetDiv = document.querySelector(`.widget[data-id="${widgetId}"]`);
                            if (widgetDiv) {
                                widgetDiv.querySelector('h3').textContent = title;
                                widgetDiv.querySelector('p').textContent = content;
                            }
                        } else {
                            console.error('Failed to update widget:', data.error);
                        }
                    })
                    .catch(error => {
                        console.error('Fetch error:', error);
                    });
                }
            }
        });
    }

    // Handle widget reordering
    const sortable = document.getElementById('widgets-container');
    if (sortable) {
        Sortable.create(sortable, {
            onEnd: function(event) {
                const widgetIds = Array.from(sortable.children).map(widget => widget.dataset.id);
                fetch('/admin/templates/widgets/reorder/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: JSON.stringify({
                        'widget_ids': widgetIds
                    }),
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        console.error('Failed to reorder widgets:', data.error);
                    }
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                });
            }
        });
    }

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
