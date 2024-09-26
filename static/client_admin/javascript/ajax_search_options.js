function initializeUserDropdown(containerId) {
    const container = document.getElementById(containerId);
    const userSearchInput = container.querySelector('.userSearch');
    const userList = container.querySelector('.userList');
    const loadingIndicator = container.querySelector('.loadingIndicator');
    const selectedUsersList = container.querySelector('.selectedUsers');

    let page = 1;
    let isLoading = false;
    let hasMoreUsers = true;

    // Function to fetch users from the backend
    function fetchUsers(searchTerm = '', resetList = false) {
        if (isLoading || !hasMoreUsers) return;
    
        isLoading = true;
        loadingIndicator.style.display = 'block';
    
        fetch(`/requests/get-users/?page=${page}&search=${searchTerm}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (resetList) {
                userList.innerHTML = '';
                page = 1;
            }

            // Retrieve selected IDs from localStorage
            const selectedIds = JSON.parse(localStorage.getItem('selectedUserIds') || '[]');

            // Append users to the dropdown list
            data.users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.classList.add('dropdown-item');
                userItem.innerHTML = `
                    <div class="dropdown-item-inner">
                        <h5>${user.first_name} ${user.last_name}</h5><span>${user.username} (${user.email})</span>
                    </div>
                `;
                userItem.dataset.userId = user.id;

                // Create the checkbox with the proper structure
                const checkboxWrapper = document.createElement('div');
                checkboxWrapper.innerHTML = `
                    <label class="container">
                        <input value="${user.id}" class="user-checkbox" type="checkbox">
                        <div class="checkmark"></div>
                    </label>
                `;

                userItem.prepend(checkboxWrapper);
                userList.appendChild(userItem);

                const checkbox = checkboxWrapper.querySelector('.user-checkbox');

                // Pre-select the checkbox if the user is already in the selected IDs
                if (selectedIds.includes(String(user.id))) {
                    checkbox.checked = true;
                    userItem.classList.add('selected');
                    appendSelectedUser(user.username, user.email, user.id, user.first_name, user.last_name);
                }

                // Click event for the entire item
                userItem.addEventListener('click', function () {
                    if (checkbox.checked) {
                        removeSelectedUser(user.id);
                        checkbox.checked = false;
                        userItem.classList.remove('selected');
                    } else {
                        appendSelectedUser(user.username, user.email, user.id, user.first_name, user.last_name);
                        checkbox.checked = true;
                        userItem.classList.add('selected');
                    }
                });

                // Ensure checkbox triggers parent item click
                checkbox.addEventListener('click', function (event) {
                    event.stopPropagation();  // Prevent checkbox click from triggering twice
                    userItem.click();  // Trigger the parent item click
                });
            });

            if (data.users.length === 0 && resetList) {
                userList.innerHTML = '<div class="no-results">No results found</div>';
            }

            hasMoreUsers = data.has_more;
            isLoading = false;
            loadingIndicator.style.display = 'none';
            page += 1;

            // Optionally clear the localStorage after retrieval
            localStorage.removeItem('selectedUserIds');
        })
        .catch(error => {
            console.error('Error fetching users:', error);
            isLoading = false;
            loadingIndicator.style.display = 'none';
        });      
    }    

    // Function to append selected user to the list
    function appendSelectedUser(username, email, userId, first_name, last_name) {
        const userItem = document.createElement('div');
        userItem.classList.add('selected-user');
        userItem.dataset.userId = userId;
        if(first_name){
            userItem.innerHTML = `<span class="selected-user-details">${first_name} ${last_name}</span>`;
        }else{
            userItem.innerHTML = `<span class="selected-user-details">${username} (${email})</span>`;
        }

        const removeButton = document.createElement('div');
        removeButton.classList.add('remove-user');
        removeButton.innerHTML = `
        <div class="upload-delete tooltip" data-tooltip="Remove User">
            <span class="tooltiptext">Remove User</span>
            <i class="fa-regular fa-trash"></i>
        </div>
        `;
        removeButton.addEventListener('click', function () {
            removeSelectedUser(userId);
        });

        userItem.appendChild(removeButton);
        selectedUsersList.appendChild(userItem);
    }

    // Function to remove selected user from the list
    function removeSelectedUser(userId) {
        const userItem = selectedUsersList.querySelector(`[data-user-id="${userId}"]`);
        if (userItem) {
            userItem.remove();
        }

        // Uncheck the corresponding item in the dropdown
        const dropdownItem = userList.querySelector(`[data-user-id="${userId}"]`);
        if (dropdownItem) {
            dropdownItem.classList.remove('selected');
            dropdownItem.querySelector('.user-checkbox').checked = false;
        }
    }

    // Event listener for scrolling in the dropdown list (infinite scroll)
    userList.addEventListener('scroll', function () {
        if (userList.scrollTop + userList.clientHeight >= userList.scrollHeight) {
            fetchUsers(userSearchInput.value);
        }
    });

    // Event listener for the search input
    userSearchInput.addEventListener('input', function () {
        page = 1;
        hasMoreUsers = true;
        fetchUsers(userSearchInput.value, true);
    });

    // Event listener to display the dropdown list when focusing the search input
    userSearchInput.addEventListener('focus', function () {
        userSearchInput.style.borderRadius = '8px 8px 0 0';
        userList.style.display = 'block';
        userSearchInput.style.border = '2px solid #c7c7db';
    });

    // Hide the dropdown list when clicking outside
    document.addEventListener('click', function (event) {
        if (!container.contains(event.target)) {
            userList.style.display = 'none';
            userSearchInput.style.borderRadius = '8px';
            userSearchInput.style.border = '1px solid #ececf1';
        }
    });

    // Initial load
    fetchUsers();
}

function initializeCourseDropdown(containerId) {
    const container = document.getElementById(containerId);
    const courseSearchInput = container.querySelector('.courseSearch');
    const courseList = container.querySelector('.courseList');
    const loadingIndicator = container.querySelector('.loadingIndicator');
    const selectedCoursesList = container.querySelector('.selectedCourses');

    let page = 1;
    let isLoading = false;
    let hasMoreCourses = true;

    // Function to fetch courses from the backend
    function fetchCourses(searchTerm = '', resetList = false) {
        if (isLoading || !hasMoreCourses) return;

        isLoading = true;
        loadingIndicator.style.display = 'block';

        fetch(`/requests/get-courses/?page=${page}&search=${searchTerm}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
            .then(response => response.json())
            .then(data => {
                if (resetList) {
                    courseList.innerHTML = '';
                    page = 1;
                }

                // Append courses to the dropdown list
                data.courses.forEach(course => {
                    const courseItem = document.createElement('div');
                    courseItem.classList.add('dropdown-item');
                    courseItem.innerHTML = `
                        <div class="dropdown-item-inner">
                            <h5>${course.title}</h5>
                        </div>
                    `;
                    courseItem.dataset.courseId = course.id;

                    // Create the checkbox with the proper structure
                    const checkboxWrapper = document.createElement('div');
                    checkboxWrapper.innerHTML = `
                        <label class="container">
                            <input value="${course.id}" class="course-checkbox" type="checkbox">
                            <div class="checkmark"></div>
                        </label>
                    `;

                    courseItem.prepend(checkboxWrapper);
                    courseList.appendChild(courseItem);

                    const checkbox = checkboxWrapper.querySelector('.course-checkbox');

                    // Check if the course is already selected and mark the checkbox
                    if (selectedCoursesList.querySelector(`[data-course-id="${course.id}"]`)) {
                        courseItem.classList.add('selected');
                        checkbox.checked = true; // Ensure the checkbox is checked
                    }

                    // Click event for the entire item
                    courseItem.addEventListener('click', function (event) {
                        if (checkbox.checked) {
                            removeSelectedCourse(course.id);
                            checkbox.checked = false;
                            courseItem.classList.remove('selected');
                        } else {
                            appendSelectedCourse(course.title, course.id);
                            checkbox.checked = true;
                            courseItem.classList.add('selected');
                        }
                    });

                    // Ensure checkbox triggers parent item click
                    checkbox.addEventListener('click', function (event) {
                        event.stopPropagation();  // Prevent checkbox click from triggering twice
                        courseItem.click();  // Trigger the parent item click
                    });
                });

                if (data.courses.length === 0 && resetList) {
                    courseList.innerHTML = '<div class="no-results">No results found</div>';
                }

                hasMoreCourses = data.has_more;
                isLoading = false;
                loadingIndicator.style.display = 'none';
                page += 1;
            })
            .catch(error => {
                console.error('Error fetching courses:', error);
                isLoading = false;
                loadingIndicator.style.display = 'none';
            });
    }

    // Function to append selected course to the list
    function appendSelectedCourse(name, courseId) {
        const courseItem = document.createElement('div');
        courseItem.classList.add('selected-course');
        courseItem.dataset.courseId = courseId;
        courseItem.innerHTML = `<span class="selected-course-details">${name}</span>`;

        const removeButton = document.createElement('div');
        removeButton.classList.add('remove-course');
        removeButton.innerHTML = `
        <div class="upload-delete tooltip" data-tooltip="Remove Course">
            <span class="tooltiptext">Remove Course</span>
            <i class="fa-regular fa-trash"></i>
        </div>
        `;
        removeButton.addEventListener('click', function () {
            removeSelectedCourse(courseId);
        });

        courseItem.appendChild(removeButton);
        selectedCoursesList.appendChild(courseItem);
    }

    // Function to remove selected course from the list
    function removeSelectedCourse(courseId) {
        const courseItem = selectedCoursesList.querySelector(`[data-course-id="${courseId}"]`);
        if (courseItem) {
            courseItem.remove();
        }

        // Uncheck the corresponding item in the dropdown
        const dropdownItem = courseList.querySelector(`[data-course-id="${courseId}"]`);
        if (dropdownItem) {
            dropdownItem.classList.remove('selected');
            dropdownItem.querySelector('.course-checkbox').checked = false;
        }
    }

    // Event listener for scrolling in the dropdown list (infinite scroll)
    courseList.addEventListener('scroll', function () {
        if (courseList.scrollTop + courseList.clientHeight >= courseList.scrollHeight) {
            fetchCourses(courseSearchInput.value);
        }
    });

    // Event listener for the search input
    courseSearchInput.addEventListener('input', function () {
        page = 1;
        hasMoreCourses = true;
        fetchCourses(courseSearchInput.value, true);
    });

    // Event listener to display the dropdown list when focusing the search input
    courseSearchInput.addEventListener('focus', function () {
        courseSearchInput.style.borderRadius = '8px 8px 0 0';
        courseList.style.display = 'block';
        courseSearchInput.style.border = '2px solid #c7c7db';
    });

    // Hide the dropdown list when clicking outside
    document.addEventListener('click', function (event) {
        if (!container.contains(event.target)) {
            courseList.style.display = 'none';
            courseSearchInput.style.borderRadius = '8px';
            courseSearchInput.style.border = '1px solid #ececf1';
        }
    });

    // Initial load
    fetchCourses();
}

function initializeSingularCourseDropdown(containerId) {
    const container = document.getElementById(containerId);
    const courseSearchInput = container.querySelector('.courseSearch');
    const courseList = container.querySelector('.courseList');
    const loadingIndicator = container.querySelector('.loadingIndicator');
    const selectedCoursesList = container.querySelector('.selectedCourses'); // Keep this if you want to show selected courses separately

    let page = 1;
    let isLoading = false;
    let hasMoreCourses = true;

    // Function to fetch courses from the backend
    function fetchCourses(searchTerm = '', resetList = false) {
        if (isLoading || !hasMoreCourses) return;

        isLoading = true;
        loadingIndicator.style.display = 'block';

        fetch(`/requests/get-courses/?page=${page}&search=${searchTerm}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (resetList) {
                courseList.innerHTML = '';
                page = 1;
            }

            // Append courses to the dropdown list
            data.courses.forEach(course => {
                const courseItem = document.createElement('div');
                courseItem.classList.add('dropdown-item');
                courseItem.innerHTML = `
                    <div class="dropdown-item-inner">
                        <h5>${course.title}</h5>
                    </div>
                `;
                courseItem.dataset.courseId = course.id;

                // Create the checkbox with the proper structure
                const checkboxWrapper = document.createElement('div');
                checkboxWrapper.innerHTML = `
                    <label class="container">
                        <input value="${course.id}" class="course-checkbox" type="checkbox">
                        <div class="checkmark"></div>
                    </label>
                `;

                courseItem.prepend(checkboxWrapper);
                courseList.appendChild(courseItem);

                const checkbox = checkboxWrapper.querySelector('.course-checkbox');

                // Check if the course is already selected and mark the checkbox
                if (selectedCoursesList.querySelector(`[data-course-id="${course.id}"]`)) {
                    courseItem.classList.add('selected');
                    checkbox.checked = true; // Ensure the checkbox is checked
                }

                // Click event for the course item
                courseItem.addEventListener('click', function () {
                    // Uncheck all checkboxes and remove selection from previously selected items
                    const previouslySelectedItem = courseList.querySelector('.dropdown-item.selected');
                    if (previouslySelectedItem) {
                        previouslySelectedItem.classList.remove('selected');
                        const previousCheckbox = previouslySelectedItem.querySelector('.course-checkbox');
                        if (previousCheckbox) {
                            previousCheckbox.checked = false;
                        }
                    }

                    // Select the current item
                    appendSelectedCourse(course.title, course.id);
                    checkbox.checked = true; // Ensure the checkbox is checked
                    courseItem.classList.add('selected');

                    // Do not close the dropdown on item select
                });

                // Ensure checkbox triggers parent item click
                checkbox.addEventListener('click', function (event) {
                    event.stopPropagation(); // Prevent checkbox click from triggering twice
                    courseItem.click(); // Trigger the parent item click
                });
            });

            if (data.courses.length === 0 && resetList) {
                courseList.innerHTML = '<div class="no-results">No results found</div>';
            }

            hasMoreCourses = data.has_more;
            isLoading = false;
            loadingIndicator.style.display = 'none';
            page += 1;
        })
        .catch(error => {
            console.error('Error fetching courses:', error);
            isLoading = false;
            loadingIndicator.style.display = 'none';
        });
    }

    // Function to append selected course to the list
    function appendSelectedCourse(name, courseId) {
        selectedCoursesList.innerHTML = ''; // Clear previous selections
        
        // Update the course name in the search input (visible to the user)
        courseSearchInput.value = name;
    
        // Update the hidden input with the selected course ID
        const hiddenInput = container.querySelector('input[type="hidden"]'); // Dynamically find the hidden input within the same container
        console.log(hiddenInput, container);
        if (hiddenInput) {
            hiddenInput.value = courseId;  // Set the selected course ID in the hidden input
        }
    }

    // Function to remove selected course from the list
    function removeSelectedCourse(courseId) {
        const courseItem = selectedCoursesList.querySelector(`[data-course-id="${courseId}"]`);
        if (courseItem) {
            courseItem.remove();
        }

        // Uncheck the corresponding item in the dropdown
        const dropdownItem = courseList.querySelector(`[data-course-id="${courseId}"]`);
        if (dropdownItem) {
            dropdownItem.classList.remove('selected');
            dropdownItem.querySelector('.course-checkbox').checked = false;
        }
    }

    // Event listener for scrolling in the dropdown list (infinite scroll)
    courseList.addEventListener('scroll', function () {
        if (courseList.scrollTop + courseList.clientHeight >= courseList.scrollHeight) {
            fetchCourses(courseSearchInput.value);
        }
    });

    // Event listener for the search input
    courseSearchInput.addEventListener('input', function () {
        page = 1;
        hasMoreCourses = true;
        fetchCourses(courseSearchInput.value, true);
    });

    // Event listener to display the dropdown list when focusing the search input
    courseSearchInput.addEventListener('focus', function () {
        courseSearchInput.style.borderRadius = '8px 8px 0 0';
        courseList.style.display = 'block';
        courseSearchInput.style.border = '2px solid #c7c7db';
    });

    // Hide the dropdown list when clicking outside
    document.addEventListener('click', function (event) {
        if (!container.contains(event.target)) {
            courseList.style.display = 'none';
            courseSearchInput.style.borderRadius = '8px';
            courseSearchInput.style.border = '1px solid #ececf1';
        }
    });

    // Initial load
    fetchCourses();
}

function initializeTimeZoneDropdown(containerId) { 
    const container = document.getElementById(containerId);
    const timeZoneSearchInput = container.querySelector('.timezoneSearch');
    const timeZoneList = container.querySelector('.timezoneList');
    const loadingIndicator = container.querySelector('.loadingIndicator');
    const selectedTimezones = container.querySelector('.selectedTimezones');

    let page = 1;
    let isLoading = false;
    let hasMoreTimeZones = true;

    // Function to fetch timezones from the backend
    function fetchTimeZones(searchTerm = '', resetList = false) {
        if (isLoading || !hasMoreTimeZones) return;

        isLoading = true;
        loadingIndicator.style.display = 'block';

        fetch(`/requests/get-timezones/?page=${page}&search=${searchTerm}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (resetList) {
                timeZoneList.innerHTML = '';
                page = 1;
            }

            // Append timezones to the dropdown list
            data.timezones.forEach(timezone => {
                const timezoneItem = document.createElement('div');
                timezoneItem.classList.add('dropdown-item');
                timezoneItem.innerHTML = `
                    <div class="dropdown-item-inner">
                        <h5>${timezone.name}</h5>
                    </div>
                `;
                timezoneItem.dataset.timezoneId = timezone.id;

                // Create the checkbox with the proper structure
                const checkboxWrapper = document.createElement('div');
                checkboxWrapper.innerHTML = `
                    <label class="container">
                        <input value="${timezone.id}" class="timezone-checkbox" type="checkbox">
                        <div class="checkmark"></div>
                    </label>
                `;

                timezoneItem.prepend(checkboxWrapper);
                timeZoneList.appendChild(timezoneItem);

                const checkbox = checkboxWrapper.querySelector('.timezone-checkbox');

                // Click event for the entire item
                timezoneItem.addEventListener('click', function (event) {
                    // Uncheck all other checkboxes and remove previously selected timezone
                    const allCheckboxes = timeZoneList.querySelectorAll('.timezone-checkbox');
                    allCheckboxes.forEach(cb => {
                        if (cb !== checkbox) {
                            cb.checked = false;
                            cb.closest('.dropdown-item').classList.remove('selected');
                        }
                    });

                    // Set the current checkbox state
                    if (!checkbox.checked) {
                        appendSelectedTimezone(timezone.name, timezone.id);
                        checkbox.checked = true;
                        timezoneItem.classList.add('selected');
                    } else {
                        removeSelectedTimezone(timezone.id);
                        checkbox.checked = false;
                        timezoneItem.classList.remove('selected');
                    }
                });

                // Ensure checkbox triggers parent item click
                checkbox.addEventListener('click', function (event) {
                    event.stopPropagation();  // Prevent checkbox click from triggering twice
                    timezoneItem.click();  // Trigger the parent item click
                });

                // Mark the item as selected if it matches the input value
                if (timezone.name === timeZoneSearchInput.value) {
                    appendSelectedTimezone(timezone.name, timezone.id);
                    checkbox.checked = true;
                    timezoneItem.classList.add('selected');
                }
            });

            if (data.timezones.length === 0 && resetList) {
                timeZoneList.innerHTML = '<div class="no-results">No results found</div>';
            }

            hasMoreTimeZones = data.has_more;
            isLoading = false;
            loadingIndicator.style.display = 'none';
            page += 1;
        })
        .catch(error => {
            console.error('Error fetching timezones:', error);
            isLoading = false;
            loadingIndicator.style.display = 'none';
        });
    }

    // Function to append selected timezone to the list and input field
    function appendSelectedTimezone(name, timezoneId) {
        // Update the input field with the selected timezone name
        timeZoneSearchInput.value = name;
    }

    // Function to remove selected timezone from the list
    function removeSelectedTimezone(timezoneId) {
        const timezoneItem = selectedTimezones.querySelector(`[data-timezone-id="${timezoneId}"]`);
        if (timezoneItem) {
            timezoneItem.remove();
        }
        
        // Clear the input field when no timezone is selected
        timeZoneSearchInput.value = '';

        // Uncheck the corresponding item in the dropdown
        const dropdownItem = timeZoneList.querySelector(`[data-timezone-id="${timezoneId}"]`);
        if (dropdownItem) {
            dropdownItem.classList.remove('selected');
            dropdownItem.querySelector('.timezone-checkbox').checked = false;
        }
    }

    // Event listener for scrolling in the dropdown list (infinite scroll)
    timeZoneList.addEventListener('scroll', function () {
        if (timeZoneList.scrollTop + timeZoneList.clientHeight >= timeZoneList.scrollHeight) {
            fetchTimeZones(timeZoneSearchInput.value);
        }
    });

    // Event listener for the search input
    timeZoneSearchInput.addEventListener('input', function () {
        page = 1;
        hasMoreTimeZones = true;
        fetchTimeZones(timeZoneSearchInput.value, true);
    });

    // Event listener to display the dropdown list when focusing the search input
    timeZoneSearchInput.addEventListener('focus', function () {
        timeZoneSearchInput.style.borderRadius = '8px 8px 0 0';
        timeZoneList.style.display = 'block';
        timeZoneSearchInput.style.border = '2px solid #c7c7db';
    });

    // Hide the dropdown list when clicking outside
    document.addEventListener('click', function (event) {
        if (!container.contains(event.target)) {
            timeZoneList.style.display = 'none';
            timeZoneSearchInput.style.borderRadius = '8px';
            timeZoneSearchInput.style.border = '1px solid #ececf1';
        }
    });

    // Initial load
    fetchTimeZones();
}

