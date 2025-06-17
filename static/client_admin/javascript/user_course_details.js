document.addEventListener('DOMContentLoaded', function() {
    /* Progress Bar Styling */
    const courseProgress = document.getElementById('courseProgress');
    if (courseProgress) {
        /* course_progress comes from the HTML */
        courseProgress.setAttribute('value', course_progress);
    }

    document.querySelectorAll('.radio-option').forEach(radio => {
        radio.addEventListener('change', function () {
            initializeRadioCheckboxes(this);
        });
    });   
});

function initializeRadioCheckboxes(radio) {
    if (radio.checked) {
        const container = radio.closest('.course-content-input');
        
        // Show current target
        if (radio.dataset.target) {
            const targetElement = document.getElementById(radio.dataset.target);
            if (targetElement) {
                targetElement.classList.add('show-toggle-option-details');
            }
        }

        // Hide other targets
        container.querySelectorAll('.radio-option').forEach(other => {
            if (other !== radio && other.dataset.target) {
                const otherTarget = document.getElementById(other.dataset.target);
                if (otherTarget) {
                    otherTarget.classList.remove('show-toggle-option-details');
                }
            }
        });

        // Handle course/lesson logic
        if (radio.value === 'completed' && radio.name === 'course_status') {
            setCourseCompletedTime();
        } else if (radio.value === 'completed' && radio.name === 'lesson_status') {
            setLessonCompletedTime();
        }
    }
}

function setCourseCompletedTime() {
    const completedDateInput = document.getElementById('completed_date');
    const completedTimeInput = document.getElementById('completed_time');

    const now = new Date();

    // Only set date if it's empty
    if (completedDateInput && !completedDateInput.value) {
        if (completedDateInput._flatpickr) {
            completedDateInput._flatpickr.setDate(now);
        } else {
            completedDateInput.value = now.toISOString().split('T')[0];
        }
    }

    // Only set time if it's empty
    if (completedTimeInput && !completedTimeInput.value) {
        if (completedTimeInput._flatpickr) {
            completedTimeInput._flatpickr.setDate(now);
        } else {
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            completedTimeInput.value = `${hours}:${minutes}`;
        }
    }
}

function setLessonCompletedTime() {
    const completedDateInput = document.getElementById('lesson_completed_date');
    const completedTimeInput = document.getElementById('Lesson_completed_time');

    const now = new Date();

    // Only set date if it's empty
    if (completedDateInput && !completedDateInput.value) {
        if (completedDateInput._flatpickr) {
            completedDateInput._flatpickr.setDate(now);
        } else {
            completedDateInput.value = now.toISOString().split('T')[0];
        }
    }

    // Only set time if it's empty
    if (completedTimeInput && !completedTimeInput.value) {
        if (completedTimeInput._flatpickr) {
            completedTimeInput._flatpickr.setDate(now);
        } else {
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            completedTimeInput.value = `${hours}:${minutes}`;
        }
    }
}

function updateCourseProgress(uuid) {
    setDisabledSaveBtns();
    const completed_on_date = document.getElementById('completed_date').value;
    const completed_on_time = document.getElementById('completed_time').value;
    const expires_on_date = document.getElementById('expires_on_date').value;
    const expires_on_time = document.getElementById('expires_on_time').value;
    const due_on_date = document.getElementById('due_on_date').value;
    const due_on_time = document.getElementById('due_on_time').value;
    let progress = parseInt(course_progress, 10);
    let storedProgress = parseInt(stored_progress, 10);
    const wasCompletedBefore = (progress === 100);

    const radioOptions = document.querySelectorAll('#courseActivityContainer .radio-option');
    let selectedValue = null;
    radioOptions.forEach(radio => {
        if (radio.checked) {
            selectedValue = radio.value;
        }
    });

    if (selectedValue === 'completed') {
        if (progress !== 100) {
            storedProgress = progress;  // Save the previous progress before setting to complete
        }
        progress = 100;
    } else if (selectedValue === 'not_completed') {
        if (wasCompletedBefore) {
            // Restore only if course was previously marked as completed
            progress = storedProgress;
        }
    }

    fetch(`/admin/course-progress/${uuid}/edit/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ 
            progress: progress,
            storedProgress: storedProgress,
            completed_on_date: completed_on_date,
            completed_on_time: completed_on_time,
            is_course_completed: selectedValue === 'completed',
            expires_on_date: expires_on_date,
            expires_on_time: expires_on_time,
            due_on_date: due_on_date,
            due_on_time: due_on_time,
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // displayValidationMessage('Course progress updated successfully', true);
            location.reload();
        } else {
            displayValidationMessage('Failed to update course progress', false);
        }
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
    });
}

function resetLessonActivity(){
    setDisabledSaveBtns();
    // Button to reset lesson activity
    const confirmResetLessonActivity = document.getElementById('confirmResetLessonActivity');
    let lessonId = confirmResetLessonActivity.getAttribute('data-lesson-id');
    
    fetch(`/admin/course-progress/lesson/${lessonId}/reset/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({}),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // displayValidationMessage('Course progress updated successfully', true);
            location.reload();
        } else {
            displayValidationMessage('Failed to reset activity.', false);
        }
        removeDisabledSaveBtns();
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
        removeDisabledSaveBtns();
    });
}

