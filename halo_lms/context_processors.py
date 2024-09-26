from custom_templates.models import Dashboard, Header, Footer
from client_admin.models import Profile, Message, OrganizationSettings

def user_info(request):
    if request.user.is_authenticated:
        first_name = request.user.first_name
        first_letter_lowercase = first_name[0].lower() if first_name else ''
        
        return {
            'first_name': first_name,
            'last_name': request.user.last_name,
            'email': request.user.email,
            'first_letter_lowercase': first_letter_lowercase,  # Add this key
        }
    return {}

def learner_base_data(request):
    dashboard = Dashboard.objects.filter(is_main=True).first()
    header = Header.objects.first()
    footer = Footer.objects.first()

    profile = None
    if request.user.is_authenticated:
        profile = Profile.objects.filter(user=request.user).first()

    return {
        'dashboard': dashboard,
        'header': header,
        'footer': footer,
        'profile': profile,
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
    return {
        'settings': settings,
    }