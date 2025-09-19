from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.core.files.base import ContentFile
from django.db.models import Q
from django.shortcuts import render, get_object_or_404, redirect
from django.utils import timezone
from datetime import datetime
from django.urls import reverse
from django.utils.dateparse import parse_date
from django.contrib import messages
from client_admin.models import Profile
import boto3
from django.contrib import messages
import hmac
import hashlib
from django.contrib.auth import login as django_login, authenticate
import base64
import requests
from jose import jwt, JWTError
import json
from django.conf import settings
from django.http import JsonResponse
from django.conf import settings
import logging
from django.shortcuts import redirect, render
from botocore.exceptions import ClientError
from custom_templates.models import Dashboard, Widget, Header, Footer, LoginForm
from client_admin.models import OrganizationSettings, ActivityLog
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

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
    login_form = LoginForm.objects.first()
    if request.method == 'POST':
        username_or_email = request.POST.get('username_or_email')
        password = request.POST.get('password')

        # Check if data is being submitted
        if not username_or_email or not password:
            messages.error(request, 'Please provide both username and password.')
            return render(request, 'main/login.html', {'login_form': login_form})
        # Step 1: Authenticate with AWS Cognito
        response = authenticate_user(username_or_email, password)
        print('Response: ', response)
        if response:
            # Valid credentials, log the user into Django
            user, created = User.objects.get_or_create(username=username_or_email)

            if created:
                user.set_password(password)
                user.save()

            django_login(request, user)
            record_login_activity(user)
            return redirect('learner_dashboard')
        
        # Add debug print to see if this line is hit
        print('Invalid credentials')  # You can remove this later
        messages.error(request, 'Invalid username or password')
        return render(request, 'main/login.html', {'login_form': login_form})

    return render(request, 'main/login.html', {'login_form': login_form})

def record_login_activity(user):
    """
    Write one ActivityLog row per user per *local* calendar day.
    Safe to call multiple times; no-ops if today's row already exists.
    """
    today = timezone.localdate()
    already = ActivityLog.objects.filter(
        user=user,
        action_type='user_login',
        timestamp__date=today,   # <-- use your field name
    ).exists()

    if not already:
        ActivityLog.objects.create(
            user=user,
            action_performer=user.username,
            action_target=user.username,
            action_type='user_login',
            action='user logged in',
            user_groups=', '.join(g.name for g in user.groups.all()),
        )

cognito_client = boto3.client('cognito-idp', region_name=settings.AWS_REGION)
logger = logging.getLogger(__name__)

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION  # e.g., 'us-east-1'
)

