from django.contrib.auth.decorators import login_required
from django.shortcuts import render
import boto3
import requests
from jose import jwt, JWTError
from django.http import JsonResponse

def login(request):
    return render(request, 'main/login.html')
