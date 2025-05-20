from django.urls import path, include
from . import views

urlpatterns = [
    path('modify-course/', views.create_or_update_course, name='create_or_update_course'),
    path('file-upload/', views.file_upload, name='file_upload'),
    path('get-users/', views.get_users, name='get_users'),
    path('get-courses/', views.get_courses, name='get_courses'),
    path('delete-course-object/', views.delete_object_ajax, name='delete_object_ajax'),
    path('get-timezones/', views.get_timezones, name='get_timezones'),
    path('get-categories/', views.get_categories, name='get_categories'),
    path('create-category/', views.create_category, name='create_category'),
    path('edit-category/', views.edit_category, name='edit_category'),
    path('upload-lesson-file/', views.upload_lesson_file, name='upload_lesson_file'),
    path('create-enrollment-key/', views.create_enrollment_key, name='create_enrollment_key'),
    path('edit-enrollment-key/', views.edit_enrollment_key, name='edit_enrollment_key'),
    path('submit-enrollment-key/', views.submit_enrollment_key, name='submit_enrollment_key'),
    path('opened-course-data/', views.opened_course_data, name='opened_course_data')
]