from django.contrib.auth.decorators import login_required
from custom_templates.models import Dashboard, Widget, Header, Footer
from client_admin.models import Profile, UserCourse, UserModuleProgress, UserLessonProgress, GeneratedCertificate, Profile, User, Message, OrganizationSettings, UserAssignmentProgress, Lesson, OrgBadge, UserBadge, CurrencyTransaction
from learner_dashboard.services.achievements import compute_progress, login_streak_days
from content.models import Upload
from django.db.models.functions import Coalesce
from django.db.models import Sum, Value, IntegerField, Prefetch
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import update_session_auth_hash, logout
from django.contrib import messages
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse, Http404, HttpResponseForbidden
from django.views.decorators.http import require_POST
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from django.templatetags.static import static
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF
from reportlab.platypus import Flowable
from reportlab.lib.enums import TA_LEFT
from datetime import datetime
import boto3
from django.conf import settings
import io
import logging
import json
from botocore.exceptions import ClientError
from authentication.python.views import modifyCognito
from halo_lms.settings import COGNITO_USER_POOL_ID
from course_player.models import LessonSession, SCORMTrackingData
import re
from datetime import timedelta
from collections import defaultdict
from PIL import Image, ImageOps, UnidentifiedImageError
import numpy as np, io
from insightface.app import FaceAnalysis

# Module-level singleton (per process)
app = FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0)


def custom_logout_view(request):
    logout(request)
    return redirect('login_view')  # Redirect to the login page after logout

# Other Data is loaded on context_processors.py
@login_required
def learner_dashboard(request):
    user = request.user
    profile = user.profile

    dashboard = Dashboard.objects.filter(is_main=True).first()
    header = Header.objects.first()
    footer = Footer.objects.first()

    # Fetch UserCourse for last opened course, if available
    user_course = None
    if profile.last_opened_course:
        try:
            user_course = UserCourse.objects.get(user=user, course=profile.last_opened_course)
        except UserCourse.DoesNotExist:
            pass  # Optionally log or handle this case

    context = {
        'dashboard': dashboard,
        'header': header,
        'footer': footer,
        'profile': profile,
        'user_course': user_course,
    }

    if dashboard:
        return render(request, 'dashboard/learner_dashboard.html', context)

    return render(request, 'dashboard/default_dashboard.html', context)

@login_required
def learner_courses(request):
    user = request.user

    module_progress_qs = (
        UserModuleProgress.objects
        .select_related('module')
        .order_by('module__order')  # modules ordered within the course
        .prefetch_related(
            Prefetch(
                'lesson_progresses',
                queryset=(
                    UserLessonProgress.objects
                    .select_related('lesson')
                    .order_by('lesson__order')  # lessons ordered within the module
                ),
                to_attr='ordered_lesson_progresses'
            )
        )
    )

    user_courses = (
        UserCourse.objects
        .filter(user=user)
        .select_related('course')
        .prefetch_related(
            Prefetch(
                'module_progresses',
                queryset=module_progress_qs,
                to_attr='ordered_module_progresses'
            )
        )
    )

    all_courses = [uc.course for uc in user_courses]

    # All assignment progress for the user
    progress_qs = UserAssignmentProgress.objects.filter(user=user)

    completed_assignment_ids = set(
        progress_qs.filter(status__in=['submitted', 'approved'])
        .values_list('assignment_id', flat=True)
    )

    # Map of assignment ID (or assignment-lesson key) → status + lock
    assignment_status_map = {}
    for progress in progress_qs:
        key = f"{progress.assignment_id}-{progress.lesson_id}" if progress.lesson_id else str(progress.assignment_id)
        assignment_status_map[key] = {
            "status": progress.status,
            "locked": False  # To be calculated later
        }

    course_lesson_assignment_map = {}     # course_id → ordered lesson-assignment pairs
    full_course_assignment_map = {}       # course_id → list of full-course assignments
    lesson_assignment_map = defaultdict(list)  # lesson_id → list of assignments

    for uc in user_courses:
        course = uc.course
        user_course = uc

        ordered_lessons = Lesson.objects.filter(
            module__course=course
        ).select_related('module').order_by('module__order', 'order')

        previous_lesson_completed = True
        ordered_pairs = []

        for lesson in ordered_lessons:
            is_completed = UserLessonProgress.objects.filter(
                user_module_progress__user_course=user_course,
                lesson=lesson,
                completed=True
            ).exists()

            locked = course.locked and not previous_lesson_completed
            previous_lesson_completed = is_completed

            for assignment in lesson.assignments.all():
                key = f"{assignment.id}-{lesson.id}"
                status = assignment_status_map.get(key, {}).get('status', 'pending')

                assignment_status_map.setdefault(key, {})["status"] = status
                assignment_status_map[key]["locked"] = locked

                pair = {
                    'lesson': lesson,
                    'assignment': assignment,
                    'locked': locked,
                    'status': status,
                    'key': key,
                }
                ordered_pairs.append(pair)
                lesson_assignment_map[lesson.id].append(pair)

        course_lesson_assignment_map[course.id] = ordered_pairs

        # Full-course assignments (not linked to specific lessons)
        full_assignments = Upload.objects.filter(course=course, lessons__isnull=True).distinct()
        for assignment in full_assignments:
            key = str(assignment.id)
            assignment.status = assignment_status_map.get(key, {}).get('status', 'pending')
            assignment.locked = assignment_status_map.get(key, {}).get('locked', False)
        full_course_assignment_map[course.id] = full_assignments

    context = {
        'user_courses': user_courses,
        'course_lesson_assignment_map': course_lesson_assignment_map,
        'full_course_assignment_map': full_course_assignment_map,
        'lesson_assignment_map': lesson_assignment_map,
        'assignment_status_map': assignment_status_map,
        'completed_assignment_ids': completed_assignment_ids,
    }

    return render(request, 'learner_pages/learner_courses.html', context)

