from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Q
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date, parse_time
from django.contrib import messages
from content.models import File, Course, Module, Lesson, Category, Credential, EventDate, Media, Resources, Upload, UploadedFile
from client_admin.models import TimeZone
from django.http import JsonResponse
from .models import File
from django.contrib.auth.models import User
import json
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateformat import DateFormat
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.views.decorators.http import require_POST
from django.core.files.storage import default_storage
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
                    'title': cred_data.get('title', '')
                }
            )

        # Remove any credentials that are no longer in the incoming data
        for existing_cred in existing_credentials:
            if existing_cred not in incoming_credentials:
                Credential.objects.filter(course=course, type=existing_cred).delete()

    def handle_event_dates(course, event_dates):
        """ Handle event dates for the course """
        existing_event_dates = EventDate.objects.filter(course=course)

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
                course=course,
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

    def handle_modules_and_lessons(course, modules):
        for module_data in modules:
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

                # Handle file attachment for the lesson (either file_id or file_url)
                if 'file_id' in lesson_data:
                    file_id = lesson_data.get('file_id')
                    file_instance = get_object_or_404(UploadedFile, id=file_id)
                    lesson.uploaded_file = file_instance
                    lesson.save()
                    print(f"File '{file_instance.title}' associated with lesson ID: {lesson.id}")
                elif 'file_url' in lesson_data:
                    file_url = lesson_data.get('file_url')

                    # Attempt to match the file URL with an existing file in the File model
                    try:
                        # Retrieve all File instances
                        file_instance = File.objects.all().filter(file__isnull=False)

                        # Manually check for a match by comparing file URLs
                        matching_file = None
                        for file in file_instance:
                            if file.file.url == file_url:
                                matching_file = file
                                break

                        if matching_file:
                            lesson.file = matching_file  # Assign the file instance to the lesson
                            lesson.save()
                            print(f"File URL '{matching_file.file.url}' associated with lesson ID: {lesson.id}")
                        else:
                            print(f"No file found with URL '{file_url}' for lesson ID: {lesson.id}")

                    except File.DoesNotExist:
                        print(f"Error occurred when searching for file with URL '{file_url}' for lesson ID: {lesson.id}")

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

    def handle_resources(course, resources):
        """ Handle references for the course """
        for reference_data in resources:
            resource_url = reference_data.get('source', '')
            description = reference_data.get('description', '')
            title = reference_data.get('title', '')
            type = reference_data.get('type', '')
            file_type = reference_data.get('file_type', '')
            
            if resource_url:
                Resources.objects.create(
                    course=course,
                    url=resource_url,  # Use URL instead of file
                    type=type,
                    title=title,
                    file_type=file_type,
                    description=description
                )

    def handle_uploads(course, uploads_data):
        # Extract upload instructions and save to course
        upload_instructions = request.POST.get('upload_instructions', '')
        course.upload_instructions = upload_instructions

        # Debug print to see the uploads_data received
        print(f"Uploads data received: {uploads_data}")

        for upload_data in uploads_data:
            # Extract approval type and approvers
            approval_type = upload_data.get('approval_type', '')
            approvers_ids = upload_data.get('selected_approvers', [])
            title = upload_data.get('title', '')

            # Debug print to confirm the data being processed
            print(f"Processing upload - Title: {title}, Approval Type: {approval_type}, Approvers: {approvers_ids}")

            if title:  # Ensure that the title is provided
                try:
                    # Create the Upload instance
                    upload = Upload.objects.create(
                        course=course,
                        approval_type=approval_type,
                        title=title,
                    )
                    
                    # Debug print to confirm upload creation
                    print(f"Upload created: {upload}")

                    # Add approvers if the list is not empty
                    if approvers_ids:
                        # Fetch users by their IDs
                        approvers = User.objects.filter(id__in=approvers_ids)  
                        upload.approvers.set(approvers)  # Set the approvers

                        # Debug print to confirm approvers have been set
                        print(f"Approvers set for upload: {upload.approvers.all()}")

                    # Save the upload instance (not strictly necessary since set() saves the relation)
                    upload.save()  

                except Exception as e:
                    # Log the error or handle it appropriately
                    print(f"Error creating upload: {e}")
            else:
                print("No title provided for upload, skipping this upload.")  

    try:
        if request.method == 'POST':
            # Extract data from request
            data = request.POST
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
            if category_id:
                course.category = get_object_or_404(Category, id=category_id)
            course.type = data.get('type', 'bundle')
            course.terms_and_conditions = data.get('terms_and_conditions', 'false') == 'true'
            course.must_complete = data.get('must_complete', 'any_order')
            course.estimated_completion_time = data.get('estimated_completion_time', '')
            course.status = data.get('status', '')
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
            resources = json.loads(data.get('resources', '[]'))
            print(f"Resources received: {resources}")  # Check what modules are being received
            handle_resources(course, resources)

            # Handle uploads
            uploads = json.loads(data.get('uploads', '[]'))
            handle_uploads(course, uploads)

            if is_save:
                return JsonResponse({'status': 'success', 'course_id': course.id})
            else:
                messages.success(request, 'Course published successfully!')
                return JsonResponse({'status': 'success', 'redirect_url': '/admin/courses/', 'course_id': course.id})

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
    
@require_POST
def create_category(request):
    category_name = request.POST.get('name', '').strip()

    if category_name:
        # Create a new category
        category = Category.objects.create(name=category_name)
        
        # Return the created category data
        return JsonResponse({
            'id': category.id,
            'name': category.name,
        }, status=201)  # HTTP 201 Created

    return JsonResponse({'error': 'Category name is required.'}, status=400)

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