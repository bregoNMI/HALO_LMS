from django.db import models
from django.contrib.auth.models import User
from pydantic import ValidationError
from content.models import Course, Module, Lesson, EventDate, Upload, TemplateQuestion, QuizTemplate
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from storages.backends.s3boto3 import S3Boto3Storage
from PIL import Image
from io import BytesIO
from django.conf import settings
import requests
from uuid import uuid4
from django.utils import timezone
from django.core.files.base import ContentFile
from client_admin.utils import fill_certificate_form
from django.contrib.contenttypes.fields import GenericRelation
from datetime import date
from datetime import datetime
from pytz import all_timezones
from course_player.models import SCORMTrackingData 
import uuid
from datetime import timedelta
from django.db.models.functions import Coalesce
from django.db.models import Value, FloatField, JSONField
import re
import os
from django.db.models import Q

no_prefix_storage = S3Boto3Storage()
no_prefix_storage.location = ''  # Disable tenant prefix

def resize_image(image_field, size=(300, 300)):
    # Check if the image field has a file
    if image_field and image_field.file:
        # Open the image from the file
        image = Image.open(image_field.file)
        
        # Define the format to use
        image_format = image.format or 'JPEG'  # Default to JPEG if format is unknown
        
        # Resize the image
        image = image.resize(size, Image.LANCZOS)  # Use Image.LANCZOS for high-quality resizing

        # Save the resized image to a BytesIO object
        buffer = BytesIO()
        image.save(buffer, format=image_format)  # Use the defined format
        buffer.seek(0)

        # Update the file field with the resized image
        image_field.save(image_field.name, ContentFile(buffer.read()), save=False)
    
class ProfileManager(models.Manager):

    def new_profile(self, user, *args):
        new_profile = self.create(
            user=user,
            photoid="",
            passportphoto="",
        )

        return new_profile
    
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    username = models.CharField(('Username'), max_length=30, blank=True)
    email = models.EmailField(('email address'), unique=True)
    first_name = models.CharField(('first name'), max_length=30, blank=True)
    last_name = models.CharField(('last name'), max_length=30, blank=True)
    name_on_cert = models.CharField(('name on certificate'), max_length=64, blank=True)
    associate_school = models.CharField(max_length=30, null=True, blank=True)
    archived = models.BooleanField(default=False)
    role = models.CharField(max_length=30, default='Student')
    birth_date = models.DateField(null=True, blank=True)
    address_1 = models.CharField(max_length=256, null=True, blank=True)
    address_2 = models.CharField(max_length=256, null=True, blank=True)
    city = models.CharField(max_length=64, null=True, blank=True)
    state = models.CharField(max_length=64, verbose_name='State/Province', null=True, blank=True)
    code = models.CharField(max_length=15, verbose_name='Postal Code', null=True, blank=True)
    country = models.CharField(max_length=256, null=True, blank=True)
    citizenship = models.CharField(max_length=256, null=True, blank=True)
    phone = models.CharField(null=True, blank=True, max_length=18)
    sex = models.CharField(max_length=30, null=True, blank=True)
    delivery_method = models.CharField(max_length=64, blank=True)
    referral = models.CharField(max_length=512, blank=True)
    initials = models.CharField(max_length=5, null=True, blank=True)
    photoid = models.ImageField(storage=no_prefix_storage)
    passportphoto = models.ImageField(storage=no_prefix_storage)
    date_joined = models.DateTimeField(('date joined'), auto_now_add=True)
    last_opened_course = models.ForeignKey(Course, on_delete=models.CASCADE, null=True, blank=True)
    last_opened_lesson_id = models.PositiveIntegerField(null=True, blank=True)
    timezone = models.CharField(
        max_length=500,
        choices=[(tz, tz) for tz in all_timezones],
        default='UTC'
    )
 
    terms_accepted = models.BooleanField(default=False)
    terms_accepted_on = models.DateTimeField(null=True, blank=True)
    accepted_terms_version = models.CharField(max_length=10, blank=True, null=True)
    completed_on_login_course = models.BooleanField(default=False)
 
    objects = ProfileManager()
 
    def __str__(self):
        return f'{self.user.username} Profile'
    
