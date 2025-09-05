import os
import uuid
import zipfile
import boto3
import re
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Count, Q, F, DateTimeField, Avg
from django.utils import timezone
from authentication.python.views import get_secret
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date, parse_time
from django.contrib import messages
from content.models import File, Course, Module, Lesson, Category, Credential, EventDate, Media, Resources, Upload, UploadedFile, ContentType, Quiz, Question, QuestionOrder, MCQuestion, Answer, TFQuestion, FITBQuestion, FITBAnswer, EssayQuestion, EssayPrompt, QuestionMedia, QuizReference, QuizTemplate, TemplateCategorySelection, TemplateQuestion, QuizConfig
from client_admin.models import TimeZone, UserModuleProgress, UserLessonProgress, UserCourse, EnrollmentKey, ActivityLog, Profile, UserAssignmentProgress, Message, FacialVerificationLog
from django.http import JsonResponse, HttpResponseBadRequest, Http404
import uuid as uuid_lib
from halo_lms import settings
from .models import File, Folder
from django.contrib.auth.models import User
import json
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateformat import DateFormat
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.views.decorators.http import require_POST
from django.core.files.storage import default_storage, FileSystemStorage
from django.core.files.base import ContentFile
from django.apps import apps
from django.utils.timezone import now
from datetime import timedelta
from collections import OrderedDict
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear, TruncDate
from urllib.parse import urlparse

# Courses
@login_required
def admin_courses(request):
    sort_by = request.GET.get('sort_by', 'title_desc')
    order_by_field = 'title'  # Default sorting field
    query_string = request.GET.get('query')

    query = Q()
    active_filters = {}

    # Apply the general search query if provided
    if query_string:
        query &= (
            Q(title__icontains=query_string)|
            Q(type__icontains=query_string) |
            Q(status__icontains=query_string) |
            Q(category__name__icontains=query_string)
        )
        active_filters['query'] = query_string  # Track the general search query

    # Build the query dynamically based on the provided filter parameters
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]  # Extract field name after 'filter_'
            if field_name == 'category':
                query &= Q(category__name__icontains=value)
            else:
                query &= Q(**{f"{field_name}__icontains": value})

            active_filters[field_name] = value

    # Define a dictionary to map sort options to user-friendly text
    sort_options = {
        'title_asc': 'Title (A-Z)',
        'title_desc': 'Title (Z-A)', 
        'type_asc': 'Type (A-Z)',
        'type_desc': 'Type (Z-A)',
        'status_asc': 'Status (A-Z)',
        'status_desc': 'Status (Z-A)',
        'category_asc': 'Category (A-Z)',
        'category_desc': 'Category (Z-A)',     
    }

    # Determine the order by field
    if sort_by == 'title_asc':
        order_by_field = 'title'
    elif sort_by == 'title_desc':
        order_by_field = '-title'
    elif sort_by == 'type_asc':
        order_by_field = 'type'
    elif sort_by == 'type_desc':
        order_by_field = '-type'
    elif sort_by == 'status_asc':
        order_by_field = 'status'
    elif sort_by == 'status_desc':
        order_by_field = '-status'
    elif sort_by == 'category_asc':
        order_by_field = 'category'
    elif sort_by == 'category_desc':
        order_by_field = '-category'

    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Title (Z-A)')

    # Apply the filtering and sorting to the users list
    courses_list = Course.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered users_list
    paginator = Paginator(courses_list, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'courses/courses.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
    })

@login_required
def add_online_courses(request):
    category = Category.objects.all()
    page = 1  # Initially load the first page
    per_page = 15  # Number of items per page

    files = File.objects.all().order_by('-uploaded_at')
    paginator = Paginator(files, per_page)
    paginated_files = paginator.page(page)

    context = {
        'category_list': category,
        'file_list': paginated_files.object_list,  # Pass only the files for the first page
        'has_next': paginated_files.has_next(),
        'next_page': page + 1 if paginated_files.has_next() else None,
    }

    return render(request, 'courses/add_online_course.html', context)

@login_required
def edit_online_courses(request, course_id):
    course = get_object_or_404(Course, pk=course_id)

    total_seconds = course.estimated_completion_time.total_seconds()
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)

    certificate_credential = course.credentials.filter(type='certificate').first()
    start_date = course.event_dates.filter(type='start_date').first()
    expiration_date = course.event_dates.filter(type='expiration_date').first()
    due_date = course.event_dates.filter(type='due_date').first()
    certificate_expiration_date = course.event_dates.filter(type='certificate_expiration_date').first()
    thumbnail_media = course.media.filter(type='thumbnail').first()
    references_resources = course.resources.filter(type='reference').all()
    course_uploads = course.uploads.all()

    context = {
        'course': course,
        'hours': hours,
        'minutes': minutes,
        'certificate_credential': certificate_credential,
        'start_date': start_date,
        'expiration_date': expiration_date,
        'certificate_expiration_date': certificate_expiration_date,
        'due_date': due_date,
        'thumbnail_media': thumbnail_media,
        'references_resources': references_resources,
        'course_uploads': course_uploads,
    }

    return render(request, 'courses/edit_online_course.html', context)

