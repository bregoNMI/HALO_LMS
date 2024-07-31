from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/<int:dashboard_id>/', views.user_dashboard, name='user_dashboard'),
]
