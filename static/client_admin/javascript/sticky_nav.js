document.addEventListener("DOMContentLoaded", function() {
    initializeTopRowNav(); 
});

// Sync widths on page load and window resize
window.addEventListener('load', syncNavBarWidth);
window.addEventListener('resize', syncNavBarWidth);

function initializeTopRowNav(){
    const detailsTopRow = document.getElementById('mainNavBar');
    const stickyNav = document.getElementById('stickyNavBar');

    if(detailsTopRow && stickyNav){
        // IntersectionObserver callback
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    stickyNav.classList.add('visible');
                    stickyNav.classList.remove('visible-hidden');
                    if(stickyNav.nextElementSibling.classList.contains('learner-top-row')){
                        stickyNav.style.top = '0' + 'px';
                    }else{
                        stickyNav.style.top = '58.29' + 'px';
                    }
                    
                } else {
                    stickyNav.style.top = '-100px';
                    setTimeout(() => {
                        stickyNav.classList.remove('visible');
                        stickyNav.classList.add('visible-hidden');
                    }, 300);
                }
            });
        };

        // Create a new IntersectionObserver instance
        const observer = new IntersectionObserver(observerCallback, {
            threshold: [0]  // Trigger the callback when 0% of the element is visible
        });

        // Observe the target element
        if(detailsTopRow){observer.observe(detailsTopRow);}
    }
}

function syncNavBarWidth() {
    setTimeout(() => {
        const adminBody = document.querySelector('.admin-body');
        const learnerBody = document.querySelector('.learner-body');
        const stickyNavBar = document.querySelector('#stickyNavBar');
        const sidebarContainer = document.querySelector('.admin-sidebar-container');
        const learnerSidebar = document.querySelector('.learner-sidebar-container');

        if (adminBody && stickyNavBar && sidebarContainer) {
            // Set the width of #stickyNavBar to match .admin-body
            stickyNavBar.style.width = `${adminBody.clientWidth}px` - (50 + 'px');
            
            // Set the margin-left of #stickyNavBar to the width of .admin-sidebar-container
            stickyNavBar.style.marginLeft = `${sidebarContainer.clientWidth}px`;
        }else if(learnerBody && stickyNavBar && learnerSidebar){
            stickyNavBar.style.width = `${learnerBody.clientWidth}px` - (50 + 'px');
            stickyNavBar.style.marginLeft = `${learnerSidebar.clientWidth}px`;
        }
    }, 10);
}