@login_required
def create_or_update_course(request):
    def normalize_time(time_str):
        """ Normalize various time formats to HH:MM[:ss[.uuuuuu]] """
        if not time_str:
            return None

        # Attempt to parse 12-hour format
        try:
            time_obj = datetime.strptime(time_str, "%I:%M %p")
            return time_obj.strftime("%H:%M")
        except ValueError:
            pass

        # Attempt to parse 24-hour format
        try:
            time_obj = datetime.strptime(time_str, "%H:%M")
            return time_obj.strftime("%H:%M")
        except ValueError:
            pass

        return None

    def handle_credentials(course, credentials):
        """ Handle credentials for the course """
        existing_credentials = Credential.objects.filter(course=course).values_list('type', flat=True)

        # Handle incoming credentials
        incoming_credentials = {cred.get('type'): cred for cred in credentials if cred.get('type')}

        # Update or create new credentials
        for cred_type, cred_data in incoming_credentials.items():
            Credential.objects.update_or_create(
                course=course,
                type=cred_type,
                defaults={
                    'source': cred_data.get('source', ''),
                    'source_title': cred_data.get('source_title', ''),
                    'title': cred_data.get('title', '')
                }
            )

        # Remove any credentials that are no longer in the incoming data
        for existing_cred in existing_credentials:
            if existing_cred not in incoming_credentials:
                Credential.objects.filter(course=course, type=existing_cred).delete()

    def handle_event_dates(course, event_dates):
        """ Handle event dates for the course """
        existing_event_dates = course.event_dates.all()

        # Extract types from the incoming event dates for easy comparison
        incoming_event_types = {event.get('type') for event in event_dates}

        # Update or create new event dates
        for event_date_data in event_dates:
            event_date_type = event_date_data.get('type')
            date_value = event_date_data.get('date')
            time_value = event_date_data.get('time', '')
            from_enrollment = event_date_data.get('from_enrollment', {})

            normalized_time = normalize_time(time_value)
            if normalized_time is None and time_value:
                return JsonResponse({
                    'status': 'error',
                    'message': f"Invalid time format for {event_date_type}. It must be in HH:MM[:ss[.uuuuuu]] format."
                }, status=400)

            EventDate.objects.update_or_create(
                content_type=ContentType.objects.get_for_model(Course),
                object_id=course.id,
                type=event_date_type,
                defaults={
                    'date': date_value,
                    'time': normalized_time,
                    'from_enrollment': from_enrollment,
                }
            )

        # Remove any event dates that are no longer in the incoming data
        for existing_event in existing_event_dates:
            if existing_event.type not in incoming_event_types:
                existing_event.delete()

    def handle_modules_and_lessons(course, modules, temp_to_upload_map):
        module_response = []

        for module_data in modules:
            module_id = module_data.get('id')
            module = get_object_or_404(Module, id=module_id) if module_id else Module(course=course)
            module.title = module_data.get('title', 'Untitled Module')
            module.description = module_data.get('description', '')
            module.order = module_data.get('order', 0)
            
            print(f"Saving Module: {module.title}, Course ID: {course.id}")  # Debug statement
            module.save()

            module_response.append({
                'id': module.id,
                'temp_id': module_data.get('temp_id'),
                'title': module.title,
                'lessons': []
            })
            print(f"Module '{module.title}' saved with ID: {module.id}")

            for lesson_data in module_data.get('lessons', []):
                lesson_id = lesson_data.get('id')
                lesson = get_object_or_404(Lesson, id=lesson_id) if lesson_id else Lesson(module=module)
                lesson.title = lesson_data.get('title', '')
                lesson.description = lesson_data.get('description', '')
                lesson.order = lesson_data.get('order', 0)
                lesson.content_type = lesson_data.get('content_type', '')

                print(f"Saving Lesson: {lesson.title}, Module ID: {module.id}")  # Debug statement
                assignment_toggle = lesson_data.get('assignment_toggle', False)
                lesson.assignment_toggle = assignment_toggle
                lesson.save()

                lesson_response = {
                    'id': lesson.id,
                    'title': lesson.title,
                    'description': lesson.description,
                }
                if 'temp_id' in lesson_data:
                    lesson_response['temp_id'] = lesson_data['temp_id']

                # If toggle is enabled, link assignments (both real and temp IDs)
                if assignment_toggle:
                    assignment_ids = []
                    for assignment in lesson_data.get('assignments', []):
                        upload_id = assignment.get('id')
                        temp_id = assignment.get('temp_id')
                        upload = None

                        if upload_id:
                            upload = Upload.objects.filter(id=upload_id, course=course).first()
                        elif temp_id and temp_id in temp_to_upload_map:
                            upload = temp_to_upload_map[temp_id]

                        if upload:
                            assignment_ids.append(upload.id)
                        else:
                            print(f"Assignment could not be matched (id: {upload_id}, temp_id: {temp_id})")

                    lesson.assignments.set(assignment_ids)
                    lesson_response['assignment_toggle'] = True
                    lesson_response['assignments'] = [{'id': id} for id in assignment_ids]

                module_response[-1]['lessons'].append(lesson_response)
                print(f"Lesson '{lesson.title}' saved with ID: {lesson.id}")

                if lesson.content_type == 'quiz':
                    lesson.create_quiz_from = lesson_data.get('create_quiz_from')
                    lesson.quiz_template_id = lesson_data.get('quiz_template_id')
                    lesson.selected_quiz_template_name = lesson_data.get('selected_quiz_template_name')
                    lesson.quiz_id = lesson_data.get('quiz_id')
                    lesson.selected_quiz_name = lesson_data.get('selected_quiz_name')

                    # Save QuizConfig
                    quiz_config_data = {
                        'quiz_type': lesson_data.get('quiz_type'),
                        'passing_score': int(lesson_data.get('passing_score') or 0),
                        'require_passing': bool(lesson_data.get('require_passing', False)),
                        'quiz_duration': int(lesson_data.get('quiz_duration') or 0),
                        'quiz_attempts': lesson_data.get('quiz_attempts') or 'Unlimited',
                        'maximum_warnings': int(lesson_data.get('maximum_warnings') or 0),
                        'randomize_order': bool(lesson_data.get('randomize_order', False)),
                        'reveal_answers': bool(lesson_data.get('reveal_answers', False)),
                    }

                    # Update or create QuizConfig instance
                    QuizConfig.objects.update_or_create(
                        lesson=lesson,
                        defaults=quiz_config_data
                    )

                # Handle file attachment for the lesson (either file_id or file_url)
                file_id = lesson_data.get('file_id', None)
                if file_id:
                    file_instance = get_object_or_404(UploadedFile, id=file_id)
                    lesson.uploaded_file = file_instance
                    print('file_instance', file_instance, ':' 'lesson.uploaded_file', lesson.uploaded_file)
                    uploaded_file_name = str(lesson.uploaded_file)
                    lesson.scorm_id = uploaded_file_name.replace(".zip", "/scormcontent/index.html")
                    print(f"File '{file_instance.title}' associated with lesson ID: {lesson.id}")
                elif 'file_url' in lesson_data:
                    file_url = lesson_data.get('file_url')

                    # Attempt to match the file URL with an existing file in the File model
                    try:
                        file_instance = File.objects.all().filter(file__isnull=False)
                        matching_file = None
                        for file in file_instance:
                            if file.file.url == file_url:
                                matching_file = file
                                break

                        if matching_file:
                            lesson.file = matching_file
                            lesson.save()
                            print(f"File URL '{matching_file.file.url}' associated with lesson ID: {lesson.id}")
                        else:
                            print(f"No file found with URL '{file_url}' for lesson ID: {lesson.id}")

                    except File.DoesNotExist:
                        print(f"Error occurred when searching for file with URL '{file_url}' for lesson ID: {lesson.id}")

                lesson.save()

        return module_response

    def handle_media(course, media_data, request_files):
        """ Handle media for the course """
        for media in media_data:
            if media.get('type') == 'thumbnail':
                type = media.get('type', '')
                new_thumbnail_link = media.get('thumbnail_link', '')

                # Access file directly from request.FILES using a known key
                new_thumbnail_image_file = request_files.get('media[0][thumbnail_image]', None)

                print(f"Handling media: {new_thumbnail_link}, {new_thumbnail_image_file}")  # Debug print

                # Check if the course already has a thumbnail
                if course.thumbnail:
                    print('thumbnail', course.thumbnail)

                    # Delete old image if it exists
                    if course.thumbnail.thumbnail_image:
                        course.thumbnail.thumbnail_image.delete(save=False)

                    # Update thumbnail link if exists
                    course.thumbnail.thumbnail_link = new_thumbnail_link or ''

                    # Update thumbnail image if a new file is provided
                    if new_thumbnail_image_file:
                        course.thumbnail.thumbnail_image = new_thumbnail_image_file

                    course.thumbnail.save()  # Save changes to the existing thumbnail

                else:
                    # Create a new Media object for the thumbnail if it doesn't exist
                    media_obj = Media.objects.create(
                        course=course,
                        type=type,
                        thumbnail_link=new_thumbnail_link,
                        thumbnail_image=new_thumbnail_image_file
                    )

                    # Assign the new media object as the course thumbnail
                    course.thumbnail = media_obj
                    course.save()  # Save the course to update the thumbnail field


    def handle_resources(course, resources):
        reference_response = []
        """ Handle references for the course """
        
        # Iterate over the incoming resources and update or create
        for index, reference_data in enumerate(resources):
            resource_url = reference_data.get('source', '')
            description = reference_data.get('description', '')
            title = reference_data.get('title', '')
            type = reference_data.get('type', '')
            file_type = reference_data.get('file_type', '')
            file_title = reference_data.get('file_title', '')
            resource_id = reference_data.get('id', None)  # Get the resource ID from the incoming data
            order = reference_data.get('order', index + 1)  # Capture the order from the frontend

            if resource_url:
                if resource_id:
                    # Check if resource with the given ID exists and belongs to the right course
                    existing_resource = Resources.objects.filter(id=resource_id, course=course).first()

                    if existing_resource:
                        # Update the existing resource
                        existing_resource.url = resource_url
                        existing_resource.type = type
                        existing_resource.title = title
                        existing_resource.file_type = file_type
                        existing_resource.file_title = file_title
                        existing_resource.description = description
                        existing_resource.order = order  # Update the order
                        existing_resource.save()
                        print(f"Resource updated: {existing_resource.title}")
                    else:
                        print(f"Resource ID {resource_id} not found or doesn't belong to this course.")
                else:
                    # If there's no resource ID, create a new one
                    reference = Resources.objects.create(
                        course=course,
                        url=resource_url,
                        type=type,
                        title=title,
                        file_type=file_type,
                        file_title=file_title,
                        description=description,
                        order=order  # Set the order
                    )

                    reference_response.append({
                        'id': reference.id,
                        'temp_id': reference_data.get('temp_id'),
                        'title': reference.title,
                        'description': reference.description,
                    })
                    print(f"New resource created: {title}")

        return reference_response

    def handle_uploads(course, uploads_data):
        upload_response = []
        temp_to_upload_map = {}

        for upload_data in uploads_data:
            resource_url = upload_data.get('source', '')
            file_type = upload_data.get('file_type', '')
            file_title = upload_data.get('file_title', '')
            upload_id = upload_data.get('id')
            temp_id = upload_data.get('temp_id')
            approval_type = upload_data.get('approval_type', '')
            approvers_ids = upload_data.get('selected_approvers', [])
            title = upload_data.get('title', '')
            description = upload_data.get('description', '')

            print(f"Processing upload - Title: {title}, Approval Type: {approval_type}, Approvers: {approvers_ids}")

            if not title:
                print("No title provided for upload, skipping this upload.")
                continue

            try:
                if upload_id:
                    upload = Upload.objects.filter(id=upload_id, course=course).first()

                    if upload:
                        upload.approval_type = approval_type
                        upload.title = title
                        upload.description = description
                        upload.url = resource_url
                        upload.file_type = file_type
                        upload.file_title = file_title
                        if approvers_ids:
                            approvers = User.objects.filter(id__in=approvers_ids)
                            upload.approvers.set(approvers)
                        upload.save()
                        print(f"Upload updated: {upload}")
                    else:
                        upload = Upload.objects.create(
                            course=course,
                            approval_type=approval_type,
                            title=title,
                            description=description,
                            url=resource_url,
                            file_type=file_type,
                            file_title=file_title,
                        )
                        if approvers_ids:
                            approvers = User.objects.filter(id__in=approvers_ids)
                            upload.approvers.set(approvers)
                        print(f"Upload created (fallback): {upload}")
                else:
                    upload = Upload.objects.create(
                        course=course,
                        approval_type=approval_type,
                        title=title,
                        url=resource_url,
                        file_type=file_type,
                        file_title=file_title,
                    )
                    if approvers_ids:
                        approvers = User.objects.filter(id__in=approvers_ids)
                        upload.approvers.set(approvers)
                    print(f"Upload created: {upload}")

                upload.save()
                upload_response.append({
                    'id': upload.id,
                    'temp_id': temp_id,
                    'title': upload.title,
                })

                if temp_id:
                    temp_to_upload_map[temp_id] = upload

            except Exception as e:
                print(f"Error creating or updating upload: {e}")

        return upload_response, temp_to_upload_map


    def update_user_progress(course):
        """ Update progress for all users enrolled in the course """
        enrolled_users = UserCourse.objects.filter(course=course).select_related('user')

        if not enrolled_users.exists():
            print(f"No enrolled users for course {course.title}, skipping progress update.")
            return
        
        for user_course in enrolled_users:
            for module in course.modules.all():
                # Get or create UserModuleProgress based on module and user_course (without order)
                user_module_progress, _ = UserModuleProgress.objects.get_or_create(
                    user_course=user_course,
                    module=module
                )
                
                # Optionally update the order if needed
                if user_module_progress.order != module.order:
                    user_module_progress.order = module.order
                    user_module_progress.save()

                for lesson in module.lessons.all():
                    # Get or create UserLessonProgress based on lesson and user_module_progress (without order)
                    user_lesson_progress, _ = UserLessonProgress.objects.get_or_create(
                        user_module_progress=user_module_progress,
                        lesson=lesson
                    )
                    
                    # Optionally update the order if needed
                    if user_lesson_progress.order != lesson.order:
                        user_lesson_progress.order = lesson.order
                        user_lesson_progress.save()

    try:
        if request.method == 'POST':
            # Extract data from request
            data = request.POST
            print('Data received:', data)
            files = request.FILES

            # Testing if the save button was selected
            is_save = data.get('is_save', None)

            # Check if it's an update
            course_id = data.get('id', None)
            print(f"Received course_id: {course_id}")
            if course_id:
                course = get_object_or_404(Course, id=course_id)
            else:
                # Create a new Course instance if no ID is provided
                course = Course()

            # Update course fields
            course.title = data.get('title', '')
            course.description = data.get('description', '')
            category_id = data.get('category_id')
            if category_id in [None, '', 'null']:
                course.category = None
            else:
                course.category = get_object_or_404(Category, id=category_id)
            course.type = data.get('type', 'bundle')
            course.terms_and_conditions = data.get('terms_and_conditions', 'false') == 'true'
            course.must_complete = data.get('must_complete', 'any_order')
            locked_value = data.get('locked', 'false') == 'true'
            locked_value = data.get('locked', 'false')
            print("🔍 Locked Value Received:", locked_value)

            course.locked = locked_value == 'true'  # Ensures string 'true' sets boolean True
            course.estimated_completion_time = data.get('estimated_completion_time', '')
            course.status = data.get('status', '')
            course.referencesEnabled = data.get('referencesEnabled', 'false') == 'true'
            course.uploadsEnabled = data.get('uploadsEnabled', 'false') == 'true'
            # Extract upload instructions and save to course
            course.upload_instructions = data.get('upload_instructions', '')
            course.save()

            # Handle credentials
            credentials = json.loads(data.get('credentials', '[]'))
            handle_credentials(course, credentials)

            # Handle event dates
            event_dates = json.loads(data.get('event_dates', '[]'))
            handle_event_dates(course, event_dates)

            # Handle uploads
            uploads = json.loads(data.get('uploads', '[]'))
            print(f"Uploads received: {uploads}")
            upload_response, temp_to_upload_map = handle_uploads(course, uploads)

            # Handle modules and lessons
            modules = json.loads(data.get('modules', '[]'))
            print(f"Modules received: {modules}")  # Check what modules are being received
            module_response = handle_modules_and_lessons(course, modules, temp_to_upload_map)

            # Handle media
            media_data = json.loads(data.get('media', '[]'))
            handle_media(course, media_data, files)

            # Handle references
            resources = json.loads(data.get('resources', '[]'))
            print(f"Resources received: {resources}")
            reference_response = handle_resources(course, resources)

            # Update user progress for all enrolled users
            update_user_progress(course)

            if is_save:
                return JsonResponse({'status': 'success', 'course_id': course.id, 'modules': module_response, 'references': reference_response, 'uploads': upload_response})
            else:
                messages.success(request, 'Course published successfully!')
                return JsonResponse({'status': 'success', 'redirect_url': '/admin/courses/', 'course_id': course.id})

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
def detect_file_type(filename):
    ext = os.path.splitext(filename)[1].lower()

    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']:
        return 'image'
    elif ext in ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']:
        return 'document'
    elif ext in ['.mp4', '.mov', '.wmv', '.flv', '.avi', '.mkv']:
        return 'video'
    elif ext in ['.mp3', '.wav', '.aac', '.ogg', '.flac']:
        return 'audio'
    elif ext in ['.zip', '.rar', '.scorm', '.xml']:   # Adjust for SCORM packaging
        return 'scorm'
    elif ext in ['.pdf']:
        return 'pdf'
    else:
        return 'other'
    
# Quizzes
@login_required
def admin_quizzes(request):
    sort_by = request.GET.get('sort_by', 'title_desc')
    order_by_field = 'title'  # Default sorting field
    query_string = request.GET.get('query')

    query = Q()
    active_filters = {}

    # Apply the general search query if provided
    if query_string:
        query &= (
            Q(title__icontains=query_string)|
            Q(category__name__icontains=query_string)
        )
        active_filters['query'] = query_string  # Track the general search query

    # Build the query dynamically based on the provided filter parameters
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]  # Extract field name after 'filter_'
            if field_name == 'category':
                query &= Q(category__name__icontains=value)
            else:
                query &= Q(**{f"{field_name}__icontains": value})
            active_filters[field_name] = value

    # Define a dictionary to map sort options to user-friendly text
    sort_options = {
        'title_asc': 'Title (A-Z)',
        'title_desc': 'Title (Z-A)', 
        'category_asc': 'Category (A-Z)',
        'category_desc': 'Category (Z-A)',     
    }

    # Determine the order by field
    if sort_by == 'title_asc':
        order_by_field = 'title'
    elif sort_by == 'title_desc':
        order_by_field = '-title'
    elif sort_by == 'category_asc':
        order_by_field = 'category'
    elif sort_by == 'category_desc':
        order_by_field = '-category'

    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Title (Z-A)')

    # Apply the filtering and sorting to the users list
    quizzes_list = Quiz.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered users_list
    paginator = Paginator(quizzes_list, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'quizzes/quizzes.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
    })

@login_required
def create_or_edit_quiz(request, uuid=None):
    if uuid:
        # Edit mode
        quiz = get_object_or_404(Quiz, uuid=uuid)
    else:
        # Create mode
        generated_uuid = uuid_lib.uuid4()
        quiz = Quiz.objects.create(
            uuid=generated_uuid,
            title="Untitled Quiz",
            url=str(generated_uuid),  # Using UUID as slug-friendly URL
            author=request.user,
            draft=True  # Mark as draft until edited
        )
        return redirect('edit_quiz', uuid=quiz.uuid)  # Redirect to edit mode

    # Render your edit template
    return render(request, 'quizzes/edit_quiz.html', {'quiz': quiz})

