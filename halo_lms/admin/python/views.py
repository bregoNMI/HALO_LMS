from django.contrib.auth.decorators import login_required
from django.shortcuts import render

@login_required
def admin_dashboard(request):
    return render(request, 'admin/html/dashboard.html')

# Users
@login_required
def admin_users(request):
    return render(request, 'admin/html/users/users.html')