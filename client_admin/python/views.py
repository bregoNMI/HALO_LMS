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
from django.db.models import Q, Avg, Count
from django.test import RequestFactory
from django.http import HttpResponse, JsonResponse
import logging, csv
from authentication.python.views import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.utils.timezone import now
from django.http import HttpResponseForbidden, HttpRequest
from learner_dashboard.views import learner_dashboard
from django.contrib import messages
from client_admin.models import Profile, User, Profile, Course, User, UserCourse, UserModuleProgress, UserLessonProgress, Message, OrganizationSettings, ActivityLog, AllowedIdPhotos, EnrollmentKey
from course_player.models import LessonSession, SCORMTrackingData
from content.models import Lesson, Category, Quiz, Question, QuizTemplate
from client_admin.forms import OrganizationSettingsForm
from .forms import UserRegistrationForm, ProfileForm, CSVUploadForm
from django.contrib.auth import update_session_auth_hash, login
from authentication.python.views import addUserCognito, modifyCognito, register_view
from django.template.response import TemplateResponse
import json
from django.db import IntegrityError, transaction
from client_admin.models import GeneratedCertificate, EventDate
from django.db.models.functions import TruncMonth, TruncHour
from django.db.models import Sum
import isodate
#from models import Profile
#from authentication.python import views

cognito_client = boto3.client('cognito-idp', region_name=settings.AWS_REGION)

# Define the custom exception at the top of your views file
class ImpersonationError(Exception):
    """Custom exception for impersonation errors."""
    pass

def get_total_time_spent_dynamic():
    now_time = now()
    one_year_ago = now_time - timedelta(days=365)
    seven_days_ago = now_time - timedelta(days=7)

    # Check how much activity happened in the last 7 days
    recent_activity_count = SCORMTrackingData.objects.filter(last_updated__gte=seven_days_ago).count()

    if recent_activity_count > 20:
        # Show hour-by-hour for recent activity
        queryset = SCORMTrackingData.objects.filter(last_updated__gte=seven_days_ago) \
            .annotate(period=TruncHour('last_updated')) \
            .values('period', 'session_time') \
            .order_by('period')
        group_format = '%b %d %I%p'
    else:
        # Show month-by-month for longer-term view
        queryset = SCORMTrackingData.objects.filter(last_updated__gte=one_year_ago) \
            .annotate(period=TruncMonth('last_updated')) \
            .values('period', 'session_time') \
            .order_by('period')
        group_format = '%b %Y'

    totals = {}

    for entry in queryset:
        period = entry['period'].strftime(group_format)
        duration = isodate.parse_duration(entry['session_time'])
        if period in totals:
            totals[period] += duration
        else:
            totals[period] = duration

    labels = []
    seconds = []

    for period, duration in sorted(totals.items()):
        labels.append(period)
        seconds.append(int(duration.total_seconds()))

    return labels, seconds, 'hour' if recent_activity_count > 20 else 'month'


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

    return render(request, 'settings.html', {
        'form': form,
        'selected_course_name': selected_course_name,
        'allowed_photos': allowed_photos,
    })

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

    # Fetch messages sent by the logged-in user to the specified user
    sent_messages = Message.objects.filter(sender=request.user, recipients=user.user)

    # Fetch activity log entries related to the user
    activity_logs = ActivityLog.objects.filter(action_target=user.user)
    print('activity_logs', activity_logs)

    context = {
        'profile': user,
        'sent_messages': sent_messages,  # Pass the messages to the template
        'activity_logs': activity_logs,  # Pass the activity logs to the template
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

        if not subject or not body:
            return JsonResponse({'message': 'Subject and body are required.'}, status=400)

        # Create the message and associate it with the recipients
        sender = request.user
        message = Message.objects.create(subject=subject, body=body, sender=sender)

        # Associate the message with the selected users
        recipients = User.objects.filter(id__in=user_ids)
        message.recipients.set(recipients)
        message.save()

        messages.success(request, 'Message sent successfully.')

        return JsonResponse({'message': 'Message sent successfully', 'redirect_url': '/admin/users/'})
    else:
        return JsonResponse({'message': 'Invalid request method'}, status=400)

User = get_user_model()
logger = logging.getLogger(__name__)

@login_required
def impersonate_user(request, profile_id):
    # Ensure the user has permission to impersonate
    if request.user.is_authenticated and request.user.is_superuser:
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
    lesson_sessions_map = {}

    # Build the lesson_sessions_map as before
    for module_progress in user_course.module_progresses.all():
        for lesson_progress in module_progress.lesson_progresses.all():
            sessions = LessonSession.objects.filter(
                lesson=lesson_progress.lesson,
                user=user_course.user
            )
            lesson_sessions_map[lesson_progress.id] = sessions

    # ➤ Calculate Total Time Spent for THIS Course from SCORMTrackingData
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

def reset_lesson_progress(request, user_lesson_progress_id):
    if request.method == 'POST':
        data = json.loads(request.body)
        lesson_progress = get_object_or_404(UserLessonProgress, id=user_lesson_progress_id)

        lesson_progress.attempts = 0
        lesson_progress.completed = False
        lesson_progress.save()

        lesson = lesson_progress.lesson
        user = lesson_progress.user_module_progress.user_course.user

        sessions_to_delete = LessonSession.objects.filter(lesson=lesson, user=user)
        deleted_count, _ = sessions_to_delete.delete()

        messages.success(request, f'Lesson progress reset.')
        return JsonResponse({'success': True, 'message': f'Lesson progress reset.'})

    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

def edit_lesson_progress(request, user_lesson_progress_id):
    if request.method == 'POST':
        data = json.loads(request.body)
        lesson_progress = get_object_or_404(UserLessonProgress, id=user_lesson_progress_id)
        print(data, lesson_progress)

        lesson_progress.completed = data.get('completed', lesson_progress.completed)
            
        # Completed Date & Time
        completed_on_date = data.get('completed_on_date', '').strip()
        completed_on_time = data.get('completed_on_time', '').strip()

        if completed_on_date:
            try:
                lesson_progress.completed_on_date = datetime.strptime(completed_on_date, '%Y-%m-%d').date()
            except ValueError:
                pass
        else:
            lesson_progress.completed_on_date = None

        if completed_on_time:
            try:
                lesson_progress.completed_on_time = datetime.strptime(completed_on_time, '%I:%M %p').time()
            except ValueError:
                pass
        else:
            lesson_progress.completed_on_time = None

        lesson_progress.save()

        # messages.success(request, f'Lesson Activity updated successfully.')
        return JsonResponse({'success': True, 'message': 'Lesson Activity updated successfully.'})

    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

def fetch_lesson_progress(request, user_lesson_progress_id):
    if request.method == 'POST':
        lesson_progress = get_object_or_404(UserLessonProgress, id=user_lesson_progress_id)

        lesson_progress_data = model_to_dict(lesson_progress)

        return JsonResponse({'success': True, 'data': lesson_progress_data})

    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

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