from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Q
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date, parse_time
from django.contrib import messages
from content.models import File, Course, Module, Lesson, Category, Credential, EventDate, Media, Reference, Upload
from client_admin.models import TimeZone
from django.http import JsonResponse
from .models import File
from django.contrib.auth.models import User
import json
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateformat import DateFormat
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile

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
            Q(title__icontains=query_string)
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
        'title_asc': 'Title (A-Z)',
        'title_desc': 'Title (Z-A)',      
    }

    # Determine the order by field
    if sort_by == 'title_asc':
        order_by_field = 'title'
    elif sort_by == 'title_desc':
        order_by_field = '-title'

    # Add the sort option to the active filters only if it is present in the request
    if 'sort_by' in request.GET and sort_by:
        active_filters['sort_by'] = sort_options.get(sort_by, 'Title (Z-A)')

    # Apply the filtering and sorting to the users list
    courses_list = Course.objects.filter(query).order_by(order_by_field)

    # Paginate the filtered users_list
    paginator = Paginator(courses_list, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Render the results with the active filters
    return render(request, 'courses/courses.html', {
        'page_obj': page_obj,
        'active_filters': active_filters,
        'sort_by': sort_by,
    })

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
def course_details(request, course_id):
    course = get_object_or_404(Course, pk=course_id)

    context = {
        'course': course
    }

    return render(request, 'courses/course_details.html', context)

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
        for credential_data in credentials:
            if credential_data.get('type') == 'certificate':
                Credential.objects.update_or_create(
                    course=course,
                    type='certificate',
                    defaults={
                        'source': credential_data.get('source', ''),
                        'title': credential_data.get('title', '')
                    }
                )

    def handle_event_dates(course, event_dates):
        """ Handle event dates for the course """
        for event_date_data in event_dates:
            event_date_type = event_date_data.get('type')
            date_value = event_date_data.get('date')
            time_value = event_date_data.get('time', '')
            from_enrollment = event_date_data.get('from_enrollment', {})

            # Normalize and validate time format if provided
            normalized_time = normalize_time(time_value)
            if normalized_time is None and time_value:
                return JsonResponse({
                    'status': 'error',
                    'message': f"Invalid time format for {event_date_type}. It must be in HH:MM[:ss[.uuuuuu]] format."
                }, status=400)

            EventDate.objects.update_or_create(
                course=course,
                type=event_date_type,
                defaults={
                    'date': date_value,
                    'time': normalized_time,
                    'from_enrollment': from_enrollment,
                }
            )

    def handle_modules_and_lessons(course, modules):
        for module_data in modules:
            print(f"Processing module data: {module_data}")
            module_id = module_data.get('id')
            module = get_object_or_404(Module, id=module_id) if module_id else Module(course=course)
            module.title = module_data.get('title', 'Untitled Module')
            module.description = module_data.get('description', '')
            module.order = module_data.get('order', 0)
            module.save()
            print(f"Module '{module.title}' saved with ID: {module.id}")

            for lesson_data in module_data.get('lessons', []):
                lesson_id = lesson_data.get('id')
                lesson = get_object_or_404(Lesson, id=lesson_id) if lesson_id else Lesson(module=module)
                lesson.title = lesson_data.get('title', '')
                lesson.order = lesson_data.get('order', 0)
                lesson.save()
                print(f"Lesson '{lesson.title}' saved with ID: {lesson.id}")

                if 'file' in lesson_data:
                    lesson_file = lesson_data['file']
                    if lesson_file:
                        file_instance = File(
                            user=request.user,
                            file=lesson_file,
                            title=lesson_file.name,
                            file_type='other'
                        )
                        file_instance.save()
                        lesson.file = file_instance
                        lesson.save()
                        print(f"File '{file_instance.title}' saved for lesson ID: {lesson.id}")

    def handle_media(course, media_data, request_files):
        """ Handle media for the course """
        for media in media_data:
            if media.get('type') == 'thumbnail':
                thumbnail_link = media.get('thumbnail_link', '')

                # Access file directly from request.FILES using a known key
                thumbnail_image_file = request_files.get('media[0][thumbnail_image]', None)

                print(f"Handling media: {thumbnail_link}, {thumbnail_image_file}")  # Check if this is printing

                # Create the Media object
                media_obj = Media.objects.create(
                    course=course,
                    thumbnail_link=thumbnail_link,
                    thumbnail_image=thumbnail_image_file  # Use the file object
                )

                # Assign the created media object as the course thumbnail
                course.thumbnail = media_obj
                course.save()  # Save the course to update the thumbnail field

    def handle_references(course, references):
        """ Handle references for the course """
        for reference_data in references:
            reference_file = request.FILES.get(reference_data.get('file'), None)
            description = reference_data.get('description', '')
            
            if reference_file:
                Reference.objects.create(
                    course=course,
                    file=reference_file,
                    description=description
                )

    def handle_uploads(course, uploads_data):
        """ Initialize uploads for the course with instructions but no file """
        for upload_data in uploads_data:
            Upload.objects.create(
                course=course,
                approved_by=None  # No approval initially
            )

    try:
        if request.method == 'POST':
            # Extract data from request
            data = request.POST
            files = request.FILES

            # Check if it's an update
            course_id = data.get('id')
            course = get_object_or_404(Course, id=course_id) if course_id else Course()

            # Update course fields
            course.title = data.get('title', '')
            course.description = data.get('description', '')
            course.category = get_object_or_404(Category, id=data.get('category_id', 1))
            course.type = data.get('type', 'bundle')
            course.terms_and_conditions = data.get('terms_and_conditions', 'false') == 'true'
            course.must_complete = data.get('must_complete', 'any_order')
            course.save()

            # Handle credentials
            credentials = json.loads(data.get('credentials', '[]'))
            handle_credentials(course, credentials)

            # Handle event dates
            event_dates = json.loads(data.get('event_dates', '[]'))
            handle_event_dates(course, event_dates)

            # Handle modules and lessons
            modules = json.loads(data.get('modules', '[]'))
            print(f"Modules received: {modules}")  # Check what modules are being received
            handle_modules_and_lessons(course, modules)

            # Handle media
            media_data = json.loads(data.get('media', '[]'))
            handle_media(course, media_data, files)

            # Handle references
            references = json.loads(data.get('references', '[]'))
            handle_references(course, references)

            # Handle uploads
            uploads = json.loads(data.get('uploads', '[]'))
            handle_uploads(course, uploads)

            return JsonResponse({'status': 'success'})

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@login_required
def file_upload(request):
    # Uploading Files
    if request.method == 'POST':
        try:
            uploaded_file = request.FILES['file']
            
            # Create a file instance
            file_instance = File(
                user=request.user,
                file=uploaded_file,
                title=uploaded_file.name
            )
            file_instance.save()

            # Format the uploaded_at date
            uploaded_at_formatted = file_instance.uploaded_at.strftime('%b %d, %Y %I:%M')
            uploaded_at_formatted += ' ' + ('p.m.' if file_instance.uploaded_at.hour >= 12 else 'a.m.')

            # Respond with success and file details
            return JsonResponse({
                'success': True,
                'message': 'File uploaded successfully.',
                'file': {
                    'title': file_instance.title,
                    'file_type': file_instance.file_type,
                    'uploaded_at': uploaded_at_formatted,
                    'file_type': file_instance.file_type,
                    'size': file_instance.file.size,
                }
            })
        except ValidationError as ve:
            return JsonResponse({'success': False, 'error': str(ve)})
        except Exception as e:
            return JsonResponse({'success': False, 'message': 'An error occurred: ' + str(e)})
    # Searching Files
    elif request.method == 'GET':
        search_query = request.GET.get('q', '')
        filters = request.GET.get('filters', '').split(',')
        page = int(request.GET.get('page', 1))  # Current page number
        per_page = 15  # Number of items per page

        # Build the query
        filter_conditions = Q(user=request.user)

        # Apply search query if present
        if search_query:
            filter_conditions &= Q(title__icontains=search_query)

        # Apply filters if present and valid
        valid_filters = [f for f in filters if f]
        if valid_filters:
            filter_conditions &= Q(file_type__in=valid_filters)

        files = File.objects.filter(filter_conditions).order_by('-uploaded_at')

        # Apply pagination
        paginator = Paginator(files, per_page)
        try:
            paginated_files = paginator.page(page)
        except EmptyPage:
            return JsonResponse({
                'success': True,
                'files': [],
                'has_next': False,
                'next_page': None
            })

        # Prepare the response data
        file_list = []
        for file in paginated_files:
            uploaded_at_formatted = file.uploaded_at.strftime('%b %d, %Y %I:%M')
            uploaded_at_formatted += ' ' + ('p.m.' if file.uploaded_at.hour >= 12 else 'a.m.')

            file_list.append({
                'title': file.title,
                'file_url': file.file.url,
                'file_type': file.file_type,
                'uploaded_at': uploaded_at_formatted,
            })

        return JsonResponse({
            'success': True,
            'files': file_list,
            'has_next': paginated_files.has_next(),
            'next_page': page + 1 if paginated_files.has_next() else None
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