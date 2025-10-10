document.addEventListener('DOMContentLoaded', function() {
    const notificationTabs = document.getElementById('notificationTabs');
    setTimeout(() => {
        initializeTabs(notificationTabs);
    }, 100);

    const markAsReadButtons = document.querySelectorAll('.mark-as-read-btn');

    markAsReadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const messageId = this.getAttribute('data-message-id');
            markMessageAsRead(messageId);
            console.log(button);
        });
    });
});

function openMessagePopup(messageId) {
    const currentPopup = document.getElementById(`popup-message-${messageId}`);
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "flex";
    setTimeout(() => {
        popupContent.classList.add('animate-popup-content');
    }, 100);

    // Mark the message as read when opened
    const messageContainer = document.getElementById(`message-${messageId}`);
    if (!messageContainer.classList.contains('read')) {
        markMessageAsRead(messageId);
    }
}

function closeMessagePopup(event, messageId) {
    event.stopPropagation();
    const currentPopup = document.getElementById(`popup-message-${messageId}`);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    setTimeout(() => {
        currentPopup.style.display = "none";
    }, 200);
}

function markMessageAsRead(messageId) {
    fetch(`/messages/read/${messageId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to mark the message as read');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const messageContainer = document.getElementById(`message-${messageId}`);
            messageContainer.classList.add('read');

            // Update the button or icon
            const markAsReadButton = messageContainer.querySelector('.mark-as-read-btn');
            if (markAsReadButton) {
                markAsReadButton.remove();
            }
            const markAsReadIcon = messageContainer.querySelector('.mark-as-read-icon');
            if (markAsReadIcon) {
                markAsReadIcon.remove();
            }

        } else {
            console.error('Error marking the message as read:', data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function getCsrfToken() {
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
    return cookieValue;
}

function initializeTabs(popup) {
    if(popup){
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
            });
        });
    }
}

function updateIndicator(activeTab) {
    const tabIndicator = activeTab.closest('.tabs').querySelector('.tab-indicator');
    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = activeTab.closest('.tabs').getBoundingClientRect();
    
    tabIndicator.style.width = `${tabRect.width}px`;
    tabIndicator.style.transform = `translateX(${tabRect.left - containerRect.left}px)`;
}