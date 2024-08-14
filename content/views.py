from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Q
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date
from django.contrib import messages
from content.models import File, Course, Module, Lesson, Category
from django.http import JsonResponse
from .models import File
import json
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateformat import DateFormat
from django.core.exceptions import ValidationError

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

def create_or_update_course(request):
    data = json.loads(request.body)

    # Check if it's an update
    course_id = data.get('id')
    if course_id:
        course = get_object_or_404(Course, id=course_id)
    else:
        course = Course()

    # Update course fields
    course.title = data['title']
    course.description = data['description']
    course.category = get_object_or_404(Category, id=data['category_id'])
    course.type = data['type']
    course.save()

    # Handle modules and lessons
    for module_data in data['modules']:
        module_id = module_data.get('id')
        if module_id:
            module = get_object_or_404(Module, id=module_id)
        else:
            module = Module(course=course)

        module.title = module_data['title']
        module.description = module_data.get('description', '')
        module.order = module_data['order']
        module.save()

        for lesson_data in module_data['lessons']:
            lesson_id = lesson_data.get('id')
            if lesson_id:
                lesson = get_object_or_404(Lesson, id=lesson_id)
            else:
                lesson = Lesson(module=module)

            lesson.title = lesson_data['title']
            lesson.order = lesson_data['order']
            lesson.save()

            # Handle associated file
            file_id = lesson_data.get('file_id')
            if file_id:
                file = get_object_or_404(File, id=file_id)
                lesson.file = file
            else:
                lesson.file = None

            lesson.save()

    return JsonResponse({'status': 'success'})

@login_required
def file_upload(request):
    # Uploading Files
    if request.method == 'POST':
        try:
            uploaded_file = request.FILES['file']
            file_instance = File(
                user=request.user,
                file=uploaded_file,
                title=uploaded_file.name
            )
            file_instance.save()

            # Format the uploaded_at date
            uploaded_at_formatted = file_instance.uploaded_at.strftime('%b %d, %Y %I:%M')
            uploaded_at_formatted += ' ' + ('p.m.' if file_instance.uploaded_at.hour >= 12 else 'a.m.')

            return JsonResponse({
                'success': True,
                'message': 'File uploaded successfully.',
                'file': {
                    'title': file_instance.title,
                    'file_type': file_instance.file_type,
                    'uploaded_at': uploaded_at_formatted,
                }
            })

        except ValidationError as ve:
            return JsonResponse({'success': False, 'message': 'Validation error: ' + str(ve)})

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