document.addEventListener('DOMContentLoaded', function () {
    initializeQuill();


    // Initialize dropdown for all containers on the page
    document.querySelectorAll('.user-dropdown').forEach(dropdown => {
        initializeUserDropdown(dropdown.id);
    });
    document.querySelectorAll('.course-dropdown').forEach(dropdown => {
        initializeCourseDropdown(dropdown.id);
    }); 
    document.querySelectorAll('.timezone-dropdown').forEach(dropdown => {
        initializeTimeZoneDropdown(dropdown.id);
    }); 
    document.querySelectorAll('.singular-course-dropdown').forEach(dropdown => {
        initializeSingularCourseDropdown(dropdown.id);
    });

    // Retrieve the selected IDs from localStorage
    const selectedIds = JSON.parse(localStorage.getItem('selectedUserIds') || '[]');

    if (selectedIds.length > 0) {
        console.log('Selected user IDs:', selectedIds);

        // Check off the corresponding user item boxes
        selectedIds.forEach(id => {
            const userCheckbox = document.querySelector(`input.user-checkbox[value="${id}"]`);
            if (userCheckbox) {
                userCheckbox.checked = true;
                userCheckbox.closest('.dropdown-item').classList.add('selected'); // Add 'selected' class for styling
            }
        });
    } else {
        console.log('No users selected');
    }
});

