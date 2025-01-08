from django.contrib.auth.decorators import login_required
from django.shortcuts import render
import boto3
import requests
from jose import jwt, JWTError
from django.http import JsonResponse

def login(request):
    return render(request, 'main/login.html')

def custom_404_view(request, exception=None):
    return render(request, 'main/404.html', status=404)

def custom_500_view(request, exception=None):
    error_message = str(exception) if exception else "An internal server error occurred."
    return render(request, 'main/404.html', {'error_message': error_message}, status=500)