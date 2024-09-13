from custom_templates.models import Dashboard, Header, Footer
from client_admin.models import Profile

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