function sendEnrollmentRequest() {
    // Get selected users and courses
    const selectedUsers = document.querySelectorAll('.selectedUsers .selected-user');
    const selectedCourses = document.querySelectorAll('.selectedCourses .selected-course');

    // Extract IDs from selected users
    const userIds = Array.from(selectedUsers).map(user => user.getAttribute('data-user-id'));

    // Extract IDs from selected courses
    const courseIds = Array.from(selectedCourses).map(course => course.getAttribute('data-course-id'));

    // Check if any users or courses are selected
    if (userIds.length === 0 || courseIds.length === 0) {
        displayValidationMessage('Please select at least one user and one course.', false);
        return;
    }

    // Create the data object to be sent in the POST request
    const data = new FormData();
    userIds.forEach(id => data.append('user_ids[]', id));
    courseIds.forEach(id => data.append('course_ids[]', id));

    // Send the POST request to the server
    fetch('/admin/users/enroll-user-request/', {
        method: 'POST',
        body: data,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Network response was not ok');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.redirect_url) {
            // Redirect to the new page where messages will be shown
            window.location.href = data.redirect_url;
        } else {
            // Display validation message for error case
            displayValidationMessage(data.message, false);  // Error message
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayValidationMessage('An error occurred during the enrollment process.', false);
    });
}

