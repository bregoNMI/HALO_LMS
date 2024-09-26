document.addEventListener("DOMContentLoaded", function () {
    /* Select Table Options */
    let checkedOptionsList = [];
    let selectedIds = [];
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

    if(tableSelectAllOption){
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
    }

    const selectedOptionsWrapper = document.getElementById('selectedOptionsWrapper');
    const selectedOptionsCount = document.getElementById('selectedOptionsCount');
    function countSelectedOptions(){
        console.log(checkedOptionsList);
        if(checkedOptionsList.length < 1){
            selectedOptionsWrapper.style.display = 'none';
            closeOptionsSidebar();
        }else{
            selectedOptionsWrapper.style.display = 'flex';
            openOptionsSidebar();
        };
        if(checkedOptionsList.length < 2){
            singleOptionsSelect();
        }else{
            multiOptionsSelect();
        };
        selectedOptionsCount.innerText = checkedOptionsList.length;
        testActiveOptions();
    }
    
    function singleOptionsSelect() {
        // Assuming checkedOptionsList is an array of selected elements
        if (checkedOptionsList.length === 0) return; // If no option is selected, exit the function
        
        const selectedOption = checkedOptionsList[0]; // The currently selected option
    
        // Get all sidebar items with class 'options-sidebar-item'
        const sidebarItems = document.querySelectorAll('.options-sidebar-item');
    
        // Iterate over each sidebar item
        sidebarItems.forEach(item => {
            // Check if the selected option has a data attribute matching the item's ID
            const matchingAttribute = selectedOption.getAttribute(`${item.id}`);
            if (matchingAttribute) {
                // Add click event listener to redirect to the matching URL
                item.addEventListener('click', () => {
                    // Clear the array to avoid duplicate entries
                    selectedIds = [];        
                    // Collect all the selected IDs
                    checkedOptionsList.forEach(option => {
                        const id = option.getAttribute('data-id');
                        if (!selectedIds.includes(id)) {
                            selectedIds.push(id);
                        }
                    });               
                    console.log(checkedOptionsList, selectedIds);                
                    // Store the unique IDs in localStorage
                    localStorage.setItem('selectedUserIds', JSON.stringify(selectedIds));          
                    // Redirect to the matching URL
                    window.location.href = matchingAttribute;
                });
            }
        });
    
        // Display the single options section and hide the multi options section
        const singleOptionsSelect = document.getElementById('singleOptionsSelect');
        if (singleOptionsSelect) {
            singleOptionsSelect.style.display = 'flex';
        }
    
        const multiOptionsSelect = document.getElementById('multiOptionsSelect');
        if (multiOptionsSelect) {
            multiOptionsSelect.style.display = 'none';
        }
    }

    function multiOptionsSelect(){
        document.getElementById('singleOptionsSelect').style.display = 'none';
        document.getElementById('multiOptionsSelect').style.display = 'flex';
    }

    const activeFilters = document.getElementById('activeFilters');
    var activeFiltersContainer = document.querySelector('.table-active-filters');
    var filters = activeFiltersContainer.querySelectorAll('.filter');
    /* Test active filters on page load */
    testActiveOptions();
    function testActiveOptions(){
        if(checkedOptionsList.length >= 1 || filters.length > 0){
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

    // Custom Select Box
    var customSelects = document.querySelectorAll('.custom-select');
    var sortButton = document.getElementById('sortButton');
    var sortForm = document.getElementById('sortForm');
    var sortByInput = document.getElementById('sort_by');

    customSelects.forEach(function(customSelect) {
        var selectSelected = customSelect.querySelector('.select-selected');
        var selectItems = customSelect.querySelector('.select-items');

        // Toggle the dropdown
        selectSelected.addEventListener('click', function() {
            // Close any open dropdowns
            customSelects.forEach(function(otherSelect) {
                if (otherSelect !== customSelect) {
                    otherSelect.querySelector('.select-items').style.display = 'none';
                    otherSelect.querySelector('.select-selected').classList.remove('select-open');
                }
            });
            selectSelected.classList.toggle('select-open');
            selectItems.style.display = selectItems.style.display === 'block' ? 'none' : 'block';
        });

        // Close the dropdown if the user clicks outside of it
        document.addEventListener('click', function(event) {
            if (!customSelect.contains(event.target) && selectItems.id != 'sortSelectItems') {
                selectItems.style.display = 'none';
                selectSelected.classList.remove('select-open');
            }
        });

        // Handle item selection
        selectItems.querySelectorAll('div').forEach(function(item) {
            if (selectItems.id === 'sortSelectItems') {
                item.addEventListener('click', function() {
                    var selectedValue = this.getAttribute('data-value');
                    sortByInput.value = selectedValue;
                    sortForm.submit();
                });
            } else {
                item.addEventListener('click', function() {
                    // Get the field name and value from data attributes
                    var fieldName = this.getAttribute('data-name');
                    var fieldValue = this.getAttribute('data-value');

                    // Update the select box text and field value input
                    selectSelected.textContent = this.textContent;
                    selectItems.querySelectorAll('div').forEach(function(el) {
                        el.classList.remove('same-as-selected');
                    });
                    this.classList.add('same-as-selected');
                    selectItems.style.display = 'none';

                    // Update the field name and value in the input
                    var fieldValueInput = document.getElementById('fieldValue');
                    if (fieldName) {
                        fieldValueInput.name = fieldName;
                        fieldValueInput.value = fieldValue;
                    }
                });
            }
        });
    });

    // Open the sort dropdown when the sort button is clicked
    sortButton.addEventListener('click', function() {
        // Close any open custom selects
        customSelects.forEach(function(customSelect) {
            customSelect.querySelector('.select-items').style.display = 'none';
            customSelect.querySelector('.select-selected').classList.remove('select-open');
        });

        // Toggle the sort dropdown
        sortSelectItems.style.display = sortSelectItems.style.display === 'block' ? 'none' : 'block';
    });

    // Close the sort dropdown if the user clicks outside of it
    document.addEventListener('click', function(event) {
        var sortByParent = event.target.closest('[data-key="sort_by"]');
        if (!sortButton.contains(event.target) && !sortSelectItems.contains(event.target) && !sortByParent) {
            sortSelectItems.style.display = 'none';
        }
    });

    // Close the dropdown if the user clicks outside of it
    document.addEventListener('click', function(event) {
        customSelects.forEach(function(customSelect) {
            var selectItems = customSelect.querySelector('.select-items');
            var selectSelected = customSelect.querySelector('.select-selected');
            if (!customSelect.contains(event.target) && selectItems.id !== 'sortSelectItems') {
                selectItems.style.display = 'none';
                selectSelected.classList.remove('select-open');
            }
        });
    });

    // Showing / Hiding search option for all users 
    var searchTable = document.getElementById('searchTable');
    var searchAllUsersBtn = document.getElementById('searchAllUsersBtn');

    searchTable.addEventListener('input', function () {
        if(searchTable.value.length > 0){
            searchAllUsersBtn.style.display = "flex";
        }else{
            searchAllUsersBtn.style.display = "none";
        }
    });

    // Removing filters
    const removeButtons = document.querySelectorAll('.table-active-filters .remove-filter');

    removeButtons.forEach(function(button) {
        button.addEventListener('click', function(event) {
            console.log(button);
            // Get the parent filter div
            const filterDiv = button.closest('.filter');
            const key = filterDiv.getAttribute('data-key');
            const value = filterDiv.getAttribute('data-value');          

            // Find the matching filter option in the custom-select div
            const filterOptions = document.querySelectorAll('.custom-select .select-items div');
            filterOptions.forEach(function(option) {
                if (option.getAttribute('data-name') === 'filter_' + key) {
                    // Update UI or perform any other necessary actions
                    document.getElementById('fieldValue').name = option.getAttribute('data-name');
                    document.getElementById('fieldValue').value = '';

                    // filterDiv.remove();
                    setTimeout(() => {
                        document.getElementById('filtersForm').submit();
                    }, 100);
                }else if(key === 'query'){
                    document.getElementById('searchTable').value = '';
                    document.getElementById('searchAllUsersBtn').click();
                }else if(key === 'sort_by'){
                    const sortHiddenFilters = document.querySelectorAll('.sort-hidden-filters');
                    sortHiddenFilters.forEach(function(filter) {
                        filter.value = '';
                    });
                    if(document.getElementById('searchTable').value != ''){
                        setTimeout(() => {
                            document.getElementById('sortForm').submit();
                        }, 100);
                    }else{
                        setTimeout(() => {
                            document.getElementById('filtersForm').submit();
                        }, 100);
                    }
                }
            });
        });
    });
    // Editing filters
    const editButtons = document.querySelectorAll('.table-active-filters .edit-filter');

    editButtons.forEach(function(button) {
        button.addEventListener('click', function(event) {
            // Get the parent filter div
            const filterDiv = button.closest('.filter');
            const key = filterDiv.getAttribute('data-key');
            const value = filterDiv.getAttribute('data-value');      

            // Find the matching filter option in the custom-select div
            const filterOptions = document.querySelectorAll('.custom-select .select-items div');
              
            filterOptions.forEach(function(option) {
                if (option.getAttribute('data-name') === 'filter_' + key) {
                    option.click();                   
                    openPopup('filtersPopup');
                }else if(key === 'query'){
                    document.getElementById('searchTable').focus();
                }else if(key === 'sort_by'){
                    document.getElementById('sortButton').click();
                }
            });
        });
    });

    // Get the active sort value from the hidden input
    if(document.getElementById('activeSort')){
        var activeSort = document.getElementById('activeSort').value;
    }

    // Loop through each sort-item-wrapper to find the matching sort option
    document.querySelectorAll('.sort-item-wrapper').forEach(function(sortItemWrapper) {
        var radioInput = sortItemWrapper.querySelector('.radio-button__input');
        var labelDiv = sortItemWrapper.querySelector('.radio-button__label div');
        if (labelDiv && labelDiv.innerText === activeSort) {
            radioInput.checked = true;
        }
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
});

// Dynamically Opening Popups
function openPopup(popup){
    const currentPopup = document.getElementById(popup);
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "flex";
    setTimeout(() => {
        popupContent.classList.add('animate-popup-content');
    }, 100);
}

function closePopup(popup){
    const currentPopup = document.getElementById(popup);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    setTimeout(() => {
        currentPopup.style.display = "none";
    }, 200);
}