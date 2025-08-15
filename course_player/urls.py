from django.urls import path, re_path
from . import views

urlpatterns = [
    # URL for available lessons
    path('lessons/', views.available_lessons, name='available_lessons'),
    
    # Launch SCORM content
    path('launch/<int:lesson_id>/', views.launch_scorm_file, name='launch_scorm'),
    path('track-scorm-data/', views.track_scorm_data, name='track_scorm_data'),
    path('track-mini-lesson-progress/', views.track_mini_lesson_progress, name='track_mini_lesson_progress'),
    path('scorm-content/<path:file_path>/', views.proxy_scorm_file, name='proxy_scorm_file'),
    path("get-scorm-progress/<int:lesson_id>/", views.get_scorm_progress, name="get_scorm_progress"),

    # NEW: fetch one question (JSON) by lesson & position (0-based)
    path("lesson/<int:lesson_id>/q/<int:position>/", views.quiz_question_json, name="quiz_question_json"),

    # Reuse your submit endpoints; keep names
    path("submit_question/", views.submit_question, name="submit_question"),

    # Reuse your score + complete endpoints (names unchanged)
    path("get-quiz-score/", views.get_quiz_score, name="get_quiz_score"),
    path("mark-lesson-complete/", views.mark_lesson_complete, name="mark_lesson_complete"),

    path("mark-lesson-complete/", views.mark_lesson_complete, name="mark_lesson_complete"),
    path('scormcontent/<path:file_path>/', views.proxy_scorm_absolute, name='proxy_scorm_absolute'),
    re_path(r"^scorm-content/(?P<file_path>.+)/$", views.proxy_scorm_file, name='proxy_scorm_file_slash'),

    # SCORM iPlayer URL pattern
    #path('scorm/launch/<int:id>/', views.launch_scorm_file, name='launch_scorm_file'),

    # Assignments fetch and submit
    path('assignments/<int:assignment_id>/detail/', views.get_assignment_detail, name='assignment_detail'),
    path('assignments/submit/', views.submit_assignment, name='assignment_submit'),
]
