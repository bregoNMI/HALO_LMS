document.addEventListener('DOMContentLoaded', function() {
    /* Progress Bar Styling */
    const courseProgress = document.getElementById('courseProgress');
    if (courseProgress) {
        /* course_progress comes from the HTML */
        courseProgress.setAttribute('value', course_progress);
    }

    document.querySelectorAll('.radio-option').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {              
                if (this.dataset.target) {
                    const targetElement = document.getElementById(this.dataset.target);
                    if (targetElement) {
                        targetElement.classList.add('show-toggle-option-details');
                    }
                }
    
                document.querySelectorAll('.radio-option').forEach(other => {
                    if (other !== this && other.dataset.target) {
                        const otherTarget = document.getElementById(other.dataset.target);
                        if (otherTarget) {
                            otherTarget.classList.remove('show-toggle-option-details');
                        }
                    }
                });
                if(this.value == 'completed'){
                    setCourseCompletedTime();
                }
            }
        });
    });
});

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

function updateCourseProgress(uuid) {
    const completed_on_date = document.getElementById('completed_date').value;
    const completed_on_time = document.getElementById('completed_time').value;
    const expires_on_date = document.getElementById('expires_on_date').value;
    const expires_on_time = document.getElementById('expires_on_time').value;
    const due_on_date = document.getElementById('due_on_date').value;
    const due_on_time = document.getElementById('due_on_time').value;
    let progress = parseInt(course_progress, 10);
    let storedProgress = parseInt(stored_progress, 10);
    const wasCompletedBefore = (progress === 100);

    const radioOptions = document.querySelectorAll('.radio-option');
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
    // Button to reset lesson activity
    const confirmResetLessonActivity = document.getElementById('confirmResetLessonActivity');
    let lessonId = confirmResetLessonActivity.getAttribute('data-lesson-id');
    
    fetch(`/admin/course-progress/lesson/${lessonId}/reset/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ 

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
            displayValidationMessage('Failed to reset activity.', false);
        }
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
    });
}

function inputLessonData(title, lessonId, type){
    const confirmResetLessonActivity = document.getElementById('confirmResetLessonActivity');
    const lessonActivityName = document.getElementById('lessonActivityName');
    const confirmEditLessonActivity = document.getElementById('confirmEditLessonActivity');
    if(type == 'reset'){
        lessonActivityName.innerText = title;
        confirmResetLessonActivity.setAttribute('data-lesson-id', lessonId);
    }else if(type == 'edit'){}
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