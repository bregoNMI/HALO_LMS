function initializeUserDropdown(containerId, selectedUserIds = []) {
    const container = document.getElementById(containerId);
    const userSearchInput = container.querySelector('.userSearch');
    console.log(container);
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
                if (resetList || selectedUserIds) {
                    userList.innerHTML = '';
                    page = 1;
                }
    
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
                    // Pre-select users who are already approvers (based on selectedUserIds)
                    if (selectedUserIds.includes(user.id)) {
                        userItem.classList.add('selected');
                        checkbox.checked = true;
                        appendSelectedUser(user.username, user.email, user.id, user.first_name, user.last_name);
                    }
    
                    // Check if the user is already selected and mark the checkbox
                    if (selectedUsersList.querySelector(`[data-user-id="${user.id}"]`)) {
                        userItem.classList.add('selected');
                        checkbox.checked = true; // Ensure the checkbox is checked
                    }
    
                    // Click event for the entire item
                    userItem.addEventListener('click', function (event) {
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

function initializeCourseDropdown(containerId, initialSelectedCourseIds = []) {
    const container = document.getElementById(containerId);
    const courseSearchInput = container.querySelector('.courseSearch');
    const courseList = container.querySelector('.courseList');
    const loadingIndicator = container.querySelector('.loadingIndicator');
    const selectedCoursesList = container.querySelector('.selectedCourses');

    let page = 1;
    let isLoading = false;
    let hasMoreCourses = true;

    const storedIds = JSON.parse(localStorage.getItem('selectedCourseIds') || '[]');
    let selectedCourseIds = [...new Set([...initialSelectedCourseIds, ...storedIds])];

    function getSelectedCourseIdsFromDOM() {
        return Array.from(selectedCoursesList.querySelectorAll('.selected-course'))
            .map(el => el.dataset.courseId);
    }

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

            // Merge localStorage + existing DOM selected course IDs
            const selectedIdsInDOM = getSelectedCourseIdsFromDOM();
            const combinedSelectedIds = new Set([
                ...selectedCourseIds.map(String),
                ...selectedIdsInDOM
            ]);

            data.courses.forEach(course => {
                const courseItem = document.createElement('div');
                courseItem.classList.add('dropdown-item');
                courseItem.innerHTML = `
                    <div class="dropdown-item-inner">
                        <h5>${course.title}</h5>
                    </div>
                `;
                courseItem.dataset.courseId = course.id;

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

                if (combinedSelectedIds.has(String(course.id))) {
                    checkbox.checked = true;
                    courseItem.classList.add('selected');

                    if (!selectedCoursesList.querySelector(`[data-course-id="${course.id}"]`)) {
                        appendSelectedCourse(course.title, course.id);
                    }

                    // Remove from selectedCourseIds so it's not processed again in future fetches
                    selectedCourseIds = selectedCourseIds.filter(id => id !== String(course.id));
                }

                courseItem.addEventListener('click', function () {
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

                checkbox.addEventListener('click', function (event) {
                    event.stopPropagation(); // Prevent checkbox click from triggering twice
                    courseItem.click(); // Trigger the parent item click
                });
            });

            if (data.courses.length === 0 && resetList) {
                courseList.innerHTML = '<div class="no-results">No results found</div>';
            }

            isLoading = false;
            loadingIndicator.style.display = 'none';
            page += 1;

            if (selectedCourseIds.length > 0 && hasMoreCourses && data.courses.length > 0) {
                fetchCourses(searchTerm);
            }
        })
        .catch(error => {
            console.error('Error fetching courses:', error);
            isLoading = false;
            loadingIndicator.style.display = 'none';
        });
    }

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
        updateSelectedCoursesVisibility();
    }

    function removeSelectedCourse(courseId) {
        const courseItem = selectedCoursesList.querySelector(`[data-course-id="${courseId}"]`);
        if (courseItem) {
            courseItem.remove();
        }

        const dropdownItem = courseList.querySelector(`[data-course-id="${courseId}"]`);
        if (dropdownItem) {
            dropdownItem.classList.remove('selected');
            dropdownItem.querySelector('.course-checkbox').checked = false;
        }
        updateSelectedCoursesVisibility();
    }

    function updateSelectedCoursesVisibility() {
        selectedCoursesList.style.display =
            selectedCoursesList.children.length === 0 ? 'none' : 'flex';
    }

    courseList.addEventListener('scroll', function () {
        if (courseList.scrollTop + courseList.clientHeight >= courseList.scrollHeight) {
            fetchCourses(courseSearchInput.value);
        }
    });

    courseSearchInput.addEventListener('input', function () {
        page = 1;
        hasMoreCourses = true;
        fetchCourses(courseSearchInput.value, true);
    });

    courseSearchInput.addEventListener('focus', function () {
        courseSearchInput.style.borderRadius = '8px 8px 0 0';
        courseList.style.display = 'block';
        courseSearchInput.style.border = '2px solid #c7c7db';
    });

    document.addEventListener('click', function (event) {
        if (!container.contains(event.target)) {
            courseList.style.display = 'none';
            courseSearchInput.style.borderRadius = '8px';
            courseSearchInput.style.border = '1px solid #ececf1';
        }
    });

    // Initial load
    fetchCourses();
    updateSelectedCoursesVisibility();
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

                // Mark the item as selected if it matches the input value
                if (course.title === courseSearchInput.value) {
                    appendSelectedCourse(course.title, course.id);
                    checkbox.checked = true;
                    courseItem.classList.add('selected');
                }
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
        
        page = 1;
        hasMoreCourses = true;
        fetchCourses(courseSearchInput.value, true);
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

const timezoneMap = {
    "(UTC)": "UTC",
    "(UTC-05:00) Eastern Time (US & Canada)": "America/New_York",
    "(UTC-06:00) Central Time (US & Canada)": "America/Chicago",
    "(UTC-07:00) Mountain Time (US & Canada)": "America/Denver",
    "(UTC-08:00) Pacific Time (US & Canada)": "America/Los_Angeles",
    "(UTC+00:00) London": "Europe/London",
    "(UTC+01:00) Paris": "Europe/Paris",
    "(UTC+05:30) India Standard Time": "Asia/Kolkata",
    "(UTC+09:00) Japan Standard Time": "Asia/Tokyo",
    "(UTC+10:00) Sydney": "Australia/Sydney"
};

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

        // Setting the hidden IANA Field
        const actualValue = timezoneMap[name] || '';  // fallback to empty
        document.querySelector('#iana_name').value = actualValue;
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

        page = 1;
        hasMoreTimeZones = true;
        fetchTimeZones(timeZoneSearchInput.value, true);
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
    // Initialize dropdown for all category containers on the page
    document.querySelectorAll('.category-dropdown').forEach(dropdown => {
        initializeCategoryDropdown(dropdown.id);
    });

    // Retrieve the selected IDs from localStorage
    const selectedIds = JSON.parse(localStorage.getItem('selectedUserIds') || '[]');
    const selectedCourseIds = JSON.parse(localStorage.getItem('selectedCourseIds') || '[]'); 

    if (selectedIds.length > 0) {
        console.log('Selected user IDs:', selectedIds);
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
    // Getting Course IDs from Local Storage
    if (selectedCourseIds.length > 0) {
        console.log('Selected course IDs:', selectedCourseIds);
        selectedCourseIds.forEach(id => {
            const courseCheckbox = document.querySelector(`input.course-checkbox[value="${id}"]`);
            if (courseCheckbox) {
                courseCheckbox.checked = true;
                courseCheckbox.closest('.dropdown-item').classList.add('selected'); // Add 'selected' class for styling
            }
        });
    } else {
        console.log('No courses selected');
    }
});

function sendEnrollmentRequest() {
    setDisabledSaveBtns();
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
        removeDisabledSaveBtns();
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
        removeDisabledSaveBtns();
    })
    .catch(error => {
        console.error('Error:', error);
        displayValidationMessage('An error occurred during the enrollment process.', false);
        removeDisabledSaveBtns();
    });
}

