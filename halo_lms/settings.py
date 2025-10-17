import environ
import os

print(os.environ.get('AWS_ACCESS_KEY_ID'))

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

env = environ.Env()
# Take environment variables from .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure--zfe4r2nb4!-g+3&ur$36ts2n#iaed+-gb8@&(bm-s$p6+ht82'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True
#DEBUG = False

#ALLOWED_HOSTS = ['127.0.0.1']
ALLOWED_HOSTS = ['127.0.0.1', 'lms.local', 'localhost']

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'client_admin',
    'halo_lms',
    'content',
    'storages',
    'authentication',
    'custom_templates',
    'learner_dashboard',
    'impersonate',
    'course_player',
    'django_extensions',
    'emails',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'halo_lms.middleware.ImpersonateMiddleware',
    'halo_lms.middleware.TimeZoneMiddleware',
    'halo_lms.middleware.TermsAcceptanceMiddleware',
    'halo_lms.middleware.AdminRoleGateMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',  
]

ROOT_URLCONF = 'halo_lms.urls'

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'client_admin', 'authentication', 'templates'),
            os.path.join(BASE_DIR, 'halo_lms', 'main', 'templates'),  # Add this line
            os.path.join(BASE_DIR, 'course_player', 'templates'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'halo_lms.context_processors.user_info',
                'halo_lms.context_processors.learner_base_data',
                'halo_lms.context_processors.unread_messages_processor',
                'halo_lms.context_processors.organization_settings',
                'halo_lms.context_processors.user_impersonation',
                'halo_lms.context_processors.date_format_context',
                'halo_lms.context_processors.flatpickr_format_context'
            ],
        },
    },
]


WSGI_APPLICATION = 'halo_lms.wsgi.application'
COGNITO_USER_POOL_ID = 'us-east-1_fD9eJjrhN'
COGNITO_CLIENT_ID = '1j41n9nibiaeimpl8aent2kioo'
AWS_STORAGE_BUCKET_NAME = 'halolmstestbucket'
AWS_S3_REGION_NAME = 'us-east-1'  # e.g., 'us-west-2'
AWS_REGION = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None  # Optional: You can set it to 'public-read' if you want public access
AWS_QUERYSTRING_AUTH = False  # Optional: Generates URLs without query strings
# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'HALO LMS',
        'USER': 'postgres',
        'PASSWORD': 'RubixCube',
        'HOST': 'localhost',  # Set to your database host, e.g., '127.0.0.1'
        'PORT': '5432',       # Set to your database port, default is '5432'
    }
}

LOGIN_URL = '/login/'

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

X_FRAME_OPTIONS = 'ALLOWALL'


SESSION_ENGINE = 'django.contrib.sessions.backends.db'  # or cache or cache_db
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_HTTPONLY = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = True  # Ensures session is saved on every request

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = '/static/'

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/tenant/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'tenant')

HALO_DEFAULT_CERTIFICATE_PATH = '/static/images/certificates/Radar Renewal(2).pdf'

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

#DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
DEFAULT_FILE_STORAGE = 'client_admin.storage_backends.TenantS3Boto3Storage'
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

IMITATE_REQUIRE_SUPERUSER = True