document.addEventListener('DOMContentLoaded', function() {
    const settingsTabs = document.getElementById('settingsTabs');
    initializeTabs(settingsTabs);

    // Hiding / Showing User Card
    const cardHeaders = document.querySelectorAll('.card-header-right');

    cardHeaders.forEach(header => {
        header.addEventListener('click', function() {

            // Toggle 'active' class on the clicked element
            header.classList.toggle('active');

            console.log('over here');

            // Find the nearest .info-card-body and toggle its visibility
            const cardBody = header.closest('.details-info-card').querySelector('.info-card-body');
            if (cardBody) {
                cardBody.classList.toggle('hidden'); // 'hidden' class should be styled with display: none;
            }
        });
    });
    // Hiding / Showing Lesson Card
    const lessonHeaders = document.querySelectorAll('.lesson-card-header-right');

    lessonHeaders.forEach(header => {
        header.addEventListener('click', function() {

            // Toggle 'active' class on the clicked element
            header.classList.toggle('active');

            // Find the nearest .info-card-body and toggle its visibility
            const cardBody = header.closest('.lesson-details-info-card').querySelector('.lesson-info-card-body');
            if (cardBody) {
                cardBody.classList.toggle('hidden'); // 'hidden' class should be styled with display: none;
            }
        });
    });
});

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