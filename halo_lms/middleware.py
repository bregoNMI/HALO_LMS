# halo_lms/middleware.py

from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import redirect
from django.urls import resolve, Resolver404, reverse
from django.http import JsonResponse, HttpResponseForbidden
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

        MODIFYING_PATHS = ['/admin/', '/users/', '/courses/']  # Move outside the if block

        if impersonate_user_id:
            request.is_impersonating = True

            # Only block if method is modifying AND path is restricted
            if request.method in ['POST', 'PUT', 'DELETE']:
                if any(request.path.startswith(p) for p in MODIFYING_PATHS):
                    messages.error(request, "You do not have permission to modify data while impersonating")
                    return redirect(request.META.get('HTTP_REFERER', '/'))

        return self.get_response(request)  # Always return the response at the end
    
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
            '/course_player/track-scorm-data/',
            '/course_player/track-mini-lesson-progress/',
            '/course_player/get-scorm-progress/',
            '/course_player/assignments/',
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
        
        require_id_photos = getattr(settings, 'require_identity_photos', True)

        def _missing_image(field) -> bool:
            """
            Safely determines if an ImageField is "missing" without hitting storage.
            """
            try:
                return not (field and getattr(field, 'name', '').strip())
            except Exception:
                return True

        if require_id_photos:
            needs_passport = _missing_image(getattr(profile, 'passportphoto', None))
            needs_photoid = _missing_image(getattr(profile, 'photoid', None))

            if needs_passport or needs_photoid:
                request.session['after_profile_complete'] = request.path

                if request.path != reverse('require_id_photos'):
                    return redirect('require_id_photos')

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
    
ALLOWED_ADMIN_ROLES = {"Admin", "Instructor"}
WHITELISTED_ADMIN_VIEWS = {
    "compare_faces",
    "facial_verification_check",
    "finalize_account",
}

class AdminRoleGateMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        if path.startswith("/admin/"):
            try:
                match = resolve(request.path_info)
                if match.url_name in WHITELISTED_ADMIN_VIEWS:
                    return self.get_response(request)
            except Resolver404:
                pass

            open_paths = {
                reverse("custom_logout_view"),
            }
            if any(path.startswith(p) for p in open_paths):
                return self.get_response(request)

            if not request.user.is_authenticated:
                return redirect(f"{reverse('login')}?next={request.get_full_path()}")

            if request.user.is_superuser:
                return self.get_response(request)

            role = getattr(getattr(request.user, "profile", None), "role", None)
            if role not in ALLOWED_ADMIN_ROLES:
                if request.headers.get("X-Requested-With") == "XMLHttpRequest" or \
                   "application/json" in request.headers.get("Accept", ""):
                    return JsonResponse({"detail": "Forbidden"}, status=403)
                return HttpResponseForbidden("You don't have access to this area.")

        return self.get_response(request)