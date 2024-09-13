from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date
from django.contrib import messages
from client_admin.models import Profile, Course, User, UserCourse
from django.template.response import TemplateResponse

@login_required
def admin_dashboard(request):
    return render(request, 'dashboard.html')

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

        # Parsing and formatting birth_date
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

@login_required
def enroll_user(request):
    # Get user and course from the request data (you can adjust this based on how you handle data, e.g., form data or JSON)
    user_id = request.POST.get('user_id')
    course_id = request.POST.get('course_id')

    # Ensure both the user and course exist
    user = get_object_or_404(User, id=user_id)
    course = get_object_or_404(Course, id=course_id)

    # Check if the UserCourse already exists (user is already enrolled)
    user_course, created = UserCourse.objects.get_or_create(user=user, course=course)

    if created:
        # Enrollment created successfully
        return JsonResponse({'message': 'User enrolled successfully!', 'progress': user_course.progress}, status=201)
    else:
        # User is already enrolled
        return JsonResponse({'message': 'User is already enrolled in this course!', 'progress': user_course.progress}, status=200)

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

    context = {
        'profile': user
    }
    return render(request, 'users/user_history.html', context)