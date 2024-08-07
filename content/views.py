from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date
from django.contrib import messages
from django.shortcuts import get_object_or_404
import json
from django.http import JsonResponse
from .models import Course, Category, Module, Lesson, TextContent, VideoContent, SCORMContent, StorylineQuizContent

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

    context = {
        'category_list': category
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

            content_data = lesson_data['content']
            content_type = lesson_data['content_type']

            if content_type == 'TextContent':
                content = get_object_or_404(TextContent, id=content_data.get('id')) if lesson_id else TextContent()
                content.text = content_data['text']
            elif content_type == 'VideoContent':
                content = get_object_or_404(VideoContent, id=content_data.get('id')) if lesson_id else VideoContent()
                content.video_url = content_data['video_url']
            elif content_type == 'SCORMContent':
                content = get_object_or_404(SCORMContent, id=content_data.get('id')) if lesson_id else SCORMContent()
                content.file = content_data['file']
            elif content_type == 'StorylineQuizContent':
                content = get_object_or_404(StorylineQuizContent, id=content_data.get('id')) if lesson_id else StorylineQuizContent()
                content.file = content_data['file']

            content.save()

            lesson.content_object = content
            lesson.save()

    return JsonResponse({'status': 'success'})