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
import os
from django.contrib import messages
import hmac
import hashlib
from django.contrib.auth import login as django_login, authenticate
import base64
import requests
from jose import jwt, JWTError
import json
from django.http import JsonResponse
import logging
from botocore.exceptions import ClientError, BotoCoreError, NoCredentialsError
from custom_templates.models import Dashboard, Widget, Header, Footer, LoginForm
from client_admin.models import OrganizationSettings, ActivityLog
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from functools import lru_cache

# ------------------------------------------------------------------------------------
# NEW: Helpers to load secrets/clients lazily and safely (NO import-time AWS calls)
# ------------------------------------------------------------------------------------

@lru_cache
def get_region() -> str:
    return getattr(settings, "AWS_REGION", None) or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"

@lru_cache
def get_secret(secret_name: str):
    """
    Lazy secret loader:
    1) Env override (raw or JSON)
    2) AWS Secrets Manager (requires IAM role or access keys)
    3) {} fallback on errors
    """
    # 1) Env override (e.g., export COGNITO_SECRET='{"AWS_ACCESS_KEY_ID":"..."}')
    env_val = os.getenv(secret_name)
    if env_val:
        try:
            return json.loads(env_val)
        except json.JSONDecodeError:
            # allow plain string secrets too
            return env_val

    # 2) Secrets Manager (only when we really need it)
    region = get_region()
    try:
        client = boto3.client("secretsmanager", region_name=region)
        resp = client.get_secret_value(SecretId=secret_name)
        val = resp.get("SecretString") or resp.get("SecretBinary")
        try:
            return json.loads(val)
        except Exception:
            return val
    except (NoCredentialsError, ClientError, BotoCoreError) as e:
        logging.getLogger(__name__).warning(f"Secret '{secret_name}' not available: {e}")
        return {}

@lru_cache
def get_cognito_client():
    """Lazy cached Cognito IDP client; uses instance role if present."""
    return boto3.client("cognito-idp", region_name=get_region())

@lru_cache
def get_s3_client():
    """Lazy cached S3 client; uses creds from secret if present, else role."""
    secret = get_secret("COGNITO_SECRET") or {}
    # These keys were pulled from your top-level block
    key_id = secret.get("AWS_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID")
    key_secret = secret.get("AWS_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")

    if key_id and key_secret:
        return boto3.client(
            "s3",
            aws_access_key_id=key_id,
            aws_secret_access_key=key_secret,
            region_name=get_region(),
        )
    # Fall back to role/ambient creds
    return boto3.client("s3", region_name=get_region())

def get_cognito_client_secret() -> str:
    """Find the app client secret (from env or secret)."""
    secret = get_secret("COGNITO_SECRET") or {}
    return os.getenv("COGNITO_CLIENT_SECRET") or secret.get("COGNITO_CLIENT_SECRET") or ""

# ------------------------------------------------------------------------------------
# Views & auth helpers
# ------------------------------------------------------------------------------------

@login_required
def login(request):
    return render(request, 'login.html')