@login_required
def learner_transcript(request):
    user = request.user

    # Fetch the user's courses and their progress
    user_courses = UserCourse.objects.filter(user=user).select_related('course').prefetch_related('module_progresses__module__lessons')

    # Enrollment Progress
    total_enrollments = user_courses.count()
    total_in_progress = 0
    total_completed = 0
    expired_enrollments = 0

    for course in user_courses:
        status = course.get_status()
        if status == 'Completed':
            total_completed += 1
        elif status in ['Started', 'Not Completed']:  # Assuming these mean "in progress"
            total_in_progress += 1
        elif status == 'Expired':
            expired_enrollments += 1

    sessions = SCORMTrackingData.objects.filter(user=user)

    total_time = timedelta()
    for session in sessions:
        total_time += parse_iso_duration(session.session_time)

    if total_time.total_seconds() == 0:
        formatted_total_time = "No Activity"
    else:
        total_hours, remainder = divmod(total_time.total_seconds(), 3600)
        total_minutes, total_seconds = divmod(remainder, 60)

        if total_hours > 0:
            formatted_total_time = f"{int(total_hours)}h {int(total_minutes)}m {int(total_seconds)}s"
        else:
            formatted_total_time = f"{int(total_minutes)}m {int(total_seconds)}s"

    user_certificates = (
        GeneratedCertificate.objects.filter(user=user)
        .prefetch_related('event_dates', 'user_course__course')
    )

    context = {
        'user_courses': user_courses,
        'total_time_spent': formatted_total_time,
        'total_completed': total_completed,
        'total_enrollments': total_enrollments,
        'user_certificates': user_certificates,
    }
    return render(request, 'learner_pages/learner_transcript.html', context)

def parse_iso_duration(duration_str):
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.fullmatch(duration_str)
    if not match:
        return timedelta()

    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0

    return timedelta(hours=hours, minutes=minutes, seconds=seconds)