def register_view(request):
    login_form = LoginForm.objects.first()
    org_settings = OrganizationSettings.objects.first()
    if org_settings:
        allowed_photos = org_settings.allowed_id_photos.order_by('id')
    else:
        allowed_photos = None

    if request.method == 'POST':
        username = request.POST.get('id_username')
        password = request.POST.get('id_password')
        email = request.POST.get('id_email')
        given_name = request.POST.get('id_given_name')
        family_name = request.POST.get('id_family_name')
        birthdate_raw = request.POST.get('id_birthdate')
        id_photo = request.FILES.get('id_id_photo')
        reg_photo = request.FILES.get('id_reg_photo')

        if not all([username, password, email, given_name, family_name, birthdate_raw, id_photo, reg_photo]):
            missing_fields = [field for field in ['username', 'password', 'email', 'given_name', 'family_name', 'birthdate']
                              if not request.POST.get(f'id_{field}')]
            if not id_photo:
                missing_fields.append('id_photo')
            if not reg_photo:
                missing_fields.append('reg_photo')
            messages.error(request, f'Missing fields: {", ".join(missing_fields)}')
            return render(request, 'main/register.html', {'login_form': login_form, 'allowed_photos': allowed_photos})

        try:
            birthdate = datetime.strptime(birthdate_raw, '%Y-%m-%d').date()

            # Read and buffer file contents
            id_photo_content = id_photo.read()
            reg_photo_content = reg_photo.read()

            # Rewind file pointer for S3 upload
            id_photo.seek(0)
            reg_photo.seek(0)

            # Upload to S3
            s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
            s3_client = boto3.client(
                's3',
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )

            id_photo_key = f"users/{username}/id_photo/{id_photo.name}"
            reg_photo_key = f"users/{username}/reg_photo/{reg_photo.name}"

            s3_client.upload_fileobj(id_photo, s3_bucket, id_photo_key)
            s3_client.upload_fileobj(reg_photo, s3_bucket, reg_photo_key)

            id_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{id_photo_key}"
            reg_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{reg_photo_key}"

            client_id = settings.COGNITO_CLIENT_ID
            client_secret = COGNITO_CLIENT_SECRET
            secret_hash = generate_secret_hash(client_id, client_secret, username)

            response = cognito_client.sign_up(
                ClientId=client_id,
                Username=username,
                Password=password,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'given_name', 'Value': given_name},
                    {'Name': 'family_name', 'Value': family_name},
                    {'Name': 'birthdate', 'Value': birthdate_raw},
                    {'Name': 'custom:id_photo', 'Value': id_photo_url},
                    {'Name': 'custom:reg_photo', 'Value': reg_photo_url}
                ],
                SecretHash=secret_hash
            )

            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                first_name=given_name,
                last_name=family_name,
            )

            Profile.objects.create(
                user=user,
                username=username,
                email=email,
                first_name=given_name,
                last_name=family_name,
                photoid=ContentFile(id_photo_content, name=id_photo.name),
                passportphoto=ContentFile(reg_photo_content, name=reg_photo.name)
            )

            cognito_client.admin_add_user_to_group(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=username,
                GroupName='Test'
            )

            messages.success(request, 'Registration successful. Please check your email to confirm your account.')
            return render(request, 'main/login.html', {'login_form': login_form})

        except cognito_client.exceptions.UsernameExistsException:
            messages.error(request, 'Username already exists.')
        except cognito_client.exceptions.EmailExistsException:
            messages.error(request, 'Email already exists.')
        except cognito_client.exceptions.InvalidParameterException as e:
            messages.error(request, f'Invalid parameters provided: {e}')
        except Exception as e:
            messages.error(request, f'An error occurred: {e}')

    return render(request, 'main/register.html', {'login_form': login_form, 'allowed_photos': allowed_photos})

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
    login_form = LoginForm.objects.first()
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

            # Initialize photo URLs as empty strings
            id_photo_url = ''
            reg_photo_url = ''

            # Upload the ID photo to S3 if present
            if id_photo:
                id_photo_name = id_photo.name
                s3_key_id_photo = f"users/{username}/id_photo/{id_photo_name}"
                id_photo.seek(0)  # Reset pointer to the beginning of the file
                s3_client.upload_fileobj(id_photo, s3_bucket, s3_key_id_photo)
                id_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key_id_photo}"

            # Upload the registration photo to S3 if present
            if reg_photo:
                reg_photo_name = reg_photo.name
                s3_key_reg_photo = f"users/{username}/reg_photo/{reg_photo_name}"
                reg_photo.seek(0)  # Reset pointer to the beginning of the file
                s3_client.upload_fileobj(reg_photo, s3_bucket, s3_key_reg_photo)
                reg_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key_reg_photo}"

            # Generate SECRET_HASH
            client_id = settings.COGNITO_CLIENT_ID
            client_secret = COGNITO_CLIENT_SECRET
            secret_hash = generate_secret_hash(client_id, client_secret, username)
            
            try:
                # Create user attributes dynamically, excluding empty photo URLs
                user_attributes = [
                    {'Name': 'email', 'Value': email},
                    {'Name': 'given_name', 'Value': given_name},
                    {'Name': 'family_name', 'Value': family_name},
                ]
                if id_photo_url:
                    user_attributes.append({'Name': 'custom:id_photo', 'Value': id_photo_url})
                if reg_photo_url:
                    user_attributes.append({'Name': 'custom:reg_photo', 'Value': reg_photo_url})

                # Sign up the user in Cognito
                response = cognito_client.sign_up(
                    ClientId=settings.COGNITO_CLIENT_ID,
                    Username=username,
                    Password=password,
                    UserAttributes=user_attributes,
                    SecretHash=secret_hash
                )
                print(f"Cognito sign_up response: {response}")

            except cognito_client.exceptions.ClientError as error:
                print(f"Error: {error.response['Error']['Message']}")

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
    
    return render(request, 'main/register.html', {'login_form': login_form})

