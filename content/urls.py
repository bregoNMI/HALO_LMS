from django.urls import path, include
from . import views

urlpatterns = [
    path('modify-course/', views.create_or_update_course, name='create_or_update_course'),
]