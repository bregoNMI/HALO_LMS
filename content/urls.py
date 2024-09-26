from django.urls import path, include
from . import views

urlpatterns = [
    path('modify-course/', views.create_or_update_course, name='create_or_update_course'),
    path('file-upload/', views.file_upload, name='file_upload'),
    path('get-users/', views.get_users, name='get_users'),
    path('get-courses/', views.get_courses, name='get_courses'),
    path('get-timezones/', views.get_timezones, name='get_timezones'),
]