@receiver(post_save, sender=Profile)
def resize_images(sender, instance, **kwargs):
    # Resize images only if they have been changed
    if instance.photoid:
        resize_image(instance.photoid)
    if instance.passportphoto:
        resize_image(instance.passportphoto)



class EnrollmentKey(models.Model):
    key = models.CharField(max_length=100, unique=True) # This is the key the student will input
    name = models.CharField(max_length=200, blank=True) # Name to understand what the key is for
    courses = models.ManyToManyField('content.Course', related_name='enrollment_keys', blank=True)
    max_uses = models.PositiveIntegerField(default=1, null=True, blank=True)
    uses = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    def is_valid(self):
        if self.max_uses is None:
            return self.active  # unlimited uses
        return self.active and self.uses < self.max_uses

    def __str__(self):
        course_titles = ", ".join(course.title for course in self.courses.all())
        return f"{self.key} for {course_titles}"   

class UserCourse(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    progress = models.PositiveIntegerField(default=0)  # percentage of the course completed by the user
    enrollment_date = models.DateField(auto_now_add=True)
    stored_progress = models.PositiveIntegerField(default=0) # Stores course progress. Reverts back to this integer if status is changed from completed to not completed 
    lesson_id = models.PositiveIntegerField(default=0) #links o the individual lesson to launch the course
    locked = models.BooleanField(default=False)
    completed_on_date = models.DateField(blank=True, null=True)  # This is the date the learner completed their course
    completed_on_time = models.TimeField(blank=True, null=True)  # This is the time the learner completed their course
    is_course_completed = models.BooleanField(default=False)
    generated_certificate = models.FileField(upload_to='certificates/', null=True, blank=True)

    def save(self, *args, **kwargs):
        just_completed = False
        if self.pk:
            previous = UserCourse.objects.get(pk=self.pk)
            just_completed = not previous.is_course_completed and self.is_course_completed
        else:
            just_completed = self.is_course_completed

        super().save(*args, **kwargs)

        if just_completed:
            self.on_course_completed()

    def on_course_completed(self):
        ActivityLog.objects.create(
            user=self.user,
            action_performer=self.user.username,
            action_target=self.user.username,
            action_type= 'course_completed',
            action=f'completed course: {self.course.title}',
            user_groups=', '.join(group.name for group in self.user.groups.all()),
        )

        certificate_credential = self.course.credentials.filter(type='certificate').first()

        if not certificate_credential:
            print("❌ Certificates are not enabled for this course. Skipping certificate generation.")
            return

        org_settings = OrganizationSettings.objects.first()

        # Determine certificate template source
        if certificate_credential and certificate_credential.source:
            template_url = certificate_credential.source
        elif org_settings and org_settings.default_certificate:
            template_url = org_settings.default_certificate_template.url
        else:
            template_path = os.path.join(settings.BASE_DIR, 'static/images/certificates/default.pdf')
            with open(template_path, 'rb') as f:
                template_stream = BytesIO(f.read())

        try:
            if 'template_url' in locals():
                response = requests.get(template_url)
                response.raise_for_status()
                template_stream = BytesIO(response.content)
        except Exception as e:
            print(f"⚠️ Failed to download certificate template: {e}")
            return

        # Prepare form data
        data = {
            'LearnerName': self.user.get_full_name(),
            'CourseName': self.course.title,
            'AcquiredDate': str(self.completed_on_date or timezone.now().date()),
            'CertificateId': str(self.uuid),
        }

        # Generate the certificate PDF
        pdf_stream = fill_certificate_form(template_stream, data)
        filename = f'{self.user.username}_{self.course.title}.pdf'

        # Check if a certificate already exists
        generated_cert = GeneratedCertificate.objects.filter(user_course=self).first()
        if generated_cert:
            print("♻️ Updating existing certificate...")
            generated_cert.file.delete(save=False)  # Remove old file
        else:
            generated_cert = GeneratedCertificate(user_course=self, user=self.user)

        # Save new file
        generated_cert.file.save(filename, ContentFile(pdf_stream.read()), save=True)

        # Set or update expiration
        cert_expiration_event = self.course.event_dates.filter(type='certificate_expiration_date').first()
        if cert_expiration_event:
            if cert_expiration_event.from_enrollment:
                calculated_date = self.course.calculate_event_date(cert_expiration_event, self.enrollment_date)
            else:
                calculated_date = cert_expiration_event.date

            # Delete previous expiration events attached to this certificate
            generated_cert.event_dates.filter(type='certificate_expiration_date').delete()

            EventDate.objects.create(
                content_object=generated_cert,
                type='certificate_expiration_date',
                date=calculated_date
            )
            print(f"Certificate expiration date set to: {calculated_date}")

        # Testing if on_login_course is enabled and if the course that was just completed match that course ID
        if (org_settings and org_settings.on_login_course and org_settings.on_login_course_id and org_settings.on_login_course_id == self.course.id):
            profile = getattr(self.user, 'profile', None)
            if profile:
                profile.completed_on_login_course = True
                profile.save()
                print("User completed the required login course. Profile updated.")
        

    def get_start_date(self):
        if hasattr(self.course, 'get_event_date'):
            return self.course.get_event_date('start_date', self.enrollment_date)
        return None

    def get_expiration_date(self):
        if hasattr(self.course, 'get_event_date'):
            return self.course.get_event_date('expiration_date', self.enrollment_date)
        return None

    def get_due_date(self):
        if hasattr(self.course, 'get_event_date'):
            return self.course.get_event_date('due_date', self.enrollment_date)
        return None


    def get_status(self):
        today = timezone.localdate()

        # Resolve event dates relative to this user's enrollment
        start_date = self.course.get_event_date('start_date', self.enrollment_date)
        expiration_date = self.course.get_event_date('expiration_date', self.enrollment_date)
        due_date = self.course.get_event_date('due_date', self.enrollment_date)

        if (self.progress or 0) >= 100:
            return 'Completed' if self.is_course_completed else 'Not Completed'

        if start_date and today < start_date:
            return 'Scheduled'

        if expiration_date and today > expiration_date and not self.is_course_completed:
            return 'Expired'

        if due_date and today > due_date and not self.is_course_completed:
            return 'Overdue'

        if (self.progress or 0) <= 0:
            return 'Not Started'
        
        return 'Started'
    
    def update_progress(self):
        """
        Recalculates the user's progress in this course by combining SCORMTrackingData progress
        and UserLessonProgress completions. Gives preference to SCORM progress if available.
        """
        lessons = Lesson.objects.filter(module__course=self.course)
        total_lessons = lessons.count()

        if total_lessons == 0:
            self.progress = 0
            self.stored_progress = 0
            self.is_course_completed = False
            self.save()
            return

        lesson_ids = list(lessons.values_list('id', flat=True))

        # Get highest SCORM progress per lesson (NULL-safe → 0.0)
        scorm_progress = {
            row['lesson_id']: row['max_progress']
            for row in SCORMTrackingData.objects
                .filter(user=self.user, lesson_id__in=lesson_ids)
                .values('lesson_id')
                .annotate(
                    max_progress=Coalesce(models.Max('progress'), Value(0.0), output_field=FloatField())
                )
        }

        # Completed lesson IDs from UserLessonProgress
        completed_lesson_ids = set(
            UserLessonProgress.objects
                .filter(
                    user_module_progress__user_course=self,
                    lesson_id__in=lesson_ids,
                    completed=True
                )
                .values_list('lesson_id', flat=True)
        )

        # Calculate combined progress
        total_progress = 0.0
        for lesson_id in lesson_ids:
            if lesson_id in scorm_progress:
                val = float(scorm_progress.get(lesson_id) or 0.0)
                total_progress += min(val, 1.0)  # Cap at 1.0
            elif lesson_id in completed_lesson_ids:
                total_progress += 1.0  # Fully completed

        percentage = int(min((total_progress / total_lessons) * 100, 100))
        self.progress = percentage

        # Completion logic unchanged...
        allowed_statuses = ['completed', 'approved']
        course_assignments = Upload.objects.filter(
            Q(lessons__module__course=self.course) |              # lesson-scoped
            Q(course=self.course, lessons__isnull=True)           # full-course
        ).distinct()

        print(f"[update_progress] uploads total={course_assignments.count()}")

        incomplete_assignments = course_assignments.exclude(
            id__in=UserAssignmentProgress.objects.filter(
                user=self.user,
                assignment__in=course_assignments,
                status__in=allowed_statuses
            ).values_list('assignment_id', flat=True)
        )

        print(f"[update_progress] incomplete_uploads={incomplete_assignments.count()} progress={self.progress}")

        if self.progress >= 100 and not self.is_course_completed:
            if not incomplete_assignments.exists():
                self.is_course_completed = True
                self.completed_on_date = datetime.now().date()
                self.completed_on_time = datetime.now().time()

        self.stored_progress = self.progress
        self.save()

    def get_scorm_total_time(self):
        scorm_sessions = SCORMTrackingData.objects.filter(
            user=self.user,
            lesson__module__course=self.course
        )

        total_time = timedelta()
        for session in scorm_sessions:
            total_time += parse_iso_duration(session.session_time)

        if total_time.total_seconds() == 0:
            return "No Activity"
        else:
            total_hours, remainder = divmod(total_time.total_seconds(), 3600)
            total_minutes, total_seconds = divmod(remainder, 60)

            if total_hours > 0:
                return f"{int(total_hours)}h {int(total_minutes)}m {int(total_seconds)}s"
            else:
                return f"{int(total_minutes)}m {int(total_seconds)}s"

    def __str__(self):
        return f"{self.user.username} - {self.course.title}"
    
def parse_iso_duration(duration_str):
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.fullmatch(duration_str)
    if not match:
        return timedelta()

    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0

    return timedelta(hours=hours, minutes=minutes, seconds=seconds)

class UserModuleProgress(models.Model):
    user_course = models.ForeignKey(UserCourse, related_name='module_progresses', on_delete=models.CASCADE)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    progress = models.PositiveIntegerField(default=0)  # percentage of the module completed by the user
    completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.user_course.user.username} - {self.module.title}"

