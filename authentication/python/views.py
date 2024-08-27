from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date
from django.contrib import messages
from client_admin.models import Profile
import boto3
import hmac
import hashlib
import base64
import requests
from jose import jwt, JWTError
import json
from django.http import JsonResponse
from django.conf import settings
import logging
from django.shortcuts import redirect, render
from botocore.exceptions import ClientError

@login_required
def login(request):
    return render(request, 'login.html')

def get_secret(secret_name):
    region_name = settings.AWS_REGION  # Ensure this is set in your Django settings

    client = boto3.client('secretsmanager', region_name=region_name)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        secret = json.loads(response['SecretString'])
        return secret
    except ClientError as e:
        # Print the error for debugging
        print(f"Error retrieving secret: {e}")
        return None

# Define your secret name
secret_name = "COGNITO_SECRET"

# Retrieve the secret
secrets = get_secret(secret_name)

# Extract multiple values from the secrets
if secrets:
    AWS_ACCESS_KEY_ID = secrets.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = secrets.get('AWS_SECRET_ACCESS_KEY')
    COGNITO_CLIENT_SECRET = secrets.get('COGNITO_CLIENT_SECRET')

    # Print for debugging
    print("AWS_ACCESS_KEY_ID:", AWS_ACCESS_KEY_ID)
    print("AWS_SECRET_ACCESS_KEY:", AWS_SECRET_ACCESS_KEY)
    print("COGNITO_CLIENT_SECRET:", COGNITO_CLIENT_SECRET)

    # Handle missing secrets
    if AWS_ACCESS_KEY_ID is None:
        print("AWS_ACCESS_KEY_ID not found in the secrets.")
    if AWS_SECRET_ACCESS_KEY is None:
        print("AWS_SECRET_ACCESS_KEY not found in the secrets.")
    if COGNITO_CLIENT_SECRET is None:
        print("COGNITO_CLIENT_SECRET not found in the secrets.")
else:
    print("Failed to retrieve secrets.")

def get_cognito_public_keys(region, user_pool_id):
    keys_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    response = requests.get(keys_url)
    response.raise_for_status()
    keys = response.json()
    return {key['kid']: key for key in keys['keys']}

def decode_jwt_with_public_key(id_token, public_keys, expected_issuer, expected_audience):
    headers = jwt.get_unverified_headers(id_token)
    kid = headers['kid']
    key = public_keys.get(kid)
    
    if not key:
        raise Exception(f'Public key not found for key ID: {kid}')
    
    try:
        # Decode and verify the JWT using the public key
        claims = jwt.decode(
            id_token,
            key,
            algorithms=['RS256'],
            audience=expected_audience,
            issuer=expected_issuer
        )
        print("Token claims:", claims)
        return claims
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.JWTClaimsError:
        raise Exception('Invalid claims, please check the audience and issuer')
    except JWTError as e:
        raise Exception('Unable to parse authentication token.') from e

def generate_secret_hash(client_id, client_secret, username):
    message = username + client_id
    dig = hmac.new(
        client_secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

def authenticate_user(username_or_email, password):
    client = boto3.client('cognito-idp', region_name='us-east-1')
    client_id = settings.COGNITO_CLIENT_ID
    client_secret = COGNITO_CLIENT_SECRET
    
    # Generate SECRET_HASH
    secret_hash = generate_secret_hash(client_id, client_secret, username_or_email)
    try:
        response = client.initiate_auth(
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': username_or_email,
                'PASSWORD': password,
                'SECRET_HASH': secret_hash
            },
            ClientId=settings.COGNITO_CLIENT_ID,
        )
        id_token = response['AuthenticationResult']['IdToken']
        access_token = response['AuthenticationResult']['AccessToken']
        refresh_token = response['AuthenticationResult'].get('RefreshToken')  # Optional       
        
        public_keys = get_cognito_public_keys(settings.AWS_REGION, settings.COGNITO_USER_POOL_ID)
        
        # Expected issuer and audience
        expected_issuer = f'https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}'
        expected_audience = settings.COGNITO_CLIENT_ID
        
        claims = decode_jwt_with_public_key(id_token, public_keys, expected_issuer, expected_audience)

        return {
            'IdToken': id_token,
            'AccessToken': access_token,
            'RefreshToken': refresh_token,
            'Username': claims.get('cognito:username'),  # Extract the Cognito username from claims
            'Claims': claims  # Include the claims for further use if needed
        }
    
    except client.exceptions.UserNotFoundException:
        print("User does not exist.")
        return None
    except client.exceptions.NotAuthorizedException:
        print("Invalid credentials.")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

