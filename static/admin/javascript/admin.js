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

    var linkElements = document.querySelectorAll(".test-current-page");

    // Loop through each link element
    linkElements.forEach(function(linkElement) {
        // Get the href attribute of the link element
        var linkPath = linkElement.getAttribute("href");

        // Compare the current URL path with the link path
        if (currentPath === linkPath) {
            // Add a class to the link element if the paths match
            linkElement.classList.add("current-page");
        }
    });

    /* Select Table Options */
    let checkedOptionsList = [];
    const tableOptions = document.querySelectorAll('.table-select-option');
    const tableSelectAllOption = document.querySelector('.table-select-all-option');

    tableOptions.forEach(option => {
        option.addEventListener('click', function() {
            const checkbox = this.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
                option.classList.remove('selected-option');
                checkedOptionsList = checkedOptionsList.filter(item => item !== option);
            } else {
                checkbox.checked = true;
                option.classList.add('selected-option');
                checkedOptionsList.push(option);
            }
            if(tableOptions.length === checkedOptionsList.length){
                tableSelectAllOption.checked = true;
            }else{
                tableSelectAllOption.checked = false;
            }
            countSelectedOptions();
        });
    });

    tableSelectAllOption.addEventListener('click', function() {
        checkedOptionsList = [];
        tableOptions.forEach(option => {
            const checkbox = option.querySelector('input[type="checkbox"]');
            if(tableSelectAllOption.checked){
                checkbox.checked = true;
                option.classList.add('selected-option');
                checkedOptionsList.push(option);
            }else {
                checkbox.checked = false;
                option.classList.remove('selected-option');
                checkedOptionsList = checkedOptionsList.filter(item => item !== option);
            }
            countSelectedOptions();
        });
    });

    const selectedOptionsWrapper = document.getElementById('selectedOptionsWrapper');
    const selectedOptionsCount = document.getElementById('selectedOptionsCount');
    function countSelectedOptions(){
        if(checkedOptionsList.length < 1){
            selectedOptionsWrapper.style.display = 'none';
            closeOptionsSidebar();
        }else{
            selectedOptionsWrapper.style.display = 'flex';
            openOptionsSidebar();
        };
        selectedOptionsCount.innerText = checkedOptionsList.length;
        testActiveOptions();
    }

    /* Test active filters on page load */
    // testActiveOptions();
    /* Need to add functionality to test for active filters */
    const activeFilters = document.getElementById('activeFilters');
    function testActiveOptions(){
        if(checkedOptionsList.length >= 1 /*|| filterActive*/){
            activeFilters.classList.add('show-table-menu');
        }else{
            activeFilters.classList.remove('show-table-menu');
        }
    }

    const optionsSidebar = document.getElementById('optionsSidebar');
    function openOptionsSidebar(){
        optionsSidebar.classList.add('show-options-sidebar');
    }

    function closeOptionsSidebar(){
        optionsSidebar.classList.remove('show-options-sidebar');
    }

    // JavaScript to set custom tooltip text
    document.querySelectorAll('.tooltip').forEach(function(elem) {
        const tooltipText = elem.getAttribute('data-tooltip');
        const tooltipSpan = elem.querySelector('.tooltiptext');
        tooltipSpan.textContent = tooltipText;
    });
});