from django.urls import path
from . import views

urlpatterns = [
    path('', views.login, name='login'),
    path('verify/', views.verification_success, name='verification_success'),
    path('login_success', views.login_success_view, name='login_success'),
]