class UserLessonProgress(models.Model):
    user_module_progress = models.ForeignKey(UserModuleProgress, related_name='lesson_progresses', on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    completed_on_date = models.DateField(blank=True, null=True)  # This is the date the learner completed this lesson
    completed_on_time = models.TimeField(blank=True, null=True)  # This is the time the learner completed this lesson
    attempts = models.PositiveIntegerField(default=0) # Total times learner has attempted this lesson
    completion_status = models.CharField(
        max_length=50,
        choices=[
            ('completed', 'Completed'),
            ('incomplete', 'Incomplete'),
            ('failed', 'Failed'),
            ('passed', 'Passed'),
            ('pending', 'Pending'),
        ],
        default='incomplete',
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.user_module_progress.user_course.user.username} - {self.lesson.title}"
    
class QuizAttempt(models.Model):
    class Status(models.TextChoices):
        ACTIVE  = 'active',  'Active'
        PENDING = 'pending', 'Pending'
        PASSED  = 'passed',  'Passed'
        FAILED  = 'failed',  'Failed'

    user_lesson_progress = models.ForeignKey('client_admin.UserLessonProgress',
                                             related_name='quiz_attempts',
                                             on_delete=models.CASCADE)
    attempt_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=20,
                              default=Status.ACTIVE,
                              choices=Status.choices)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    last_position   = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)

    score_percent = models.IntegerField(null=True, blank=True)
    passed        = models.BooleanField(null=True, blank=True)
    question_order = JSONField(null=True, blank=True, default=list)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.user_lesson_progress} • {self.attempt_id} • {self.status}"

    @property
    def is_open(self):
        return self.status in (self.Status.ACTIVE, self.Status.PENDING)
    
