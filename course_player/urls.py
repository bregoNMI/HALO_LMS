from django.urls import path
from . import views

urlpatterns = [
    # URL for available lessons
    path('lessons/', views.available_lessons, name='available_lessons'),
    
    # Launch SCORM content
    path('launch/<int:lesson_id>/', views.launch_scorm_file, name='launch_scorm'),
    path('track-scorm-data/', views.track_scorm_data, name='track_scorm_data'),

    # SCORM iPlayer URL pattern
    #path('scorm/launch/<int:id>/', views.launch_scorm_file, name='launch_scorm_file'),
]