def get_cognito_public_keys(region, user_pool_id):
    keys_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    response = requests.get(keys_url, timeout=10)
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
        claims = jwt.decode(
            id_token,
            key,
            algorithms=['RS256'],
            audience=expected_audience,
            issuer=expected_issuer
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.JWTClaimsError:
        raise Exception('Invalid claims, please check the audience and issuer')
    except JWTError as e:
        raise Exception('Unable to parse authentication token.') from e

def generate_secret_hash(client_id, client_secret, username):
    message = username + client_id
    dig = hmac.new(client_secret.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).digest()
    return base64.b64encode(dig).decode()

def authenticate_user(username_or_email, password):
    client = get_cognito_client()
    client_id = settings.COGNITO_CLIENT_ID
    client_secret = get_cognito_client_secret()

    # SECRET_HASH is required when the app client has a secret
    secret_hash = generate_secret_hash(client_id, client_secret, username_or_email) if client_secret else None
    auth_params = {'USERNAME': username_or_email, 'PASSWORD': password}
    if secret_hash:
        auth_params['SECRET_HASH'] = secret_hash

    try:
        response = client.initiate_auth(
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters=auth_params,
            ClientId=client_id,
        )
        id_token = response['AuthenticationResult']['IdToken']
        access_token = response['AuthenticationResult']['AccessToken']
        refresh_token = response['AuthenticationResult'].get('RefreshToken')

        public_keys = get_cognito_public_keys(get_region(), settings.COGNITO_USER_POOL_ID)
        expected_issuer = f'https://cognito-idp.{get_region()}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}'
        expected_audience = client_id
        
        claims = decode_jwt_with_public_key(id_token, public_keys, expected_issuer, expected_audience)
        return {
            'IdToken': id_token,
            'AccessToken': access_token,
            'RefreshToken': refresh_token,
            'Username': claims.get('cognito:username'),
            'Claims': claims
        }
    except client.exceptions.UserNotFoundException:
        return None
    except client.exceptions.NotAuthorizedException:
        return None
    except Exception as e:
        logging.getLogger(__name__).exception(f"authenticate_user error: {e}")
        return None

def login_view(request):
    login_form = LoginForm.objects.first()
    if request.method == 'POST':
        username_or_email = request.POST.get('username_or_email')
        password = request.POST.get('password')

        if not username_or_email or not password:
            messages.error(request, 'Please provide both username and password.')
            return render(request, 'main/login.html', {'login_form': login_form})

        response = authenticate_user(username_or_email, password)
        if response:
            user, created = User.objects.get_or_create(username=username_or_email)
            if created:
                user.set_password(password)
                user.save()
            django_login(request, user)
            record_login_activity(user)
            return redirect('learner_dashboard')

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

def register_view(request):
    login_form = LoginForm.objects.first()
    org_settings = OrganizationSettings.objects.first()
    allowed_photos = org_settings.allowed_id_photos.order_by('id') if org_settings else None

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

            # Upload to S3
            s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
            s3 = get_s3_client()

            id_photo_key = f"users/{username}/id_photo/{id_photo.name}"
            reg_photo_key = f"users/{username}/reg_photo/{reg_photo.name}"
            id_photo.seek(0); reg_photo.seek(0)
            s3.upload_fileobj(id_photo, s3_bucket, id_photo_key)
            s3.upload_fileobj(reg_photo, s3_bucket, reg_photo_key)
            id_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{id_photo_key}"
            reg_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{reg_photo_key}"

            client_id = settings.COGNITO_CLIENT_ID
            client_secret = get_cognito_client_secret()
            secret_hash = generate_secret_hash(client_id, client_secret, username) if client_secret else None

            cognito = get_cognito_client()
            kwargs = dict(
                ClientId=client_id,
                Username=username,
                Password=password,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'given_name', 'Value': given_name},
                    {'Name': 'family_name', 'Value': family_name},
                    {'Name': 'birthdate', 'Value': birthdate_raw},
                    {'Name': 'custom:id_photo', 'Value': id_photo_url},
                    {'Name': 'custom:reg_photo', 'Value': reg_photo_url},
                ],
            )
            if secret_hash:
                kwargs["SecretHash"] = secret_hash

            response = cognito.sign_up(**kwargs)

            user = User.objects.create_user(
                username=username, password=password, email=email,
                first_name=given_name, last_name=family_name
            )

            # If you still want to store originals in Django:
            id_photo.seek(0); reg_photo.seek(0)
            Profile.objects.create(
                user=user,
                username=username,
                email=email,
                first_name=given_name,
                last_name=family_name,
                photoid=ContentFile(id_photo.read(), name=id_photo.name),
                passportphoto=ContentFile(reg_photo.read(), name=reg_photo.name)
            )

            cognito.admin_add_user_to_group(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=username,
                GroupName='Test'
            )

            messages.success(request, 'Registration successful. Please check your email to confirm your account.')
            return render(request, 'main/login.html', {'login_form': login_form})

        except get_cognito_client().exceptions.UsernameExistsException:
            messages.error(request, 'Username already exists.')
        except get_cognito_client().exceptions.InvalidParameterException as e:
            messages.error(request, f'Invalid parameters provided: {e}')
        except Exception as e:
            messages.error(request, f'An error occurred: {e}')

    return render(request, 'main/register.html', {'login_form': login_form, 'allowed_photos': allowed_photos})

def verify_account(request):
    code = request.GET.get('code')
    username = request.GET.get('username')

    if not code or not username:
        return render(request, 'verification_status.html', {'message': 'Invalid verification request.'})

    cognito = get_cognito_client()
    try:
        cognito.confirm_sign_up(
            ClientId=settings.COGNITO_CLIENT_ID,
            Username=username,
            ConfirmationCode=code
        )
        return render(request, 'verification_status.html', {'message': 'Your account has been verified successfully.'})
    except cognito.exceptions.CodeMismatchException:
        return render(request, 'verification_status.html', {'message': 'Invalid verification code.'})
    except cognito.exceptions.UserNotFoundException:
        return render(request, 'verification_status.html', {'message': 'User not found.'})
    except Exception as e:
        return render(request, 'verification_status.html', {'message': f'An error occurred: {e}'})

def verification_success(request):
    return render(request, 'verification_status.html')