class UserAssignmentProgress(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    assignment = models.ForeignKey(Upload, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, null=True, blank=True, on_delete=models.SET_NULL)
    file = models.FileField(upload_to='user_assignments/', null=True, blank=True)
    student_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    completed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, related_name='reviews', on_delete=models.SET_NULL)
    review_notes = models.TextField(blank=True, null=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'assignment', 'lesson')

    @property
    def is_approved(self):
        return self.status == 'approved'

    @property
    def is_submitted(self):
        return self.status in ['submitted', 'approved', 'rejected']
    
    @property
    def file_name(self):
        if self.file:
            return os.path.basename(self.file.name)
        return ''
    
    def get_file_type_icon(self):
        if not self.file:
            return 'other'

        ext = os.path.splitext(self.file.name)[1].lower()

        if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']:
            return 'image'
        elif ext in ['.pdf']:
            return 'pdf'
        elif ext in ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']:
            return 'document'
        elif ext in ['.mp4', '.mov', '.wmv', '.flv', '.avi', '.mkv']:
            return 'video'
        elif ext in ['.mp3', '.wav', '.aac', '.ogg', '.flac']:
            return 'audio'
        elif ext in ['.zip', '.rar', '.scorm', '.xml']:
            return 'archive'
        else:
            return 'other'

    def __str__(self):
        return f"{self.user} - {self.assignment} - {self.status}"
    