@login_required
def file_upload(request):
    # Uploading Files
    if request.method == 'POST':
        try:
            uploaded_file = request.FILES['file']
            custom_title = request.POST.get('title', '').strip()
            file_name = custom_title if custom_title else uploaded_file.name
            parent_id = request.POST.get('parent_id')

            # Detect file type based on extension
            file_type = detect_file_type(file_name)

            # Create a file instance with detected file type
            file_instance = File(
                user=request.user,
                file=uploaded_file,
                title=file_name,
                file_type=file_type
            )
            
            if parent_id:
                folder = Folder.objects.filter(id=parent_id, user=request.user).first()
                if folder:
                    file_instance.save()
                    file_instance.folders.add(folder)
                else:
                    file_instance.save()
            else:
                file_instance.save()

            uploaded_at_formatted = file_instance.uploaded_at.strftime('%b %d, %Y %I:%M')
            uploaded_at_formatted += ' ' + ('p.m.' if file_instance.uploaded_at.hour >= 12 else 'a.m.')

            return JsonResponse({
                'success': True,
                'message': 'File uploaded successfully.',
                'file': {
                    'id': file_instance.id,
                    'title': file_instance.title,
                    'file_type': file_instance.file_type,
                    'uploaded_at': uploaded_at_formatted,
                    'size': file_instance.file.size,
                    'file_url': file_instance.file.url
                }
            })
        except ValidationError as ve:
            return JsonResponse({'success': False, 'error': str(ve)})
        except Exception as e:
            return JsonResponse({'success': False, 'message': 'An error occurred: ' + str(e)})
    # Searching Files
    elif request.method == 'GET':
        search_query = request.GET.get('q', '')
        filters_raw = request.GET.get('filters', '')
        parent_id = request.GET.get('parent')  # can be null for root
        page = int(request.GET.get('page', 1))
        per_page = 20
        layout = request.GET.get('layout', '')

        # Build base filter conditions for current user
        file_filter_conditions = Q(user=request.user)
        folder_filter_conditions = Q(user=request.user)

        # Search filtering
        if search_query:
            file_filter_conditions &= Q(title__icontains=search_query)
            folder_filter_conditions &= Q(title__icontains=search_query)

        # Separate regular file type filters and special filters
        filters = [f.strip().lower() for f in filters_raw.split(',') if f.strip()]
        special_keys = {'certificate', 'thumbnail', 'reference'}
        regular_filters = [f for f in filters if f not in special_keys]
        special_filters = [f for f in filters if f in special_keys]

        # Apply regular file_type filter
        if regular_filters:
            file_filter_conditions &= Q(file_type__in=regular_filters)

        # Apply special file filters
        if special_filters:
            file_filter_conditions &= build_special_file_filters(special_filters, request.user)

        course_ids = request.GET.getlist('course_ids[]')
        if course_ids:
            course_ids = [int(cid) for cid in course_ids if cid.isdigit()]
            file_filter_conditions &= build_course_file_filter(course_ids)

        print("Course IDs:", course_ids)

        # Root vs nested folder handling
        if parent_id:
            folder_filter_conditions &= Q(parent_id=parent_id)
            file_filter_conditions &= Q(folders__id=parent_id)
        else:
            folder_filter_conditions &= Q(parent=None)
            file_filter_conditions &= Q(folders=None)  # files not attached to any folder

        print("Raw filters:", filters_raw)
        print("Parsed filters:", filters)
        print("Final file_filter_conditions:", file_filter_conditions)

        # Fetch data
        folders = Folder.objects.filter(folder_filter_conditions)
        files = File.objects.filter(file_filter_conditions).distinct()

        # Merge and sort
        combined_items = list(folders) + list(files)
        combined_items.sort(
            key=lambda x: x.created_at if hasattr(x, 'created_at') else x.uploaded_at,
            reverse=True
        )

        # Paginate
        paginator = Paginator(combined_items, per_page)
        try:
            page_items = paginator.page(page)
        except EmptyPage:
            return JsonResponse({
                'success': True,
                'items': [],
                'has_next': False,
                'next_page': None,
                'layout': layout
            })

        # Serialize
        response_data = []
        for item in page_items:
            if isinstance(item, Folder):
                response_data.append({
                    'type': 'folder',
                    'id': item.id,
                    'title': item.title,
                    'created_at': item.created_at.strftime('%b %d, %Y %I:%M %p')
                })
            else:  # it's a File
                uploaded_at_formatted = item.uploaded_at.strftime('%b %d, %Y %I:%M')
                uploaded_at_formatted += ' ' + ('p.m.' if item.uploaded_at.hour >= 12 else 'a.m.')
                response_data.append({
                    'type': 'file',
                    'id': item.id,
                    'title': item.title,
                    'file_url': item.file.url,
                    'file_type': item.file_type,
                    'uploaded_at': uploaded_at_formatted,
                })

        return JsonResponse({
            'success': True,
            'items': response_data,
            'has_next': page_items.has_next(),
            'next_page': page + 1 if page_items.has_next() else None,
            'layout': layout
        })
    
def build_special_file_filters(filters, user):
    def get_file_names_from_urls(urls):
        stripped = []
        for url in urls:
            if url:
                parsed = urlparse(url).path.replace('/media/', '').lstrip('/')
                stripped.append(parsed.split('/')[-1])  # or just parsed if full relative path needed
        return stripped

    q_objects = Q()

    if 'certificate' in filters:
        cert_urls = Credential.objects.filter(type='certificate').values_list('source', flat=True)
        cert_file_names = get_file_names_from_urls(cert_urls)

        if cert_file_names:
            regex = r'(' + '|'.join(map(re.escape, cert_file_names)) + ')'
            q_objects &= Q(file__iregex=regex)

    if 'thumbnail' in filters:
        thumb_urls = Media.objects.exclude(thumbnail_link='').values_list('thumbnail_link', flat=True)
        thumb_file_names = get_file_names_from_urls(thumb_urls)

        if thumb_file_names:
            regex = r'(' + '|'.join(map(re.escape, thumb_file_names)) + ')'
            q_objects &= Q(file__iregex=regex)

    if 'reference' in filters:
        reference_urls = Resources.objects.filter(type='reference').values_list('url', flat=True)
        upload_urls = Upload.objects.exclude(url='').values_list('url', flat=True)
        combined_urls = list(reference_urls) + list(upload_urls)
        ref_file_names = get_file_names_from_urls(combined_urls)
        if ref_file_names:
            regex = r'(' + '|'.join(map(re.escape, ref_file_names)) + ')'
            q_objects &= Q(file__iregex=regex)

    return q_objects

def get_filenames_from_urls(urls):
    filenames = []
    for url in urls:
        if url:
            parsed = urlparse(url).path.replace('/media/', '').lstrip('/')
            filenames.append(parsed.split('/')[-1])
    return filenames

def build_course_file_filter(course_ids):
    q = Q()
    
    creds = Credential.objects.filter(course_id__in=course_ids).values_list('source', flat=True)
    media = Media.objects.filter(course_id__in=course_ids).values_list('thumbnail_link', flat=True)
    resources = Resources.objects.filter(course_id__in=course_ids).values_list('url', flat=True)
    uploads = Upload.objects.filter(course_id__in=course_ids).values_list('url', flat=True)
    lesson_file_ids = Lesson.objects.filter(module__course_id__in=course_ids).values_list('file_id', flat=True)
    lesson_file_ids = [fid for fid in lesson_file_ids if fid]

    url_files = get_filenames_from_urls(list(creds) + list(media) + list(resources) + list(uploads))

    if url_files:
        regex = r'(' + '|'.join(map(re.escape, url_files)) + ')'
        q |= Q(file__iregex=regex)

    if lesson_file_ids:
        q |= Q(id__in=lesson_file_ids)

    return q
    
@login_required
def file_delete(request):
    if request.method == 'POST':
        try:
            payload = json.loads(request.body)
            file_id = payload.get('id')
            file = File.objects.get(id=file_id, user=request.user)
            file.delete()
            return JsonResponse({'success': True})
        except File.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'File not found.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@login_required
def file_rename(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            file_id = data.get('id')
            new_title = data.get('title', '').strip()

            if not new_title:
                return JsonResponse({'success': False, 'message': 'Title cannot be empty.'})

            file = File.objects.get(id=file_id, user=request.user)
            file.title = new_title
            file.save()

            return JsonResponse({'success': True})
        except File.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'File not found.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@login_required
def folder_create(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)

    title = request.POST.get('title', '').strip()
    parent_id = request.POST.get('parent')

    if not title:
        return JsonResponse({'success': False, 'message': 'Folder name is required.'}, status=400)

    parent_folder = None
    if parent_id:
        try:
            parent_folder = Folder.objects.get(id=parent_id, user=request.user)
        except Folder.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Parent folder not found.'}, status=404)

    folder = Folder.objects.create(
        user=request.user,
        title=title,
        parent=parent_folder
    )

    return JsonResponse({
        'success': True,
        'folder': {
            'id': folder.id,
            'title': folder.title,
            'parent_id': folder.parent.id if folder.parent else None,
            'created_at': folder.created_at.strftime('%b %d, %Y %I:%M %p')
        }
    })

@login_required
def folder_delete(request):
    if request.method == 'POST':
        try:
            payload = json.loads(request.body)
            folder_id = payload.get('id')
            folder = Folder.objects.get(id=folder_id, user=request.user)
            folder.delete()
            return JsonResponse({'success': True})
        except Folder.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Folder not found.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@login_required
def folder_rename(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            folder_id = data.get('id')
            new_title = data.get('title', '').strip()

            if not new_title:
                return JsonResponse({'success': False, 'message': 'Title cannot be empty.'})

            folder = Folder.objects.get(id=folder_id, user=request.user)
            folder.title = new_title
            folder.save()

            return JsonResponse({'success': True})
        except Folder.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Folder not found.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@require_POST
@login_required
def move_to_folder(request):
    item_id = request.POST.get('item_id')
    item_type = request.POST.get('item_type')
    target_folder_id = request.POST.get('target_folder_id')

    # Handle root-level move
    target_folder = None
    if target_folder_id != 'null':
        try:
            target_folder = Folder.objects.get(id=target_folder_id, user=request.user)
        except Folder.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Target folder not found.'})

    try:
        if item_type == 'file':
            file = File.objects.get(id=item_id, user=request.user)
            file.folders.clear()
            if target_folder:
                file.folders.add(target_folder)
        elif item_type == 'folder':
            folder = Folder.objects.get(id=item_id, user=request.user)
            folder.parent = target_folder
            folder.save()
        else:
            return JsonResponse({'success': False, 'message': 'Invalid item type.'})
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})
    
@login_required
def get_folder_children(request):
    parent_id = request.GET.get('parent_id')

    if parent_id == '' or parent_id is None:
        folders = Folder.objects.filter(user=request.user, parent__isnull=True)
    else:
        folders = Folder.objects.filter(user=request.user, parent_id=parent_id)

    data = [{
        'id': f.id,
        'title': f.title,
        'has_children': Folder.objects.filter(user=request.user, parent=f).exists()
    } for f in folders]

    return JsonResponse({'folders': data})

@login_required
def folder_path(request):
    item_id = request.GET.get('item_id')
    item_type = request.GET.get('item_type')

    try:
        if item_type == 'file':
            file = File.objects.get(id=item_id, user=request.user)
            folder = file.folders.first()
        elif item_type == 'folder':
            folder = Folder.objects.get(id=item_id, user=request.user).parent
        else:
            return JsonResponse({'path': []})

        path = []
        while folder:
            path.insert(0, {'id': folder.id, 'title': folder.title})
            folder = folder.parent

        return JsonResponse({'path': path})
    except:
        return JsonResponse({'path': []})
    
# Quiz Templates
@login_required
def admin_quiz_templates(request):
    sort_by = request.GET.get('sort_by', 'title_desc')
    order_by_field = 'title'  # Default sorting field
    query_string = request.GET.get('query')

    query = Q()
    active_filters = {}

    # Apply the general search query if provided
    if query_string:
        query &= (
            Q(title__icontains=query_string)
        )
        active_filters['query'] = query_string  # Track the general search query

    # Build the query dynamically based on the provided filter parameters
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]  # Extract field name after 'filter_'
            if field_name == 'category':
                query &= Q(category__name__icontains=value)
            else:
                query &= Q(**{f"{field_name}__icontains": value})
            active_filters[field_name] = value

    # Define a dictionary to map sort options to user-friendly text
    sort_options = {
        'title_asc': 'Title (A-Z)',
        'title_desc': 'Title (Z-A)', 
        'total_questions_asc': 'Total Questions (A-Z)',
        'total_questions_desc': 'Total Questions (Z-A)',     
    }

    # Determine the order by field
    if sort_by == 'title_asc':
        order_by_field = 'title'
    elif sort_by == 'title_desc':
        order_by_field = '-title'
    elif sort_by == 'total_questions_asc':
        order_by_field = 'total_questions'
    elif sort_by == 'total_questions_desc':
        order_by_field = '-total_questions'

    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Title (Z-A)')

    # Apply the filtering and sorting to the users list
    quiz_templates_list = QuizTemplate.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered users_list
    paginator = Paginator(quiz_templates_list, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'quiz_templates/quiz_templates.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
    })

