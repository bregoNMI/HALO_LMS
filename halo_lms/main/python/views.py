from django.contrib.auth.decorators import login_required
from django.shortcuts import render

def login(request):
    return render(request, 'main/login.html')