class GeneratedCertificate(models.Model):
    user_course = models.ForeignKey('UserCourse', on_delete=models.CASCADE, related_name='certificates', blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates', blank=True, null=True)
    file = models.FileField(upload_to='certificates/')
    issued_at = models.DateTimeField(auto_now_add=True)
    event_dates = GenericRelation('content.EventDate')

    def __str__(self):
        return f"Certificate for {self.user_course.user.username} - {self.user_course.course.title}"
    
class Message(models.Model):
    MESSAGE_TYPES = [
        ('message', 'Message'),
        ('alert', 'Alert'),
        ('system', 'System Message'),
    ]

    subject = models.CharField(max_length=255)
    body = models.TextField(max_length=2000)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipients = models.ManyToManyField(User, related_name='received_messages')
    sent_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='message')

    def __str__(self):
        return self.subject
    
class AllowedIdPhotos(models.Model):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=1000)

    def __str__(self):
        return self.name
    
class OrganizationSettings(models.Model):
    # Client Profile
    lms_name = models.CharField(max_length=255, blank=True, null=True)
    organization_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Main Contact
    contact_first_name = models.CharField(max_length=255, blank=True, null=True)
    contact_last_name = models.CharField(max_length=255, blank=True, null=True)
    contact_address = models.CharField(max_length=255, blank=True, null=True)
    contact_city = models.CharField(max_length=255, blank=True, null=True)
    contact_state = models.CharField(max_length=255, blank=True, null=True)
    country = models.CharField(max_length=255, blank=True, null=True)
    contact_postal_code = models.CharField(max_length=20, blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)

    # Date & Time Preferences
    date_format = models.CharField(max_length=255, blank=True, null=True, default='MM/DD/YYYY')
    time_zone = models.CharField(max_length=255, blank=True, null=True, default='(UTC-05:00) Eastern Time (US & Canada)')
    iana_name = models.CharField(max_length=100, unique=True, default='America/New_York')

    # Learner Settings
    on_login_course = models.BooleanField(default=False, blank=True, null=True)
    on_login_course_id = models.PositiveIntegerField(blank=True, null=True)
    profile_customization = models.BooleanField(default=False, blank=True, null=True)
    enable_gamification = models.BooleanField(default=False, blank=True, null=True)
    learning_credits_name = models.CharField(max_length=255, default='HELMS° Credits', blank=True, null=True)
    learning_credits_icon = models.ImageField(upload_to='logos/', blank=True, null=True)

    # Course Settings 
    default_course_thumbnail = models.BooleanField(default=False, blank=True, null=True)
    default_course_thumbnail_image = models.ImageField(upload_to='thumbnails/', blank=True, null=True)
    default_certificate = models.BooleanField(default=False, blank=True, null=True)
    default_certificate_template = models.FileField(upload_to='certificates/', blank=True, null=True)

    # Portal
    portal_favicon = models.ImageField(upload_to='logos/', blank=True, null=True)
    allowed_id_photos = models.ManyToManyField(AllowedIdPhotos, related_name='OrganizationSettings', blank=True)
    terms_and_conditions = models.BooleanField(default=False, blank=True, null=True)
    terms_and_conditions_text = models.TextField(max_length=50000, blank=True, null=True)
    terms_last_modified = models.DateTimeField(blank=True, null=True)

    in_session_checks = models.BooleanField(default=True, blank=True, null=True)
    course_launch_verification = models.BooleanField(default=True, blank=True, null=True)
    check_frequency_time = models.DurationField(null=True, blank=True, default=timedelta(minutes=10), help_text="Customize how often verification checks will occur within a session.")
    
    def save(self, *args, **kwargs):
        if not self.pk and OrganizationSettings.objects.exists():
            raise ValidationError('There is already a Login Settings instance. You cannot create another one.')
        return super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        instance, created = cls.objects.get_or_create(id=1)
        return instance

    def __str__(self):
        return self.lms_name
    
