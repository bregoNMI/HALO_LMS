from django.urls import path
from . import views

urlpatterns = [
    path('', views.login, name='login'),
    path('login_view', views.login_view, name='login_view'),
    path('register/', views.register_view, name='register_view'),
    path('verify/', views.verification_success, name='verification_success'),
    path('login_success', views.login_success_view, name='login_success')
]