function inputLessonData(title, lessonId, type, lessonType){
    const confirmResetLessonActivity = document.getElementById('confirmResetLessonActivity');
    const lessonActivityName = document.getElementById('lessonActivityName');
    const confirmEditLessonActivity = document.getElementById('confirmEditLessonActivity');
    const editLessonType = document.getElementById('editLessonType');
    let lessonTypeTitle;
    if(type == 'reset'){
        lessonActivityName.innerText = title;
        confirmResetLessonActivity.setAttribute('data-lesson-id', lessonId);
    }else if(type == 'edit'){
        confirmEditLessonActivity.setAttribute('data-lesson-id', lessonId);
        fetchLessonData(lessonId);
        if(lessonType == 'SCORM2004'){lessonTypeTitle = 'SCORM 2004'}else if(lessonType == 'SCORM1.2'){lessonTypeTitle = 'SCORM 1.2'}else if(lessonType == 'file'){lessonTypeTitle = 'File'}
        editLessonType.innerText = lessonTypeTitle;
        document.getElementById('editLessonTitle').innerText = title;
    }
}

function fetchLessonData(lessonId){
    const container = document.getElementById('editLessonActivity');
    const notCompletedRadio = container.querySelector('.radio-option[value="not_completed"]');
    const completedRadio = container.querySelector('.radio-option[value="completed"]');
    const currentAttempts = document.getElementById('current_attempts');

    fetch(`/admin/course-progress/lesson/${lessonId}/fetch/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({}),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const editLessonActivityLoading = document.getElementById('editLessonActivityLoading');
            const editLessonActivityLoaded = document.getElementById('editLessonActivityLoaded');
            const lessonData = data.data;

            if (lessonData.completed === true) {
                completedRadio.checked = true;
                initializeRadioCheckboxes(completedRadio);
                document.getElementById('lesson_completed_date').value = lessonData.completed_on_date;
                const formattedTime = formatTimeTo12Hour(lessonData.completed_on_time);
                document.getElementById('Lesson_completed_time').value = formattedTime;
            } else {
                notCompletedRadio.checked = true;
                initializeRadioCheckboxes(notCompletedRadio);
                document.getElementById('lesson_completed_date').value = '';
                document.getElementById('Lesson_completed_time').value = '';
            }

            currentAttempts.value = lessonData.attempts;
            editLessonActivityLoading.classList.add('hidden');
            editLessonActivityLoaded.classList.remove('hidden');
        } else {
            displayValidationMessage('Failed to fetch lesson data.', false);
        }
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
    });
}

function editLessonActivity(){
    setDisabledSaveBtns();
    const completed_on_date = document.getElementById('lesson_completed_date').value;
    const completed_on_time = document.getElementById('Lesson_completed_time').value;
    const confirmEditLessonActivity = document.getElementById('confirmEditLessonActivity');
    let lessonId = confirmEditLessonActivity.getAttribute('data-lesson-id');

    const radioOptions = document.querySelectorAll('#editLessonActivity .radio-option');
    let selectedValue = null;
    radioOptions.forEach(radio => {
        if (radio.checked) {
            selectedValue = radio.value;
        }
    });
    
    fetch(`/admin/course-progress/lesson/${lessonId}/edit/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            completed: selectedValue === 'completed',
            completed_on_date: completed_on_date,
            completed_on_time: completed_on_time,
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            location.reload();
            closePopup('editLessonActivity');
            // displayValidationMessage('Lesson Activity updated successfully.', true);
        } else {
            displayValidationMessage('Failed to reset activity.', false);
        }
        removeDisabledSaveBtns();
    })
    .catch(error => {
        console.log(error);
        displayValidationMessage('Something went wrong, please contact an administrator', false);
        removeDisabledSaveBtns();
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

function formatTimeTo12Hour(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));

    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function resetEditLessonLoading(){  
    const editLessonActivityLoading = document.getElementById('editLessonActivityLoading');
    const editLessonActivityLoaded = document.getElementById('editLessonActivityLoaded');

    setTimeout(() => {
        editLessonActivityLoading.classList.remove('hidden');
        editLessonActivityLoaded.classList.add('hidden');
    }, 300);
}