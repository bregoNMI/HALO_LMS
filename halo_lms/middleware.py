# halo_lms/middleware.py

from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import redirect
from django.urls import reverse
from django.http import JsonResponse
from django.contrib import messages
from django.utils import timezone
from content.models import Course, Lesson
from client_admin.models import UserCourse, UserModuleProgress, UserLessonProgress
try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:
    from backports.zoneinfo import ZoneInfo  # Python < 3.9

from client_admin.models import OrganizationSettings

class ImpersonateMiddleware(MiddlewareMixin):
    def __call__(self, request):
        request.is_impersonating = False
        impersonate_user_id = request.session.get('impersonate_user_id', None)

        if impersonate_user_id:
            request.is_impersonating = True
            
            # Forbid any data modification
            if request.method in ['POST', 'PUT', 'DELETE']:
                messages.error(request, "You do not have permission to modify data while impersonating")
                return redirect(request.META.get('HTTP_REFERER', '/'))  # Redirect to the referring page
                
        response = self.get_response(request)
        return response
    
class TimeZoneMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            org_settings = OrganizationSettings.get_instance()
            if org_settings.iana_name:
                timezone.activate(ZoneInfo(org_settings.iana_name))
            else:
                timezone.deactivate()  # fallback to UTC
        except Exception as e:
            print(f"[TimeZoneMiddleware] Failed to set timezone: {e}")
            timezone.deactivate()

        return self.get_response(request)
    
class TermsAcceptanceMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        if not request.user.is_authenticated:
            return None

        excluded_paths = [
            reverse('terms_and_conditions'),
            reverse('custom_logout_view'),
            '/admin/', '/django-admin/', '/static/','/login-course/', '/requests/modify-course/', '/launch_scorm_file/', '/scorm-content/',
        ]

        if (
            any(request.path.startswith(path) for path in excluded_paths)
            or request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            or request.headers.get('Accept') == 'application/json'
            or request.path.startswith('/requests/')
        ):
            return None

        settings = OrganizationSettings.get_instance()
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return None

        # Step 1: Handle Terms Acceptance
        if settings.terms_and_conditions:
            latest_version = settings.terms_last_modified.strftime('%Y%m%d') if settings.terms_last_modified else "v1"
            if not profile.terms_accepted or profile.accepted_terms_version != latest_version:
                if profile.terms_accepted:
                    profile.terms_accepted = False
                    profile.accepted_terms_version = None
                    profile.save()

                request.session['terms_redirect_after'] = request.path
                return redirect('terms_and_conditions')

        # Step 2: Handle On Login Course logic
        if settings.on_login_course and settings.on_login_course_id:
            course_id = settings.on_login_course_id
            course = Course.objects.filter(id=course_id).first()

            if course and not profile.completed_on_login_course:
                # Check for enrollment
                user_course, created = UserCourse.objects.get_or_create(user=request.user, course=course)

                if created:
                    # Enroll the user: assign first lesson and progress objects

                    first_lesson = Lesson.objects.filter(module__course=course).order_by('module__order', 'order').first()
                    if first_lesson:
                        user_course.lesson_id = first_lesson.id
                        user_course.save()

                    for module in course.modules.all():
                        ump = UserModuleProgress.objects.create(user_course=user_course, module=module)
                        for lesson in module.lessons.all():
                            UserLessonProgress.objects.create(user_module_progress=ump, lesson=lesson)

                # Redirect to UUID-based course page
                return redirect('on_login_course', uuid=user_course.uuid)

        return None