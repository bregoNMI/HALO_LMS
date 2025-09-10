document.addEventListener("DOMContentLoaded", function () {
    /* Select Table Options */
    let checkedOptionsList = [];
    let selectedIds = [];
    let selectedCourseIds = [];
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
        updateSelectedIds();
        console.log(checkedOptionsList);
        if(checkedOptionsList.length < 1){
            selectedOptionsWrapper.style.display = 'none';
            closeOptionsSidebar();
        }else{
            selectedOptionsWrapper.style.display = 'flex';
            openOptionsSidebar();
            populateUploadedAssignmentsBtn(); 
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
                    updateSelectedIds();             
                    console.log(checkedOptionsList, selectedIds);                
                    // Store the unique IDs in localStorage
                    localStorage.setItem('selectedUserIds', JSON.stringify(selectedIds)); 
                    localStorage.setItem('selectedCourseIds', JSON.stringify(selectedCourseIds));          
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

    function updateSelectedIds(){
        // Clear the array to avoid duplicate entries
        selectedIds = [];  
        selectedCourseIds = [];      
        // Collect all the selected IDs
        checkedOptionsList.forEach(option => {
            const id = option.getAttribute('data-id');
            const courseId = option.getAttribute('data-course-id');
            if (!selectedIds.includes(id)) {
                selectedIds.push(id);
            }
            if (!selectedCourseIds.includes(courseId)) {
                selectedCourseIds.push(courseId);
            }
        }); 
    }

    function multiOptionsSelect(){
        document.getElementById('singleOptionsSelect').style.display = 'none';
        document.getElementById('multiOptionsSelect').style.display = 'flex';
    }

    function populateUploadedAssignmentsBtn(){
        // Opening uploaded course assignments
        document.querySelectorAll('#data-uploaded-assignments').forEach(item => {
            const selectedOption = document.querySelector('.selected-option');
            const courseTitle = selectedOption.querySelector('.course-title');
            console.log('selectedOption:', selectedOption, 'courseTitle:', courseTitle.innerText, courseTitle.innerHTML, );
            item.addEventListener('click', () => {
                window.location.href = `/admin/assignments/?filter_course__title=${courseTitle.textContent}`;
            });
        });
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
        if(tooltipSpan){tooltipSpan.textContent = tooltipText};
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
                        filter.remove();
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
        
        if (labelDiv && labelDiv.innerHTML === activeSort || labelDiv && labelDiv.innerText === activeSort) {
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

    document.querySelectorAll('#data-delete-users').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('userDeleteConfirmation');
        });
    });
    const deleteUserConfirmation = document.getElementById('deleteUserConfirmation');
    if(deleteUserConfirmation){
        deleteUserConfirmation.addEventListener('click', () => {
            console.log(selectedIds);
            const url = '/admin/users/delete-users/';  // Change this to your actual endpoint
    
            fetch(url, {
                method: 'POST',   // or 'DELETE', depending on how your API is set up
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(response => response.json())  // Assuming the server responds with JSON
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    // Redirect to the new page where messages will be shown
                    window.location.href = data.redirect_url;
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                // Handle errors here, such as displaying a message to the user
            });
        });
    }

    // Deleting Courses
    document.querySelectorAll('#data-delete-courses').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('courseDeleteConfirmation');
        });
    });

    const deleteCourseConfirmation = document.getElementById('deleteCourseConfirmation');
    if(deleteCourseConfirmation){
        deleteCourseConfirmation.addEventListener('click', () => {
            console.log(selectedCourseIds);
            const url = '/admin/courses/delete-courses/';
    
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedCourseIds })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                    // displayValidationMessage(data.message, true);
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    }

    // Deleting Categories 
    document.querySelectorAll('#data-delete-categories').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('categoryDeleteConfirmation');
        });
    });

    const deleteCategoryConfirmation = document.getElementById('deleteCategoryConfirmation');
    if(deleteCategoryConfirmation){
        deleteCategoryConfirmation.addEventListener('click', () => {
            console.log(selectedIds);
            const url = '/admin/categories/delete-categories/';
    
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                    // displayValidationMessage(data.message, true);
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    }

    // Deleting Enrollment Keys 
    document.querySelectorAll('#data-delete-enrollment-keys').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('enrollmentKeyDeleteConfirmation');
        });
    });

    const deleteEnrollmentKeyConfirmation = document.getElementById('deleteEnrollmentKeyConfirmation');
    if(deleteEnrollmentKeyConfirmation){
        deleteEnrollmentKeyConfirmation.addEventListener('click', () => {
            console.log(selectedIds);
            const url = '/admin/enrollment-keys/delete-keys/';
    
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                    // displayValidationMessage(data.message, true);
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    }

    // Deleting Quizzes
    document.querySelectorAll('#data-delete-quizzes').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('quizDeleteConfirmation');
        });
    });

    const deleteQuizConfirmation = document.getElementById('deleteQuizConfirmation');
    if(deleteQuizConfirmation){
        deleteQuizConfirmation.addEventListener('click', () => {
            console.log(selectedIds);
            const url = '/admin/quizzes/delete-quizzes/';
    
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                    // displayValidationMessage(data.message, true);
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    }

    // Deleting Questions
    document.querySelectorAll('#data-delete-questions').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('questionDeleteConfirmation');
        });
    });

    const deleteQuestionConfirmation = document.getElementById('deleteQuestionConfirmation');
    if(deleteQuestionConfirmation){
        deleteQuestionConfirmation.addEventListener('click', () => {
            console.log(selectedIds);
            const url = '/admin/questions/delete-questions/';
    
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                    // displayValidationMessage(data.message, true);
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    }

    // Deleting Quiz Templates
    document.querySelectorAll('#data-delete-quiz-templates').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('quizTemplateDeleteConfirmation');
        });
    });

    const deleteQuizTemplateConfirmation = document.getElementById('deleteQuizTemplateConfirmation');
    if(deleteQuizTemplateConfirmation){
        deleteQuizTemplateConfirmation.addEventListener('click', () => {
            console.log(selectedIds);
            const url = '/admin/quiz-templates/delete-quiz-templates/';
    
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                    // displayValidationMessage(data.message, true);
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    }

    // Deleting Assignments
    document.querySelectorAll('#data-delete-assignments').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('assignmentDeleteConfirmation');
        });
    });

    const deleteAssignmentConfirmation = document.getElementById('deleteAssignmentConfirmation');
    if(deleteAssignmentConfirmation){
        deleteAssignmentConfirmation.addEventListener('click', () => {
            console.log(selectedIds);
            const url = '/admin/assignments/delete-assignments/';
    
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                    // displayValidationMessage(data.message, true);
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    }

    // Deleting User Enrollments (Un-Enrolling users)
    document.querySelectorAll('#data-unenroll-users').forEach(item => {
        item.addEventListener('click', () => {
            openPopup('userUnenrollConfirmation');
        });
    });

    const unenrollUserConfirmation = document.getElementById('unenrollUserConfirmation');
    if(unenrollUserConfirmation){
        unenrollUserConfirmation.addEventListener('click', () => {
            console.log(selectedIds);
            const url = '/admin/user-enrollments/delete-enrollments/';
    
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                    // displayValidationMessage(data.message, true);
                } else {
                    console.log('show error');
                    displayValidationMessage(data.message, false);  // Error message
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    }

    // Approving Assignments
    document.querySelectorAll('#data-approve').forEach(item => {
        item.addEventListener('click', () => {
            manageAssignment(selectedIds, 'approved','', true);
        });
    });

    // Rejecting Assignments
    document.querySelectorAll('#data-reject').forEach(item => {
        item.addEventListener('click', () => {
            manageAssignment(selectedIds, 'rejected','', true);
        });
    });

    function getCsrfToken() {
        const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
        return cookieValue;
    } 
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