function sendMessageRequest() {
    setDisabledSaveBtns();
    const selectedUsers = document.querySelectorAll('.selectedUsers .selected-user');
    const subject = document.getElementById('subject').value;
    const body = getEditorContent('body');

    const userIds = Array.from(selectedUsers).map(user => user.getAttribute('data-user-id'));

    if (userIds.length === 0) {
        displayValidationMessage('Please select at least one user.', false);
        removeDisabledSaveBtns();
        return;
    }
    if(subject.length === 0){
        displayValidationMessage('Please enter a message subject.', false);
        removeDisabledSaveBtns();
        return;
    }if(body === '<p><br></p>'){
        displayValidationMessage('Please enter a message body.', false);
        removeDisabledSaveBtns();
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
        removeDisabledSaveBtns();
    })
    .catch(error => {
        console.error('Error:', error);
        displayValidationMessage('An error occurred while sending the message.', false);
        removeDisabledSaveBtns();
    });
}

// Function to get the CSRF token
function getCsrfToken() {
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
    return cookieValue;
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
                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                [{ 'color': [] }, { 'background': [] }],
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
                editor.classList.add('scrollable-content');

                // Push the instance to the quillEditors array
                quillEditors.push(quill);
            }
        });
    }
    
}

function getEditorContent(editorId) {
    const quillEditor = new Quill(`#${editorId}`);
    return quillEditor.root.innerHTML;
}

