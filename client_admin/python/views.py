from io import BytesIO
import re
from datetime import timedelta
import boto3
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.forms.models import model_to_dict
from django.core.paginator import Paginator
from django.shortcuts import render
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.sessions.backends.db import SessionStore
from django.contrib.auth import get_user_model
from django.core.files.base import File
from django.db.models import Q, Avg, Count, Prefetch, Max, Min
from django.test import RequestFactory
from django.http import HttpResponse, JsonResponse, HttpResponseNotAllowed
import logging, csv
from authentication.python.views import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.utils.timezone import now, get_current_timezone
from django.http import HttpResponseForbidden, HttpRequest
from learner_dashboard.views import learner_dashboard
from django.contrib import messages
from client_admin.models import Profile, User, Profile, Course, User, UserCourse, UserModuleProgress, UserLessonProgress, Message, OrganizationSettings, ActivityLog, AllowedIdPhotos, EnrollmentKey, UserAssignmentProgress, QuizAttempt
from course_player.models import LessonSession, SCORMTrackingData, LessonProgress, QuizResponse, EssayPromptGrade 
from content.models import Lesson, Category, Quiz, Question, QuizTemplate, QuestionOrder, Answer, EssayPrompt, EssayAnswer, QuizReference, QuestionMedia
from client_admin.forms import OrganizationSettingsForm
from .forms import UserRegistrationForm, ProfileForm, CSVUploadForm
from django.contrib.auth import update_session_auth_hash, login
from authentication.python.views import addUserCognito, modifyCognito, register_view
from django.template.response import TemplateResponse
import json
from django.db import IntegrityError, transaction
from client_admin.models import GeneratedCertificate, EventDate
from django.db.models.functions import TruncMonth, TruncHour, Coalesce
from django.db.models import Sum, JSONField
import isodate
from collections import defaultdict
#from models import Profile
#from authentication.python import views

LOG = logging.getLogger(__name__)
QUIZ_DEBUG = getattr(settings, 'QUIZ_DEBUG', True)  # flip to False in prod

def qlog(event: str, **kv):
    """Lightweight structured logger for quiz debugging."""
    if not QUIZ_DEBUG:
        return
    try:
        LOG.warning("[QUIZDBG] %s %s", event, json.dumps(kv, default=str))
    except Exception:
        LOG.warning("[QUIZDBG] %s %r", event, kv)

cognito_client = boto3.client('cognito-idp', region_name=settings.AWS_REGION)

# Define the custom exception at the top of your views file
class ImpersonationError(Exception):
    """Custom exception for impersonation errors."""
    pass

def get_total_time_spent_dynamic(user=None, course=None):

    qs = LessonSession.objects.all()
    if user is not None:
        qs = qs.filter(user=user)
    if course is not None:
        qs = qs.filter(lesson__module__course=course)

    now_time = now()
    seven_days_ago = now_time - timedelta(days=7)
    one_year_ago = now_time - timedelta(days=365)

    # Use end_time when available, otherwise start_time, for bucketing
    qs = qs.annotate(ts=Coalesce('end_time', 'start_time'))

    recent_activity_count = qs.filter(ts__gte=seven_days_ago).count()

    if recent_activity_count > 20:
        # Hourly view over last 7 days
        qs = qs.filter(ts__gte=seven_days_ago).annotate(period=TruncHour('ts'))
        group_format = '%b %d %I%p'   # e.g. "Aug 15 03PM"
        granularity = 'hour'
    else:
        # Monthly view over last year
        qs = qs.filter(ts__gte=one_year_ago).annotate(period=TruncMonth('ts'))
        group_format = '%b %Y'        # e.g. "Aug 2025"
        granularity = 'month'

    # Only pull what we need
    rows = qs.values_list('period', 'session_time').order_by('period')

    # Sum ISO 8601 durations per period
    totals = defaultdict(timedelta)
    for period, iso in rows:
        try:
            d = isodate.parse_duration(iso or "PT0S")
        except Exception:
            d = timedelta()
        # isodate may return isodate.duration.Duration; coerce to timedelta
        if not isinstance(d, timedelta):
            d = getattr(d, 'tdelta', timedelta())
        totals[period] += d

    # Build ordered outputs
    periods_sorted = sorted(totals.keys())
    labels = [p.strftime(group_format) for p in periods_sorted]
    seconds = [int(totals[p].total_seconds()) for p in periods_sorted]

    return labels, seconds, granularity


@login_required
def admin_dashboard(request):
    total_students = User.objects.filter(profile__role='Student').count()
    completed_courses = UserCourse.objects.filter(is_course_completed=True).count()
    active_courses = Course.objects.filter(status='Active').count()

    labels, values, granularity = get_total_time_spent_dynamic()

    # Get top 5 most-enrolled courses
    top_courses_qs = Course.objects.annotate(enrollments=Count('usercourse')) \
        .order_by('-enrollments')[:5]

    top_course_labels = [course.title for course in top_courses_qs]
    top_course_data = [course.enrollments for course in top_courses_qs]

    context = {
        'total_students': total_students,
        'completed_courses': completed_courses,
        'active_courses': active_courses,
        'time_spent_labels': labels,
        'time_spent_data': values,
        'time_spent_granularity': granularity,
        'top_course_labels': top_course_labels,
        'top_course_data': top_course_data,
    }

    print(f"Labels: {labels}")
    print(f"Values: {values}")
    print(f"Granularity: {granularity}")


    return render(request, 'dashboard.html', context)

@login_required
def admin_settings(request):
    settings = OrganizationSettings.objects.first()

    # Create a new instance if none exists
    if settings is None:
        settings = OrganizationSettings()
        settings.save()

    if request.method == 'POST':
        existing_text = (settings.terms_and_conditions_text or '').strip()
        previously_modified = settings.terms_last_modified

        form = OrganizationSettingsForm(request.POST, request.FILES, instance=settings)

        if form.is_valid():
            # Handle boolean fields
            settings.on_login_course = request.POST.get('on_login_course') == 'on'
            settings.profile_customization = request.POST.get('profile_customization') == 'on'
            settings.default_course_thumbnail = request.POST.get('default_course_thumbnail') == 'on' 
            settings.default_certificate = request.POST.get('default_certificate') == 'on' 
            settings.terms_and_conditions = request.POST.get('terms_and_conditions') == 'on'
            settings.course_launch_verification = request.POST.get('course_launch_verification') == 'on'
            settings.in_session_checks = request.POST.get('in_session_checks') == 'on'

            # Check for course ID if on_login_course is enabled
            course_id = request.POST.get('on_login_course_id')
            if settings.on_login_course and not course_id:
                messages.error(request, 'Please select a course for the One-time Course setting.')
                return redirect('admin_settings')

            # Handle Text Fields
            new_terms_text = (request.POST.get('terms_and_conditions_text') or '').strip()
            if existing_text != new_terms_text:
                settings.terms_last_modified = timezone.now()
            else:
                settings.terms_last_modified = previously_modified

            # Save cleaned text and course ID if present
            settings.terms_and_conditions_text = new_terms_text
            if course_id:
                settings.on_login_course_id = int(course_id)

            # Clear favicon if not present in FILES
            if 'portal_favicon' not in request.FILES and not request.POST.get('portal_favicon'):
                settings.portal_favicon = None

            hours = safe_int(request.POST.get('check_frequency_hours'))
            minutes = safe_int(request.POST.get('check_frequency_minutes'))

            settings.check_frequency_time = timedelta(hours=hours, minutes=minutes)

            settings.save()
            form.save()

            messages.success(request, 'Settings updated')
            return redirect('admin_settings')

        else:
            messages.error(request, form.errors)
            print(form.errors)

    else:
        form = OrganizationSettingsForm(instance=settings)

    selected_course_name = ''
    if settings.on_login_course_id:
        try:
            selected_course = Course.objects.get(id=settings.on_login_course_id)
            selected_course_name = selected_course.title
        except Course.DoesNotExist:
            pass

    allowed_photos = settings.allowed_id_photos.order_by('id')

    check_frequency = settings.check_frequency_time
    hours = minutes = 0
    if check_frequency:
        total_seconds = check_frequency.total_seconds()
        hours = int(total_seconds // 3600)
        minutes = int((total_seconds % 3600) // 60)


    return render(request, 'settings.html', {
        'form': form,
        'selected_course_name': selected_course_name,
        'allowed_photos': allowed_photos,
        'hours': hours,
        'minutes': minutes,
    })

def safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0

@login_required
def custom_admin_header(request):
    context = {
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'email': request.user.email,
    }
    print(context)
    return TemplateResponse(request, 'base.html', context)

# Users
@login_required
def admin_users(request):
    sort_by = request.GET.get('sort_by', 'username_desc')
    order_by_field = 'username'  # Default sorting field
    query_string = request.GET.get('query')

    query = Q()
    active_filters = {}

    # Apply the general search query if provided
    if query_string:
        query &= (
            Q(username__icontains=query_string) |
            Q(email__icontains=query_string) |
            Q(first_name__icontains=query_string) |
            Q(last_name__icontains=query_string)
        )
        active_filters['query'] = query_string  # Track the general search query

    # Build the query dynamically based on the provided filter parameters
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]  # Extract field name after 'filter_'
            query &= Q(**{f"{field_name}__icontains": value})
            active_filters[field_name] = value

    # Define a dictionary to map sort options to user-friendly text
    sort_options = {
        'username_asc': 'Username (A-Z)',
        'username_desc': 'Username (Z-A)',
        'email_asc': 'Email (A-Z)',
        'email_desc': 'Email (Z-A)',
        'last_name_asc': 'Last Name (A-Z)',
        'last_name_desc': 'Last Name (Z-A)',
        'first_name_asc': 'First Name (A-Z)',
        'first_name_desc': 'First Name (Z-A)',       
    }

    # Determine the order by field
    if sort_by == 'username_asc':
        order_by_field = 'username'
    elif sort_by == 'username_desc':
        order_by_field = '-username'
    elif sort_by == 'email_asc':
        order_by_field = 'email'
    elif sort_by == 'email_desc':
        order_by_field = '-email'
    elif sort_by == 'last_name_asc':
        order_by_field = 'last_name'
    elif sort_by == 'last_name_desc':
        order_by_field = '-last_name'
    elif sort_by == 'first_name_asc':
        order_by_field = 'first_name'
    elif sort_by == 'first_name_desc':
        order_by_field = '-first_name'

    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Username (Z-A)')

    # Apply the filtering and sorting to the users list
    users_list = Profile.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered users_list
    paginator = Paginator(users_list, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'users/users.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
    })