function sendMessageRequest() {
    const selectedUsers = document.querySelectorAll('.selectedUsers .selected-user');
    const subject = document.getElementById('subject').value;
    const body = getEditorContent('body');

    const userIds = Array.from(selectedUsers).map(user => user.getAttribute('data-user-id'));

    if (userIds.length === 0) {
        displayValidationMessage('Please select at least one user.', false);
        return;
    }
    if(subject.length === 0){
        displayValidationMessage('Please enter a message subject.', false);
        return;
    }if(body === '<p><br></p>'){
        displayValidationMessage('Please enter a message body.', false);
        return;
    }

    const data = new FormData();
    userIds.forEach(id => data.append('user_ids[]', id));
    data.append('subject', subject);  // Include key 'subject'
    data.append('body', body);        // Include key 'body'

    fetch('/admin/users/message-user-request/', {
        method: 'POST',
        body: data,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Network response was not ok');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.redirect_url) {
            window.location.href = data.redirect_url;
        } else {
            displayValidationMessage(data.message, false);  // Error message
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayValidationMessage('An error occurred while sending the message.', false);
    });
}

// Function to get the CSRF token
function getCsrfToken() {
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
    return cookieValue;
}

const validationMessageContainer = document.getElementById('validation-message-container');
const validationMessageInner = document.getElementById('validation-message-inner');
const validationMessage = document.getElementById('validation-message');
const validationIcon = document.getElementById('validation-icon');