@login_required
def add_quiz_templates(request):
    category = Category.objects.all()

    context = {
        'category_list': category,
    }

    return render(request, 'quiz_templates/add_quiz_template.html', context)

@login_required
def edit_quiz_templates(request, quiz_template_id):
    quiz_template = get_object_or_404(QuizTemplate, pk=quiz_template_id)

    selections = quiz_template.category_selections.select_related(
        'category', 'sub_category1', 'sub_category2', 'sub_category3'
    )

    selection_data = []
    for sel in selections:
        selection_data.append({
            'mainCategoryId': sel.category_id,
            'mainCategoryName': sel.category.name if sel.category else '',
            'subCategory1Id': sel.sub_category1_id,
            'subCategory1Name': sel.sub_category1.name if sel.sub_category1 else '',
            'subCategory2Id': sel.sub_category2_id,
            'subCategory2Name': sel.sub_category2.name if sel.sub_category2 else '',
            'subCategory3Id': sel.sub_category3_id,
            'subCategory3Name': sel.sub_category3.name if sel.sub_category3 else '',
            'questionCount': sel.num_questions,
        })

    context = {
        'quiz_template': quiz_template,
        'template_selections': json.dumps(selection_data),
        'description': quiz_template.description,
    }

    return render(request, 'quiz_templates/edit_quiz_template.html', context)
    
# Questions
@login_required
def admin_questions(request):
    sort_by = request.GET.get('sort_by', 'content_desc')
    order_by_field = 'content'  # Default sorting field
    query_string = request.GET.get('query')

    query = Q()
    active_filters = {}

    # Apply the general search query if provided
    if query_string:
        query &= (
            Q(content__icontains=query_string)|
            Q(category__name__icontains=query_string)
        )
        active_filters['query'] = query_string  # Track the general search query

    # Build the query dynamically based on the provided filter parameters
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]  # Extract field name after 'filter_'
            if field_name == 'category':
                query &= Q(category__name__icontains=value)
            else:
                query &= Q(**{f"{field_name}__icontains": value})
            active_filters[field_name] = value

    # Define a dictionary to map sort options to user-friendly text
    sort_options = {
        'content_asc': 'Content (A-Z)',
        'content_desc': 'Content (Z-A)', 
        'category_asc': 'Category (A-Z)',
        'category_desc': 'Category (Z-A)',     
    }

    # Determine the order by field
    if sort_by == 'content_asc':
        order_by_field = 'content'
    elif sort_by == 'content_desc':
        order_by_field = '-content'
    elif sort_by == 'category_asc':
        order_by_field = 'category'
    elif sort_by == 'category_desc':
        order_by_field = '-category'

    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Content (Z-A)')

    # Apply the filtering and sorting to the users list
    questions_list = Question.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered users_list
    paginator = Paginator(questions_list, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'questions/questions.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
    })
    
@login_required
def submit_coursework(request, upload_id):
    """ Allows students to submit coursework """
    upload = get_object_or_404(Upload, id=upload_id)

    if request.method == 'POST' and request.FILES.get('coursework_file'):
        # Assuming there's a coursework file field in the form
        coursework_file = request.FILES['coursework_file']
        upload.file = coursework_file  # Attach the submitted file
        upload.save()
        return JsonResponse({'status': 'success', 'message': 'Coursework submitted successfully'})

    return JsonResponse({'status': 'error', 'message': 'No file submitted'}, status=400)
    
def get_users(request):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        # Get the current page from the request
        page = int(request.GET.get('page', 1))
        per_page = 10
        offset = (page - 1) * per_page

        # Fetch the users from the database
        search_query = request.GET.get('search', '')
        users = User.objects.filter(
            Q(username__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query)
        )[offset:offset + per_page]

        # Prepare the data
        user_data = [{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        } for user in users]

        return JsonResponse({
            'users': user_data,
            'has_more': User.objects.filter(
                Q(username__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query)
            ).count() > offset + per_page
        })
    else:
        return JsonResponse({'error': 'This view only accepts AJAX requests.'}, status=400)
    
def get_courses(request):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        page = int(request.GET.get('page', 1))
        per_page = 10
        offset = (page - 1) * per_page

        search_query = request.GET.get('search', '')
        courses = Course.objects.filter(title__icontains=search_query)[offset:offset + per_page]

        course_data = [{
            'id': course.id,
            'title': course.title,
        } for course in courses]

        return JsonResponse({
            'courses': course_data,
            'has_more': Course.objects.filter(title__icontains=search_query).count() > offset + per_page
        })
    else:
        return JsonResponse({'error': 'This view only accepts AJAX requests.'}, status=400)
    
def get_timezones(request):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        page = int(request.GET.get('page', 1))
        per_page = 10
        offset = (page - 1) * per_page

        search_query = request.GET.get('search', '')
        timezones = TimeZone.objects.filter(name__icontains=search_query)[offset:offset + per_page]

        timezone_data = [{
            'id': timezone.id,
            'name': timezone.name,
        } for timezone in timezones]

        total_timezones = TimeZone.objects.filter(name__icontains=search_query).count()
        has_more = total_timezones > (offset + per_page)

        return JsonResponse({
            'timezones': timezone_data,
            'has_more': has_more,
            'total': total_timezones  # Optional: you can include total count if needed
        })
    else:
        return JsonResponse({'error': 'This view only accepts AJAX requests.'}, status=400)
    
def get_categories(request):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        page = int(request.GET.get('page', 1))
        per_page = 10
        offset = (page - 1) * per_page

        search_query = request.GET.get('search', '')
        # Filter categories based on the search query
        categories = Category.objects.filter(name__icontains=search_query)[offset:offset + per_page]

        category_data = [{
            'id': category.id,
            'name': category.name,
        } for category in categories]

        return JsonResponse({
            'categories': category_data,
            'has_more': Category.objects.filter(name__icontains=search_query).count() > offset + per_page
        })
    else:
        return JsonResponse({'error': 'This view only accepts AJAX requests.'}, status=400)
    
def get_quizzes(request):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        page = int(request.GET.get('page', 1))
        per_page = 10
        offset = (page - 1) * per_page

        search_query = request.GET.get('search', '')
        quizzes = Quiz.objects.filter(title__icontains=search_query)[offset:offset + per_page]

        quiz_data = [{'id': quiz.id, 'title': quiz.title} for quiz in quizzes]
        return JsonResponse({
            'quizzes': quiz_data,
            'has_more': Quiz.objects.filter(title__icontains=search_query).count() > offset + per_page
        })
    return JsonResponse({'error': 'This view only accepts AJAX requests.'}, status=400)


def get_quiz_templates(request):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        page = int(request.GET.get('page', 1))
        per_page = 10
        offset = (page - 1) * per_page
        search_query = request.GET.get('search', '')

        templates = QuizTemplate.objects.filter(title__icontains=search_query)[offset:offset + per_page]
        template_data = [{'id': t.id, 'title': t.title} for t in templates]

        return JsonResponse({
            'templates': template_data,
            'has_more': QuizTemplate.objects.filter(title__icontains=search_query).count() > offset + per_page
        })
    return JsonResponse({'error': 'This view only accepts AJAX requests.'}, status=400)
    
@require_POST
def create_category(request):
    name = request.POST.get('name', '').strip()
    description = request.POST.get('description', '').strip()
    parent_id = request.POST.get('parent_category')
    is_create_page = request.POST.get('isCreatePage')

    if not name:
        return JsonResponse({'error': 'Category name is required.'}, status=400)

    parent_category = None
    if parent_id:
        try:
            parent_category = Category.objects.get(id=parent_id)
        except Category.DoesNotExist:
            return JsonResponse({'error': 'Invalid parent category.'}, status=400)

    category = Category.objects.create(
        name=name,
        description=description,
        parent_category=parent_category
    )

    if is_create_page == 'true':
        messages.success(request, 'Category created successfully!')

    return JsonResponse({
        'id': category.id,
        'name': category.name,
        'is_create_page': is_create_page,
    }, status=201)

@require_POST
def edit_category(request):
    id = request.POST.get('id')
    name = request.POST.get('name', '').strip()
    description = request.POST.get('description', '').strip()
    parent_id = request.POST.get('parent_category')
    is_create_page = request.POST.get('isCreatePage')

    if not name:
        return JsonResponse({'error': 'Category name is required.'}, status=400)

    parent_category = None
    if parent_id:
        try:
            parent_category = Category.objects.get(id=parent_id)
        except Category.DoesNotExist:
            return JsonResponse({'error': 'Invalid parent category.'}, status=400)

    try:
        category = Category.objects.get(id=id)
    except Category.DoesNotExist:
        return JsonResponse({'error': 'Category not found.'}, status=404)

    category.name = name
    category.description = description
    category.parent_category = parent_category
    category.save()

    if is_create_page == 'true':
        messages.success(request, 'Category edited successfully!')

    return JsonResponse({
        'id': category.id,
        'name': category.name,
        'is_create_page': is_create_page,
    }, status=201)

@require_POST
def create_enrollment_key(request):
    name = request.POST.get('name', '').strip()
    key_name = request.POST.get('key_name', '').strip()
    course_ids_raw = request.POST.get('course_ids')
    active = request.POST.get('active') == 'true'
    max_uses_raw = request.POST.get('max_uses', '').strip()
    is_create_page = request.POST.get('isCreatePage')

    # Validate required input
    if not name or not key_name:
        return JsonResponse({'error': 'Name and Key Name are required.'}, status=400)

    # Check for duplicate key
    if EnrollmentKey.objects.filter(key=key_name).exists():
        return JsonResponse({'error': 'This Key Name already exists. Please choose or generate a different one.'}, status=400)

    # Convert max_uses
    if max_uses_raw.lower() in ('', 'null', 'none'):
        max_uses = None
    else:
        try:
            max_uses = int(max_uses_raw)
        except ValueError:
            return JsonResponse({'error': 'Invalid max_uses value.'}, status=400)
        
        if max_uses > 999999999:
            return JsonResponse({'error': 'Max Number of Uses is too large. Please enter a vale smaller than 999999999.'}, status=400)

    # Create the key
    key = EnrollmentKey.objects.create(
        name=name,
        key=key_name,
        active=active,
        max_uses=max_uses,
    )

    # Assign courses if provided
    if course_ids_raw:
        course_ids = [cid.strip() for cid in course_ids_raw.split(',') if cid.strip()]
        key.courses.set(course_ids)

    if is_create_page == 'true':
        messages.success(request, 'Enrollment key created successfully!')

    return JsonResponse({
        'id': key.id,
        'name': key.name,
        'is_create_page': is_create_page,
    }, status=201)

@require_POST
def edit_enrollment_key(request):
    id = request.POST.get('id')
    name = request.POST.get('name', '').strip()
    key_name = request.POST.get('key_name', '').strip()
    course_ids_raw = request.POST.get('course_ids')
    active = request.POST.get('active') == 'true'
    max_uses_raw = request.POST.get('max_uses', '').strip()
    is_create_page = request.POST.get('isCreatePage')

    if not name or not key_name:
        return JsonResponse({'error': 'Name and Key Name are required.'}, status=400)

    # Check uniqueness (exclude current key)
    if EnrollmentKey.objects.filter(key=key_name).exclude(id=id).exists():
        return JsonResponse({'error': 'This Key Name already exists. Please choose or generate a different one.'}, status=400)

    # Parse max_uses
    if max_uses_raw.lower() in ('', 'null', 'none'):
        max_uses = None
    else:
        try:
            max_uses = int(max_uses_raw)
        except ValueError:
            return JsonResponse({'error': 'Invalid max_uses value.'}, status=400)
        
        if max_uses < 0:
            return JsonResponse({'error': 'Max Uses must be 0 or greater.'}, status=400)
        if max_uses > 999999999:
            return JsonResponse({'error': 'Max Uses is too large. Please enter a smaller value.'}, status=400)

    # Update the key
    try:
        key = EnrollmentKey.objects.get(id=id)
    except EnrollmentKey.DoesNotExist:
        return JsonResponse({'error': 'Enrollment key not found.'}, status=404)

    key.name = name
    key.key = key_name
    key.active = active
    key.max_uses = max_uses
    key.save()

    # Update courses
    if course_ids_raw:
        course_ids = [cid.strip() for cid in course_ids_raw.split(',') if cid.strip()]
        key.courses.set(course_ids)
    else:
        key.courses.clear()

    if is_create_page == 'true':
        messages.success(request, 'Enrollment key updated successfully!')

    return JsonResponse({
        'id': key.id,
        'name': key.name,
        'is_create_page': is_create_page,
    }, status=200)