'''
@login_required
def edit_user(request, user_id):
    profile = get_object_or_404(Profile, pk=user_id)
    user = profile.user

    if request.method == 'POST':
        # Update User fields
        user.username = request.POST.get('username')
        user.email = request.POST.get('email')
        user.first_name = request.POST.get('first_name')
        user.last_name = request.POST.get('last_name')
        user.save()  # Save User model

        # Update Profile fields
        profile.role = request.POST.get('role')
        profile.archived = request.POST.get('archived') == 'on'  # Checkbox handling
        profile.country = request.POST.get('country')
        profile.city = request.POST.get('city')
        profile.state = request.POST.get('state')
        profile.code = request.POST.get('code')
        profile.citizenship = request.POST.get('citizenship')
        profile.address_1 = request.POST.get('address_1')
        birth_date_str = request.POST.get('birth_date')
        profile.sex = request.POST.get('sex')
        profile.referral = request.POST.get('referral')
        profile.associate_school = request.POST.get('associate_school')

        # Initialize birth_date with None or an existing value from the user
        birth_date = user.birth_date if hasattr(user, 'birth_date') else None
        
        # Parse and format birth_date
        if birth_date_str:
            birth_date = parse_date(birth_date_str)
            if birth_date:
                profile.birth_date = birth_date

        # Handle file uploads
        if 'photoid' in request.FILES:
            profile.photoid = request.FILES['photoid']
        if 'passportphoto' in request.FILES:
            profile.passportphoto = request.FILES['passportphoto']

        profile.save()  # Save Profile model

        messages.success(request, 'User information updated')

        # Determine where to redirect
        referer = request.META.get('HTTP_REFERER')
        if referer:
            return redirect(referer)
        else:
            # Default redirect
            return redirect('user_details', user_id=profile.id)

    # Determine which template to use
    referer = request.META.get('HTTP_REFERER', '')
    if 'transcript' in referer:
        template = 'users/user_transcript.html'
    else:
        template = 'users/user_details.html'

    context = {
        'profile': profile
    }
    return render(request, template, context)
'''

@login_required
def edit_user(request, user_id):
    if request.is_impersonating:
        return messages.error(request, 'Cannot edit while impersonating')

    user = get_object_or_404(Profile, pk=user_id)

    original_values = {
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'archived': user.archived,
        'country': user.country,
        'city': user.city,
        'state': user.state,
        'code': user.code,
        'citizenship': user.citizenship,
        'address_1': user.address_1,
        'birth_date': user.birth_date,
        'sex': user.sex,
        'referral': user.referral,
        'associate_school': user.associate_school,
    }

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        email = request.POST.get('email')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        role = request.POST.get('role')
        archived = request.POST.get('archived') == 'on'
        country = request.POST.get('country')
        city = request.POST.get('city')
        state = request.POST.get('state')
        code = request.POST.get('code')
        citizenship = request.POST.get('citizenship')
        address_1 = request.POST.get('address_1')
        birth_date_str = request.POST.get('birth_date')
        sex = request.POST.get('sex')
        referral = request.POST.get('referral')
        associate_school = request.POST.get('associate_school')

        # Parse birth_date
        birth_date = user.birth_date
        if birth_date_str:
            parsed_birth_date = parse_date(birth_date_str)
            if parsed_birth_date:
                birth_date = parsed_birth_date
                user.birth_date = birth_date
        else:
            birth_date = None

        # Handle password change
        if password and confirm_password:
            if password == confirm_password:
                user.user.set_password(password)
                user.user.save()
                update_session_auth_hash(request, user.user)
                messages.success(request, 'Password updated successfully.')
            else:
                messages.error(request, 'Passwords do not match.')

        # Update user fields
        user.username = username
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.archived = archived
        user.country = country
        user.city = city
        user.state = state
        user.code = code
        user.citizenship = citizenship
        user.address_1 = address_1
        user.birth_date = birth_date
        user.sex = sex
        user.referral = referral
        user.associate_school = associate_school

        # Handle file uploads (no manual S3 upload, let Django handle it)
        if 'photoid' in request.FILES:
            id_photo = request.FILES['photoid']
            id_photo.name = f'users/{username}/id_photo/{id_photo.name}'
            user.photoid = id_photo

        if 'passportphoto' in request.FILES:
            passport_photo = request.FILES['passportphoto']
            passport_photo.name = f'users/{username}/passport_photo/{passport_photo.name}'
            user.passportphoto = passport_photo

        user.save()
        modifyCognito(request)

        # Log changes
        changes = []
        for field, original_value in original_values.items():
            new_value = getattr(user, field)
            if original_value != new_value:
                changes.append(f"Changed {field} from '{original_value}' to '{new_value}'")
        changes_log = "; ".join(changes) if changes else "No changes made."

        ActivityLog.objects.create(
            user=user.user,
            action_performer=request.user.username,
            action_target=user.user.username,
            action_type= 'user_updated',
            action=f'Updated User Information: {changes_log}',
            user_groups=', '.join(group.name for group in request.user.groups.all()),
        )

        messages.success(request, 'Information updated successfully')

        referer = request.META.get('HTTP_REFERER')
        return redirect(referer if referer else 'user_details', user_id=user.id)

    # Determine template
    referer = request.META.get('HTTP_REFERER', '')
    template = 'users/user_transcript.html' if 'transcript' in referer else 'users/user_details.html'
    
    return render(request, template, {'profile': user})


@login_required
def enroll_users_request(request):
    user_ids = request.POST.getlist('user_ids[]')
    course_ids = request.POST.getlist('course_ids[]')

    response_data = {
        'enrolled': [],
        'already_enrolled': [],
        'message': ''  # Add a message key to store response messages
    }

    for user_id in user_ids:
        user = get_object_or_404(User, id=user_id)
        for course_id in course_ids:
            course = get_object_or_404(Course, id=course_id)

            # Check if the UserCourse already exists (user is already enrolled)
            user_course, created = UserCourse.objects.get_or_create(user=user, course=course)

            print('ENROLL USERS REQUEST')

            if created:
                # Create UserModuleProgress instances for each module in the course
                first_lesson = Lesson.objects.filter(module__course=course).order_by('module__order', 'order').first()
                print('first_lesson:', first_lesson)

                if first_lesson:
                    user_course.lesson_id = first_lesson.id  # Assign the first lesson
                    print(first_lesson)
                    user_course.save()

                for module in course.modules.all():
                    UserModuleProgress.objects.create(
                        user_course=user_course,
                        module=module
                    )

                    # Create UserLessonProgress instances for each lesson in the module
                    for lesson in module.lessons.all():
                        UserLessonProgress.objects.create(
                            user_module_progress=UserModuleProgress.objects.get(
                                user_course=user_course,
                                module=module
                            ),
                            lesson=lesson
                        )

                response_data['enrolled'].append({
                    'user_id': user.id,
                    'course_id': course.id,
                    'progress': user_course.progress,
                    'lesson_id': user_course.lesson_id
                })
                try:
                    ActivityLog.objects.create(
                        user=user,
                        action_performer=request.user,
                        action_target=user,
                        action_type= 'user_enrolled',
                        action=f"was enrolled in: {course.title}",
                        user_groups=', '.join(group.name for group in request.user.groups.all()),
                    )
                except Exception as e:
                    print(f"Failed to create activity log: {e}")
            else:
                response_data['already_enrolled'].append({
                    'user_id': user.id,
                    'course_id': course.id,
                    'progress': user_course.progress
                })

    if response_data['enrolled']:
        # Set a success message
        messages.success(request, 'User(s) enrolled successfully.')
        # Notify the front-end that a redirect should occur
        return JsonResponse({'redirect_url': '/admin/users/'}, status=201)
    else:
        response_data['message'] = 'All users are already enrolled in the selected courses.'
        return JsonResponse(response_data, status=200)

