from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.admin_dashboard, name='admin_dashboard'),
    # Users
    path('users/', views.admin_users, name='admin_users'),
    path('user/<int:user_id>/edit/', views.edit_user, name='edit_user'),
    path('users/<int:user_id>/', views.user_details, name='user_details'),
    path('users/<int:user_id>/transcript/', views.user_transcript, name='user_transcript'),
    path('users/<int:user_id>/history/', views.user_history, name='user_history'),

    path('add', views.add_user, name='add_user')
]