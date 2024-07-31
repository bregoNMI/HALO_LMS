from django.urls import path
from . import views as admin_views
from custom_dashboard import views as custom_dashboard_views

urlpatterns = [
    # Dashboard
    path('dashboard/', admin_views.admin_dashboard, name='admin_dashboard'),
    # Users
    path('users/', admin_views.admin_users, name='admin_users'),
    path('user/<int:user_id>/edit/', admin_views.edit_user, name='edit_user'),
    path('users/<int:user_id>/', admin_views.user_details, name='user_details'),
    path('users/<int:user_id>/transcript/', admin_views.user_transcript, name='user_transcript'),
    path('users/<int:user_id>/history/', admin_views.user_history, name='user_history'),

    #Custom User Dashboard
    path('templates/dashboards/', custom_dashboard_views.dashboard_list, name='dashboard_list'),
    path('templates/dashboards/create/', custom_dashboard_views.dashboard_create, name='dashboard_create'),
    path('templates/dashboards/<int:dashboard_id>/edit/', custom_dashboard_views.dashboard_edit, name='dashboard_edit'),
    path('templates/widgets/add/<int:dashboard_id>/', custom_dashboard_views.widget_add, name='widget_add'),
    path('templates/widgets/update/', custom_dashboard_views.widget_update, name='widget_update'),
    path('templates/widgets/reorder/', custom_dashboard_views.widget_reorder, name='widget_reorder'),
    path('templates/dashboards/<int:dashboard_id>/preview/', custom_dashboard_views.dashboard_preview, name='dashboard_preview'),
    # Main Dashboard
    path('templates/dashboard/set_main/<int:dashboard_id>/', custom_dashboard_views.set_main_dashboard, name='set_main_dashboard'),
    path('user-dashboard/', custom_dashboard_views.main_dashboard, name='main_dashboard'),
]