@login_required
def download_transcript(request):
    user = request.user
    user_courses = UserCourse.objects.filter(user=user)

    filename = f"{user.first_name}_{user.last_name}'s_transcript.pdf"

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    doc = SimpleDocTemplate(
        response,
        pagesize=letter,
        leftMargin=30,
        rightMargin=30,
        topMargin=40,
        bottomMargin=30
    )

    elements = []
    styles = getSampleStyleSheet()

    # Customize styles
    styles['Title'].fontSize = 16
    styles['Title'].alignment = TA_LEFT

    styles['Heading2'].fontSize = 12
    styles['Heading2'].textColor = colors.HexColor("#41454d")
    styles['Heading2'].alignment = TA_LEFT
    styles['Heading2'].spaceAfter = 6

    # Title
    elements.append(Paragraph(f"Transcript for <b>{user.first_name} {user.last_name}</b>", styles['Title']))
    elements.append(Spacer(1, 12))

    # User Info Table (Username & Email with icons)
    info_rows = []

    userIcon = SVGImage('static/images/icons/circle-user-regular.svg', width=13, height=13)
    emailIcon = SVGImage('static/images/icons/envelope-regular.svg', width=13, height=13)

    info_rows.append([
        userIcon,
        Paragraph(f'<font color="#41454d" size="10"><b>Username:</b> {user.username}</font>', styles['Normal'])
    ])
    info_rows.append([
        emailIcon,
        Paragraph(f'<font color="#41454d" size="10"><b>Email:</b> {user.email}</font>', styles['Normal'])
    ])

    info_table = Table(info_rows, colWidths=[18, doc.width - 18])

    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))

    elements.append(info_table)
    elements.append(Spacer(1, 12))

    # Courses Table Data
    data = [['Course Title', 'Status', 'Progress (%)', 'Enrolled On', 'Completed On']]

    for course in user_courses:
        data.append([
            course.course.title,
            course.get_status(),
            course.progress,
            course.enrollment_date.strftime('%Y-%m-%d'),
            course.completed_on_date.strftime('%Y-%m-%d') if course.completed_on_date else 'N/A'
        ])

    # Add Heading for Courses
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Enrolled Courses", styles['Heading2']))
    elements.append(Spacer(1, 6))

    if len(data) == 1:
        elements.append(Paragraph("No courses enrolled.", styles['Normal']))
    else:
        # Define column widths to align with margins
        col_widths = [
            doc.width * 0.30,
            doc.width * 0.15,
            doc.width * 0.15,
            doc.width * 0.20,
            doc.width * 0.20
        ]

        table = Table(data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f2f2f2")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#808080")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#ececf1")),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)

    certificates = GeneratedCertificate.objects.filter(user=user).prefetch_related('event_dates')

    # Add heading
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Issued Certificates", styles['Heading2']))
    elements.append(Spacer(1, 6))

    if not certificates.exists():
        elements.append(Paragraph("No certificates issued.", styles['Normal']))
    else:
        cert_data = [['Course Title', 'Issued On', 'Expires On']]

        for cert in certificates:
            issued = cert.issued_at.strftime('%Y-%m-%d')
            expiration = cert.event_dates.filter(type='certificate_expiration_date').first()
            expires = expiration.date.strftime('%Y-%m-%d') if expiration and expiration.date else 'N/A'

            cert_data.append([
                cert.user_course.course.title,
                issued,
                expires
            ])

        cert_col_widths = [
            doc.width * 0.50,
            doc.width * 0.25,
            doc.width * 0.25,
        ]

        cert_table = Table(cert_data, colWidths=cert_col_widths, repeatRows=1)
        cert_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f2f2f2")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#808080")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#ececf1")),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(cert_table)

    # Footer with Date of Issue
    def add_footer(canvas, doc):
        date_of_issue = datetime.now().strftime("Issued: %Y-%m-%d")
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.drawString(doc.leftMargin, 20, date_of_issue)
        canvas.restoreState()

    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)

    return response

# Custom Flowable to embed SVG in Platypus (e.g., inside tables)
class SVGImage(Flowable):
    def __init__(self, path, width, height):
        Flowable.__init__(self)
        self.drawing = svg2rlg(path)

        # Calculate scale factors
        scale_x = width / self.drawing.width
        scale_y = height / self.drawing.height

        self.scale = min(scale_x, scale_y)
        self.width = width
        self.height = height

    def draw(self):
        self.canv.saveState()
        self.canv.scale(self.scale, self.scale)
        renderPDF.draw(self.drawing, self.canv, 0, 0)
        self.canv.restoreState()

def _credits_from_criteria(criteria: dict) -> int:
    try:
        return int((criteria or {}).get("reward", {}).get("credits", 0))
    except (TypeError, ValueError):
        return 0

