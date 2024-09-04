from django.urls import path
from custom_templates import views as custom_template_views

urlpatterns = [
    path('dashboard/', custom_template_views.learner_dashboard, name='learner_dashboard'),
]