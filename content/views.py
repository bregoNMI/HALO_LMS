from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
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
    file = File.objects.all()

    context = {
        'category_list': category,
        'file_list': file
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
            uploaded_at_formatted = DateFormat(file_instance.uploaded_at).format('Y-m-d H:i:s')

            # Respond with success and file details
            return JsonResponse({
                'success': True,
                'file': {
                    'title': file_instance.title,
                    'uploaded_at': uploaded_at_formatted,
                    'file_type': file_instance.file_type,
                    'size': file_instance.file.size,
                }
            })
        except ValidationError as ve:
            return JsonResponse({'success': False, 'error': str(ve)})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid request method'})