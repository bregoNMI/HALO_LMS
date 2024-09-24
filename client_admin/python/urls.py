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
    
    path('add', views.add_user, name='add_user'),
    # Courses
    path('courses/', content_views.admin_courses, name='admin_courses'),
    path('courses/online/add/', content_views.add_online_courses, name='add_online_courses'),
    path('courses/<int:course_id>/', content_views.course_details, name='course_details'),

    # Custom User Dashboard
    path('templates/', custom_template_views.templates, name='templates'),
    path('templates/dashboards/', custom_template_views.dashboard_list, name='dashboard_list'),
    path('templates/dashboards/create/', custom_template_views.dashboard_create, name='dashboard_create'),
    path('templates/dashboards/<int:dashboard_id>/edit/', custom_template_views.dashboard_edit, name='dashboard_edit'),
    path('templates/widgets/add/<int:dashboard_id>/', custom_template_views.widget_add, name='widget_add'),
    path('templates/widgets/edit/<int:widget_id>/', custom_template_views.edit_widget, name='edit_widget'),
    path('templates/widgets/reorder/', custom_template_views.widget_reorder, name='widget_reorder'),
    path('templates/dashboards/<int:dashboard_id>/preview/', custom_template_views.dashboard_preview, name='dashboard_preview'),
    # Requests
    path('templates/widgets/<int:widget_id>/data/', custom_template_views.get_widget_data, name='get_widget_data'),
    path('templates/widgets/delete/<int:widget_id>/', custom_template_views.delete_widget, name='delete_widget'),
    path('templates/dashboard/<int:dashboard_id>/edit-header/', custom_template_views.edit_dashboard_header, name='edit_dashboard_header'),
    path('templates/dashboards/<int:dashboard_id>/delete/', custom_template_views.dashboard_delete, name='dashboard_delete'),
    path('templates/update-header/', custom_template_views.update_header, name='update_header'),
    path('templates/update-footer/', custom_template_views.update_footer, name='update_footer'),

    # Main Dashboard
    path('templates/dashboard/set_main/<int:dashboard_id>/', custom_template_views.set_main_dashboard, name='set_main_dashboard'),
]