@login_required
def modifyCognito(request):
    if request.method != 'POST':
        return redirect('dashboard/')

    # Who are we updating in Cognito?
    cognito_username = (request.POST.get('cognito_username') or request.POST.get('username') or '').strip()
    # Actor (the person making this request)
    actor_username = request.user.username

    # Password fields
    current_password = (request.POST.get('current_password') or '').strip()
    new_password     = (request.POST.get('new_password') or '').strip()
    confirm_password = (request.POST.get('confirm_password') or '').strip()

    # Attribute fields
    email       = request.POST.get('email') or ''
    given_name  = request.POST.get('first_name') or ''
    family_name = request.POST.get('last_name') or ''
    birthdate   = request.POST.get('birth_date') if 'birth_date' in request.POST else None

    id_photo = request.FILES.get('photoid')
    reg_photo = request.FILES.get('passportphoto')

    # Determine if this is self-service (user editing themselves) vs admin editing someone else
    is_self = (cognito_username == actor_username)

    try:
        # --- PASSWORD CHANGES ---
        if new_password or confirm_password:
            if new_password != confirm_password:
                messages.error(request, 'New passwords do not match.')
                return redirect('dashboard/')

            # If self-service, require current password to be correct (Django-side check)
            if is_self and not request.user.check_password(current_password):
                messages.error(request, 'Current password is incorrect.')
                return redirect('dashboard/')

            # Optional: run Django validators (gives better UX feedback than Cognito alone)
            try:
                validate_password(new_password, user=request.user if is_self else None)
            except ValidationError as e:
                for err in e:
                    messages.error(request, err)
                return redirect('dashboard/')

            # Use admin_set_user_password for BOTH flows (no AccessToken needed)
            cognito_client.admin_set_user_password(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=cognito_username,
                Password=new_password,
                Permanent=True,  # don't force change on next sign in
            )

        # --- ATTRIBUTE UPDATES ---
        user_attributes = []
        if email:
            user_attributes.append({'Name': 'email', 'Value': email})
        if given_name:
            user_attributes.append({'Name': 'given_name', 'Value': given_name})
        if family_name:
            user_attributes.append({'Name': 'family_name', 'Value': family_name})

        # send/clear birthdate explicitly
        if birthdate is not None:
            user_attributes.append({'Name': 'birthdate', 'Value': birthdate or ''})

        # Upload photos → S3 → custom attributes
        s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
        if id_photo:
            s3_key = f"users/{cognito_username}/id_photo/{id_photo.name}"
            s3_client.upload_fileobj(id_photo, s3_bucket, s3_key)
            user_attributes.append({'Name': 'custom:id_photo', 'Value': f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"})

        if reg_photo:
            s3_key = f"users/{cognito_username}/reg_photo/{reg_photo.name}"
            s3_client.upload_fileobj(reg_photo, s3_bucket, s3_key)
            user_attributes.append({'Name': 'custom:reg_photo', 'Value': f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"})

        if user_attributes:
            cognito_client.admin_update_user_attributes(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=cognito_username,
                UserAttributes=user_attributes
            )

    except cognito_client.exceptions.UserNotFoundException:
        messages.error(request, 'User not found in Cognito.')
    except cognito_client.exceptions.InvalidPasswordException as e:
        messages.error(request, f'Invalid new password: {e}')
    except Exception as e:
        messages.error(request, f'An error occurred: {e}')

    return redirect('dashboard/')

def password_reset(request):
    login_form = LoginForm.objects.first()
    if request.method == 'POST':
        email = request.POST.get('email')
        request.session['reset_email'] = email  # Store for convenience

        client = boto3.client('cognito-idp', region_name=settings.AWS_REGION)

        try:
            response = client.forgot_password(
                ClientId=settings.COGNITO_CLIENT_ID,
                Username=email,
                SecretHash=generate_secret_hash(settings.COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET, email)
            )
            messages.success(request, "Password reset email sent.")
            return redirect(reverse('confirm_password_reset'))
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                messages.error(request, "User not found.")
            elif error_code == 'InvalidParameterException':
                messages.error(request, "Invalid email or user is not confirmed.")
            else:
                messages.error(request, f"Unexpected error: {str(e)}")

    return render(request, 'main/password_reset.html', {'login_form': login_form})

def confirm_password_reset(request):
    login_form = LoginForm.objects.first()
    if request.method == 'POST':
        email = request.POST.get('email')
        code = request.POST.get('code')
        new_password = request.POST.get('new_password')

        client = boto3.client('cognito-idp', region_name=settings.AWS_REGION)

        try:
            # Reset password in Cognito
            response = client.confirm_forgot_password(
                ClientId=settings.COGNITO_CLIENT_ID,
                Username=email,
                ConfirmationCode=code,
                Password=new_password,
                SecretHash=generate_secret_hash(settings.COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET, email)
            )

            # Also update password in Django if the user exists
            try:
                user = User.objects.get(username=email)
                user.set_password(new_password)
                user.save()
                messages.success(request, "Your password has successfully been reset.")
            except User.DoesNotExist:
                messages.warning(request, "Password reset in Cognito, but user does not exist in Django.")

            return redirect('login_view')

        except client.exceptions.CodeMismatchException:
            messages.error(request, "Invalid Confirmation Code.")
        except client.exceptions.ExpiredCodeException:
            messages.error(request, "The Confirmation Code has expired.")
        except client.exceptions.UserNotFoundException:
            messages.error(request, "User not found.")
        except Exception as e:
            messages.error(request, f"An error occurred: {e}")

    return render(request, 'main/confirm_password_reset.html', {'login_form': login_form})