class OrgBadge(models.Model):
    organization = models.ForeignKey(OrganizationSettings, on_delete=models.CASCADE, related_name="org_badges")
    template_slug = models.SlugField(max_length=80)  # stable link to the code catalog
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    criteria = models.JSONField(default=dict)
    icon = models.ImageField(upload_to="badges/org/", blank=True, null=True)
    icon_static = models.CharField(max_length=255, blank=True, null=True)

    active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("organization", "template_slug"),)

class UserBadge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_badges")
    org_badge = models.ForeignKey(OrgBadge, on_delete=models.CASCADE, related_name="awards")
    earned_at = models.DateTimeField(auto_now_add=True)
    evidence = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = (("user", "org_badge"),)

class CurrencyTransaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="credit_txns")
    amount = models.IntegerField()  # use PositiveIntegerField if you never subtract
    reason = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    # Optional: keep per-tenant accounting
    organization = models.ForeignKey(OrganizationSettings, on_delete=models.CASCADE, related_name="credit_txns", null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        sign = "+" if self.amount >= 0 else "−"
        return f"{self.user_id} {sign}{abs(self.amount)} ({self.reason})"
    
class TimeZone(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
    
class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Assuming you want to log the user as well
    action_performer = models.CharField(max_length=150)  # Changed from ForeignKey to CharField
    action_target = models.CharField(max_length=150)  # Changed from ForeignKey to CharField
    action_type = models.CharField(max_length=150)
    action = models.CharField(max_length=500)
    timestamp = models.DateTimeField(auto_now_add=True)
    user_groups = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'activitylog'

    def __str__(self):
        return f"{self.action_performer} performed '{self.action}' on {self.action_target} at {self.timestamp}"

class FacialVerificationLog(models.Model):
    VERIFICATION_TYPE_CHOICES = [
        ('course_launch_verification', 'Course Launch'),
        ('in_session_check', 'In-Session Check'),
    ]

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
    ]

    TYPE_CHOICES = [
        ('verified', 'Verified'),
        ('no_face_live', 'No Face Detected'),
        ('face_mismatch', 'Different Face Than Expected'),
        ('no_face_uploaded', 'No Headshot Face Detected')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    user_course = models.ForeignKey(UserCourse, on_delete=models.SET_NULL, null=True, blank=True)
    lesson = models.ForeignKey(Lesson, on_delete=models.SET_NULL, null=True, blank=True)

    verification_type = models.CharField(max_length=30, choices=VERIFICATION_TYPE_CHOICES, db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, db_index=True)
    error_type = models.CharField(max_length=100, choices=TYPE_CHOICES, null=True, blank=True)  # e.g., 'no_face_live', 'face_mismatch', etc.

    similarity_score = models.FloatField(null=True, blank=True)

    device_type = models.CharField(max_length=20, blank=True, null=True)  # 'desktop', 'mobile', 'tablet'
    browser = models.CharField(max_length=50, blank=True, null=True)  # e.g., 'Chrome', 'Safari'

    metadata = models.JSONField(null=True, blank=True)  # Can include IP, user-agent, future data like location

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} - {self.verification_type} - {self.status} ({self.timestamp})"