@login_required
def learner_profile(request):
    user = request.user
    profile = get_object_or_404(Profile, user=user)
    org = OrganizationSettings.get_instance()

    streak = login_streak_days(user)

    # totals (as you already set up)
    badges_earned_count = (
        UserBadge.objects
        .filter(user=user, org_badge__organization=org)
        .count()
    )
    credits_total = (
        CurrencyTransaction.objects
        .filter(user=user)
        .aggregate(total=Coalesce(Sum('amount'), 0))['total']
    )

    # earned badges list
    earned_qs = (
        UserBadge.objects
        .filter(user=user, org_badge__organization=org)
        .select_related('org_badge')
        .order_by('-earned_at')
    )

    earned_badges = []
    for ub in earned_qs:
        ob = ub.org_badge
        # resolve icon
        icon_url = None
        if ob.icon:
            try:
                icon_url = ob.icon.url
            except Exception:
                icon_url = None
        if not icon_url and ob.icon_static:
            icon_url = static(ob.icon_static)

        earned_badges.append({
            "name": ob.name,
            "description": ob.description,
            "icon_url": icon_url,
            "credits": _credits_from_criteria(ob.criteria),
            "earned_at": ub.earned_at,
        })

    credits_name = org.learning_credits_name or "Credits"
    credits_icon_url = org.learning_credits_icon.url if org.learning_credits_icon else '/static/images/gamification/credits/LMS_Credit.png'

    return render(request, 'learner_pages/learner_profile.html', {
        'profile': profile,
        'streak': streak,
        'badges_earned': badges_earned_count,
        'credits_total': credits_total,
        'earned_badges': earned_badges,          # <<< pass to template
        'credits_name': credits_name,
        'credits_icon_url': credits_icon_url,
    })

@login_required
def require_id_photos(request):
    user = request.user
    profile = get_object_or_404(Profile, user=user)
    settings = OrganizationSettings.get_instance()

    allowed_photos = settings.allowed_id_photos.order_by('id')

    return render(request, 'require_id_photos/require_id_photos.html', {
        'profile': profile,
        'allowed_photos': allowed_photos,
    })

@login_required
def terms_and_conditions(request):
    settings = OrganizationSettings.get_instance()
    profile = request.user.profile

    if request.method == 'POST':
        profile.terms_accepted = True
        profile.terms_accepted_on = timezone.now()

        profile.accepted_terms_version = settings.terms_last_modified.strftime('%Y%m%d') if settings.terms_last_modified else "v1"
        profile.save()

        next_url = '/dashboard/'
        return redirect(next_url)

    return render(request, 'terms_and_conditions/terms.html', {
        'terms_text': settings.terms_and_conditions_text,
        'last_modified': settings.terms_last_modified,
        'org_name': settings.organization_name,
    })

