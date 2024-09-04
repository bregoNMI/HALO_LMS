from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.learner_dashboard, name='user_dashboard'),
]
