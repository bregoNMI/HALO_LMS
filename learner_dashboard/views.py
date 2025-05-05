from django.contrib.auth.decorators import login_required
from custom_templates.models import Dashboard, Widget, Header, Footer
from client_admin.models import Profile, UserCourse, UserModuleProgress, UserLessonProgress, GeneratedCertificate, Profile, User, Message
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import update_session_auth_hash, logout
from django.contrib import messages
from django.utils.dateparse import parse_date
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF
from reportlab.platypus import Flowable
from reportlab.lib.enums import TA_LEFT
from datetime import datetime
import boto3
from django.conf import settings
import logging
import json
from botocore.exceptions import ClientError
from authentication.python.views import modifyCognito
from halo_lms.settings import COGNITO_USER_POOL_ID
from course_player.models import LessonSession, SCORMTrackingData
import re
from datetime import timedelta

def custom_logout_view(request):
    logout(request)
    return redirect('login_view')  # Redirect to the login page after logout

# Other Data is loaded on context_processors.py
@login_required
def learner_dashboard(request):
    dashboard = Dashboard.objects.filter(is_main=True).first()
    header = Header.objects.first()
    footer = Footer.objects.first()
    # After redirecting (in the redirected view)
    print("Session data after redirect:", request.session.get('impersonate_user_id'))
    if dashboard:
        return render(request, 'dashboard/learner_dashboard.html', {'dashboard': dashboard, 'header': header, 'footer': footer})
    return render(request, 'dashboard/default_dashboard.html')

@login_required
def learner_courses(request):
    user = request.user

    user_courses = UserCourse.objects.filter(user=user).select_related('course').prefetch_related('module_progresses__module__lessons')

    context = {
        'user_courses': user_courses
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


@login_required
def learner_profile(request):
    # Retrieve the current user's profile
    profile = get_object_or_404(Profile, user=request.user)
    
    return render(request, 'learner_pages/learner_profile.html', {'profile': profile})

@login_required
def update_learner_profile(request, user_id):

    print("Is Impersonating:", getattr(request, 'is_impersonating', False))
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
        if 'photoid' in request.FILES:
            profile.photoid = request.FILES['photoid']
        if 'passportphoto' in request.FILES:
            profile.passportphoto = request.FILES['passportphoto']

        #Updating Cognito User
        modifyCognito(request)

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