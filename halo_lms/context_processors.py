from custom_templates.models import Dashboard, Header, Footer
from client_admin.models import Profile, Message, OrganizationSettings
from client_admin.utils import get_strftime_format, get_flatpickr_format

from django.contrib.auth import get_user_model
from client_admin.models import OrganizationSettings, OrgBadge, UserBadge
from learner_dashboard.services.achievements import compute_progress

def user_info(request):
    if request.user.is_authenticated:
        first_name = request.user.profile.first_name
        first_letter_lowercase = first_name[0].lower() if first_name else ''
        
        return {
            'first_name': first_name,
            'last_name': request.user.profile.last_name,
            'email': request.user.profile.email,
            'first_letter_lowercase': first_letter_lowercase,  # Add this key
        }
    return {}

def learner_base_data(request):
    dashboard = Dashboard.objects.filter(is_main=True).first()
    header = Header.objects.first()
    footer = Footer.objects.first()

    profile = None
    unclaimed_badge_count = 0

    if request.user.is_authenticated:
        profile = Profile.objects.filter(user=request.user).first()

        org = OrganizationSettings.get_instance()
        if org.enable_gamification:
            # active org badges
            org_badges = (OrgBadge.objects
                          .filter(organization=org, active=True)
                          .only("id", "template_slug", "criteria", "name")  # keep it light
                          .order_by("display_order", "name"))

            # which of those are already awarded to this user?
            already_awarded_ids = set(
                UserBadge.objects
                         .filter(user=request.user, org_badge__in=org_badges)
                         .values_list("org_badge_id", flat=True)
            )

            # compute whether each badge is claimable
            c = 0
            for ob in org_badges:
                progress = compute_progress(request.user, ob, ob.id in already_awarded_ids)
                if progress.claimable:
                    c += 1
            unclaimed_badge_count = c

    return {
        'dashboard': dashboard,
        'header': header,
        'footer': footer,
        'profile': profile,
        'unclaimed_badge_count': unclaimed_badge_count,
    }

def unread_messages_processor(request):
    # Ensure the request has a user and that the user is authenticated
    if request.user.is_authenticated:
        unread_messages_exist = Message.objects.filter(recipients=request.user, read=False).exists()
    else:
        unread_messages_exist = False

    # Return the context variable
    return {
        'unread_messages_exist': unread_messages_exist
    }

def organization_settings(request):
    settings = OrganizationSettings.objects.first()

    check_frequency = settings.check_frequency_time
    check_frequency_ms = 0

    if check_frequency:
        check_frequency_ms = int(check_frequency.total_seconds() * 1000)

    return {
        'settings': settings,
        'check_frequency_ms': check_frequency_ms
    }

def user_impersonation(request):
    User = get_user_model()
    original_user = request.session.get('original_user_id')
    impersonated_user = request.user if request.user.is_authenticated else None
    
    if original_user:
        try:
            original_user_instance = User.objects.get(id=original_user)
        except User.DoesNotExist:
            original_user_instance = None
    else:
        original_user_instance = None

    return {
        'original_user': original_user_instance,
        'impersonated_user': impersonated_user,
    }

def date_format_context(request):
    settings = OrganizationSettings.get_instance()
    return {'org_date_format': get_strftime_format(settings.date_format)}

def flatpickr_format_context(request):
    settings = OrganizationSettings.get_instance()
    date_format = get_flatpickr_format(settings.date_format)
    return {'flatpickr_format': date_format}