function displayValidationMessage(message, isSuccess) {
    validationMessage.textContent = message;
    validationMessageContainer.style.display = 'flex';
    setTimeout(() => {
        validationMessageContainer.className = isSuccess ? 'alert-container animate-alert-container' : 'alert-container animate-alert-container';
    }, 100);
    validationMessageInner.className = isSuccess ? 'alert alert-success' : 'alert alert-error';
    setTimeout(() => {
        validationMessageContainer.classList.remove('animate-alert-container');
    }, 10000);
    if(isSuccess){
        validationIcon.className = 'fa-solid fa-circle-check';
    }else{
        validationIcon.className = 'fa-solid fa-triangle-exclamation';
    }
}

// Declare quillEditors as a global variable to store all Quill instances
let quillEditors = [];

function initializeQuill() {
    // Select all elements with a specific class that should have a Quill editor
    const editors = document.querySelectorAll('.editor-container');
    if(editors.length > 0){
        var icons = Quill.import('ui/icons');
        icons['bold'] = '<i class="fa-solid fa-bold"></i>';
        icons['italic'] = '<i class="fa-solid fa-italic"></i>';
        icons['underline'] = '<i class="fa-solid fa-underline"></i>';
        icons['link'] = '<i class="fa-solid fa-link"></i>';
        icons['image'] = '<i class="fa-regular fa-image"></i>';

        

        // Iterate over each editor container
        editors.forEach(function(editor) {
            // Check if the editor container has already been initialized
            if (!editor.classList.contains('quill-initialized')) {
                // Initialize a new Quill editor for this container
                const quill = new Quill(editor, {
                    theme: 'snow',
                    modules: {
                        toolbar: {
                            container: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline'],
                                ['link', 'image']
                            ],
                            handlers: {
                                // Add custom handlers here
                            }
                        }
                    }
                });

                // Mark this container as initialized
                editor.classList.add('quill-initialized');

                // Push the instance to the quillEditors array
                quillEditors.push(quill);
            }
        });
    }
    
}

function getEditorContent(editorId) {
    const quillEditor = new Quill(`#${editorId}`);
    return quillEditor.root.innerHTML; // or quillEditor.getText() for plain text
}