@login_required
def on_login_course(request, uuid):
    settings = OrganizationSettings.get_instance()
    user = request.user

    # Early redirect if already completed login-required course
    if settings.on_login_course and user.profile.completed_on_login_course:
        return redirect('learner_dashboard')

    user_course = get_object_or_404(UserCourse, uuid=uuid)
    course = user_course.course

    # Lesson session map
    lesson_sessions_map = {}
    for module_progress in user_course.module_progresses.all():
        for lesson_progress in module_progress.lesson_progresses.all():
            sessions = LessonSession.objects.filter(
                lesson=lesson_progress.lesson,
                user=user
            )
            lesson_sessions_map[lesson_progress.id] = sessions

    # Calculate total SCORM time
    scorm_sessions = SCORMTrackingData.objects.filter(
        user=user,
        lesson__module__course=course
    )
    total_time = timedelta()
    for session in scorm_sessions:
        total_time += parse_iso_duration(session.session_time)

    if total_time.total_seconds() == 0:
        formatted_total_time = "No Activity"
    else:
        total_hours, remainder = divmod(total_time.total_seconds(), 3600)
        total_minutes, total_seconds = divmod(remainder, 60)
        if total_hours > 0:
            formatted_total_time = f"{int(total_hours)}h {int(total_minutes)}m {int(total_seconds)}s"
        else:
            formatted_total_time = f"{int(total_minutes)}m {int(total_seconds)}s"

    # === Assignment logic (replicated from learner_courses) ===
    progress_qs = UserAssignmentProgress.objects.filter(user=user)

    completed_assignment_ids = set(
        progress_qs.filter(status__in=['submitted', 'approved'])
        .values_list('assignment_id', flat=True)
    )

    assignment_status_map = {}
    for progress in progress_qs:
        key = f"{progress.assignment_id}-{progress.lesson_id}" if progress.lesson_id else str(progress.assignment_id)
        assignment_status_map[key] = {
            "status": progress.status,
            "locked": False
        }

    course_lesson_assignment_map = {}     # course_id → ordered lesson-assignment pairs
    full_course_assignment_map = {}       # course_id → list of full-course assignments
    lesson_assignment_map = defaultdict(list)  # lesson_id → list of assignments

    ordered_lessons = Lesson.objects.filter(
        module__course=course
    ).select_related('module').order_by('module__order', 'order')

    previous_lesson_completed = True
    ordered_pairs = []

    for lesson in ordered_lessons:
        is_completed = UserLessonProgress.objects.filter(
            user_module_progress__user_course=user_course,
            lesson=lesson,
            completed=True
        ).exists()

        locked = course.locked and not previous_lesson_completed
        previous_lesson_completed = is_completed

        for assignment in lesson.assignments.all():
            key = f"{assignment.id}-{lesson.id}"
            status = assignment_status_map.get(key, {}).get('status', 'pending')

            assignment_status_map.setdefault(key, {})["status"] = status
            assignment_status_map[key]["locked"] = locked

            pair = {
                'lesson': lesson,
                'assignment': assignment,
                'locked': locked,
                'status': status,
                'key': key,
            }
            ordered_pairs.append(pair)
            lesson_assignment_map[lesson.id].append(pair)

    course_lesson_assignment_map[course.id] = ordered_pairs

    # Full-course assignments (not linked to specific lessons)
    full_assignments = Upload.objects.filter(course=course, lessons__isnull=True).distinct()
    for assignment in full_assignments:
        key = str(assignment.id)
        assignment.status = assignment_status_map.get(key, {}).get('status', 'pending')
        assignment.locked = assignment_status_map.get(key, {}).get('locked', False)
    full_course_assignment_map[course.id] = full_assignments

    return render(request, 'on_login_course/login_course.html', {
        'on_login_course_id': settings.on_login_course_id,
        'user_course': user_course,
        'lesson_sessions_map': lesson_sessions_map,
        'total_time_spent': formatted_total_time,
        'full_course_assignment_map': full_course_assignment_map,
        'course_lesson_assignment_map': course_lesson_assignment_map,
        'lesson_assignment_map': lesson_assignment_map,
        'assignment_status_map': assignment_status_map,
        'completed_assignment_ids': completed_assignment_ids,
    })

@login_required
def update_learner_profile(request, user_id):
    # Prevent updates if impersonating
    if getattr(request, 'is_impersonating', False):
        return JsonResponse("Cannot edit while Impersonating")

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
        photoid_file = request.FILES.get('photoid')
        if photoid_file:
            try:
                photoid_file.seek(0)
            except Exception:
                pass
            # Option A (streaming, preferred):
            profile.photoid.save(photoid_file.name, photoid_file, save=False)

        passport_file = request.FILES.get('passportphoto')
        if passport_file:
            try:
                passport_file.seek(0)
            except Exception:
                pass
            profile.passportphoto.save(passport_file.name, passport_file, save=False)


        profile.save() 
        #Updating Cognito User
        modifyCognito(request)

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

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_UPLOAD_MB = 100
MIN_WIDTH = 200
MIN_HEIGHT = 200

