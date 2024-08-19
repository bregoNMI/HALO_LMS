from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import render, get_object_or_404, redirect
from datetime import datetime
from django.utils.dateparse import parse_date
from django.contrib import messages
from client_admin.models import Profile, User
from .forms import UserRegistrationForm, ProfileForm
#from models import Profile
#from authentication.python import views

@login_required
def admin_dashboard(request):
    return render(request, 'dashboard.html')

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
    user = get_object_or_404(Profile, pk=user_id)

    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        role = request.POST.get('role')
        archived = request.POST.get('archived') == 'on'  # Check if checkbox is checked
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

        # Parsing and formatting birth_date
        if birth_date_str:
            birth_date = parse_date(birth_date_str)
            if birth_date:
                user.birth_date = birth_date

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
        user.save()
        
        messages.success(request, 'User information updated successfully')
        # Determine where to redirect
        referer = request.META.get('HTTP_REFERER')
        if referer:
            return redirect(referer)
        else:
            # Default redirect
            return redirect('user_details', user_id=user.id)

    # Determine which template to use
    referer = request.META.get('HTTP_REFERER', '')
    if 'transcript' in referer:
        template = 'users/user_transcript.html'
    else:
        template = 'users/user_details.html'
    
    context = {
        'profile': user
    }
    return render(request, template, context)

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

def add_user(request):
    if request.method == 'POST':
        user_form = UserRegistrationForm(request.POST)
        profile_form = ProfileForm(request.POST, request.FILES)
        if user_form.is_valid():
            print('user_form valid')

        if profile_form.is_valid():
            print('profile form is valid')

        if user_form.is_valid() and profile_form.is_valid():
            # Extract the cleaned data from the form
            username = request.POST.get('username')
            email = request.POST.get('email')
            first_name = request.POST.get('first_name')
            last_name = request.POST.get('last_name')
            role = request.POST.get('role')
            archived = request.POST.get('archived') == 'on'  # Check if checkbox is checked
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
            # Create a new user
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            print('before ')
            profile = profile_form.save(commit=False)
            profile.user = user  # Link profile to user
            profile.save()
            print('here')

            messages.success(request, 'User created successfully.')
            return redirect('test')  # Redirect to a success page or list view

        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        user_form = UserRegistrationForm()
        profile_form = ProfileForm()

    return render(request, 'users/add_user.html', {'user_form': user_form, 'profile_form': profile_form})