// Category Dropdown Search
function initializeCategoryDropdown(containerId) {
    const container = document.getElementById(containerId);
    console.log('container:', container);
    const searchInput = container.querySelector('.categorySearch');
    const dropdownList = container.querySelector('.categoryList');
    const loading = container.querySelector('.loadingIndicator');
    const selectedDisplay = container.querySelector('.selectedCategories');
    const noResultsDisplay = container.querySelector('.no-results');

    let page = 1;
    let isLoading = false;
    let hasMore = true;

    if (noResultsDisplay) noResultsDisplay.style.display = 'none';

    function fetchCategories(searchTerm = '', reset = false) {
        if (isLoading || !hasMore) return;

        isLoading = true;
        if (loading) loading.style.display = 'block';

        fetch(`/requests/get-categories/?page=${page}&search=${searchTerm}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(res => res.json())
        .then(data => {
            if (reset) {
                dropdownList.innerHTML = '';
                page = 1;
            }

            if (data.categories.length === 0) {
                if (reset) dropdownList.innerHTML = '<div class="no-results">No categories found</div>';
                hasMore = false;
                isLoading = false;
                if (loading) loading.style.display = 'none';
                return;
            }            

            data.categories.forEach(cat => {
                const item = document.createElement('div');
                item.classList.add('dropdown-item');
                item.innerHTML = `<div class="dropdown-item-inner"><h5>${cat.name}</h5></div>`;
                item.dataset.categoryId = cat.id;

                const checkboxWrap = document.createElement('div');
                checkboxWrap.innerHTML = `
                    <label class="container">
                        <input value="${cat.id}" class="category-checkbox" type="checkbox">
                        <div class="checkmark"></div>
                    </label>
                `;

                const checkbox = checkboxWrap.querySelector('.category-checkbox');
                item.prepend(checkboxWrap);
                dropdownList.appendChild(item);

                item.addEventListener('click', function () {
                    const checkboxes = dropdownList.querySelectorAll('.category-checkbox');
                    checkboxes.forEach(cb => {
                        if (cb !== checkbox) {
                            cb.checked = false;
                            cb.closest('.dropdown-item').classList.remove('selected');
                        }
                    });

                    if (!checkbox.checked) {
                        appendSelected(cat.name, cat.id);
                        checkbox.checked = true;
                        item.classList.add('selected');
                    } else {
                        removeSelected(cat.id);
                        checkbox.checked = false;
                        item.classList.remove('selected');
                    }
                });

                checkbox.addEventListener('click', function (e) {
                    e.stopPropagation();
                    item.click();
                });

                // Only auto-select if the input has data-id matching the current cat
                const preSelectedId = searchInput.getAttribute('data-id');
                if (preSelectedId && parseInt(preSelectedId) === cat.id && cat.name === searchInput.value) {
                    appendSelected(cat.name, cat.id);
                    checkbox.checked = true;
                    item.classList.add('selected');
                }
            });

            hasMore = data.has_more;
            isLoading = false;
            if (loading) loading.style.display = 'none';
            page += 1;
        })
        .catch(err => {
            console.error('Error fetching categories:', err);
            isLoading = false;
            if (loading) loading.style.display = 'none';
        });
    }

    function appendSelected(name, id) {
        searchInput.value = name;
        searchInput.setAttribute('data-id', id);
    }

    function removeSelected(id) {
        if (selectedDisplay) {
            const item = selectedDisplay.querySelector(`[data-id="${id}"]`);
            if (item) item.remove();
        }

        searchInput.value = '';
        const item = dropdownList.querySelector(`[data-id="${id}"]`);
        if (item) {
            item.classList.remove('selected');
            item.querySelector('.category-checkbox').checked = false;
        }
    }

    dropdownList.addEventListener('scroll', function () {
        if (dropdownList.scrollTop + dropdownList.clientHeight >= dropdownList.scrollHeight) {
            fetchCategories(searchInput.value);
        }
    });

    searchInput.addEventListener('input', function () {
        page = 1;
        hasMore = true;
        fetchCategories(searchInput.value, true);
    });

    searchInput.addEventListener('focus', function () {
        searchInput.style.borderRadius = '8px 8px 0 0';
        dropdownList.style.display = 'block';
        searchInput.style.border = '2px solid #c7c7db';
        page = 1;
        hasMore = true;
        fetchCategories(searchInput.value, true);
    });

    document.addEventListener('click', function (e) {
        if (!container.contains(e.target)) {
            dropdownList.style.display = 'none';
            searchInput.style.borderRadius = '8px';
            searchInput.style.border = '1px solid #ececf1';
        }
    });

    fetchCategories();
}

// Function to create a new category
function createCategory(parent_category, name, description, isCreatePage) {
    fetch('/requests/create-category/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams({
            'parent_category': parent_category || '',
            'name': name,
            'description': description,
            'isCreatePage': isCreatePage,
        }),
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Error creating category');
    })
    .then(data => {
        // Update the dropdown list with the new category
        updateCategoryDropdown(data.id, data.name);
        // Fully resetting the category dropdown to add the newly added category
        const categoryList = document.querySelector('.categoryList');
        const dropdownItems = categoryList.querySelectorAll('.dropdown-item');
        // Remove each dropdown item
        dropdownItems.forEach(item => {
            categoryList.removeChild(item);
        });

        document.querySelectorAll('.category-dropdown').forEach(dropdown => {
            initializeCategoryDropdown(dropdown.id);
        });
        if(data.is_create_page == 'true'){
            location.href = '/admin/categories/';
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Function to create a new category
function editCategory(id, parent_category, name, description, isCreatePage) {
    fetch('/requests/edit-category/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams({
            'id': id,
            'parent_category': parent_category || '',
            'name': name,
            'description': description,
            'isCreatePage': isCreatePage,
        }),
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Error editing category');
    })
    .then(data => {
        // Update the dropdown list with the new category
        updateCategoryDropdown(data.id, data.name);
        // Fully resetting the category dropdown to add the newly added category
        const categoryList = document.querySelector('.categoryList');
        const dropdownItems = categoryList.querySelectorAll('.dropdown-item');
        // Remove each dropdown item
        dropdownItems.forEach(item => {
            categoryList.removeChild(item);
        });

        document.querySelectorAll('.category-dropdown').forEach(dropdown => {
            initializeCategoryDropdown(dropdown.id);
        });
        if(data.is_create_page == true){
            location.href = '/admin/categories/';
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Function to update the category dropdown list
function updateCategoryDropdown(categoryId, categoryName) {
    const categoryList = document.querySelector('.categoryList');  // Adjust if necessary

    const categoryItem = document.createElement('div');
    categoryItem.classList.add('dropdown-item');
    categoryItem.innerHTML = `
        <div class="dropdown-item-inner">
            <h5>${categoryName}</h5>
        </div>
    `;
    categoryItem.dataset.categoryId = categoryId;

    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.innerHTML = `
        <label class="container">
            <input value="${categoryId}" class="category-checkbox" type="checkbox">
            <div class="checkmark"></div>
        </label>
    `;

    categoryItem.prepend(checkboxWrapper);
    categoryList.appendChild(categoryItem);
}

// Function to create a new enrollment key
function createEnrollmentKey(name, keyName, courseIds, active, maxUses, isCreatePage) {
    fetch('/requests/create-enrollment-key/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams({
            'name': name,
            'key_name': keyName,
            'course_ids': courseIds,
            'active': active,
            'max_uses': maxUses,
            'isCreatePage': isCreatePage,
        }),
    })
    .then(async response => {
        const data = await response.json();

        if (!response.ok) {
            displayValidationMessage(data.error || 'Failed to create key.', false);
            removeDisabledSaveBtns();
            return;
        }

        if (data.is_create_page === 'true') {
            location.href = '/admin/enrollment-keys/';
        } else {
            displayValidationMessage('Enrollment key created successfully!', true);
        }
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        displayValidationMessage('Something went wrong. Please try again.', false);
    });
}

// Function to create a edit enrollment key
function editEnrollmentKey(id, name, keyName, courseIds, active, maxUses, isCreatePage) {
    console.log(id, name, keyName, courseIds, active, maxUses, isCreatePage);
    fetch('/requests/edit-enrollment-key/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams({
            'id': id,
            'name': name,
            'key_name': keyName,
            'course_ids': courseIds,
            'active': active,
            'max_uses': maxUses,
            'isCreatePage': isCreatePage,
        }),
    })
    .then(async response => {
        const data = await response.json();

        if (!response.ok) {
            displayValidationMessage(data.error || 'Failed to create key.', false);
            removeDisabledSaveBtns();
            return;
        }

        if (data.is_create_page === 'true') {
            location.href = '/admin/enrollment-keys/';
        } else {
            displayValidationMessage('Enrollment key edited successfully!', true);
        }
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        displayValidationMessage('Something went wrong. Please try again.', false);
    });
}

// Helper function to get CSRF token from cookies
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