@login_required
@require_POST
def verify_headshot_face(request):
    f = request.FILES.get('image')
    if not f:
        return JsonResponse({'success': False, 'message': 'No image uploaded.'}, status=400)

    # 1) Basic type / size checks
    name = (f.name or "").lower()
    ctype_ok = (f.content_type or "").lower() in ALLOWED_CONTENT_TYPES
    ext_ok = any(name.endswith(ext) for ext in ALLOWED_EXTS)
    if not (ctype_ok and ext_ok):
        return JsonResponse({
            'success': False,
            'error_type': 'unsupported_type',
            'message': 'Unsupported file type. Please upload a JPG, PNG, or WebP image.'
        }, status=400)

    if f.size > MAX_UPLOAD_MB * 1024 * 1024:
        return JsonResponse({
            'success': False,
            'error_type': 'image_too_large',
            'message': f'Image is too large. Max size is {MAX_UPLOAD_MB} MB.'
        }, status=400)

    try:
        # 2) Validate it’s a real image (and not corrupt)
        raw = f.read()
        bio = io.BytesIO(raw)
        try:
            Image.open(bio).verify()  # quick integrity check
        except UnidentifiedImageError:
            return JsonResponse({
                'success': False,
                'error_type': 'invalid_image',
                'message': 'We couldn’t read that file as an image. Please upload a JPG, PNG, or WebP photo.'
            }, status=400)

        # reopen after verify()
        bio.seek(0)
        img = Image.open(bio)
        img = ImageOps.exif_transpose(img).convert('RGB')

        # 3) Basic quality checks
        if img.width < MIN_WIDTH or img.height < MIN_HEIGHT:
            return JsonResponse({
                'success': False,
                'error_type': 'image_too_small',
                'message': f'Image is too small. Minimum size is {MIN_WIDTH}×{MIN_HEIGHT}px.'
            }, status=400)

        img.thumbnail((1024, 1024))  # speed up face detection

        # 4) Face detection (InsightFace expects BGR)
        arr = np.array(img)[:, :, ::-1]
        faces = app.get(arr) or []
        count = len(faces)

        if count == 0:
            return JsonResponse({
                'success': False,
                'error_type': 'no_face_found',
                'faces': 0,
                'message': 'No face detected. Please upload a clear, front-facing photo with good lighting.'
            }, status=200)

        if count > 1:
            return JsonResponse({
                'success': False,
                'error_type': 'multiple_faces',
                'faces': count,
                'message': 'Multiple faces detected. Please upload a photo with just your face.'
            }, status=200)

        return JsonResponse({
            'success': True,
            'faces': count,
            'message': 'Face detected. Remember to save your changes to update your Headshot Photo.'
        })

    except Exception:
        # Generic fallback without leaking internals
        return JsonResponse({
            'success': False,
            'error_type': 'server_error',
            'message': 'Something went wrong while checking your photo. Please try again.'
        }, status=500)

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

                    # Update the password in AWS Cognito
                    cognito_client = boto3.client('cognito-idp')
                    try:
                        # Admin Set Password if using admin privileges
                        cognito_client.admin_set_user_password(
                            UserPoolId=settings.COGNITO_USER_POOL_ID,  # Your User Pool ID
                            Username=user.username,  # Assuming Django username matches Cognito username
                            Password=new_password1,
                            Permanent=True,  # Set the new password as permanent
                        )
                        return JsonResponse({'success': True, 'message': 'Password updated successfully.'})

                    except cognito_client.exceptions.UserNotFoundException:
                        return JsonResponse({'success': False, 'message': 'User not found in Cognito.'}, status=404)
                    except cognito_client.exceptions.InvalidPasswordException as e:
                        return JsonResponse({'success': False, 'message': f'Invalid new password: {e}'}, status=400)
                    except ClientError as e:
                        return JsonResponse({'success': False, 'message': f'An error occurred: {e.response["Error"]["Message"]}'}, status=500)

                else:
                    return JsonResponse({'success': False, 'message': 'New passwords do not match.'})
            else:
                return JsonResponse({'success': False, 'message': 'Current password is incorrect.'})
        else:
            return JsonResponse({'success': False, 'message': 'Please fill out all fields.'})

    return JsonResponse({'success': False, 'message': 'Invalid request.'})

@login_required
def learner_notifications(request):
    
    context = {
        'messages': Message.objects.filter(message_type='message', recipients=request.user).order_by('-sent_at'),
        'alerts': Message.objects.filter(message_type='alert', recipients=request.user).order_by('-sent_at'),
        'system_messages': Message.objects.filter(message_type='system', recipients=request.user).order_by('-sent_at')
    }
    
    return render(request, 'learner_pages/learner_notifications.html', context)