@require_POST
@login_required
def submit_enrollment_key(request):
    key_name = request.POST.get('key_name', '').strip()

    # Validate key exists
    try:
        key = EnrollmentKey.objects.get(key=key_name)
    except EnrollmentKey.DoesNotExist:
        return JsonResponse({'error': "Hmm... we couldn't find a matching enrollment key. Please double-check and try again."}, status=400)

    # Validate if key is still usable
    if not key.is_valid():
        return JsonResponse({'error': 'This enrollment key is inactive or has reached its usage limit.'}, status=400)

    courses = key.courses.all()
    if not courses.exists():
        return JsonResponse({'error': 'No courses are associated with this key.'}, status=400)

    user = request.user
    enrolled_courses = []
    already_enrolled = []

    for course in courses:
        user_course, created = UserCourse.objects.get_or_create(user=user, course=course)

        print('SUBMIT ENROLLMENT KEY')

        if created:
            # Assign first lesson
            first_lesson = Lesson.objects.filter(module__course=course).order_by('module__order', 'order').first()
            if first_lesson:
                user_course.lesson_id = first_lesson.id
                user_course.save()

            for module in course.modules.all():
                ump = UserModuleProgress.objects.create(user_course=user_course, module=module)

                for lesson in module.lessons.all():
                    UserLessonProgress.objects.create(user_module_progress=ump, lesson=lesson)

            enrolled_courses.append(course.title)

            # Log activity
            try:
                ActivityLog.objects.create(
                    user=user,
                    action_performer=user,
                    action_target=user,
                    action_type='user_enrolled',
                    action=f"enrolled in: {course.title}",
                    user_groups=', '.join(group.name for group in user.groups.all()),
                )
            except Exception as e:
                print(f"Failed to log activity for {course.title}: {e}")
        else:
            already_enrolled.append(course.title)

    # Increment usage
    key.uses += 1
    key.save()

    return JsonResponse({
        'enrolled_courses': enrolled_courses,
        'already_enrolled': already_enrolled,
        'message': f"You were enrolled in {len(enrolled_courses)} new course(s)." if enrolled_courses else "You are already enrolled in all courses tied to this key."
    }, status=200)


@require_POST
@login_required
def manage_assignment(request):
    assignment_id = request.POST.get('id')
    status = request.POST.get('status', '').strip()
    review_notes = request.POST.get('review_notes', '').strip()
    is_create_page = request.POST.get('isCreatePage')

    if not assignment_id:
        return JsonResponse({'error': 'Missing assignment ID.'}, status=400)

    try:
        assignment_progress = UserAssignmentProgress.objects.get(id=assignment_id)
    except UserAssignmentProgress.DoesNotExist:
        return JsonResponse({'error': 'Assignment progress not found.'}, status=404)

    if status not in dict(UserAssignmentProgress.STATUS_CHOICES):
        return JsonResponse({'error': 'Invalid status value.'}, status=400)

    assignment_progress.status = status
    assignment_progress.review_notes = review_notes
    assignment_progress.reviewed_by = request.user
    assignment_progress.reviewed_at = now()
    assignment_progress.save()

    user_course = UserCourse.objects.filter(user=assignment_progress.user, course=assignment_progress.course).first()
    course_lesson = assignment_progress.lesson.id if assignment_progress.lesson else (user_course.lesson_id if user_course else None)

    if status == 'rejected':
        body = f"Your assignment <strong>{assignment_progress.assignment.title}</strong> was rejected. Please re-submit your assignment for additional review."
        if course_lesson:
            body += f" <span class='open-course-link' onclick='launchCourse({course_lesson})'>Open Course</span>"
        if review_notes:
            body += f" Notes from reviewer: {review_notes}"

        Message.objects.create(
            subject='Your assignment was rejected',
            body=body,
            sender=request.user,
            message_type='alert',
        ).recipients.add(assignment_progress.user)

    if is_create_page == 'true':
        messages.success(request, 'Assignment updated successfully!')

    return JsonResponse({
        'id': assignment_progress.id,
        'review_notes': assignment_progress.review_notes,
        'status': assignment_progress.status,
        'is_create_page': is_create_page,
    }, status=200)

# This is setting the last_opened_course to populate the resume widget on the dashboard
@require_POST
@login_required
def opened_course_data(request):
    lesson_id = request.POST.get('lesson_id', '').strip()

    print("🔍 Hit opened_course_data view", lesson_id)


    if not lesson_id:
        return JsonResponse({'error': 'Lesson ID is required.'}, status=400)

    # Get the lesson and its course
    try:
        lesson = Lesson.objects.select_related('module__course').get(id=lesson_id)
        course = lesson.module.course
    except Lesson.DoesNotExist:
        return JsonResponse({'error': 'Invalid lesson ID.'}, status=404)

    # Check enrollment
    user = request.user
    is_enrolled = UserCourse.objects.filter(user=user, course=course).exists()

    if not is_enrolled:
        return JsonResponse({'error': 'You are not enrolled in this course.'}, status=403)

    # Update the user's profile
    try:
        profile = user.profile
        profile.last_opened_course = course
        profile.last_opened_lesson_id = lesson_id
        profile.save()
    except Profile.DoesNotExist:
        return JsonResponse({'error': 'User profile not found.'}, status=404)

    return JsonResponse({
        'course_id': course.id,
        'course_title': course.title,
        'message': 'Last opened course updated successfully.'
    }, status=200)

'''
def upload_lesson_file(request):
    if request.method == 'POST':
        # Check if a file is uploaded
        if request.FILES.get('file'):
            file = request.FILES['file']
            file_path = default_storage.save(f'lessons/{file.name}', ContentFile(file.read()))
            uploaded_file = UploadedFile.objects.create(title=file.name, file=file)
        # Check if a URL is provided
        elif request.POST.get('url'):
            url = request.POST.get('url')
            uploaded_file = UploadedFile.objects.create(title=url, url=url)
        else:
            return JsonResponse({'error': 'No file or URL uploaded'}, status=400)

        return JsonResponse({'file_id': uploaded_file.id})  # Return the ID of the uploaded file

    return JsonResponse({'error': 'Invalid request'}, status=400)
'''
''''''
@login_required
def upload_lesson_file(request):
    if request.method == 'POST':
        print("Received POST request")

        # Check if a file is uploaded
        if request.FILES.get('file'):
            uploaded_file = request.FILES['file']
            print(f"Uploaded file name: {uploaded_file.name}")

            # Check if the uploaded file is a zip file
            if uploaded_file.name.endswith('.zip'):
                print("Uploaded file is a ZIP file")

                # Save the uploaded zip file temporarily
                fs = FileSystemStorage(location='/tmp')
                filename = fs.save(uploaded_file.name, uploaded_file)
                file_path = fs.path(filename)

                # Define a consistent folder name for extraction
                extract_folder_name = os.path.splitext(uploaded_file.name)[0]  # Use the file name without extension
                extract_path = f'/tmp/{extract_folder_name}'

                # Create folder if not exists
                os.makedirs(extract_path, exist_ok=True)

                # Extract the zip file
                try:
                    with zipfile.ZipFile(file_path, 'r') as zip_ref:
                        zip_ref.extractall(extract_path)
                        print(f"Extracted ZIP file to: {extract_path}")
                except zipfile.BadZipFile:
                    return JsonResponse({'error': 'The uploaded file is not a valid ZIP file.'}, status=400)

                # Locate the SCORM entry point (index.html)
                scorm_entry_point_relative = None
                scormcontent_folder = os.path.join(extract_path, 'scormcontent')
                entry_file_path = os.path.join(scormcontent_folder, 'index.html')
                
                if os.path.exists(entry_file_path):
                    scorm_entry_point_relative = f'{extract_folder_name}/scormcontent/index.html'
                else:
                    print("index.html not found in scormcontent folder")
                    return JsonResponse({'error': 'The uploaded SCORM package does not contain a valid entry point in scormcontent/index.html.'}, status=400)

                scorm_entry_point_relative = scorm_entry_point_relative.replace("\\", "/")
                # Upload the extracted files to S3
                secret_name = "COGNITO_SECRET"
                secrets = get_secret(secret_name)

                if not secrets:
                    print("Failed to retrieve secrets.")
                    return JsonResponse({'error': 'Failed to retrieve AWS credentials.'}, status=500)

                aws_access_key_id = secrets.get('AWS_ACCESS_KEY_ID')
                aws_secret_access_key = secrets.get('AWS_SECRET_ACCESS_KEY')

                if aws_access_key_id is None or aws_secret_access_key is None:
                    print("AWS credentials are not found in the secrets.")
                    return JsonResponse({'error': 'AWS credentials are not found in the secrets.'}, status=500)

                # Set up boto3 S3 client
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=aws_access_key_id,
                    aws_secret_access_key=aws_secret_access_key,
                    region_name=settings.AWS_S3_REGION_NAME
                )

                bucket_name = settings.AWS_STORAGE_BUCKET_NAME

                # Upload the extracted files to S3 using the standardized folder name
                for root, dirs, files in os.walk(extract_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        s3_key = f'media/default/uploads/{extract_folder_name}/{os.path.relpath(file_path, extract_path)}'
                        s3_key = s3_key.replace("\\", "/")
                        print(f"Uploading file to S3 with key: {s3_key}")  # Debugging statement
                        s3_client.upload_file(file_path, bucket_name, s3_key)

                # Create a reference for the uploaded file in the database and save the SCORM entry point path
                uploaded_file_entry = UploadedFile.objects.create(
                    title=uploaded_file.name,
                    file=None,
                    scorm_entry_point=scorm_entry_point_relative  # Store the full entry point path relative to the bucket
                )
                print(f"Uploaded file entry created with ID: {uploaded_file_entry.id}, scorm_entry_point: {scorm_entry_point_relative}")


                return JsonResponse({'file_id': uploaded_file_entry.id})
            else:
                # If not a zip file, save it directly
                file_path = default_storage.save(f'lessons/{uploaded_file.name}', ContentFile(uploaded_file.read()))
                uploaded_file_entry = UploadedFile.objects.create(title=uploaded_file.name, file=uploaded_file)
                print(f"Uploaded non-ZIP file entry created with ID: {uploaded_file_entry.id}")

                return JsonResponse({'file_id': uploaded_file_entry.id})
        
        # No file provided in the request
        print("No file uploaded in the request.")
        return JsonResponse({'error': 'No file uploaded.'}, status=400)

    # If request method is not POST
    print("Invalid request method")
    return JsonResponse({'error': 'Invalid request'}, status=400)


# Helper function to upload extracted files to S3
def upload_extracted_to_s3(directory, lesson_id):
    # Set up S3 client with credentials
    secret_name = "COGNITO_SECRET"
    secrets = get_secret(secret_name)

    if not secrets:
        print("Failed to retrieve secrets.")
        return

    aws_access_key_id = secrets.get('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = secrets.get('AWS_SECRET_ACCESS_KEY')

    if aws_access_key_id is None or aws_secret_access_key is None:
        print("AWS credentials are not found in the secrets.")
        return

    # Set up boto3 S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=settings.AWS_S3_REGION_NAME
    )

    bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    # Upload each file in the directory to S3
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            s3_key = f'media/default/uploads/lesson_{lesson_id}/{os.path.relpath(file_path, directory)}'
            s3_client.upload_file(file_path, bucket_name, s3_key)

    print(f"Uploaded all files for lesson {lesson_id} to S3.")

def get_file_id_from_path(file_path):
    # Check if a record for the file already exists in the database
    try:
        # Assuming you have a model called Lesson
        lesson_file, created = Lesson.objects.get_or_create(
            file_path=file_path,
            defaults={'file_name': os.path.basename(file_path)}  # Add other fields as needed
        )
        return lesson_file.id  # Return the file ID
    except Exception as e:
        # Log the error or handle it as needed
        return None  # Return None or an appropriate error response
    
@require_POST
def delete_object_ajax(request):
    try:
        # Parse the JSON request body
        data = json.loads(request.body)
        object_type = data.get('type')
        object_id = data.get('id')

        if not object_type or not object_id:
            return JsonResponse({"error": "Missing 'type' or 'id' in the request."}, status=400)

        # Dynamically get the model class from the object_type
        model_class = apps.get_model('content', object_type)

        # Get the object by its ID and delete it
        obj = model_class.objects.get(id=object_id)
        obj.delete()

        return JsonResponse({"message": f"{object_type} with ID {object_id} deleted successfully."})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data."}, status=400)
    except LookupError:
        return JsonResponse({"error": f"Invalid object type: {object_type}"}, status=400)
    except model_class.DoesNotExist:
        return JsonResponse({"error": f"{object_type} with ID {object_id} does not exist."}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
# Categories
@login_required
def admin_categories(request):
    sort_by = request.GET.get('sort_by', 'name_desc')
    order_by_field = 'name'  # Default sorting field
    query_string = request.GET.get('query')

    query = Q()
    active_filters = {}

    # Apply the general search query if provided
    if query_string:
        query &= (
            Q(name__icontains=query_string) |
            Q(parent_category__name__icontains=query_string)
        )
        active_filters['query'] = query_string

    # Build the query dynamically based on the provided filter parameters
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]  # Extract field name after 'filter_'
            query &= Q(**{f"{field_name}__icontains": value})
            active_filters[field_name] = value

    # Define a dictionary to map sort options to user-friendly text
    sort_options = {
        'name_asc': 'Name (A-Z)',
        'name_desc': 'Name (Z-A)',
        'parent_category__name_asc': 'Parent Name (A-Z)',
        'parent_category__name_desc': 'Parent Name (Z-A)',      
    }

    # Determine the order by field
    if sort_by == 'name_asc':
        order_by_field = 'name'
    elif sort_by == 'name_desc':
        order_by_field = '-name'
    elif sort_by == 'parent_category__name_asc':
        order_by_field = 'parent_category__name'
    elif sort_by == 'parent_category__name_desc':
        order_by_field = '-parent_category__name'


    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Name (Z-A)')

    # Apply the filtering and sorting to the users list
    courses_list = Category.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered users_list
    paginator = Paginator(courses_list, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'categories/categories.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
    })

