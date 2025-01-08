"""
URL configuration for halo_lms project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from halo_lms.main.python import views
from authentication.python.views import login_view, register_view

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('admin/', include('client_admin.python.urls')),
    path('login/', login_view, name='login_view'),
    path('register/', register_view, name='register_view'),  # Register URL
    path('requests/', include('content.urls')),
    path('course_player/', include('course_player.urls')),
    path('', include('learner_dashboard.urls')),
]

handler404 = 'halo_lms.main.python.views.custom_404_view'
handler500 = 'halo_lms.main.python.views.custom_500_view'