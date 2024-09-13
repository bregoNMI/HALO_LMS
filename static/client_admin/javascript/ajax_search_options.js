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

document.addEventListener('DOMContentLoaded', function () {
    // Initialize dropdown for all containers on the page
    document.querySelectorAll('.user-dropdown').forEach(dropdown => {
        initializeUserDropdown(dropdown.id);
    });
    document.querySelectorAll('.course-dropdown').forEach(dropdown => {
        initializeCourseDropdown(dropdown.id);
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

function enrollUsers(){
    const selectedUsers = document.querySelectorAll('.selectedUsers');

    const selectedCourses = document.querySelectorAll('.selectedCourses');

    console.log(selectedUsers, selectedCourses);
}