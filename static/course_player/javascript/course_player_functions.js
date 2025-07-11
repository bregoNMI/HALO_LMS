document.addEventListener("DOMContentLoaded", function () {
    const courseFooterTabs = document.getElementById('courseFooterTabs');
    initializeTabs(courseFooterTabs);

    document.getElementById('toggleCourseSidebar').addEventListener('click', () => {
        toggleCourseSidebar();
    })  
});

function toggleCourseSidebar(){
    const courseSidebar = document.getElementById('courseSidebar');
    const toggleCourseSidebar = document.getElementById('toggleCourseSidebar');
    const sidebarToggleWrapper = courseSidebar.querySelector('.sidebar-toggle-wrapper');

    courseSidebar.classList.toggle('toggle-sidebar');

    if(courseSidebar.classList.contains('toggle-sidebar')){
        setTimeout(() => {
            toggleCourseSidebar.innerHTML = `<span style="left: -70%;" class="tooltiptext">Show Sidebar</span><i class="fa-regular fa-angle-left"></i>`;
        }, 200);
    }else{
        setTimeout(() => {
            toggleCourseSidebar.innerHTML = `<span class="tooltiptext">Hide Sidebar</span><i class="fa-regular fa-angle-right"></i>`;                 
        }, 200);
    }
}

let previousHeight;
let isExpanded = false;

function openCourseDetails(){
    if(isExpanded == true){
        return;
    }
    const toggleFooterBtn = document.getElementById('toggleFooterBtn');
    toggleFooterBtn.innerHTML = `<i class="fa-light fa-arrows-to-dotted-line"></i><span>Collapse</span>`;
    toggleFooterBtn.setAttribute('onclick', 'closeCourseDetails()');
    const footer = document.querySelector('.course-footer-container');
    previousHeight = footer.getBoundingClientRect().height + 'px';

    footer.classList.add('expanded');
    footer.style.position = 'absolute';
    footer.style.maxHeight = '80dvh';
    isExpanded = true;
}

function closeCourseDetails() {
    const toggleFooterBtn = document.getElementById('toggleFooterBtn');
    toggleFooterBtn.innerHTML = `<i class="fa-light fa-arrows-from-dotted-line"></i><span>Expand</span>`;
    toggleFooterBtn.setAttribute('onclick', 'openCourseDetails()');
    const footer = document.querySelector('.course-footer-container');
    
    footer.style.maxHeight = previousHeight;

    setTimeout(() => {
        footer.style.position = 'relative';
        footer.classList.remove('expanded');
    }, 350);
    isExpanded = false;
}