def login_success_view(request):
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
            s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
            s3 = get_s3_client()

            id_photo_url = ''
            reg_photo_url = ''

            if id_photo:
                s3_key_id_photo = f"users/{username}/id_photo/{id_photo.name}"
                id_photo.seek(0)
                s3.upload_fileobj(id_photo, s3_bucket, s3_key_id_photo)
                id_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key_id_photo}"

            if reg_photo:
                s3_key_reg_photo = f"users/{username}/reg_photo/{reg_photo.name}"
                reg_photo.seek(0)
                s3.upload_fileobj(reg_photo, s3_bucket, s3_key_reg_photo)
                reg_photo_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key_reg_photo}"

            client_id = settings.COGNITO_CLIENT_ID
            client_secret = get_cognito_client_secret()
            secret_hash = generate_secret_hash(client_id, client_secret, username) if client_secret else None

            cognito = get_cognito_client()
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'given_name', 'Value': given_name},
                {'Name': 'family_name', 'Value': family_name},
            ]
            if id_photo_url:
                user_attributes.append({'Name': 'custom:id_photo', 'Value': id_photo_url})
            if reg_photo_url:
                user_attributes.append({'Name': 'custom:reg_photo', 'Value': reg_photo_url})

            kwargs = dict(
                ClientId=client_id,
                Username=username,
                Password=password,
                UserAttributes=user_attributes,
            )
            if secret_hash:
                kwargs["SecretHash"] = secret_hash

            cognito.sign_up(**kwargs)

            group_name = 'Test'
            cognito.admin_add_user_to_group(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=username,
                GroupName=group_name
            )

            messages.success(request, 'Registration successful. Please check your email to confirm your account.')
            return redirect('dashboard/')

        except cognito.exceptions.UsernameExistsException:
            messages.error(request, 'Username already exists.')
        except cognito.exceptions.InvalidParameterException as e:
            messages.error(request, f'Invalid parameters provided: {e}')
        except Exception as e:
            messages.error(request, f'An error occurred: {e}')
    
    return render(request, 'main/register.html', {'login_form': login_form})

@login_required
def modifyCognito(request):
    if request.method != 'POST':
        return redirect('dashboard/')

    cognito_username = (request.POST.get('cognito_username') or request.POST.get('username') or '').strip()
    actor_username = request.user.username

    current_password = (request.POST.get('current_password') or '').strip()
    new_password     = (request.POST.get('new_password') or '').strip()
    confirm_password = (request.POST.get('confirm_password') or '').strip()

    email       = request.POST.get('email') or ''
    given_name  = request.POST.get('first_name') or ''
    family_name = request.POST.get('last_name') or ''
    birthdate   = request.POST.get('birth_date') if 'birth_date' in request.POST else None

    id_photo = request.FILES.get('photoid')
    reg_photo = request.FILES.get('passportphoto')

    is_self = (cognito_username == actor_username)

    try:
        cognito = get_cognito_client()

        if new_password or confirm_password:
            if new_password != confirm_password:
                messages.error(request, 'New passwords do not match.')
                return redirect('dashboard/')

            if is_self and not request.user.check_password(current_password):
                messages.error(request, 'Current password is incorrect.')
                return redirect('dashboard/')

            try:
                validate_password(new_password, user=request.user if is_self else None)
            except ValidationError as e:
                for err in e:
                    messages.error(request, err)
                return redirect('dashboard/')

            cognito.admin_set_user_password(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=cognito_username,
                Password=new_password,
                Permanent=True,
            )

        user_attributes = []
        if email:
            user_attributes.append({'Name': 'email', 'Value': email})
        if given_name:
            user_attributes.append({'Name': 'given_name', 'Value': given_name})
        if family_name:
            user_attributes.append({'Name': 'family_name', 'Value': family_name})

        if birthdate is not None:
            user_attributes.append({'Name': 'birthdate', 'Value': birthdate or ''})

        s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
        s3 = get_s3_client()
        if id_photo:
            s3_key = f"users/{cognito_username}/id_photo/{id_photo.name}"
            s3.upload_fileobj(id_photo, s3_bucket, s3_key)
            user_attributes.append({'Name': 'custom:id_photo', 'Value': f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"})

        if reg_photo:
            s3_key = f"users/{cognito_username}/reg_photo/{reg_photo.name}"
            s3.upload_fileobj(reg_photo, s3_bucket, s3_key)
            user_attributes.append({'Name': 'custom:reg_photo', 'Value': f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"})

        if user_attributes:
            cognito.admin_update_user_attributes(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=cognito_username,
                UserAttributes=user_attributes
            )

    except cognito.exceptions.UserNotFoundException:
        messages.error(request, 'User not found in Cognito.')
    except cognito.exceptions.InvalidPasswordException as e:
        messages.error(request, f'Invalid new password: {e}')
    except Exception as e:
        messages.error(request, f'An error occurred: {e}')

    return redirect('dashboard/')

def password_reset(request):
    login_form = LoginForm.objects.first()
    if request.method == 'POST':
        email = request.POST.get('email')
        request.session['reset_email'] = email

        client = get_cognito_client()
        try:
            client_secret = get_cognito_client_secret()
            secret_hash = generate_secret_hash(settings.COGNITO_CLIENT_ID, client_secret, email) if client_secret else None

            kwargs = dict(
                ClientId=settings.COGNITO_CLIENT_ID,
                Username=email,
            )
            if secret_hash:
                kwargs["SecretHash"] = secret_hash

            client.forgot_password(**kwargs)
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

        client = get_cognito_client()
        try:
            client_secret = get_cognito_client_secret()
            secret_hash = generate_secret_hash(settings.COGNITO_CLIENT_ID, client_secret, email) if client_secret else None

            kwargs = dict(
                ClientId=settings.COGNITO_CLIENT_ID,
                Username=email,
                ConfirmationCode=code,
                Password=new_password,
            )
            if secret_hash:
                kwargs["SecretHash"] = secret_hash

            client.confirm_forgot_password(**kwargs)

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