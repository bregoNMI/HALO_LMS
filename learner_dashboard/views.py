from django.contrib.auth.decorators import login_required
from custom_templates.models import Dashboard, Widget, Header, Footer
from client_admin.models import Profile, UserCourse, UserModuleProgress, UserLessonProgress
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import update_session_auth_hash
from django.http import JsonResponse
from django.contrib import messages
from django.utils.dateparse import parse_date
from client_admin.models import Profile, User, Message

# Other Data is loaded on context_processors.py
@login_required
def learner_dashboard(request):
    dashboard = Dashboard.objects.filter(is_main=True).first()
    header = Header.objects.first()
    footer = Footer.objects.first()

    if dashboard:
        return render(request, 'dashboard/learner_dashboard.html', {'dashboard': dashboard, 'header': header, 'footer': footer})
    return render(request, 'dashboard/default_dashboard.html')

@login_required
def learner_courses(request):
    user = request.user

    # Fetch the user's courses and their progress
    user_courses = UserCourse.objects.filter(user=user).select_related('course').prefetch_related('module_progresses__module__lessons')

    context = {
        'user_courses': user_courses
    }
    return render(request, 'learner_pages/learner_courses.html', context)

@login_required
def learner_profile(request):
    # Retrieve the current user's profile
    profile = get_object_or_404(Profile, user=request.user)
    
    return render(request, 'learner_pages/learner_profile.html', {'profile': profile})

@login_required
def update_learner_profile(request, user_id):
    # Get the profile and associated user
    profile = get_object_or_404(Profile, pk=user_id)
    user = profile.user

    if request.method == 'POST':
        # Update User model fields
        user.username = request.POST.get('username')
        user.email = request.POST.get('email')
        user.first_name = request.POST.get('first_name')
        user.last_name = request.POST.get('last_name')
        profile.email = request.POST.get('email')
        profile.first_name = request.POST.get('first_name')
        profile.last_name = request.POST.get('last_name')
        user.save()  # Save the User model

        # Update Profile model fields
        profile.country = request.POST.get('country')
        profile.city = request.POST.get('city')
        profile.state = request.POST.get('state')
        profile.code = request.POST.get('code')
        profile.citizenship = request.POST.get('citizenship')
        profile.address_1 = request.POST.get('address_1')
        profile.referral = request.POST.get('referral')
        profile.associate_school = request.POST.get('associate_school')
        profile.sex = request.POST.get('sex')

        # Handle date input for birth_date
        birth_date_str = request.POST.get('birth_date')
        if birth_date_str:
            birth_date = parse_date(birth_date_str)
            if birth_date:
                profile.birth_date = birth_date

        # Handle file uploads for 'photoid' and 'passportphoto'
        if 'photoid' in request.FILES:
            profile.photoid = request.FILES['photoid']
        if 'passportphoto' in request.FILES:
            profile.passportphoto = request.FILES['passportphoto']

        # Save Profile model
        profile.save()

        # Success message
        messages.success(request, 'Profile updated successfully')

        # Determine where to redirect
        referer = request.META.get('HTTP_REFERER')
        if referer:
            return redirect(referer)
        else:
            # Default redirect
            return redirect('learner_profile')

    context = {
        'profile': profile,
    }

    # Render the appropriate template
    return render(request, 'learner_pages/learner_profile.html', context)

@login_required
def change_password(request):
    if request.method == 'POST':
        current_password = request.POST.get('current_password')
        new_password1 = request.POST.get('new_password1')
        new_password2 = request.POST.get('new_password2')
        user = request.user

        if current_password and new_password1 and new_password2:
            if user.check_password(current_password):
                if new_password1 == new_password2:
                    user.set_password(new_password1)
                    user.save()
                    update_session_auth_hash(request, user)

                    return JsonResponse({'success': True, 'message': 'Password updated successfully.'})
                else:
                    return JsonResponse({'success': False, 'message': 'New passwords do not match.'})
            else:
                return JsonResponse({'success': False, 'message': 'Current password is incorrect.'})
        else:
            return JsonResponse({'success': False, 'message': 'Please fill out all fields.'})

    return JsonResponse({'success': False, 'message': 'Invalid request.'})

@login_required
def learner_notifications(request):
    # Retrieve the messages for the current user
    messages = Message.objects.filter(recipients=request.user).order_by('-sent_at')
    
    context = {
        'messages': messages
    }
    
    return render(request, 'learner_pages/learner_notifications.html', context)

@login_required
def mark_message_as_read(request, message_id):
    try:
        message = Message.objects.get(id=message_id, recipients=request.user)
        message.read = True
        message.save()
        return JsonResponse({'success': True})
    except Message.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Message not found'}, status=404)