from django.urls import path
from . import views

urlpatterns = [
    # URL for available lessons
    path('lessons/', views.available_lessons, name='available_lessons'),
    
    # Launch SCORM content
    path('launch/<int:lesson_id>/', views.launch_scorm_file, name='launch_scorm'),
    path('track-scorm-data/', views.track_scorm_data, name='track_scorm_data'),
    path('track-mini-lesson-progress/', views.track_mini_lesson_progress, name='track_mini_lesson_progress'),
    path('scorm-content/<path:file_path>/', views.proxy_scorm_file, name='proxy_scorm_file')

    # SCORM iPlayer URL pattern
    #path('scorm/launch/<int:id>/', views.launch_scorm_file, name='launch_scorm_file'),
]