@login_required
def add_categories(request):
    category = Category.objects.all()

    context = {
        'category_list': category,
    }

    return render(request, 'categories/add_category.html', context)

@login_required
def edit_categories(request, category_id):
    category = get_object_or_404(Category, pk=category_id)

    context = {
        'category': category,
    }

    return render(request, 'categories/edit_category.html', context)

# Assignments
@login_required
def admin_assignments(request):
    sort_by = request.GET.get('sort_by', 'completed_at_desc')
    order_by_field = '-completed_at'  # Default sorting field
    query_string = request.GET.get('query')

    query = Q()
    active_filters = {}

    # Apply the general search query if provided
    if query_string:
        query &= (
            Q(course__title__icontains=query_string) |
            Q(assignment__title__icontains=query_string) |
            Q(user__first_name__icontains=query_string) |
            Q(user__last_name__icontains=query_string) |
            Q(status__icontains=query_string) |
            Q(completed_at__icontains=query_string)
        )
        active_filters['query'] = query_string

    # Build the query dynamically based on the provided filter parameters
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]  # Extract field name after 'filter_'
            query &= Q(**{f"{field_name}__icontains": value})
            active_filters[field_name] = value

    # Define a dictionary to map sort options to user-friendly text
    sort_options = {
        'completed_at_asc': 'Submitted At <i class="fa-regular fa-arrow-up"></i>',
        'completed_at_desc': 'Submitted At <i class="fa-regular fa-arrow-down"></i>',
        'course_title_asc': 'Course (A-Z)',
        'course_title_desc': 'Course (Z-A)',
        'assignment_title_asc': 'Assignment (A-Z)',
        'assignment_title_desc': 'Assignment (Z-A)',
        'first_name_asc': 'First Name (A-Z)',
        'first_name_desc': 'First Name (Z-A)',
        'last_name_asc': 'Last Name (A-Z)',
        'last_name_desc': 'Last Name (Z-A)',
        'status_asc': 'Status (A-Z)',
        'status_desc': 'Status (Z-A)',
    }

    order_by_field_map = {
        'completed_at_asc': 'completed_at',
        'completed_at_desc': '-completed_at',
        'course_title_asc': 'course__title',
        'course_title_desc': '-course__title',
        'assignment_title_asc': 'assignment__title',
        'assignment_title_desc': '-assignment__title',
        'first_name_asc': 'user__first_name',
        'first_name_desc': '-user__first_name',
        'last_name_asc': 'user__last_name',
        'last_name_desc': '-user__last_name',
        'status_asc': 'status',
        'status_desc': '-status',
    }

    order_by_field = order_by_field_map.get(sort_by, '-completed_at')

    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Submitted at <i class="fa-regular fa-arrow-down" aria-hidden="true"></i>')

    # Apply the filtering and sorting to the users list
    courses_list = UserAssignmentProgress.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered users_list
    paginator = Paginator(courses_list, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'assignments/assignments.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
    })

@login_required
def manage_assignments(request, assignment_id):
    assignment = get_object_or_404(UserAssignmentProgress, pk=assignment_id)
    user = request.user
    upload = assignment.assignment

    approval_type = upload.approval_type
    user_role = getattr(user.profile, 'role', None)

    # Approval logic
    can_approve = False
    if approval_type in [None, 'None', '']:
        can_approve = True
    elif approval_type == 'instructor' and (user_role == 'instructor' or user.profile.role == 'Admin'):
        can_approve = True
    elif approval_type == 'admin' and user.profile.role == 'Admin':
        can_approve = True
    elif approval_type == 'other' and user in upload.approvers.all():
        can_approve = True

    print(can_approve)

    user_course = UserCourse.objects.filter(
        user=assignment.user,
        course=assignment.course
    ).first()

    context = {
        'assignment': assignment,
        'user_course': user_course,
        'can_approve': can_approve,
        'is_manage_page': True
    }
    return render(request, 'assignments/manage_assignment.html', context)

@login_required
def admin_enrollment_keys(request):
    sort_by = request.GET.get('sort_by', 'name_desc')
    order_by_field = 'name'  # Default sorting field
    query_string = request.GET.get('query')

    query = Q()
    active_filters = {}

    # Apply the general search query if provided
    if query_string:
        query &= (
            Q(name__icontains=query_string) |
            Q(key__icontains=query_string)
        )
        active_filters['query'] = query_string

    # Build the query dynamically based on the provided filter parameters
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]  # Extract field name after 'filter_'
            query &= Q(**{f"{field_name}__icontains": value})
            active_filters[field_name] = value

    # Define a dictionary to map sort options to user-friendly text
    sort_options = {
        'name_asc': 'Name (A-Z)',
        'name_desc': 'Name (Z-A)',
        'key_name_asc': 'Key Name (A-Z)',
        'key_name_desc': 'Key Name (Z-A)',
        'uses_asc': 'Times Used (A-Z)',
        'uses_desc': 'Times Used (Z-A)', 
        'max_uses_asc': 'Max Uses (A-Z)',
        'max_uses_desc': 'Max Uses (Z-A)',   
    }

    # Determine the order by field
    if sort_by == 'name_asc':
        order_by_field = 'name'
    elif sort_by == 'name_desc':
        order_by_field = '-name'
    elif sort_by == 'key_name_asc':
        order_by_field = 'key'
    elif sort_by == 'key_name_desc':
        order_by_field = '-key'
    elif sort_by == 'uses_asc':
        order_by_field = 'uses'
    elif sort_by == 'uses_desc':
        order_by_field = '-uses'
    elif sort_by == 'max_uses_asc':
        order_by_field = 'max_uses'
    elif sort_by == 'max_uses_desc':
        order_by_field = '-max_uses'


    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Name (Z-A)')

    # Apply the filtering and sorting to the keys list
    keys_list = EnrollmentKey.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered keys_list
    paginator = Paginator(keys_list, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'enrollmentKeys/enrollment_keys.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
    })

@login_required
def add_enrollment_keys(request):
    enrollment_key = EnrollmentKey.objects.all()

    context = {
        'key_list': enrollment_key,
    }

    return render(request, 'enrollmentKeys/add_enrollment_key.html', context)

@login_required
def edit_enrollment_keys(request, key_id):
    enrollment_key = get_object_or_404(EnrollmentKey, pk=key_id)

    context = {
        'key': enrollment_key,
    }

    return render(request, 'enrollmentKeys/edit_enrollment_key.html', context)

@require_POST
def learner_login_data(request):
    range_label = request.POST.get('range', 'Last 12 months')
    today = now()
    if range_label == 'Last 7 days':
        start_date = today - timedelta(days=7)
        truncate = TruncDate
        date_format = '%b %d'
    elif range_label == 'Last 30 days':
        start_date = today - timedelta(days=30)
        truncate = TruncDate
        date_format = '%b %d'
    elif range_label == 'Last 6 months':
        start_date = today - timedelta(days=180)
        truncate = TruncMonth
        date_format = '%b %Y'
    else:
        start_date = today - timedelta(days=365)
        truncate = TruncMonth
        date_format = '%b %Y'

    logins = (
        User.objects
        .filter(last_login__gte=start_date)
        .annotate(period=truncate('last_login'))
        .values('period')
        .annotate(count=Count('id'))
        .order_by('period')
    )

    labels = []
    values = []
    for entry in logins:
        labels.append(entry['period'].strftime(date_format))
        values.append(entry['count'])

    return JsonResponse({'labels': labels, 'values': values, 'total_learners': sum(values)})

@require_POST
def get_question_data(request):
    uuid = request.POST.get('uuid')
    try:
        quiz = Quiz.objects.get(uuid=uuid)
        questions = Question.objects.filter(quizzes=quiz).order_by('questionorder__order')

        data = []
        for q in questions:
            if hasattr(q, 'mcquestion') and q.mcquestion.allows_multiple:
                q_type = 'MRQuestion'
            elif hasattr(q, 'mcquestion'):
                q_type = 'MCQuestion'
            elif hasattr(q, 'tfquestion'):
                q_type = 'TFQuestion'
            elif hasattr(q, 'fitbquestion'):
                q_type = 'FITBQuestion'
            elif hasattr(q, 'essayquestion'):
                q_type = 'EssayQuestion'
            else:
                q_type = 'Question'

            data.append({
                'id': q.id,
                'content': q.content,
                'type': q_type,
            })

        return JsonResponse({'success': True, 'questions': data})
    except Quiz.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Quiz not found'})
    
@require_POST
def create_question(request):
    try:
        data = json.loads(request.body)
        quiz_uuid = data.get('quiz_uuid')
        q_type = data.get('type')

        if not quiz_uuid or not q_type:
            return JsonResponse({'success': False, 'error': 'Missing required data'})

        quiz = Quiz.objects.get(uuid=quiz_uuid)

        # Map types to classes
        question_classes = {
            'multiple-choice': MCQuestion,
            'multiple-response': MCQuestion,
            'true-false': TFQuestion,
            'fill-in-the-blank': FITBQuestion,
            'open-response': EssayQuestion,
        }

        QuestionClass = question_classes.get(q_type)
        if not QuestionClass:
            return JsonResponse({'success': False, 'error': 'Invalid question type'})

        # Create question with type-specific defaults
        if q_type == 'true-false':
            new_question = QuestionClass.objects.create(
                content="Enter question content here...",
                correct=False  # Default answer
            )
        elif q_type == 'multiple-choice':
            new_question = QuestionClass.objects.create(
                content="Enter question content here...",
                answer_order='none'  # optional field in MCQuestion
            )
        elif q_type == 'multiple-response':
            new_question = MCQuestion.objects.create(
                content="Enter question content here...",
                answer_order='none',
                allows_multiple=True 
            )
        elif q_type == 'fill-in-the-blank':
            new_question = QuestionClass.objects.create(
                content="Enter question content here...",
                case_sensitive=False,
                strip_whitespace=True
            )
        elif q_type == 'open-response':
            new_question = EssayQuestion.objects.create(
                content="Enter question content here...",
                instructions="",
                rubric=""
            )
        else:
            return JsonResponse({'success': False, 'error': 'Unsupported question type'})

        # Assign order in quiz
        order = QuestionOrder.objects.filter(quiz=quiz).count()

        QuestionOrder.objects.create(
            quiz=quiz,
            question=new_question,
            order=order
        )

        return JsonResponse({'success': True, 'question_id': new_question.id})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
@require_POST
def update_question_order(request):
    try:
        data = json.loads(request.body)
        quiz_uuid = data['quiz_uuid']
        question_ids = data['ordered_ids']  # e.g., [3, 5, 1, 4]

        quiz = Quiz.objects.get(uuid=quiz_uuid)

        for order, qid in enumerate(question_ids):
            QuestionOrder.objects.update_or_create(
                quiz=quiz,
                question_id=qid,
                defaults={'order': order}
            )

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
@require_POST
def update_answer_order(request):
    try:
        data = json.loads(request.body)
        ordered_ids = data.get('ordered_ids', [])
        question_type = data.get('question_type')

        Model = Answer if question_type in ['MCQuestion', 'MRQuestion'] else EssayPrompt

        for index, answer_id in enumerate(ordered_ids):
            Model.objects.filter(id=answer_id).update(order=index)

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
@require_POST
def delete_question(request):
    try:
        data = json.loads(request.body)
        question_id = data.get('question_id')

        if not question_id:
            return JsonResponse({'success': False, 'error': 'Missing question_id'})

        question = Question.objects.get(id=question_id)
        question.delete()

        return JsonResponse({'success': True})

    except Question.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Question not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_POST
