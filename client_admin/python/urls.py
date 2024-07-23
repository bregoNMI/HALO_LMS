from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.admin_dashboard, name='admin_dashboard'),
    # Users
    path('users/', views.admin_users, name='admin_users'),
    path('users/<int:user_id>/', views.user_details, name='user_details'),
]