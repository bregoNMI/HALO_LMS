from io import BytesIO
import boto3
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.shortcuts import render
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.sessions.backends.db import SessionStore
from django.contrib.auth import get_user_model
from django.core.files.base import File
from django.db.models import Q
from django.test import RequestFactory
from django.http import HttpResponse, JsonResponse
import logging, csv
from authentication.python.views import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date
from django.http import HttpResponseForbidden, HttpRequest
from content.models import Lesson
from learner_dashboard.views import learner_dashboard
from django.contrib import messages
from client_admin.models import Profile, User, Profile, Course, User, UserCourse, UserModuleProgress, UserLessonProgress, Message, OrganizationSettings, ActivityLog
from client_admin.forms import OrganizationSettingsForm
from .forms import UserRegistrationForm, ProfileForm, CSVUploadForm
from django.contrib.auth import update_session_auth_hash, login
from authentication.python.views import addUserCognito, modifyCognito, register_view
from django.template.response import TemplateResponse
import json
from django.db import IntegrityError, transaction
#from models import Profile
#from authentication.python import views

# Define the custom exception at the top of your views file
class ImpersonationError(Exception):
    """Custom exception for impersonation errors."""
    pass


@login_required
def admin_dashboard(request):
    return render(request, 'dashboard.html')

@login_required
def admin_settings(request):
    settings = OrganizationSettings.objects.first()

    # Create a new instance if none exists
    if settings is None:
        settings = OrganizationSettings()

    if request.method == 'POST':
        form = form = OrganizationSettingsForm(request.POST, request.FILES, instance=settings)

        if form.is_valid():
            # Handle boolean fields
            settings.on_login_course = request.POST.get('on_login_course') == 'on'
            settings.profile_customization = request.POST.get('profile_customization') == 'on'
            settings.default_course_thumbnail = request.POST.get('default_course_thumbnail') == 'on' 
            settings.default_certificate = request.POST.get('default_certificate') == 'on' 

            # Save the on_login_course_id (make sure it exists in the POST data)
            course_id = request.POST.get('on_login_course_id')
            if course_id:
                settings.on_login_course_id = int(course_id)
            
            messages.success(request, 'Settings updated successfully')

            # Save the form data
            form.save()
            return redirect('admin_settings')
        else:
            messages.error(request, form.errors)
            print(form.errors)  # Print errors for debugging

    else:
        form = OrganizationSettingsForm(instance=settings)

    # If a course is already selected, fetch the course name to display it
    selected_course_name = ''
    if settings.on_login_course_id:
        try:
            selected_course = Course.objects.get(id=settings.on_login_course_id)
            selected_course_name = selected_course.title
        except Course.DoesNotExist:
            selected_course_name = ''

    return render(request, 'settings.html', {
        'form': form,
        'selected_course_name': selected_course_name,
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

        messages.success(request, 'User information updated successfully')

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
            action=f'Updated User Information: {changes_log}',
            user_groups=', '.join(group.name for group in request.user.groups.all()),
        )

        messages.success(request, 'User information updated successfully')

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

            if created:
                # Create UserModuleProgress instances for each module in the course
                first_lesson = Lesson.objects.filter(module__course=course).order_by('module__order', 'order').first()

                if first_lesson:
                    user_course.lesson_id = first_lesson.id  # ✅ Assign the first lesson
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
                    # Log the activity in the ActivityLog
                    ActivityLog.objects.create(
                        user=user,  # Assuming this is the user being edited
                        action_performer=request.user,  # User performing the action
                        action_target=user,  # User being enrolled
                        action=f"Enrolled in Course: {course.title}",
                        user_groups=', '.join(group.name for group in request.user.groups.all()),  # Optional: Add user groups
                    )
                except Exception as e:
                    print(f"Failed to create activity log: {e}")  # Replace with proper logging mechanism
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
    user = get_object_or_404(Profile, pk=user_id)

    context = {
        'profile': user
    }
    return render(request, 'users/user_details.html', context)

@login_required
def user_transcript(request, user_id):
    user = get_object_or_404(Profile, pk=user_id)

    context = {
        'profile': user
    }
    return render(request, 'users/user_transcript.html', context)

@login_required
def user_history(request, user_id):
    user = get_object_or_404(Profile, pk=user_id)

    # Fetch messages sent by the logged-in user to the specified user
    sent_messages = Message.objects.filter(sender=request.user, recipients=user.user)

    # Fetch activity log entries related to the user
    activity_logs = ActivityLog.objects.filter(action_target=user.user)

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
                user = User.objects.filter(id=user_id)
                if not user.exists():
                    raise ValueError(f"No user found with ID {user_id}")
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
        logger.error(f"Unexpected error: {e}")
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