def login_view(request):
    if request.method == 'POST':
        username_or_email = request.POST.get('username_or_email')
        password = request.POST.get('password')

        # Authenticate user with Cognito
        cognito_response = authenticate_user(username_or_email, password)

        if cognito_response:
            id_token = cognito_response.get('IdToken')
            access_token = cognito_response.get('AccessToken')
            cognito_username = cognito_response.get('Username')

            # Store the access token and Cognito username in the session
            request.session['access_token'] = access_token
            request.session['cognito_username'] = cognito_username
            
            # Optionally, store user claims in session or database
            request.session['id_token'] = id_token
            return redirect('login_success')  # Redirect to the landing page
        else:
            return JsonResponse({'message': 'Login failed. Invalid credentials.'}, status=401)
    else:
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    
cognito_client = boto3.client('cognito-idp', region_name=settings.AWS_REGION)
logger = logging.getLogger(__name__)

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION  # e.g., 'us-east-1'
)

def register_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        email = request.POST.get('email')
        given_name = request.POST.get('given_name')
        family_name = request.POST.get('family_name')
        birthdate = request.POST.get('birthdate')
        id_photo = request.FILES.get('id_photo') 
        reg_photo = request.FILES.get('reg_photo') 

        logger.debug(f"Username: {username}, Email: {email}, Given Name: {given_name}, Family Name: {family_name}, Birth Date: {birthdate}, Picture: {id_photo}, Registration Photo: {reg_photo}")
        logger.debug(f"id_photo field: {id_photo}")

        if not all([username, password, email, given_name, family_name, birthdate, id_photo, reg_photo]):
            missing_fields = [field for field in ['username', 'password', 'email', 'given_name', 'family_name', 'birthdate', 'id_photo', 'reg_photo'] if not request.POST.get(field) and field != 'id_photo'] + (['id_photo'] if not id_photo else [])
            if not username: missing_fields.append('username')
            if not password: missing_fields.append('password')
            if not email: missing_fields.append('email')
            if not given_name: missing_fields.append('given_name')
            if not family_name: missing_fields.append('family_name')
            if not birthdate: missing_fields.append('birthdate')
            if not id_photo: missing_fields.append('id_photo')
            if not id_photo: missing_fields.append('reg_photo')
            messages.error(request, f'Missing fields: {", ".join(missing_fields)}')
            return render(request, 'register.html')

        try:
            # Upload the photo to S3
            id_photo_name = id_photo.name
            reg_photo_name = reg_photo.name
            s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
            s3_key = f"users/{username}/id_photo/{id_photo_name}"  # S3 path for the photo

            s3_client.upload_fileobj(id_photo, s3_bucket, s3_key)

            # Generate S3 URL
            id_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"

            s3_key = f"users/{username}/reg_photo/{reg_photo_name}"  # S3 path for the photo

            s3_client.upload_fileobj(reg_photo, s3_bucket, s3_key)

            # Generate S3 URL
            reg_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"

            # Generate SECRET_HASH
            client_id = settings.COGNITO_CLIENT_ID
            client_secret = COGNITO_CLIENT_SECRET
            secret_hash = generate_secret_hash(client_id, client_secret, username)

            response = cognito_client.sign_up(
                ClientId=settings.COGNITO_CLIENT_ID,
                Username=username,
                Password=password,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'given_name', 'Value': given_name},
                    {'Name': 'family_name', 'Value': family_name},
                    {'Name': 'birthdate', 'Value': birthdate},
                    {'Name': 'custom:id_photo', 'Value': id_photo_url},
                    {'Name': 'custom:reg_photo', 'Value': reg_photo_url}
                ],
                SecretHash=secret_hash
            )

            # Add the user to a group
            group_name = 'Test'  # Replace with your desired group name
            cognito_client.admin_add_user_to_group(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=username,
                GroupName=group_name
            )

            messages.success(request, 'Registration successful. Please check your email to confirm your account.')
            return render(request, 'login.html')
        except cognito_client.exceptions.UsernameExistsException:
            messages.error(request, 'Username already exists.')
        except cognito_client.exceptions.InvalidParameterException as e:
            messages.error(request, f'Invalid parameters provided: {e}')
        except Exception as e:
            messages.error(request, f'An error occurred: {e}')
    
    return render(request, 'register.html')