@login_required
def user_details(request, user_id):
    profile = get_object_or_404(Profile, pk=user_id)
    user_courses = UserCourse.objects.filter(user=profile.user) \
        .select_related('course') \
        .prefetch_related('module_progresses__module__lessons') \
        .order_by('course__title')

    # Enrollment Progress
    total_enrollments = user_courses.count()
    total_in_progress = 0
    total_completed = 0
    expired_enrollments = 0

    for course in user_courses:
        status = course.get_status()
        if status == 'Completed':
            total_completed += 1
        elif status in ['Started', 'Not Completed']:  # Assuming these mean "in progress"
            total_in_progress += 1
        elif status == 'Expired':
            expired_enrollments += 1

    # Learner Activity
    average_progress = user_courses.aggregate(avg_progress=Avg('progress'))['avg_progress'] or 0
    average_progress = round(average_progress, 2)
    last_session = LessonSession.objects.filter(user=profile.user).order_by('-start_time').first()
    last_active = last_session.start_time if last_session else None
    sessions = SCORMTrackingData.objects.filter(user=profile.user)

    total_time = timedelta()
    for session in sessions:
        total_time += parse_iso_duration(session.session_time)

    if total_time.total_seconds() == 0:
        formatted_total_time = "No Activity"
    else:
        total_hours, remainder = divmod(total_time.total_seconds(), 3600)
        total_minutes, total_seconds = divmod(remainder, 60)

        if total_hours > 0:
            formatted_total_time = f"{int(total_hours)}h {int(total_minutes)}m {int(total_seconds)}s"
        else:
            formatted_total_time = f"{int(total_minutes)}m {int(total_seconds)}s"

    total_certificates = GeneratedCertificate.objects.filter(user=profile.user).count()

    context = {
        'profile': profile,
        'user_courses': user_courses,
        'total_in_progress': total_in_progress,
        'total_completed': total_completed,
        'total_enrollments': total_enrollments,
        'expired_enrollments': expired_enrollments,
        'average_progress': average_progress,
        'last_active': last_active,
        'total_time_spent': formatted_total_time,
        'total_certificates': total_certificates,
    }

    return render(request, 'users/user_details.html', context)

def parse_iso_duration(duration_str):
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.fullmatch(duration_str)
    if not match:
        return timedelta()

    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0

    return timedelta(hours=hours, minutes=minutes, seconds=seconds)

@login_required
def user_transcript(request, user_id):
    profile = get_object_or_404(Profile, pk=user_id)

    user_courses = (
        UserCourse.objects.filter(user=profile.user)
        .select_related('course')
        .prefetch_related('module_progresses__module__lessons')
        .order_by('course__title')
    )

    user_certificates = (
        GeneratedCertificate.objects.filter(user=profile.user)
        .prefetch_related('event_dates', 'user_course__course')
    )

    context = {
        'profile': profile,
        'user_courses': user_courses,
        'user_certificates': user_certificates,
    }
    return render(request, 'users/user_transcript.html', context)

@login_required
def user_history(request, user_id):
    user = get_object_or_404(Profile, pk=user_id)

    sent_messages = Message.objects.filter(sender=request.user, recipients=user.user)

    activity_logs = ActivityLog.objects.filter(
        action_target=user.user.username  # Adjust as needed
    ).order_by('-timestamp')  # Most recent first

    context = {
        'profile': user,
        'sent_messages': sent_messages,
        'activity_logs': activity_logs,
    }
    return render(request, 'users/user_history.html', context)