def get_answer_data(request):
    try:
        data = json.loads(request.body)
        question_id = data.get('question_id')
        question = Question.objects.get(id=question_id)

        q_type = 'Question'
        answers = []
        randomize = getattr(question, 'randomize_answer_order', False)
        allows_multiple = False
        case_sensitive = False
        strip_whitespace = False
        instructions = None
        rubric = None

        if hasattr(question, 'mcquestion'):
            mc = question.mcquestion
            allows_multiple = getattr(mc, 'allows_multiple', False)
            q_type = 'MRQuestion' if allows_multiple else 'MCQuestion'
            answers = [
                {
                    'id': a.id,
                    'text': a.text,
                    'is_correct': a.is_correct
                } for a in question.answers.all().order_by('order')
            ]

        elif hasattr(question, 'tfquestion'):
            tf = question.tfquestion
            q_type = 'TFQuestion'
            answers = [
                {'label': 'True', 'value': True, 'is_correct': tf.correct is True},
                {'label': 'False', 'value': False, 'is_correct': tf.correct is False}
            ]

        elif hasattr(question, 'fitbquestion'):
            fitb = question.fitbquestion
            q_type = 'FITBQuestion'
            case_sensitive = getattr(fitb, 'case_sensitive', False)
            strip_whitespace = getattr(fitb, 'strip_whitespace', False)
            answers = [
                {'id': a.id, 'text': a.content}
                for a in fitb.acceptable_answers.all().order_by('order')
            ]

        elif hasattr(question, 'essayquestion'):
            essay = question.essayquestion
            q_type = 'EssayQuestion'
            instructions = essay.instructions
            rubric = essay.rubric
            answers = [
                {'id': p.id, 'text': p.prompt_text, 'rubric': p.rubric}
                for p in essay.prompts.all().order_by('order')
            ]

        return JsonResponse({
            'success': True,
            'question': {
                'id': question.id,
                'content': question.content,
                'category_id': question.category.id if question.category else None,
                'category_name': question.category.name if question.category else '',
                'explanation': question.explanation,
                'type': q_type,
                'randomize_answer_order': randomize,
                'case_sensitive': case_sensitive,
                'strip_whitespace': strip_whitespace,
                'allows_multiple': allows_multiple,
                'instructions': instructions,
                'rubric': rubric,
                'answers': answers,
                'media_items': [
                    {
                        'id': m.id,
                        'source_type': m.source_type,
                        'title': m.title,
                        'embed_code': m.embed_code,
                        'input_type': m.input_type,
                        'file_url': m.file.url if m.source_type == 'upload' and m.file else '',
                        'file_name': m.file.name.split('/')[-1] if m.source_type == 'upload' and m.file else '',
                        'url_from_library': m.url_from_library,
                        'type_from_library': m.type_from_library or '',
                    } for m in question.media_items.all()
                ]
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
@require_POST
def save_question_data(request):
    
    try:
        data = json.loads(request.body)
        question_id = data.get('question_id')
        q_type = data.get('type')
        category_id = data.get('category')
        content = data.get('content')
        randomize_answer_order = data.get('randomize_answer_order')
        case_sensitive = bool(data.get('case_sensitive', False))
        strip_whitespace = bool(data.get('strip_whitespace', False))
        explanation = data.get('explanation')

        if not question_id or not q_type:
            return JsonResponse({'success': False, 'error': 'Missing question ID or type'})

        question = Question.objects.get(id=question_id)
        question.content = content
        if category_id:
            try:
                question.category = Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Invalid category ID'})
        else:
            question.category = None

        question.explanation = explanation
        question.randomize_answer_order = randomize_answer_order
        question.save()

        # Save answers
        if q_type == 'MCQuestion':
            existing = {a.id: a for a in Answer.objects.filter(question=question)}
            incoming_ids = set()

            for ans in data['answers']:
                answer_id = ans.get('id')
                incoming_ids.add(int(answer_id)) if answer_id else None

                if answer_id and int(answer_id) in existing:
                    a = existing[int(answer_id)]
                    a.text = ans['text']
                    a.is_correct = ans['is_correct']
                    a.order = ans.get('order', 0)
                    a.save()
                else:
                    Answer.objects.create(
                        question=question,
                        text=ans['text'],
                        is_correct=ans['is_correct'],
                        order=ans.get('order', 0)
                    )

            # Delete removed
            for old_id in existing:
                if old_id not in incoming_ids:
                    existing[old_id].delete()

        elif q_type == 'TFQuestion':
            tf = TFQuestion.objects.get(id=question_id)
            tf.correct = data.get('correct', False)
            tf.save()

        elif q_type == 'FITBQuestion':
            fitb = FITBQuestion.objects.get(id=question_id)
            fitb.case_sensitive = case_sensitive
            fitb.strip_whitespace = strip_whitespace
            fitb.save()
            
            existing = {a.id: a for a in fitb.acceptable_answers.all()}
            incoming_ids = set()

            for ans in data['answers']:
                answer_id = ans.get('id')
                incoming_ids.add(int(answer_id)) if answer_id else None

                if answer_id and int(answer_id) in existing:
                    a = existing[int(answer_id)]
                    a.content = ans['text']
                    a.save()
                else:
                    FITBAnswer.objects.create(
                        question=fitb,
                        content=ans['text']
                    )

            for old_id in existing:
                if old_id not in incoming_ids:
                    existing[old_id].delete()

        elif q_type == 'EssayQuestion':
            essay = EssayQuestion.objects.get(id=question_id)
            essay.instructions = data.get('instructions', '')
            essay.rubric = data.get('rubric', '')
            essay.save()

            existing = {p.id: p for p in essay.prompts.all()}
            incoming_ids = set()

            for prompt in data['answers']:
                prompt_id = prompt.get('id')
                incoming_ids.add(int(prompt_id)) if prompt_id else None

                if prompt_id and int(prompt_id) in existing:
                    p = existing[int(prompt_id)]
                    p.prompt_text = prompt['text']
                    p.rubric = prompt.get('rubric', '')
                    p.order = prompt.get('order', 0)
                    p.save()
                else:
                    EssayPrompt.objects.create(
                        question=essay,
                        prompt_text=prompt['text'],
                        rubric=prompt.get('rubric', ''),
                        order=prompt.get('order', 0)
                    )

            for old_id in existing:
                if old_id not in incoming_ids:
                    existing[old_id].delete()

        media_items = data.get('media_items', [])
        existing_media = {m.id: m for m in question.media_items.all()}
        incoming_ids = set()

        for item in media_items:
            media_id = item.get('id')
            source_type = item.get('source_type')
            title = item.get('title', '')
            embed_code = item.get('embed_code', '')
            input_type = item.get('input_type', '')
            url_from_library = item.get('url_from_library', '')
            type_from_library = item.get('type_from_library', '')
            
            if source_type == 'upload' and not media_id:
                continue
            if source_type == 'library' and not url_from_library:
                continue
            if source_type == 'embed' and not embed_code:
                continue

            if media_id:
                media = QuestionMedia.objects.filter(id=media_id).first()
                if media:
                    if not media.question_id:
                        media.question = question
                    media.title = title
                    media.embed_code = embed_code
                    media.input_type = input_type
                    media.url_from_library = url_from_library
                    media.type_from_library = type_from_library
                    media.save()
                    incoming_ids.add(media.id)
            else:
                media = QuestionMedia.objects.create(
                    question=question,
                    source_type=source_type,
                    title=title,
                    embed_code=embed_code,
                    input_type=input_type,
                    url_from_library=url_from_library,
                    type_from_library=type_from_library
                )
                incoming_ids.add(media.id)

        for old_id in existing_media:
            if old_id not in incoming_ids:
                existing_media[old_id].delete()

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
@require_POST
def change_question_type(request):
    try:
        data = json.loads(request.body)
        question_id = data.get('question_id')
        new_type = data.get('new_type')

        question = Question.objects.get(id=question_id)

        if new_type not in ['MCQuestion', 'MRQuestion']:
            return JsonResponse({'success': False, 'error': 'Unsupported question type'})

        # Update the allows_multiple flag (used in frontend)
        question.allows_multiple = (new_type == 'MRQuestion')
        question.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_POST
def upload_question_media(request):
    try:
        file = request.FILES.get('file')
        if not file:
            return JsonResponse({'success': False, 'error': 'No file provided'})

        media = QuestionMedia.objects.create(
            file=file,
            source_type='upload'
        )

        return JsonResponse({
            'success': True,
            'id': media.id,
            'file_url': media.file.url,
            'file_name': media.file.name.split('/')[-1],
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
@require_POST
def save_quiz_settings(request):
    try:
        data = json.loads(request.body)
        uuid = data.get('uuid')
        quiz = get_object_or_404(Quiz, uuid=uuid)

        quiz.title = data.get('title', '')
        quiz.description = data.get('description', '')
        category_id = data.get('category_id')
        quiz.success_text = data.get('success_text')
        quiz.fail_text = data.get('fail_text')
        quiz.quiz_material = data.get('quiz_material')
        quiz.singular_quiz_rules = data.get('singular_quiz_rules')
        quiz.ai_grade_essay = bool(data.get('ai_grade_essay'))
        quiz.ai_grade_rubric = data.get('ai_grade_rubric')

        if category_id:
            try:
                quiz.category = Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Invalid category ID'})
        else:
            quiz.category = None

        quiz.save()

        references = data.get('references', [])
        existing_refs = {r.id: r for r in quiz.references.all()}
        incoming_ids = set()

        for ref_data in references:
            ref_id = ref_data.get('id')
            title = ref_data.get('title', '')
            url = ref_data.get('url_from_library', '')
            ref_type = ref_data.get('type_from_library', '')
            source_type = ref_data.get('source_type', 'upload')

            if ref_id:
                ref = QuizReference.objects.filter(id=ref_id).first()
                if ref:
                    ref.title = title
                    ref.url_from_library = url
                    ref.type_from_library = ref_type
                    ref.source_type = source_type
                    ref.quiz = quiz
                    ref.save()
                    incoming_ids.add(ref.id)
            else:
                # Create new reference
                new_ref = QuizReference.objects.create(
                    quiz=quiz,
                    title=title,
                    url_from_library=url,
                    type_from_library=ref_type,
                    source_type=source_type
                )
                incoming_ids.add(new_ref.id)

        # Delete removed references
        for old_id in existing_refs:
            if old_id not in incoming_ids:
                existing_refs[old_id].delete()

        return JsonResponse({'success': True, 'title': quiz.title})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_POST
def upload_reference(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'success': False, 'error': 'No file uploaded'})

    reference = QuizReference.objects.create(
        file=uploaded_file,
        title=uploaded_file.name,
        source_type='upload'
    )

    mime_type = uploaded_file.content_type
    if 'pdf' in mime_type:
        type_label = 'pdf'
    elif 'image' in mime_type:
        type_label = 'image'
    else:
        type_label = 'document'

    reference.type_from_library = type_label
    reference.save()

    return JsonResponse({
        'success': True,
        'id': reference.id,
        'file_url': reference.file.url,
        'file_name': reference.title,
        'type': type_label,
    })

def get_quiz_references(request, uuid):
    try:
        quiz = Quiz.objects.get(uuid=uuid)
        references = quiz.references.all()
 
        data = []
        for ref in references:
            try:
                file_url = ref.get_file_url()
                print(f"[DEBUG] Ref ID {ref.id} | Type: {ref.source_type} | File Field: {ref.file} | URL: {file_url}")
                data.append({
                    'id': ref.id,
                    'title': ref.title,
                    'url_from_library': file_url,
                    'type_from_library': ref.type_from_library,
                    'source_type': ref.source_type,
                })
            except Exception as e:
                print(f"[ERROR] Failed to load reference ID {ref.id}: {e}")
        return JsonResponse({'success': True, 'references': data})
 
    except Quiz.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Quiz not found'})
    
    except Exception as e:
        print(f"[ERROR] Unexpected error in get_quiz_references: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
def get_file_url(self):
    if self.source_type == 'upload' and self.file:
        return self.file.url  # ← this must be a valid path from your storage
    elif self.source_type == 'library':
        return self.url_from_library
    return ''

def get_subcategories(request):
    parent_id = request.GET.get('parent_id')
    search = request.GET.get('search', '')
    queryset = Category.objects.all()

    if parent_id:
        queryset = queryset.filter(parent_category_id=parent_id)
    else:
        queryset = queryset.filter(parent_category__isnull=True)

    if search:
        queryset = queryset.filter(name__icontains=search)

    categories = queryset.order_by('name').values('id', 'name')
    return JsonResponse({'categories': list(categories)})

def category_question_count(request, category_id):
    """
    Returns the total number of questions for the given category ID.
    """
    category = get_object_or_404(Category, id=category_id)
    
    # If you're using a direct FK like question.category == category
    question_count = Question.objects.filter(category=category).count()

    # If using a tree/hierarchy, and want to include descendants:
    # question_count = Question.objects.filter(category__in=category.get_descendants(include_self=True)).count()

    return JsonResponse({
        'category_id': category.id,
        'question_count': question_count,
    })

def create_template(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title')
            description = data.get('description', '')
            selections = data.get('selections', [])

            if not title or not selections:
                return JsonResponse({'success': False, 'error': 'Missing title or selections'})

            template = QuizTemplate.objects.create(
                title=title,
                description=description,
                created_by=request.user,
                total_questions=sum(sel.get('questionCount', 0) for sel in selections)
            )

            for sel in selections:
                category_sel = TemplateCategorySelection.objects.create(
                    template=template,
                    category_id=sel.get('mainCategoryId'),
                    sub_category1_id=sel.get('subCategory1Id'),
                    sub_category2_id=sel.get('subCategory2Id'),
                    sub_category3_id=sel.get('subCategory3Id'),
                    num_questions=sel.get('questionCount', 0)
                )

                # Fetch matching questions
                matching_qs = get_matching_questions(category_sel)
                for question in matching_qs:
                    TemplateQuestion.objects.create(
                        template=template,
                        question=question,
                        filter_source=category_sel
                    )

            messages.success(request, 'Quiz Template created!')

            return JsonResponse({'success': True, 'template_id': template.id})

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
        
@login_required
def update_quiz_template(request, template_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            template = get_object_or_404(QuizTemplate, id=template_id, created_by=request.user)

            template.title = data.get('title', template.title)
            template.description = data.get('description', '')
            template.total_questions = sum(sel.get('questionCount', 0) for sel in data.get('selections', []))
            template.save()

            # Clear existing category selections
            template.category_selections.all().delete()
            TemplateQuestion.objects.filter(template=template).delete()

            # Recreate selections
            for sel in data['selections']:
                selection = TemplateCategorySelection.objects.create(
                    template=template,
                    category_id=sel.get('mainCategoryId'),
                    sub_category1_id=sel.get('subCategory1Id'),
                    sub_category2_id=sel.get('subCategory2Id'),
                    sub_category3_id=sel.get('subCategory3Id'),
                    num_questions=sel.get('questionCount', 0)
                )
                matching = get_matching_questions(selection)
                for q in matching:
                    TemplateQuestion.objects.create(template=template, question=q, filter_source=selection)

            messages.success(request, 'Quiz Template updated successfully.')

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

        
def get_matching_questions(selection):
    # Use the deepest non-null category to filter questions
    category = (
        selection.sub_category3 or
        selection.sub_category2 or
        selection.sub_category1 or
        selection.category
    )

    if not category:
        return Question.objects.none()  # nothing to match against

    return Question.objects.filter(category=category).order_by('?')[:selection.num_questions]

@login_required
def admin_facial_verification_analytics(request):
    raw_sort_by = request.GET.get('sort_by')
    sort_by = raw_sort_by if raw_sort_by else None
    query_string = request.GET.get('query')
    query = Q()
    active_filters = {}

    # General search
    if query_string:
        query &= (
            Q(user__first_name__icontains=query_string) |
            Q(user__last_name__icontains=query_string) |
            Q(user__email__icontains=query_string) |
            Q(course__title__icontains=query_string) |
            Q(error_type__icontains=query_string) |
            Q(status__icontains=query_string) |
            Q(device_type__icontains=query_string) |
            Q(browser__icontains=query_string)
        )
        active_filters['query'] = query_string

    # Filter by individual fields
    for key, value in request.GET.items():
        if key.startswith('filter_') and value:
            field_name = key[len('filter_'):]
            query &= Q(**{f"{field_name}__icontains": value})
            active_filters[field_name] = value

    # Sort mapping
    sort_options = {
        'timestamp_desc': ('-timestamp', 'Timestamp <i class="fa-regular fa-arrow-down"></i>'),
        'timestamp_asc': ('timestamp', 'Timestamp <i class="fa-regular fa-arrow-up"></i>'),
        'course_title_asc': ('course__title', 'Course Title (A-Z)'),
        'course_title_desc': ('-course__title', 'Course Title (Z-A)'),
        'first_name_asc': ('user__first_name', 'First Name (A-Z)'),
        'first_name_desc': ('-user__first_name', 'First Name (Z-A)'),
        'last_name_asc': ('user__last_name', 'Last Name (A-Z)'),
        'last_name_desc': ('-user__last_name', 'Last Name (Z-A)'),
        'status_asc': ('status', 'Status (A-Z)'),
        'status_desc': ('-status', 'Status (Z-A)'),
        'similarity_asc': ('similarity_score', 'Similarity (Low → High)'),
        'similarity_desc': ('-similarity_score', 'Similarity (High → Low)'),
    }

    order_by_field, sort_label = sort_options.get(sort_by, ('-timestamp', None))

    if sort_by and sort_label:
        active_filters['sort_by'] = sort_label

    if 'sort_by' in request.GET:
        active_filters['sort_by'] = sort_label

    logs = FacialVerificationLog.objects.select_related('user', 'course', 'lesson') \
                                        .filter(query) \
                                        .order_by(order_by_field)

    paginator = Paginator(logs, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'analytics/facial_verification/facial_verification_analytics.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
        'sort_options': sort_options,
    })

def _parse_chart_filters(request):
    """
    Accepts:
      start=YYYY-MM-DD (optional)
      end=YYYY-MM-DD   (optional)
      bucket in {Daily, Weekly, Monthly, Yearly} or {day, week, month, year}
    Defaults: last 30 days, bucket = day.
    """
    raw_bucket = (request.GET.get('bucket') or 'month').strip().lower()
    bucket_map = {
        'day': 'day', 'daily': 'day',
        'week': 'week', 'weekly': 'week',
        'month': 'month', 'monthly': 'month',
        'year': 'year', 'yearly': 'year',
    }
    bucket = bucket_map.get(raw_bucket, 'day')

    start_str = request.GET.get('start')
    end_str = request.GET.get('end')

    now = timezone.now()
    if start_str and end_str:
        try:
            start = timezone.make_aware(datetime.strptime(start_str, "%Y-%m-%d"))
            # include the end date fully
            end = timezone.make_aware(datetime.strptime(end_str, "%Y-%m-%d")) + timezone.timedelta(days=1)
        except ValueError:
            start = now - timezone.timedelta(days=30)
            end = now
    else:
        end = now
        start = now - timezone.timedelta(days=30)

    trunc_map = {
        'day': TruncDay,
        'week': TruncWeek,
        'month': TruncMonth,
        'year': TruncYear,
    }
    TruncFn = trunc_map[bucket]
    return start, end, bucket, TruncFn

@login_required
def facial_verification_timeseries_api(request):
    start, end, bucket, TruncFn = _parse_chart_filters(request)

    base = FacialVerificationLog.objects.filter(
        timestamp__gte=start,
        timestamp__lt=end
    )

    # ---- Optional filters
    vt = request.GET.get('verification_type')
    if vt:
        base = base.filter(verification_type=vt)

    course_id = request.GET.get('course_id')
    if course_id:
        base = base.filter(course_id=course_id)

    device_type = request.GET.get('device_type')
    if device_type:
        base = base.filter(device_type=device_type)

    browser = request.GET.get('browser')
    if browser:
        base = base.filter(browser=browser)

    # ---- Aggregate by bucket
    bucketed_qs = (
        base
        .annotate(bucket=TruncFn('timestamp', output_field=DateTimeField()))
        .values('bucket')
        .annotate(
            total=Count('id'),
            pass_count=Count('id', filter=Q(status='success')),
            fail_count=Count('id', filter=Q(status='failure')),
        )
        .order_by('bucket')
    )
    bucket_rows   = list(bucketed_qs)
    bucket_labels = [row['bucket'].date().isoformat() for row in bucket_rows]
    idx_map       = {lbl: i for i, lbl in enumerate(bucket_labels)}

    pass_counts = [row['pass_count'] for row in bucket_rows]
    fail_counts = [row['fail_count'] for row in bucket_rows]
    totals      = [row['total']      for row in bucket_rows]
    pass_rates  = [(p / t) if t else 0 for p, t in zip(pass_counts, totals)]

    # ---- Failures by reason (per bucket)
    failures = (
        base
        .filter(status='failure')
        .annotate(bucket=TruncFn('timestamp', output_field=DateTimeField()))
        .values('bucket', 'error_type')
        .annotate(n=Count('id'))
        .order_by('bucket', 'error_type')
    )

    reasons = sorted(set([(r['error_type'] or 'unknown') for r in failures]))
    reason_series = {reason: [0] * len(bucket_labels) for reason in reasons}

    for r in failures:
        label = r['bucket'].date().isoformat()
        reason = r['error_type'] or 'unknown'
        i = idx_map.get(label)
        if i is not None:
            reason_series[reason][i] = r['n']

    # ---- Failures by reason AND verification_type (per bucket)
    failures_vt = (
        base
        .filter(status='failure')
        .annotate(bucket=TruncFn('timestamp', output_field=DateTimeField()))
        .values('bucket', 'error_type', 'verification_type')
        .annotate(n=Count('id'))
        .order_by('bucket', 'error_type', 'verification_type')
    )

    vt_keys = ['course_launch_verification', 'in_session_check']
    # ensure we have at least an 'unknown' reason key if nothing else
    if not reasons:
        reasons = ['unknown']

    reason_vt_series = {
        reason: {vt: [0] * len(bucket_labels) for vt in vt_keys}
        for reason in reasons
    }

    for row in failures_vt:
        label = row['bucket'].date().isoformat()
        reason = row['error_type'] or 'unknown'
        vt = row['verification_type'] or 'unknown'
        i = idx_map.get(label)
        if i is not None and reason in reason_vt_series and vt in reason_vt_series[reason]:
            reason_vt_series[reason][vt][i] = row['n']

    # ---- Similarity (per-bucket averages by status)
    sim_bucketed = (
        base
        .exclude(similarity_score__isnull=True)
        .annotate(bucket=TruncFn('timestamp', output_field=DateTimeField()))
        .values('bucket', 'status')
        .annotate(avg=Avg('similarity_score'), n=Count('id'))
    )

    sim_avg_success = [0.0] * len(bucket_labels)
    sim_n_success   = [0]   * len(bucket_labels)
    sim_avg_failure = [0.0] * len(bucket_labels)
    sim_n_failure   = [0]   * len(bucket_labels)

    for row in sim_bucketed:
        label = row['bucket'].date().isoformat()
        i = idx_map.get(label)
        if i is None:
            continue
        if row['status'] == 'success':
            sim_avg_success[i] = float(row['avg'] or 0.0)
            sim_n_success[i]   = int(row['n'] or 0)
        elif row['status'] == 'failure':
            sim_avg_failure[i] = float(row['avg'] or 0.0)
            sim_n_failure[i]   = int(row['n'] or 0)

    # ---- Platform (overall mix in selected range; not bucketed)
    by_device = (
        base
        .values('device_type')
        .annotate(
            total=Count('id'),
            failures=Count('id', filter=Q(status='failure')),
        )
        .order_by('-total')
    )
    by_browser = (
        base
        .values('browser')
        .annotate(
            total=Count('id'),
            failures=Count('id', filter=Q(status='failure')),
        )
        .order_by('-total')
    )

    bucket_ui = {'day': 'Daily', 'week': 'Weekly', 'month': 'Monthly', 'year': 'Yearly'}[bucket]

    return JsonResponse({
        'labels': bucket_labels,
        'pass_count': pass_counts,
        'fail_count': fail_counts,
        'pass_rate': pass_rates,

        'failures_by_reason': reason_series,
        'failures_by_reason_vt': reason_vt_series,

        'similarity': {
            'avg_success': sim_avg_success,
            'n_success':   sim_n_success,
            'avg_failure': sim_avg_failure,
            'n_failure':   sim_n_failure,
        },

        'platform': {
            'by_device':  [{'key': (r['device_type'] or 'unknown'), 'total': r['total'], 'failures': r['failures']} for r in by_device],
            'by_browser': [{'key': (r['browser']     or 'unknown'), 'total': r['total'], 'failures': r['failures']} for r in by_browser],
        },

        'bucket': bucket,
        'bucket_ui': bucket_ui,
        'start': start.date().isoformat(),
        'end':   (end - timezone.timedelta(days=1)).date().isoformat(),
    })