def verify_account(request):
    code = request.GET.get('code')
    username = request.GET.get('username')

    if not code or not username:
        return render(request, 'verification_status.html', {'message': 'Invalid verification request.'})

    cognito_client = boto3.client('cognito-idp', region_name='us-east-1')

    try:
        response = cognito_client.confirm_sign_up(
            ClientId=settings.COGNITO_CLIENT_ID,
            Username=username,
            ConfirmationCode=code
        )
        return render(request, 'verification_status.html', {'message': 'Your account has been verified successfully.'})
    except cognito_client.exceptions.CodeMismatchException:
        return render(request, 'verification_status.html', {'message': 'Invalid verification code.'})
    except cognito_client.exceptions.UserNotFoundException:
        return render(request, 'verification_status.html', {'message': 'User not found.'})
    except Exception as e:
        return render(request, 'verification_status.html', {'message': f'An error occurred: {e}'})
    
def verification_success(request):
    # Add any logic you need for after verification
    return render(request, 'verification_status.html')

def login_success_view(request):
    # Add any logic you need for after verification
    return redirect('dashboard')

def addUserCognito(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        email = request.POST.get('email')
        given_name = request.POST.get('first_name')
        family_name = request.POST.get('last_name')
        id_photo = request.FILES.get('photoid') 
        reg_photo = request.FILES.get('passportphoto') 

        try:
            # Define S3 bucket and folder paths
            s3_bucket = settings.AWS_STORAGE_BUCKET_NAME

            # Upload the ID photo to S3
            id_photo_name = id_photo.name
            s3_key_id_photo = f"users/{username}/id_photo/{id_photo_name}"
            id_photo.seek(0)  # Reset pointer to the beginning of the file
            s3_client.upload_fileobj(id_photo, s3_bucket, s3_key_id_photo)
            id_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key_id_photo}"

            # Upload the registration photo to S3
            reg_photo_name = reg_photo.name
            s3_key_reg_photo = f"users/{username}/reg_photo/{reg_photo_name}"
            reg_photo.seek(0)  # Reset pointer to the beginning of the file
            s3_client.upload_fileobj(reg_photo, s3_bucket, s3_key_reg_photo)
            reg_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key_reg_photo}"

            # Generate SECRET_HASH
            client_id = settings.COGNITO_CLIENT_ID
            client_secret = COGNITO_CLIENT_SECRET
            secret_hash = generate_secret_hash(client_id, client_secret, username)

            response = cognito_client.sign_up(
                ClientId=settings.COGNITO_CLIENT_ID,
                Username=username,
                Password=password,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'given_name', 'Value': given_name},
                    {'Name': 'family_name', 'Value': family_name},
                    {'Name': 'custom:id_photo', 'Value': id_photo_url},
                    {'Name': 'custom:reg_photo', 'Value': reg_photo_url}
                ],
                SecretHash=secret_hash
            )

            # Add the user to a group
            group_name = 'Test'  # Replace with your desired group name
            cognito_client.admin_add_user_to_group(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=username,
                GroupName=group_name
            )

            messages.success(request, 'Registration successful. Please check your email to confirm your account.')
            return redirect('dashboard/')
        except cognito_client.exceptions.UsernameExistsException:
            messages.error(request, 'Username already exists.')
        except cognito_client.exceptions.InvalidParameterException as e:
            messages.error(request, f'Invalid parameters provided: {e}')
        except Exception as e:
            messages.error(request, f'An error occurred: {e}')
    
    return render(request, 'register.html')