@login_required
def add_user_page(request):
    """Render the user registration and profile creation form."""
    user_form = UserRegistrationForm()
    profile_form = ProfileForm()

    return render(request, 'users/add_user.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })

@login_required
def add_user(request):
    if request.method == 'POST':
        print('POST request received')

        # Bind forms with POST data and FILES
        user_form = UserRegistrationForm(request.POST)
        profile_form = ProfileForm(request.POST, request.FILES)

        if user_form.is_valid() and profile_form.is_valid():

            username = user_form.cleaned_data.get('username')
            password = user_form.cleaned_data.get('password')
            email = user_form.cleaned_data.get('email')
            first_name = user_form.cleaned_data.get('first_name')
            last_name = user_form.cleaned_data.get('last_name')

            # Create the new user
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            profile = profile_form.save(commit=False)
            profile.user = user  # Link profile to user
            s3_client = boto3.client(
                's3',
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )

            # >>> START FILE UPLOAD TO S3 <<<
            id_photo = request.FILES.get('photoid')
            passport_photo = request.FILES.get('passportphoto')

            # Skip uploading via boto3 if files are already in S3.
            # Set custom S3 key by overriding the file name BEFORE save()
            if id_photo:
                id_photo.name = f'users/{username}/id_photo/{id_photo.name}'
            if passport_photo:
                passport_photo.name = f'users/{username}/passport_photo/{passport_photo.name}'

            profile = profile_form.save(commit=False)
            profile.user = user
            profile.save()

            # Additional operations like Cognito integration
            addUserCognito(request)
            print('User successfully created and registered with Cognito.')

            messages.success(request, 'User created successfully.')
            return redirect('/admin/users/')  # Redirect to success page

        else:
            # Handle form errors and log them
            if not user_form.is_valid():
                print('User form errors:', user_form.errors)
                messages.error(request, user_form.errors)

            if not profile_form.is_valid():
                print('Profile form errors:', profile_form.errors)
                messages.error(request, profile_form.errors)

    return redirect('add_user_page')

@login_required
def enroll_users(request):

    return render(request, 'users/enroll_users.html')

@login_required
def message_users(request):

    return render(request, 'users/message_users.html')

@login_required
def message_users_request(request):
    if request.method == 'POST':
        user_ids = request.POST.getlist('user_ids[]')
        subject = request.POST.get('subject')
        body = request.POST.get('body')
        message_type = request.POST.get('message_type', 'message').strip()

        if not subject or not body:
            return JsonResponse({'message': 'Subject and body are required.'}, status=400)

        if message_type not in dict(Message.MESSAGE_TYPES):
            return JsonResponse({'message': 'Invalid message type.'}, status=400)

        sender = request.user
        message = Message.objects.create(
            subject=subject,
            body=body,
            sender=sender,
            message_type=message_type
        )

        recipients = User.objects.filter(id__in=user_ids)
        message.recipients.set(recipients)
        message.save()

        messages.success(request, 'Message sent successfully.')
        return JsonResponse({'message': 'Message sent successfully', 'redirect_url': '/admin/users/'})

    return JsonResponse({'message': 'Invalid request method'}, status=400)

User = get_user_model()
logger = logging.getLogger(__name__)

@login_required
def impersonate_user(request, profile_id):
    # Ensure the user has permission to impersonate
    if request.user.is_authenticated:
        try:
            # Retrieve the user associated with the given profile ID
            user_to_impersonate = User.objects.get(profile__id=profile_id)
            print("User found:", user_to_impersonate.username)

            # Store the original user ID before impersonating
            if 'original_user_id' not in request.session:
                request.session['original_user_id'] = request.user.id
                request.session.modified = True
                print("Original user ID stored:", request.session['original_user_id'])

            # Store the original session ID in a temporary variable
            original_user_id = request.session['original_user_id']

            # Log in as the impersonated user
            login(request, user_to_impersonate)

            # Set the session variable for impersonation
            request.session['impersonate_user_id'] = user_to_impersonate.id
            request.session['original_user_id'] = original_user_id  # Restore original user ID
            request.session.modified = True  # Ensure the session is marked as modified

            # Log the session data
            print("Session data after impersonation:", request.session.items())
            impersonate_user_id = request.session.get('impersonate_user_id', None)
            print("Assigned impersonate_user_id:", impersonate_user_id)

            # Redirect to the dashboard
            return redirect('/dashboard')  # Update with the appropriate dashboard URL

        except User.DoesNotExist:
            print("User does not exist.")
            return redirect('/login')
        except ImpersonationError as e:
            # Handle the impersonation error
            messages.error(request, str(e))  # Use the error message from the exception
            return redirect(request.META.get('HTTP_REFERER', '/'))  # Redirect back

    print("Unauthorized access attempt.")
    return redirect('/login')


@login_required
def stop_impersonating(request):
    # Print session data before any operations
    print("Session data before stopping impersonation:", dict(request.session.items()))
    
    if 'impersonate_user_id' in request.session:
        # Delete the impersonation session variable
        del request.session['impersonate_user_id']

        # Retrieve the original user ID from the session
        original_user_id = request.session.pop('original_user_id', None)
        print("Retrieved original user ID:", original_user_id)

        if original_user_id:
            User = get_user_model()
            try:
                # Retrieve the original user and log them back in
                original_user = User.objects.get(id=original_user_id)
                login(request, original_user)
                
                messages.success(request, 'You have stopped impersonating.')
            except User.DoesNotExist:
                messages.error(request, 'Original user not found. Please log in again.')

    return redirect('/admin/users') 

@login_required
def import_user(request):
    if request.method == 'POST':
        form = CSVUploadForm(request.POST, request.FILES)

        if form.is_valid():
            csv_file = form.cleaned_data['csv_file']

            try:
                decoded_file = csv_file.read().decode('utf-8').splitlines()
                first_line = decoded_file[0]
                delimiter = ',' if ',' in first_line else '\t'
                reader = csv.DictReader(decoded_file, delimiter=delimiter)

                for row in reader:
                    username = row.get('username', '').strip()
                    email = row.get('email', '').strip()
                    password = row.get('password', '').strip()
                    first_name = row.get('givenName', '').strip()
                    last_name = row.get('familyName', '').strip()

                    if not username:
                        messages.error(request, f'Missing username for row: {row}')
                        continue

                    # Create or get the user
                    user, created = User.objects.get_or_create(
                        username=username,
                        defaults={
                            'email': email,
                            'first_name': first_name,
                            'last_name': last_name,
                        }
                    )

                    if created:
                        user.set_password(password)
                        user.save()
                        messages.success(request, f'User {username} created successfully in Django.')

                        # Call the function to add the user to Cognito
                        add_user_to_cognito(request, username, password, email, first_name, last_name)

                        # Create the corresponding profile
                        Profile.objects.create(
                            user=user,
                            username=user.username,  # Link the profile to the user object
                            first_name=first_name,
                            last_name=last_name,
                            email=email
                        )
                        messages.success(request, f'Profile created for {username}.')

                    else:
                        messages.warning(request, f'User {username} already exists in Django.')

            except Exception as e:
                messages.error(request, f'Error processing CSV file: {e}')

            return redirect('/admin/users/')

    return redirect('/admin/users/')

def add_user_to_cognito(original_request, username, password, email, first_name, last_name, id_photo=None, reg_photo=None):
    # Prepare a mock request object
    request = HttpRequest()
    request.method = 'POST'
    request.POST = {
        'username': username,
        'password': password,
        'email': email,
        'first_name': first_name,
        'last_name': last_name,
    }

    # Attach user from the original request
    request.user = original_request.user

    # Manually create a session for the mock request
    session = SessionStore()
    session.create()  # Create a new session in the database
    request.session = session

    # Mocking the messages framework
    setattr(request, 'session', original_request.session)
    messages_storage = FallbackStorage(request)
    setattr(request, '_messages', messages_storage)

    # Add files if available
    if id_photo:
        request.FILES['photoid'] = id_photo
    if reg_photo:
        request.FILES['passportphoto'] = reg_photo

    try:
        # Call the existing addUserCognito function
        addUserCognito(request)
        logging.info(f"User {username} successfully added to Cognito.")
    except Exception as e:
        logging.error(f"Error adding user {username} to Cognito: {e}")

def delete_users(request):
    data = json.loads(request.body)
    user_ids = data['ids']
    try:
        with transaction.atomic():
            for user_id in user_ids:
                user = User.objects.filter(id=user_id).first()
                if not user:
                    raise ValueError(f"No user found with ID {user_id}")

                try:
                    cognito_client.admin_delete_user(
                        UserPoolId=settings.COGNITO_USER_POOL_ID,
                        Username=user.username.lower()  # Normalize username for Cognito
                    )
                except cognito_client.exceptions.UserNotFoundException:
                    logger.warning(f"User {user.username} not found in Cognito — continuing.")

                user.delete()

            messages.success(request, 'All selected Users deleted successfully.')
            return JsonResponse({
                'status': 'success',
                'redirect_url': '/admin/users/',
                'message': 'All selected users deleted successfully'
            })

    except ValueError as e:
        logger.error(f"Deletion error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)
    
def delete_courses(request):
    data = json.loads(request.body)
    course_ids = data['ids']
    try:
        with transaction.atomic():
            for course_id in course_ids:
                course = Course.objects.filter(id=course_id)
                if not course.exists():
                    raise ValueError(f"No course found with ID {course_id}")
                course.delete()
            messages.success(request, 'All selected Courses deleted successfully.')
            return JsonResponse({
                'status': 'success',
                'redirect_url': '/admin/courses/',
                'message': 'All selected courses deleted successfully'
            })
    except ValueError as e:
        logger.error(f"Deletion error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)
    
def create_allowed_id_photo(request):
    try:
        data = json.loads(request.body)
        name = data.get('name')

        if name:
            allowedPhoto = AllowedIdPhotos.objects.create(name=name)

            # Get the current organization settings (this assumes there's one or use a filter for your use case)
            settings = OrganizationSettings.objects.first()
            if settings:
                settings.allowed_id_photos.add(allowedPhoto)
                settings.save()

            return JsonResponse({'id': allowedPhoto.id, 'name': allowedPhoto.name}, status=201)
        else:
            return JsonResponse({'error': 'Name is missing'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
def get_allowed_id_photos(request):
    try:
        settings = OrganizationSettings.objects.first()
        if settings:
            disapprovals = settings.allowed_id_photos.order_by('id').values('id', 'name')
            return JsonResponse(list(disapprovals), safe=False)
        else:
            return JsonResponse({'error': 'Organization not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
def edit_allowed_id_photos(request):
    if request.method == 'POST':
        try:
            photo_id = request.POST.get('id')
            new_name = request.POST.get('name')
            
            allowedPhoto = AllowedIdPhotos.objects.get(id=photo_id)
            allowedPhoto.name = new_name
            allowedPhoto.save()
            
            return JsonResponse({'status': 'success', 'msg': 'Updated successfully'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'msg': str(e)})
        
def delete_allowed_id_photos(request):
    if request.method == 'POST':
        try:
            reasoning_id = request.POST.get('id')
            reasoning = AllowedIdPhotos.objects.get(id=reasoning_id)
            reasoning.delete()
            return JsonResponse({'status': 'success', 'msg': 'Deleted successfully'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'msg': str(e)})
        
@login_required
def usercourse_detail_view(request, uuid):
    user_course = get_object_or_404(UserCourse, uuid=uuid)

    # Pull module/lesson progresses efficiently and annotate each ULP with its quiz_attempts_count
    module_progresses = (
        user_course.module_progresses
        .select_related('module')
        .prefetch_related(
            Prefetch(
                'lesson_progresses',
                queryset=UserLessonProgress.objects
                    .select_related('lesson')
                    .annotate(quiz_attempts_count=Count('quiz_attempts'))
                    .order_by('order')
            )
        )
    )

    # Rebuild lesson_sessions_map (unchanged behavior)
    lesson_sessions_map = {}
    for module_progress in module_progresses:
        for lp in module_progress.lesson_progresses.all():
            sessions = LessonSession.objects.filter(
                lesson=lp.lesson,
                user=user_course.user
            )
            lesson_sessions_map[lp.id] = sessions

    # ➤ Build a fast lookup for quiz attempts count per ULP id
    quiz_attempts_map = {
        lp.id: lp.quiz_attempts_count
        for mp in module_progresses
        for lp in mp.lesson_progresses.all()
    }

    # ➤ Total time spent (unchanged)
    scorm_sessions = SCORMTrackingData.objects.filter(
        user=user_course.user,
        lesson__module__course=user_course.course
    )

    total_time = timedelta()
    for session in scorm_sessions:
        total_time += parse_iso_duration(session.session_time)

    if total_time.total_seconds() == 0:
        formatted_total_time = "No Activity"
    else:
        total_hours, remainder = divmod(total_time.total_seconds(), 3600)
        total_minutes, total_seconds = divmod(remainder, 60)
        if total_hours > 0:
            formatted_total_time = f"{int(total_hours)}h {int(total_minutes)}m {int(total_seconds)}s"
        else:
            formatted_total_time = f"{int(total_minutes)}m {int(total_seconds)}s"

    return render(request, 'userCourse/user_course_details.html', {
        'user_course': user_course,
        'lesson_sessions_map': lesson_sessions_map,
        'quiz_attempts_map': quiz_attempts_map,   # ➤ pass to template
        'total_time_spent': formatted_total_time,
    })

def edit_usercourse_detail_view(request, uuid):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_course = get_object_or_404(UserCourse, uuid=uuid)

        user_course.progress = data.get('progress', user_course.progress)
        user_course.stored_progress = data.get('storedProgress', user_course.stored_progress)
        user_course.is_course_completed = data.get('is_course_completed', user_course.is_course_completed)

        # Expiration Date & Time
        expiration_event = user_course.course.event_dates.filter(type='expiration_date').first()
        if expiration_event:
            expires_on_date = data.get('expires_on_date', '').strip()
            expires_on_time = data.get('expires_on_time', '').strip()

            if expires_on_date:
                try:
                    expiration_event.date = datetime.strptime(expires_on_date, '%Y-%m-%d').date()
                except ValueError:
                    pass
            else:
                expiration_event.date = None

            if expires_on_time:
                try:
                    expiration_event.time = datetime.strptime(expires_on_time, '%I:%M %p').time()
                except ValueError:
                    pass
            else:
                expiration_event.time = None

            expiration_event.save()

        # Due Date & Time
        due_event = user_course.course.event_dates.filter(type='due_date').first()
        if due_event:
            due_on_date = data.get('due_on_date', '').strip()
            due_on_time = data.get('due_on_time', '').strip()

            if due_on_date:
                try:
                    due_event.date = datetime.strptime(due_on_date, '%Y-%m-%d').date()
                except ValueError:
                    pass
            else:
                due_event.date = None

            if due_on_time:
                try:
                    due_event.time = datetime.strptime(due_on_time, '%I:%M %p').time()
                except ValueError:
                    pass
            else:
                due_event.time = None

            due_event.save()

        # Completed Date & Time
        completed_on_date = data.get('completed_on_date', '').strip()
        completed_on_time = data.get('completed_on_time', '').strip()

        if completed_on_date:
            try:
                user_course.completed_on_date = datetime.strptime(completed_on_date, '%Y-%m-%d').date()
            except ValueError:
                pass
        else:
            user_course.completed_on_date = None

        if completed_on_time:
            try:
                user_course.completed_on_time = datetime.strptime(completed_on_time, '%I:%M %p').time()
            except ValueError:
                pass
        else:
            user_course.completed_on_time = None

        user_course.save()

        messages.success(request, 'Course progress updated successfully.')
        return JsonResponse({'success': True, 'message': 'Course progress updated successfully'})

    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

@login_required
def reset_lesson_progress(request, user_lesson_progress_id):
    lp = get_object_or_404(UserLessonProgress, id=user_lesson_progress_id)
    user = lp.user_module_progress.user_course.user
    lesson = lp.lesson
    user_course = lp.user_module_progress.user_course

    # (Optional) authorize: staff or owner
    if not request.user.is_staff and request.user.id != user.id:
        return JsonResponse({'success': False, 'error': 'Forbidden'}, status=403)

    with transaction.atomic():
        # Reset the per-lesson progress row
        lp.attempts = 0
        lp.completed = False
        lp.completed_on_date = None
        lp.completed_on_time = None
        lp.completion_status = 'incomplete'
        lp.save()

        # Delete all LessonSession rows for this user+lesson
        sessions_qs = LessonSession.objects.filter(user=user, lesson=lesson)
        sessions_deleted_count, _ = sessions_qs.delete()

        # Delete SCORMTrackingData row for this user+lesson
        scorm_qs = SCORMTrackingData.objects.filter(user=user, lesson=lesson)
        scorm_deleted_count, _ = scorm_qs.delete()

        # Delete mini-lesson progress rows (LessonProgress)
        mini_qs = LessonProgress.objects.filter(user=user, lesson=lesson)
        mini_deleted_count, _ = mini_qs.delete()

        # Delete quiz answers for this user+lesson (so attempts truly reset)
        qr_qs = QuizResponse.objects.filter(user=user, lesson=lesson)
        quiz_responses_deleted_count, _ = qr_qs.delete()

        try:
            current_sid = request.session.get("current_lesson_session_id")
            if current_sid:
                # If you need to verify it belongs to this lesson, you could fetch by session_id.
                # We simply clear it to avoid reusing a deleted session.
                del request.session["current_lesson_session_id"]
        except Exception:
            pass

        # Optional: recompute course progress after reset
        try:
            user_course.update_progress()
        except Exception:
            # Not fatal for the reset; UI will recompute soon anyway
            pass

    messages.success(request, 'Lesson progress reset.')
    return JsonResponse({
        'success': True,
        'message': 'Lesson activity reset.',
        'sessions_deleted': sessions_deleted_count,
        'scorm_data_deleted': scorm_deleted_count,
        'mini_progress_deleted': mini_deleted_count,
        'quiz_responses_deleted': quiz_responses_deleted_count,
    })

def edit_lesson_progress(request, user_lesson_progress_id):
    data = json.loads(request.body)
    lesson_progress = get_object_or_404(UserLessonProgress, id=user_lesson_progress_id)
    user = lesson_progress.user_module_progress.user_course.user
    lesson = lesson_progress.lesson

    # Toggle completion state
    completed = data.get('completed', lesson_progress.completed)
    lesson_progress.completed = completed

    # Parse date and time
    completed_on_date = data.get('completed_on_date', '').strip()
    completed_on_time = data.get('completed_on_time', '').strip()

    if completed_on_date:
        try:
            lesson_progress.completed_on_date = datetime.strptime(completed_on_date, '%Y-%m-%d').date()
        except ValueError:
            lesson_progress.completed_on_date = None
    else:
        lesson_progress.completed_on_date = None

    if completed_on_time:
        try:
            lesson_progress.completed_on_time = datetime.strptime(completed_on_time, '%I:%M %p').time()
        except ValueError:
            lesson_progress.completed_on_time = None
    else:
        lesson_progress.completed_on_time = None

    lesson_progress.save()

    # --- Sync with SCORMTrackingData ---
    scorm_tracking, created = SCORMTrackingData.objects.get_or_create(user=user, lesson=lesson)
    if completed:
        scorm_tracking.completion_status = 'completed'
        scorm_tracking.progress = 1.0
    else:
        scorm_tracking.completion_status = 'incomplete'
        scorm_tracking.progress = 0.0

    scorm_tracking.last_updated = now()
    scorm_tracking.save()

    return JsonResponse({'success': True, 'message': 'Lesson Activity updated successfully.'})

@login_required
def fetch_lesson_progress(request, user_lesson_progress_id):
    lp = get_object_or_404(UserLessonProgress, id=user_lesson_progress_id)

    # Optional permission guard (owner or staff)
    owner = lp.user_module_progress.user_course.user

    data = model_to_dict(lp)

    # ✅ attempts = number of LessonSession rows for this user + this lesson
    attempts = LessonSession.objects.filter(
        user=owner,
        lesson=lp.lesson
    ).count()
    data['attempts'] = attempts

    # If your UI expects these keys, ensure they’re present
    data.setdefault('completed', bool(lp.completed))
    if getattr(lp, 'completed_on_date', None):
        data['completed_on_date'] = lp.completed_on_date.isoformat()
    else:
        data['completed_on_date'] = ''
    if getattr(lp, 'completed_on_time', None):
        data['completed_on_time'] = lp.completed_on_time.strftime('%H:%M')
    else:
        data['completed_on_time'] = ''

    return JsonResponse({'success': True, 'data': data})

@login_required
def fetch_quiz_attempts_for_lesson(request, ulp_id):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    ulp = get_object_or_404(
        UserLessonProgress.objects.select_related(
            'user_module_progress__user_course__user',
            'lesson__module__course__category',
            'lesson__quiz_config'
        ),
        id=ulp_id
    )

    attempts_qs = QuizAttempt.objects.filter(
        user_lesson_progress=ulp
    ).order_by('-started_at')

    # Count new statuses; include legacy strings for safety
    agg = attempts_qs.aggregate(
        attempt_count=Count('id'),
        avg_score=Avg('score_percent', filter=Q(score_percent__isnull=False)),
        best_score=Max('score_percent', filter=Q(score_percent__isnull=False)),
        worst_score=Min('score_percent', filter=Q(score_percent__isnull=False)),
        last_started=Max('started_at'),
        last_finished=Max('finished_at'),

        active_count = Count('id', filter=Q(status__in=['active'])),
        pending_count = Count('id', filter=Q(status__in=['pending'])),
        passed_count  = Count('id', filter=Q(status__in=['passed', 'completed'])),   # legacy -> passed
        failed_count  = Count('id', filter=Q(status__in=['failed', 'abandoned'])),   # legacy -> failed
    )

    last_session = agg.get('last_finished') or agg.get('last_started')
    avg_val = agg.get('avg_score')

    created_from_map = {
        'create_quiz_from1': 'Quiz Template',
        'create_quiz_from2': 'Quiz',
    }

    lesson = ulp.lesson
    qc = getattr(lesson, 'quiz_config', None)
    course = lesson.module.course
    course_type = getattr(course, 'type', None)
    category_name = getattr(getattr(course, 'category', None), 'name', None)

    data = {
        'lesson': {
            'id': lesson.id,
            'title': lesson.title,
            'content_type': lesson.content_type,
            'created_from': created_from_map.get(lesson.create_quiz_from),
            'selected_quiz_template_name': lesson.selected_quiz_template_name,
            'selected_quiz_name': lesson.selected_quiz_name,
            'module_title': lesson.module.title,
            'course_title': course.title if course else None,
            'category': category_name,
        },
        'quiz_config': {
            'passing_score': qc.passing_score if qc else None,
            'quiz_type': qc.quiz_type if qc else None,
            'require_passing': qc.require_passing if qc else False,
            'quiz_duration': qc.quiz_duration if qc else None,
            'quiz_attempts': qc.quiz_attempts if qc else None,
            'maximum_warnings': qc.maximum_warnings if qc else None,
            'randomize_order': qc.randomize_order if qc else False,
            'reveal_answers': qc.reveal_answers if qc else False,
        },
        'stats': {
            'attempt_count': agg.get('attempt_count', 0),
            'avg_score': round(avg_val) if avg_val is not None else None,
            'best_score': agg.get('best_score'),
            'worst_score': agg.get('worst_score'),
            'active_count': agg.get('active_count', 0),
            'pending_count': agg.get('pending_count', 0),
            'passed_count':  agg.get('passed_count', 0),
            'failed_count':  agg.get('failed_count', 0),
            'last_session': last_session.isoformat() if last_session else None,

            'completed_count': agg.get('passed_count', 0),
            'abandoned_count': agg.get('failed_count', 0),
        },
        'attempts': [
            {
                'id': a.id,
                'attempt_uuid': str(a.attempt_id),
                'status': a.status,                          # now 'active'|'pending'|'passed'|'failed'
                'started_at': a.started_at.isoformat(),
                'finished_at': a.finished_at.isoformat() if a.finished_at else None,
                'last_position': a.last_position,
                'total_questions': a.total_questions,
                'score_percent': a.score_percent,
                'passed': a.passed,
            }
            for a in attempts_qs
        ],
        'course_type': course_type,
    }

    return JsonResponse({'success': True, 'data': data})

def _safe_json(val):
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val or "")
    except Exception:
        return val

def _latest_responses_by_qid(attempt):
    qs = (QuizResponse.objects
          .filter(quiz_attempt=attempt)
          .select_related('question')
          .order_by('question_id', '-submitted_at', '-id'))
    latest = {}
    for r in qs:
        if r.question_id not in latest:
            latest[r.question_id] = r
    return latest

def _canonical_question_ids(lesson):
    if getattr(lesson, 'quiz_id', None):
        return list(
            QuestionOrder.objects
            .filter(quiz_id=lesson.quiz_id)
            .order_by('order')
            .values_list('question_id', flat=True)
        )
    return []

def _attempt_qids(attempt, lesson):
    """IDs that should be scored for THIS attempt."""
    if attempt.question_order:
        qids = list(attempt.question_order)
        qlog("attempt_qids:question_order",
             attempt_id=attempt.id, len=len(qids), sample=qids[:10])
        return qids

    latest = _latest_responses_by_qid(attempt)
    answered = sorted(
        latest.values(),
        key=lambda r: (
            999999 if getattr(r, 'seen_index', None) is None else r.seen_index,
            r.submitted_at, r.id
        )
    )
    qids = [r.question_id for r in answered]
    total = getattr(attempt, 'total_questions', None)

    if total and len(qids) < total:
        canon = _canonical_question_ids(lesson)
        added = []
        for qid in canon:
            if len(qids) >= total:
                break
            if qid not in qids:
                qids.append(qid)
                added.append(qid)
        qlog("attempt_qids:padded",
             attempt_id=attempt.id, have=len(answered), total=total,
             added=added[:10], final_len=len(qids))
    else:
        qlog("attempt_qids:derived",
             attempt_id=attempt.id, len=len(qids), sample=qids[:10], total=total)

    return qids

def _compute_attempt_score_and_status(attempt):
    lesson = attempt.user_lesson_progress.lesson
    qids   = _attempt_qids(attempt, lesson)
    latest = _latest_responses_by_qid(attempt)

    qmap = {q.id: q for q in Question.objects
                             .filter(id__in=qids)
                             .select_related('essayquestion')}

    points_scored = 0.0
    points_possible = 0.0
    pending_essays = False

    qlog("compute:start", attempt_id=attempt.id, qids_len=len(qids), qids_sample=qids[:10])

    for qid in qids:
        r = latest.get(qid)
        q = qmap.get(qid)

        # No response: count as 0/1
        if not r:
            points_possible += 1
            qlog("compute:no_response", qid=qid,
                 running_scored=points_scored, running_possible=points_possible)
            continue

        is_essay = hasattr(q, 'essayquestion')

        if is_essay:
            # === Equal weight for essays: 0/1 by overall correctness ===
            points_possible += 1
            if r.is_correct is None:
                pending_essays = True
                qlog("compute:essay_pending", qid=qid,
                     running_scored=points_scored, running_possible=points_possible)
            else:
                add = 1 if (r.is_correct is True) else 0
                points_scored += add
                qlog("compute:essay_binary", qid=qid, is_correct=r.is_correct,
                     add_scored=add, add_possible=1,
                     running_scored=points_scored, running_possible=points_possible)
        else:
            # Non-essay: 0/1 unless explicit points exist (and are sane)
            if r.max_points is not None and r.score_points is not None:
                maxp = int(r.max_points or 0)
                scp  = int(r.score_points or 0)
                if maxp <= 0:
                    points_possible += 1
                    add = 1 if (r.is_correct is True) else 0
                    points_scored += add
                    qlog("compute:row_zero_max", qid=qid,
                         is_correct=r.is_correct, add_scored=add, add_possible=1,
                         running_scored=points_scored, running_possible=points_possible)
                else:
                    points_possible += maxp
                    inc_scored = min(maxp, max(0, scp))
                    points_scored += inc_scored
                    qlog("compute:row_points", qid=qid,
                         is_correct=r.is_correct, score_points=r.score_points,
                         max_points=r.max_points, add_scored=inc_scored, add_possible=maxp,
                         running_scored=points_scored, running_possible=points_possible)
            else:
                points_possible += 1
                add = 1 if (r.is_correct is True) else 0
                points_scored += add
                qlog("compute:row_binary", qid=qid,
                     is_correct=r.is_correct, add_scored=add, add_possible=1,
                     running_scored=points_scored, running_possible=points_possible)

    percent = int(round(100.0 * points_scored / points_possible)) if points_possible > 0 else 0

    # passing threshold logic unchanged...
    passing = 70
    qc = getattr(lesson, 'quiz_config', None)
    if qc and qc.passing_score is not None:
        passing = int(qc.passing_score)
    else:
        quiz = Quiz.objects.filter(id=getattr(lesson, 'quiz_id', None)).first()
        if quiz and quiz.pass_mark is not None:
            passing = int(quiz.pass_mark)

    passed_bool = (percent >= passing)

    qlog("compute:end", attempt_id=attempt.id,
         points_scored=points_scored, points_possible=points_possible,
         percent=percent, passing_threshold=passing,
         passed=passed_bool, pending_essays=pending_essays)

    return points_scored, points_possible, pending_essays, percent, passed_bool

def _finalize_attempt_if_ready(attempt):
    qlog("finalize:start", attempt_id=attempt.id, prev_status=attempt.status,
         prev_percent=attempt.score_percent, finished_at=attempt.finished_at)

    ps, pp, pending_essays, percent, passed = _compute_attempt_score_and_status(attempt)

    if pending_essays:
        if attempt.status != QuizAttempt.Status.PENDING:
            attempt.status = QuizAttempt.Status.PENDING
            attempt.save(update_fields=['status'])
        qlog("finalize:pending", attempt_id=attempt.id,
             ps=ps, pp=pp, percent=percent, status=attempt.status)
        return False

    attempt.score_percent = percent
    attempt.passed        = passed
    attempt.status        = QuizAttempt.Status.PASSED if passed else QuizAttempt.Status.FAILED
    if not attempt.finished_at:
        attempt.finished_at = timezone.now()
    attempt.save(update_fields=['score_percent','passed','status','finished_at'])

    qlog("finalize:done", attempt_id=attempt.id,
         score_percent=attempt.score_percent, status=attempt.status,
         passed=attempt.passed, finished_at=attempt.finished_at)
    return True

def _sync_lesson_status_from_attempt(attempt):
    """
    Update the UserLessonProgress based on the current attempt.status.
    active   -> incomplete
    pending  -> pending
    passed   -> passed  (+ completed=True)
    failed   -> failed  (+ completed=True if require_passing is False)
    """
    ulp = attempt.user_lesson_progress
    lesson = ulp.lesson

    # Default mapping
    status_map = {
        QuizAttempt.Status.ACTIVE:  'incomplete',
        QuizAttempt.Status.PENDING: 'pending',
        QuizAttempt.Status.PASSED:  'passed',
        QuizAttempt.Status.FAILED:  'failed',
    }
    new_status = status_map.get(attempt.status, 'incomplete')

    # Determine completion semantics
    require_passing = False
    qc = getattr(lesson, 'quiz_config', None)
    if qc is not None:
        require_passing = bool(getattr(qc, 'require_passing', False))

    mark_completed = False
    if attempt.status == QuizAttempt.Status.PASSED:
        mark_completed = True
    elif attempt.status == QuizAttempt.Status.FAILED and not require_passing:
        # If passing is not required, "finished" (failed) can still complete the lesson
        mark_completed = True

    fields = []

    # Update completion_status if changed
    if ulp.completion_status != new_status:
        ulp.completion_status = new_status
        fields.append('completion_status')

    # Mark completed (only upgrade; don't downgrade)
    if mark_completed and not ulp.completed:
        ulp.completed = True
        fields.append('completed')
        now = timezone.now()
        if not ulp.completed_on_date:
            ulp.completed_on_date = now.date()
            fields.append('completed_on_date')
        if not ulp.completed_on_time:
            ulp.completed_on_time = now.time()
            fields.append('completed_on_time')

    # Persist only when something changed
    if fields:
        ulp.save(update_fields=fields)

    # Debug
    qlog("lesson_sync",
         attempt_id=attempt.id,
         attempt_status=attempt.status,
         ulp_id=ulp.id,
         new_status=new_status,
         require_passing=require_passing,
         marked_completed=mark_completed,
         saved_fields=fields)

@login_required
def grade_essay_question(request, attempt_id, question_id):
    attempt = get_object_or_404(
        QuizAttempt.objects.select_related(
            'user_lesson_progress__lesson',
            'user_lesson_progress__user_module_progress__user_course__user'
        ),
        id=attempt_id
    )

    role = getattr(getattr(request.user, 'profile', None), 'role', None)
    if role not in ('Admin', 'Instructor'):
        return JsonResponse({'success': False, 'error': 'Forbidden'}, status=403)

    question = get_object_or_404(
        Question.objects.select_related('essayquestion'),
        id=question_id
    )
    if not hasattr(question, 'essayquestion'):
        return JsonResponse({'success': False, 'error': 'Not an Essay question'}, status=400)

    latest = _latest_responses_by_qid(attempt)
    response = latest.get(question.id)
    if not response:
        return JsonResponse({'success': False, 'error': 'No response to grade for this question'}, status=400)

    try:
        payload = json.loads(request.body or "{}")
    except Exception:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    eq = question.essayquestion
    prompts_qs = list(eq.prompts.all().order_by('order'))
    has_prompts = len(prompts_qs) > 0

    qlog("grade:start", attempt_id=attempt.id, question_id=question.id,
         has_prompts=has_prompts, payload=payload)

    if has_prompts:
        marks = payload.get('prompt_marks') or []
        pmap = {str(p.id): p for p in prompts_qs}

        if not isinstance(marks, list) or not marks:
            return JsonResponse({'success': False, 'error': 'prompt_marks required'}, status=400)

        for m in marks:
            pid = str(m.get('prompt_id'))
            if pid not in pmap:
                return JsonResponse({'success': False, 'error': f'Invalid prompt_id {pid}'}, status=400)

            is_correct = m.get('is_correct', None)
            score      = int(m.get('score', 0) or 0)
            maxp       = int(m.get('max', 1) or 1)
            feedback   = m.get('feedback') or None

            EssayPromptGrade.objects.update_or_create(
                response=response, prompt_id=pid,
                defaults={
                    'is_correct': is_correct,
                    'score_points': score,
                    'max_points': maxp,
                    'feedback': feedback
                }
            )
            qlog("grade:prompt_upsert", attempt_id=attempt.id, question_id=question.id,
                 prompt_id=pid, is_correct=is_correct, score=score, max=maxp)

        prompt_grades = list(EssayPromptGrade.objects.filter(response=response, prompt__in=prompts_qs))

        if len(prompt_grades) < len(prompts_qs) or any(pg.is_correct is None for pg in prompt_grades):
            total_score = sum(pg.score_points or 0 for pg in prompt_grades)
            total_max   = sum(pg.max_points  or 0 for pg in prompt_grades)
            response.is_correct  = None
            response.score_points = total_score
            response.max_points   = total_max
            response.save(update_fields=['is_correct','score_points','max_points'])
            qlog("grade:pending_question", question_id=question.id,
                 score_points=total_score, max_points=total_max)
        else:
            all_true   = all(pg.is_correct is True for pg in prompt_grades)
            total_score = sum(pg.score_points or 0 for pg in prompt_grades)
            total_max   = sum(pg.max_points  or 0 for pg in prompt_grades)
            response.is_correct  = True if all_true else False
            response.score_points = total_score
            response.max_points   = total_max
            response.save(update_fields=['is_correct','score_points','max_points'])
            qlog("grade:final_question", question_id=question.id,
                 is_correct=response.is_correct,
                 score_points=total_score, max_points=total_max)
    else:
        overall = payload.get('overall') or {}
        is_correct = overall.get('is_correct', None)
        score      = int(overall.get('score', 0) or 0)
        maxp       = int(overall.get('max', 1) or 1)
        if is_correct is None:
            return JsonResponse({'success': False, 'error': 'overall.is_correct required'}, status=400)

        response.is_correct  = bool(is_correct)
        response.score_points = score
        response.max_points   = maxp
        response.save(update_fields=['is_correct','score_points','max_points'])
        qlog("grade:single_saved", question_id=question.id,
             is_correct=response.is_correct, score_points=score, max_points=maxp)

    finalized = _finalize_attempt_if_ready(attempt)
    _sync_lesson_status_from_attempt(attempt)

    qlog("grade:finalize_result", attempt_id=attempt.id,
        finalized=finalized, status=attempt.status, score_percent=attempt.score_percent)

    return JsonResponse({
        'success': True,
        'data': {
            'question_id': question.id,
            'is_correct': response.is_correct,
            'score_points': response.score_points,
            'max_points': response.max_points,
            'attempt': {
                'id': attempt.id,
                'status': attempt.status,
                'score_percent': attempt.score_percent,
                'passed': attempt.passed,
                'finalized': finalized,
            }
        }
    })

def _qtype(q):
    if hasattr(q, 'tfquestion'):    return 'TF'
    if hasattr(q, 'fitbquestion'):  return 'FITB'
    if hasattr(q, 'essayquestion'): return 'ESSAY'
    if hasattr(q, 'mcquestion'):    return 'MC'  # MR handled by allows_multiple
    return 'MC'

def _parse_user_answer(user_answer):
    """
    Return a normalized representation of the stored answer:
      - For lists: set of stringified items (IDs) OR the list of dicts for essay prompts
      - For dicts: FITB {text: "..."} -> {'...'}
      - For booleans: {'true'} or {'false'}  (lower-case!)
      - For scalars: {'<string>'}
    """
    try:
        ua = json.loads(user_answer)
    except Exception:
        if user_answer is None:
            return set()
        s = str(user_answer).strip()
        if s.lower() in ('true', 'false'):
            return {s.lower()}
        return {s}

    if isinstance(ua, bool):
        # normalize TF to lower-case tokens
        return {'true' if ua else 'false'}

    if isinstance(ua, list):
        # essay [{prompt_id,text}, ...] OR list of IDs
        if ua and isinstance(ua[0], dict) and 'prompt_id' in ua[0]:
            return ua
        return {str(x) for x in ua if x is not None}

    if isinstance(ua, dict):
        # FITB payload
        if 'text' in ua:
            return {str(ua.get('text', ''))}
        return {json.dumps(ua)}

    return {str(ua)}

def _essay_answers_from_response(question, parsed):
    """
    Build [{'id','prompt_text','rubric','answer_text'}, ...] from the *parsed*
    QuizResponse.user_answer. Handles both:
      • multi-prompt: list of {prompt_id,text}
      • single-prompt: raw string/one value (stored as a set by _parse_user_answer)
    We do NOT read EssayAnswer rows to avoid cross-attempt bleed.
    """
    eq = getattr(question, 'essayquestion', None)
    if not eq:
        return []

    prompts = list(eq.prompts.all().order_by('order'))
    pmap = {str(p.id): p for p in prompts}
    out, used = [], set()

    # Case A: multi-prompt payload [{prompt_id, text}, ...]
    if isinstance(parsed, list):
        for item in parsed:
            if not isinstance(item, dict):
                continue
            pid = str(item.get('prompt_id', '')).strip()
            txt = (item.get('text') or '').strip()
            p = pmap.get(pid)
            if p:
                out.append({
                    'id': pid,
                    'prompt_text': p.prompt_text,
                    'rubric': p.rubric,
                    'answer_text': txt,
                })
                used.add(pid)

    # Case B: single-prompt essay where _parse_user_answer returned a set({text})
    # or a direct string (very defensive)
    if not out:
        single_text = None
        if isinstance(parsed, (set, tuple, list)) and parsed:
            single_text = str(next(iter(parsed)) or '')
        elif isinstance(parsed, str):
            single_text = parsed

        if single_text is not None and len(prompts) == 1:
            p = prompts[0]
            out.append({
                'id': str(p.id),
                'prompt_text': p.prompt_text,
                'rubric': p.rubric,
                'answer_text': single_text.strip(),
            })
            used.add(str(p.id))

    # Ensure every prompt appears once
    for p in prompts:
        if str(p.id) not in used:
            out.append({
                'id': str(p.id),
                'prompt_text': p.prompt_text,
                'rubric': p.rubric,
                'answer_text': '',
            })

    return out

def _answered_flag(resp, eff_type):
    """
    True if the student submitted *something* for this question, else False.
    eff_type: 'MC'|'MR'|'TF'|'FITB'|'ESSAY'
    """
    if not resp:
        return False

    ua = _parse_user_answer(resp.user_answer)

    # MC/MR/TF → any choice selected counts
    if eff_type in ('MC', 'MR', 'TF'):
        if isinstance(ua, (list, tuple, set)):
            # a non-empty list of choice ids/labels
            return any(str(x).strip() for x in ua)
        if isinstance(ua, (bool, int, float)):
            # a concrete boolean or numeric answer id
            return True
        return bool(str(ua).strip())  # e.g. "true", "false", "42"

    # FITB → any non-empty text
    if eff_type == 'FITB':
        if isinstance(ua, dict):
            return bool(str(ua.get('text', '')).strip())
        return bool(str(ua).strip())

    # ESSAY → at least one non-empty text item
    if eff_type == 'ESSAY':
        if isinstance(ua, list):
            for item in ua:
                if isinstance(item, dict):
                    if str(item.get('text', '')).strip():
                        return True
                else:
                    if str(item).strip():
                        return True
            return False
        return bool(str(ua).strip())

    # Fallback
    return bool(str(ua).strip()) if ua is not None else False

def _has_nonempty_text(parsed):
    """
    Return True if 'parsed' contains any non-empty text.
    Handles str, list/tuple/set (strings or dicts with 'text'), and dict {text:...}.
    """
    if parsed is None:
        return False

    # dict: FITB-style or generic
    if isinstance(parsed, dict):
        return bool(str(parsed.get('text', '')).strip())

    # list/tuple/set:
    if isinstance(parsed, (list, tuple, set)):
        for x in parsed:
            if isinstance(x, dict):
                if str(x.get('text', '')).strip():
                    return True
            else:
                if str(x).strip():
                    return True
        return False

    # everything else → str
    return bool(str(parsed).strip())

@login_required
def fetch_quiz_attempt_qandas(request, attempt_id):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    attempt = get_object_or_404(
        QuizAttempt.objects.select_related(
            'user_lesson_progress__lesson',
            'user_lesson_progress__user_module_progress__user_course__user'
        ),
        id=attempt_id
    )

    owner = attempt.user_lesson_progress.user_module_progress.user_course.user
    if not (request.user.is_staff or request.user == owner):
        return JsonResponse({'success': False, 'error': 'Forbidden'}, status=403)

    lesson = attempt.user_lesson_progress.lesson

    # latest response per question
    responses = (
        QuizResponse.objects
        .filter(quiz_attempt=attempt)
        .select_related('question')
        .order_by('question_id', '-submitted_at', '-id')
    )

    latest_by_qid = {}
    for r in responses:
        if r.question_id not in latest_by_qid:
            latest_by_qid[r.question_id] = r

    # preserve order (attempt.question_order first; otherwise by seen_index/submitted)
    if attempt.question_order:
        order_ids = list(attempt.question_order)
    else:
        answered = sorted(
            latest_by_qid.values(),
            key=lambda r: (
                999999 if getattr(r, 'seen_index', None) is None else r.seen_index,
                r.submitted_at, r.id
            )
        )
        order_ids = [r.question_id for r in answered]
        if getattr(lesson, 'quiz_id', None):
            canonical = list(
                QuestionOrder.objects
                .filter(quiz_id=lesson.quiz_id)
                .order_by('order')
                .values_list('question_id', flat=True)
            )
            for qid in canonical:
                if qid not in order_ids:
                    order_ids.append(qid)

    # questions + related
    qs = (
        Question.objects
        .filter(id__in=order_ids)
        .select_related('tfquestion', 'fitbquestion', 'essayquestion', 'mcquestion')
        .prefetch_related(
            'answers',
            'media_items',
            'essayquestion__prompts',
            'fitbquestion__acceptable_answers'
        )
    )
    qmap = {q.id: q for q in qs}

    # quiz metadata
    quiz = None
    references, materials = [], []
    category = None
    if getattr(lesson, 'quiz_id', None):
        quiz = (
            Quiz.objects
            .select_related('category')
            .filter(id=lesson.quiz_id)
            .first()
        )
        if quiz:
            references = list(quiz.references.all().order_by('id'))
            if quiz.quiz_material:
                for part in re.split(r'[,;\n]+', quiz.quiz_material):
                    txt = (part or '').strip()
                    if txt:
                        materials.append({'text': txt})
            category = quiz.category.name if quiz.category_id else None

    items = []
    for idx, qid in enumerate(order_ids, start=1):
        q = qmap.get(qid)
        if not q:
            continue
        resp = latest_by_qid.get(qid)

        base_t   = _qtype(q)  # 'TF'|'FITB'|'ESSAY'|'MC'
        eff_type = 'MR' if (base_t == 'MC' and bool(getattr(q, 'allows_multiple', False))) else base_t

        # --- normalize selection / essay payload consistently ---
        selected = set()
        essay_payload = None
        parsed = None

        if resp:
            parsed = _parse_user_answer(resp.user_answer)

        if eff_type == 'ESSAY':
            # If prompts exist, build attempt-isolated answers from parsed
            eq = getattr(q, 'essayquestion', None)
            has_prompts = bool(eq and eq.prompts.exists())

            if has_prompts:
                essay_payload = _essay_answers_from_response(q, parsed)

                # Attach per-prompt grades (prefill for grader UI)
                if essay_payload:
                    prompt_ids = [str(p['id']) for p in essay_payload if 'id' in p]
                    if prompt_ids:
                        # Ensure EssayPromptGrade is imported in your module
                        pg_qs = EssayPromptGrade.objects.filter(response=resp, prompt_id__in=prompt_ids)
                        pg_map = {str(pg.prompt_id): pg for pg in pg_qs}
                        for p in essay_payload:
                            pid = str(p.get('id'))
                            if pid in pg_map:
                                pg = pg_map[pid]
                                p['grade_is_correct'] = pg.is_correct
                                p['grade_score'] = pg.score_points
                                p['grade_max_points'] = pg.max_points
                                p['grade_feedback'] = pg.feedback or ''
            # else: single-prompt essay → answered uses parsed text below

        else:
            # Non-essay questions keep the original selection logic
            if isinstance(parsed, set):
                selected = parsed
            elif isinstance(parsed, (list, tuple)):
                selected = {str(x) for x in parsed if x is not None}
            elif parsed is None:
                selected = set()
            else:
                selected = {str(parsed)}

        # options (MC/MR/TF)
        options = []
        if eff_type in ('MC', 'MR'):
            for a in q.answers.all():
                options.append({
                    'id': str(a.id),
                    'text': a.text,
                    'selected': str(a.id) in selected,
                    'is_correct': bool(a.is_correct),
                })
        elif eff_type == 'TF':
            # normalize selected to {'true','false'} strings
            sel_norm = {str(x).strip().lower() for x in selected}
            tfc = getattr(getattr(q, 'tfquestion', None), 'correct', None)
            options = [
                {'id': 'true',  'text': 'True',  'selected': ('true'  in sel_norm),
                 'is_correct': (True  if tfc is True  else False if tfc is False else None)},
                {'id': 'false', 'text': 'False', 'selected': ('false' in sel_norm),
                 'is_correct': (True  if tfc is False else False if tfc is True  else None)},
            ]
        # FITB and ESSAY handled below

        # correctness & answered
        correct_val = (None if (resp is None or resp.is_correct is None) else bool(resp.is_correct))

        answered = False
        if resp is not None:
            if eff_type in ('MC', 'MR', 'TF'):
                answered = bool(selected)
            elif eff_type == 'FITB':
                answered = bool(str(next(iter(selected), '')).strip())
            elif eff_type == 'ESSAY':
                # If we built per-prompt payload, use that; otherwise fall back to raw parsed text
                if essay_payload is not None and len(essay_payload) > 0:
                    answered = any((p.get('answer_text') or '').strip() for p in essay_payload)
                else:
                    answered = _has_nonempty_text(parsed)  # single-prompt essays

        # media
        media = []
        for m in q.media_items.all():
            display_url = ''
            if m.file and hasattr(m.file, 'url'):
                display_url = m.file.url
            elif m.url_from_library:
                display_url = m.url_from_library
            media.append({
                'id': m.id,
                'title': m.title or '',
                'source_type': m.source_type,   # 'upload'|'library'|'embed'
                'display_url': display_url,
                'embed_code': m.embed_code or ''
            })

        # FITB specifics
        fitb_text = ''
        fitb_acceptable = []
        fitb_case_sensitive = None
        fitb_strip_whitespace = None
        if eff_type == 'FITB':
            fitb_text = next(iter(selected), '')
            fq = getattr(q, 'fitbquestion', None)
            if fq:
                fitb_acceptable = [a.content for a in fq.acceptable_answers.all()]
                fitb_case_sensitive = bool(fq.case_sensitive)
                fitb_strip_whitespace = bool(fq.strip_whitespace)

        items.append({
            'order': idx,
            'question_id': q.id,
            'title': q.content,
            'prompt': q.content,
            'type': eff_type,                              # MC/MR/TF/FITB/ESSAY
            'allows_multiple': bool(getattr(q, 'allows_multiple', False)),
            'essay_instructions': getattr(getattr(q, 'essayquestion', None), 'instructions', None),
            'explanation': q.explanation or None,

            'correct': correct_val,
            'answered': answered,
            'response': (resp.user_answer if resp is not None else None),

            'score_points': (resp.score_points if resp is not None else None),
            'max_points':   (resp.max_points   if resp is not None else None),

            'options': options,                   # for MC/MR/TF
            'essay_prompts': essay_payload or [], # for ESSAY
            'media': media,

            # FITB extras
            'fitb_text': fitb_text,
            'fitb_acceptable': fitb_acceptable,
            'fitb_case_sensitive': fitb_case_sensitive,
            'fitb_strip_whitespace': fitb_strip_whitespace,
        })

    serialized_refs = [
        {
            'id': ref.id,
            'title': (ref.title or 'Reference'),
            'url': ref.get_file_url(),
            'source_type': ref.source_type,
            'type_from_library': (ref.type_from_library or ''),
        }
        for ref in references
    ]

    data = {
        'attempt': {
            'id': attempt.id,
            'attempt_uuid': str(attempt.attempt_id),
            'status': attempt.status,
            'score_percent': attempt.score_percent,
            'started_at': attempt.started_at.isoformat(),
            'finished_at': attempt.finished_at.isoformat() if attempt.finished_at else None,
            'lesson_title': lesson.title,
        },
        'references': serialized_refs,
        'materials': materials,
        'category': category or '',
        'items': items,
    }
    return JsonResponse({'success': True, 'data': data})

def delete_categories(request):
    data = json.loads(request.body)
    category_ids = data['ids']
    try:
        with transaction.atomic():
            for category_id in category_ids:
                category = Category.objects.filter(id=category_id)
                if not category.exists():
                    raise ValueError(f"No category found with ID {category_id}")
                category.delete()
            messages.success(request, 'All selected categories deleted successfully.')
            return JsonResponse({
                'status': 'success',
                'redirect_url': '/admin/categories/',
                'message': 'All selected categories deleted successfully'
            })
    except ValueError as e:
        logger.error(f"Deletion error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)
     
def delete_enrollment_keys(request):
    data = json.loads(request.body)
    key_ids = data['ids']
    try:
        with transaction.atomic():
            for key_id in key_ids:
                key = EnrollmentKey.objects.filter(id=key_id)
                if not key.exists():
                    raise ValueError(f"No enrollment key found with ID {key_id}")
                key.delete()
            messages.success(request, 'All selected enrollment keys deleted.')
            return JsonResponse({
                'status': 'success',
                'redirect_url': '/admin/enrollment-keys/',
                'message': 'All selected enrollment keys deleted'
            })
    except ValueError as e:
        logger.error(f"Deletion error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)
    
def delete_quizzes(request):
    data = json.loads(request.body)
    quiz_ids = data['ids']
    try:
        with transaction.atomic():
            for quiz_id in quiz_ids:
                quiz = Quiz.objects.filter(id=quiz_id)
                if not quiz.exists():
                    raise ValueError(f"No quiz found with ID {quiz_id}")
                quiz.delete()
            messages.success(request, 'All selected Quizzes deleted.')
            return JsonResponse({
                'status': 'success',
                'redirect_url': '/admin/quizzes/',
                'message': 'All selected quizzes deleted'
            })
    except ValueError as e:
        logger.error(f"Deletion error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)
    
# From Questions Table
def delete_questions(request):
    data = json.loads(request.body)
    question_ids = data['ids']
    try:
        with transaction.atomic():
            for question_id in question_ids:
                question = Question.objects.filter(id=question_id)
                if not question.exists():
                    raise ValueError(f"No question found with ID {question_id}")
                question.delete()
            messages.success(request, 'All selected Questions deleted.')
            return JsonResponse({
                'status': 'success',
                'redirect_url': '/admin/questions/',
                'message': 'All selected questions deleted'
            })
    except ValueError as e:
        logger.error(f"Deletion error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)

# From Quiz Templates Table 
def delete_quiz_templates(request):
    data = json.loads(request.body)
    quiz_ids = data['ids']
    try:
        with transaction.atomic():
            for quiz_id in quiz_ids:
                quiz = QuizTemplate.objects.filter(id=quiz_id)
                if not quiz.exists():
                    raise ValueError(f"No quiz template found with ID {quiz_id}")
                quiz.delete()
            messages.success(request, 'All selected Quiz Templates deleted.')
            return JsonResponse({
                'status': 'success',
                'redirect_url': '/admin/quiz-templates/',
                'message': 'All selected quizzes templates deleted'
            })
    except ValueError as e:
        logger.error(f"Deletion error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)
    
def delete_assignments(request):
    data = json.loads(request.body)
    assignment_ids = data['ids']
    try:
        with transaction.atomic():
            for assignment_id in assignment_ids:
                assignment = UserAssignmentProgress.objects.filter(id=assignment_id)
                if not assignment.exists():
                    raise ValueError(f"No assignment found with ID {assignment_id}")
                assignment.delete()
            messages.success(request, 'All selected assignments deleted successfully.')
            return JsonResponse({
                'status': 'success',
                'redirect_url': '/admin/assignments/',
                'message': 'All selected assignments deleted successfully'
            })
    except ValueError as e:
        logger.error(f"Deletion error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)