from django.urls import path
from . import views
from halo_lms.main.python.views import login
from course_player.views import proxy_scorm_file, track_scorm_data, track_mini_lesson_progress, launch_scorm_file

urlpatterns = [
    path('dashboard/', views.learner_dashboard, name='learner_dashboard'),
    path('profile/', views.learner_profile, name='learner_profile'),
    path('courses/', views.learner_courses, name='learner_courses'),
    path('transcript/', views.learner_transcript, name='learner_transcript'),
    path('download-transcript/', views.download_transcript, name='download_transcript'),
    path('notifications/', views.learner_notifications, name='learner_notifications'),
    path('achievements/', views.learner_achievements, name='learner_achievements'),  
    path('logout/', views.custom_logout_view, name='custom_logout_view'),

    # Terms and Conditions
    path('terms/', views.terms_and_conditions, name='terms_and_conditions'),

    # On Login Course
    path('login-course/<uuid:uuid>/', views.on_login_course, name='on_login_course'),

    # Require ID Photos (If Learners don't have both ID and Headshot Photos)
    path('require-photos', views.require_id_photos, name='require_id_photos'),

    # Requests
    path('update-profile/<int:user_id>/', views.update_learner_profile, name='update_learner_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('verify-headshot-face/', views.verify_headshot_face, name='verify_headshot_face'),
    path('messages/read/<int:message_id>/', views.mark_message_as_read, name='mark_message_as_read'),
    path('scorm-content/<path:file_path>/', proxy_scorm_file, name='proxy_scorm_file'),
    path('track-scorm-data/', track_scorm_data, name='track_scorm_data'),
    path('track-scorm-data/', track_mini_lesson_progress, name='track_mini_lesson_progress'),
    path('launch_scorm_file/<int:lesson_id>/', launch_scorm_file, name='launch_scorm_file'),
    path('learner/achievements/claim/<int:org_badge_id>/', views.claim_badge, name='claim_badge'),
]