@login_required
def modifyCognito(request):
    if request.method == 'POST':
        # Retrieve user input
        username = request.POST.get('username')
        new_password = request.POST.get('new_password')
        confirm_password = request.POST.get('confirm_password')
        email = request.POST.get('email')
        given_name = request.POST.get('first_name')
        family_name = request.POST.get('last_name')
        birthdate = request.POST.get('birth_date')
        id_photo = request.FILES.get('photoid') 
        reg_photo = request.FILES.get('passportphoto')

        try:
            # Retrieve Cognito credentials from session
            access_token = request.session.get('access_token')
            cognito_username = request.session.get('cognito_username')
            
            if not access_token or not cognito_username:
                messages.error(request, 'User is not authenticated.')
                return redirect('login/')

            # Change Password only if new_password is provided
            if new_password:
                if new_password != confirm_password:
                    messages.error(request, 'New password and confirm password do not match.')
                    return redirect('dashboard/')
                
                # Change the password using Cognito client
                cognito_client.change_password(
                    PreviousPassword='',
                    ProposedPassword=new_password,
                    AccessToken=access_token
                )
                messages.success(request, 'Password changed successfully.')

            # Prepare list of attributes to update if fields are filled
            user_attributes = []
            if email:
                user_attributes.append({'Name': 'email', 'Value': email})
            if given_name:
                user_attributes.append({'Name': 'given_name', 'Value': given_name})
            if family_name:
                user_attributes.append({'Name': 'family_name', 'Value': family_name})
            if birthdate:
                user_attributes.append({'Name': 'birthdate', 'Value': birthdate})
            
            # Upload photos to S3 if provided
            s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
            if id_photo:
                id_photo_name = id_photo.name
                s3_key = f"users/{cognito_username}/id_photo/{id_photo_name}"  # Use Cognito username
                s3_client.upload_fileobj(id_photo, s3_bucket, s3_key)
                id_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"
                user_attributes.append({'Name': 'custom:id_photo', 'Value': id_photo_url})

            if reg_photo:
                reg_photo_name = reg_photo.name
                s3_key = f"users/{cognito_username}/reg_photo/{reg_photo_name}"  # Use Cognito username
                s3_client.upload_fileobj(reg_photo, s3_bucket, s3_key)
                reg_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"
                user_attributes.append({'Name': 'custom:reg_photo', 'Value': reg_photo_url})

            # Update User Attributes in Cognito using the correct username
            if user_attributes:
                cognito_client.admin_update_user_attributes(
                    UserPoolId=settings.COGNITO_USER_POOL_ID,
                    Username=username,  # Use Cognito username from session
                    UserAttributes=user_attributes
                )
                messages.success(request, 'User details updated successfully.')
            else:
                messages.info(request, 'No user details were updated.')

        except cognito_client.exceptions.UserNotFoundException:
            messages.error(request, 'User not found in Cognito.')
        except cognito_client.exceptions.NotAuthorizedException:
            messages.error(request, 'User is not authorized.')
        except cognito_client.exceptions.InvalidPasswordException as e:
            messages.error(request, f'Invalid new password: {e}')
        except Exception as e:
            messages.error(request, f'An error occurred: {e}')

    return redirect('dashboard/')
