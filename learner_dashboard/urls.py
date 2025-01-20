from django.urls import path
from . import views
from halo_lms.main.python.views import login
from course_player.views import proxy_scorm_file, track_scorm_data

urlpatterns = [
    path('dashboard/', views.learner_dashboard, name='learner_dashboard'),
    path('profile/', views.learner_profile, name='learner_profile'),
    path('courses/', views.learner_courses, name='learner_courses'),
    path('notifications/', views.learner_notifications, name='learner_notifications'), 
    path('logout/', views.custom_logout_view, name='custom_logout_view'),  # URL for logout

    # Requests
    path('update-profile/<int:user_id>/', views.update_learner_profile, name='update_learner_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('messages/read/<int:message_id>/', views.mark_message_as_read, name='mark_message_as_read'),
    path('scorm-content/<path:file_path>/', proxy_scorm_file, name='proxy_scorm_file'),
    path('track-scorm-data/', track_scorm_data, name='track_scorm_data')
]