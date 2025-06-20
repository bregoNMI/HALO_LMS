const launchScormUrlTemplate = "{% url 'launch_scorm_file' 0 %}".replace("/0/", "/");
        
function launchLessonById(lessonId) {
    window.location.href = launchScormUrlTemplate + lessonId + "/";
}

function launchNextLesson(nextLessonId) {
    launchLessonById(nextLessonId);
}

function launchPrevLesson(prevLessonId) {
    launchLessonById(prevLessonId);
}