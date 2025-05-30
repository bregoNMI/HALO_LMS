from django.urls import path
from . import views
from content import views as content_views
from custom_templates import views as custom_template_views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.admin_dashboard, name='admin_dashboard'),
    # Users
    path('users/', views.admin_users, name='admin_users'),
    path('user/<int:user_id>/edit/', views.edit_user, name='edit_user'),
    path('users/<int:user_id>/', views.user_details, name='user_details'),
    path('users/<int:user_id>/transcript/', views.user_transcript, name='user_transcript'),
    path('users/<int:user_id>/history/', views.user_history, name='user_history'),
    path('users/enroll-users/', views.enroll_users, name='enroll_users'),
    path('users/enroll-user-request/', views.enroll_users_request, name='enroll_user_request'),
    path('users/message-users/', views.message_users, name='message_users'),
    path('users/message-user-request/', views.message_users_request, name='message_users'),
    path('users/delete-users/', views.delete_users, name='delete_users'),
        # User Course
    path('users/course-progress/<uuid:uuid>/', views.usercourse_detail_view, name='usercourse_detail_view'),
    path('course-progress/<uuid:uuid>/edit/', views.edit_usercourse_detail_view, name='edit_usercourse_detail_view'),
    path('course-progress/lesson/<int:user_lesson_progress_id>/reset/', views.reset_lesson_progress, name='reset_lesson_progress'),
    path('course-progress/lesson/<int:user_lesson_progress_id>/edit/', views.edit_lesson_progress, name='edit_lesson_progress'),
    path('course-progress/lesson/<int:user_lesson_progress_id>/fetch/', views.fetch_lesson_progress, name='fetch_lesson_progress'),
    
    path('add/', views.add_user, name='add_user'),
    path('users/add/', views.add_user_page, name='add_user_page'),
    # Courses
    path('courses/', content_views.admin_courses, name='admin_courses'),
    path('courses/online/add/', content_views.add_online_courses, name='add_online_courses'),
    path('courses/online/edit/<int:course_id>/', content_views.edit_online_courses, name='edit_online_courses'),
    path('courses/delete-courses/', views.delete_courses, name='delete_courses'),

    # Quizzes
    path('quizzes/', content_views.admin_quizzes, name='admin_quizzes'),
    path('quizzes/create/', content_views.create_or_edit_quiz, name='create_quiz'),
    path('quizzes/<uuid:uuid>/', content_views.create_or_edit_quiz, name='edit_quiz'),

    # Categories
    path('categories/', content_views.admin_categories, name='admin_categories'),
    path('categories/add/', content_views.add_categories, name='add_categories'),
    path('categories/edit/<int:category_id>/', content_views.edit_categories, name='edit_categories'),
    path('categories/delete-categories/', views.delete_categories, name='delete_categories'),

    # Enrollment Keys
    path('enrollment-keys/', content_views.admin_enrollment_keys, name='admin_enrollment_keys'),
    path('enrollment-keys/add/', content_views.add_enrollment_keys, name='add_enrollment_keys'),
    path('enrollment-keys/edit/<int:key_id>/', content_views.edit_enrollment_keys, name='edit_enrollment_keys'),
    path('enrollment-keys/delete-keys/', views.delete_enrollment_keys, name='delete_enrollment_keys'),

    # Settings
    path('settings/', views.admin_settings, name='admin_settings'), 
    path('settings/create-allowed-id/', views.create_allowed_id_photo, name='create_allowed_id_photo'),
    path('settings/get-allowed-ids/', views.get_allowed_id_photos, name='get_allowed_id_photos'),
    path('settings/edit-allowed-ids/', views.edit_allowed_id_photos, name='edit_allowed_id_photos'), 
    path('settings/delete-allowed-ids/', views.delete_allowed_id_photos, name='delete_allowed_id_photos'),

    # Custom User Dashboard
    path('templates/', custom_template_views.templates, name='templates'),
    path('templates/dashboards/', custom_template_views.dashboard_list, name='dashboard_list'),
    path('templates/dashboards/create/', custom_template_views.dashboard_create, name='dashboard_create'),
    path('templates/dashboards/<int:dashboard_id>/edit/', custom_template_views.dashboard_edit, name='dashboard_edit'),
    path('templates/widgets/add/<int:dashboard_id>/', custom_template_views.widget_add, name='widget_add'),
    path('templates/widgets/edit/<int:widget_id>/', custom_template_views.edit_widget, name='edit_widget'),
    path('templates/widgets/reorder/', custom_template_views.widget_reorder, name='widget_reorder'),
    path('templates/dashboards/<int:dashboard_id>/preview/', custom_template_views.dashboard_preview, name='dashboard_preview'),
    # Custom Login Page
    path('templates/login/', custom_template_views.login_form, name='login_form'),
    path('templates/login/edit/', custom_template_views.login_edit, name='login_edit'),
        # Requests
    path('templates/widgets/<int:widget_id>/data/', custom_template_views.get_widget_data, name='get_widget_data'),
    path('templates/widgets/delete/<int:widget_id>/', custom_template_views.delete_widget, name='delete_widget'),
    path('templates/dashboard/<int:dashboard_id>/edit-header/', custom_template_views.edit_dashboard_header, name='edit_dashboard_header'),
    path('templates/dashboards/<int:dashboard_id>/delete/', custom_template_views.dashboard_delete, name='dashboard_delete'),
    path('templates/update-header/', custom_template_views.update_header, name='update_header'),
    path('templates/update-footer/', custom_template_views.update_footer, name='update_footer'),

    # Main Dashboard
    path('templates/dashboard/set_main/<int:dashboard_id>/', custom_template_views.set_main_dashboard, name='set_main_dashboard'),

    path('impersonate/<int:profile_id>/', views.impersonate_user, name='impersonate_user'),
    path('stop-impersonating/', views.stop_impersonating, name='stop_impersonating'),

    path('import-users/', views.import_user, name='import_user'),
]