@login_required
def learner_achievements(request):
    org = OrganizationSettings.get_instance()
    user = request.user

    org_badges = (OrgBadge.objects
                  .filter(organization=org, active=True)
                  .order_by('display_order', 'name'))

    already_awarded_map = set(UserBadge.objects
                              .filter(user=user, org_badge__in=org_badges)
                              .values_list("org_badge_id", flat=True))

    items = []
    for ob in org_badges:
        progress = compute_progress(user, ob, ob.id in already_awarded_map)
        items.append({
            "id": ob.id,
            "slug": ob.template_slug,
            "name": ob.name,
            "description": ob.description,
            "icon_url": (ob.icon.url if ob.icon else None),
            "icon_static": ob.icon_static,
            "progress_current": progress.current,
            "progress_target": progress.target,
            "percent": progress.percent,
            "achieved": progress.achieved,
            "awarded": progress.awarded,
            "claimable": progress.claimable,
            "credits": progress.credits,
        })

    if not org.enable_gamification:
        return render(request, "learner_pages/learner_achievements.html", {"badges": [], "settings": org})

    return render(request, "learner_pages/learner_achievements.html", {
        "badges": items,
        "settings": org,
    })

def _badge_payload(ob, progress, org):
    icon_url = None
    if ob.icon:
        try:
            icon_url = ob.icon.url
        except Exception:
            pass
    if not icon_url and ob.icon_static:
        icon_url = static(ob.icon_static)

    org_icon = None
    if org.learning_credits_icon:
        org_icon = org.learning_credits_icon.url

    return {
        "id": ob.id,
        "slug": ob.template_slug,
        "name": ob.name,
        "description": ob.description,
        "icon_url": icon_url,
        "credits": int(progress.credits or 0),
        "credits_icon": org_icon,
    }

@require_POST
@login_required
def claim_badge(request, org_badge_id: int):
    org = OrganizationSettings.get_instance()
    user = request.user

    with transaction.atomic():
        try:
            ob = (OrgBadge.objects
                  .select_for_update()
                  .get(id=org_badge_id, organization=org, active=True))
        except OrgBadge.DoesNotExist:
            raise Http404("Badge not found")

        already = (UserBadge.objects
                   .select_for_update()
                   .filter(user=user, org_badge=ob)
                   .exists())

        progress = compute_progress(user, ob, already_awarded=already)
        if not progress.achieved:
            return HttpResponseForbidden("Badge not yet achieved.")

        if already:
            # compute unclaimed count anyway
            unclaimed_count = _unclaimed_badge_count(user, org)
            return JsonResponse({
                "ok": True,
                "claimed": False,
                "message": "Badge already claimed.",
                "badge": _badge_payload(ob, progress, org),
                "unclaimed_count": unclaimed_count,
            })

        try:
            UserBadge.objects.create(user=user, org_badge=ob, evidence={})
        except IntegrityError:
            unclaimed_count = _unclaimed_badge_count(user, org)
            return JsonResponse({
                "ok": True,
                "claimed": False,
                "message": "Badge already claimed.",
                "badge": _badge_payload(ob, progress, org),
                "unclaimed_count": unclaimed_count,
            })

        if progress.credits:
            CurrencyTransaction.objects.create(
                user=user,
                amount=progress.credits,
                reason=f"Badge: {ob.name}",
            )

    # recompute after successful claim
    unclaimed_count = _unclaimed_badge_count(user, org)

    return JsonResponse({
        "ok": True,
        "claimed": True,
        "credits": progress.credits,
        "badge": _badge_payload(ob, progress, org),
        "unclaimed_count": unclaimed_count,
    })


def _unclaimed_badge_count(user, org):
    org_badges = OrgBadge.objects.filter(organization=org, active=True)
    awarded_ids = set(
        UserBadge.objects.filter(user=user, org_badge__in=org_badges)
        .values_list("org_badge_id", flat=True)
    )
    count = 0
    for ob in org_badges:
        progress = compute_progress(user, ob, ob.id in awarded_ids)
        if progress.claimable:
            count += 1
    return count

@login_required
def mark_message_as_read(request, message_id):
    try:
        message = Message.objects.get(id=message_id, recipients=request.user)
        message.read = True
        message.save()
        return JsonResponse({'success': True})
    except Message.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Message not found'}, status=404)