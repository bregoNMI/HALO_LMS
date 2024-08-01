from django.urls import path
from . import views
from content import views as content_views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.admin_dashboard, name='admin_dashboard'),
    # Users
    path('users/', views.admin_users, name='admin_users'),
    path('user/<int:user_id>/edit/', views.edit_user, name='edit_user'),
    path('users/<int:user_id>/', views.user_details, name='user_details'),
    path('users/<int:user_id>/transcript/', views.user_transcript, name='user_transcript'),
    path('users/<int:user_id>/history/', views.user_history, name='user_history'),
    # Courses
    path('courses/', content_views.admin_courses, name='admin_courses'),
    path('courses/online/add/', content_views.add_online_courses, name='add_online_courses'),
    path('courses/<int:course_id>/', content_views.course_details, name='course_details'),
]