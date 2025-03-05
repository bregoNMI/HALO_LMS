from django.db import models
from django.contrib.auth.models import User
from content.models import Course, Module, Lesson
from django.db.models.signals import post_save
from django.dispatch import receiver
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from datetime import datetime
from pytz import all_timezones
from course_player.models import SCORMTrackingData 

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
    
# Combined Applicant and Profile
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    username = models.CharField(('Username'), max_length=30, blank=True)
    email = models.EmailField(('email address'), unique=True)
    first_name = models.CharField(('first name'), max_length=30, blank=True)
    last_name = models.CharField(('last name'), max_length=30, blank=True)
    name_on_cert = models.CharField(('name on certificate'), max_length=64, blank=True)
    associate_school = models.CharField(default='NMI / NEMO', max_length=30, blank=False)
    archived = models.BooleanField(default=False)
    role = models.CharField(max_length=30, default='Student')
    birth_date = models.DateField(null=True, blank=True)
    address_1 = models.CharField(max_length=256)
    address_2 = models.CharField(max_length=256, null=True, blank=True)
    city = models.CharField(max_length=64)
    state = models.CharField(max_length=64, verbose_name='State/Province')
    code = models.CharField(max_length=15, verbose_name='Postal Code')
    country = models.CharField(max_length=256)
    citizenship = models.CharField(max_length=256)
    phone = models.CharField(default='9999999999', blank=False, max_length=18)
    sex = models.CharField(max_length=30, blank=True)
    delivery_method = models.CharField(max_length=64, blank=True)
    referral = models.CharField(max_length=512, blank=True)
    initials = models.CharField(max_length=5, default='ABC')
    photoid = models.ImageField()
    passportphoto = models.ImageField()
    date_joined = models.DateTimeField(('date joined'), auto_now_add=True)
    last_opened_course = models.OneToOneField(Course, on_delete=models.CASCADE, null=True, blank=True)
    timezone = models.CharField(
        max_length=50,
        choices=[(tz, tz) for tz in all_timezones],
        default='UTC'
    )


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

class UserCourse(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    progress = models.PositiveIntegerField(default=0)  # percentage of the course completed by the user
    lesson_id = models.PositiveIntegerField(default=0) #links o the individual lesson to launch the course
    locked = models.BooleanField(default=False)

    def get_status(self):
        expiration_date = self.course.get_event_date('expiration_date')
        if expiration_date and expiration_date < datetime.now().date():
            return 'Expired'

        if self.progress == 0:
            return 'Not Started'
        elif self.progress == 100:
            return 'Completed'
        else:
            return 'Started'
    
    def update_progress(self):
        """
        Recalculates the user's progress in this course based on the highest recorded progress per lesson.
        """
        lessons = Lesson.objects.filter(module__course=self.course)
        total_lessons = lessons.count()

        if total_lessons == 0:
            self.progress = 0.0
            self.save()
            return

        # Get max progress per lesson
        lesson_progress = (
            SCORMTrackingData.objects
            .filter(user=self.user, lesson_id__in=lessons.values_list('id', flat=True))
            .values('lesson_id')
            .annotate(max_progress=models.Max('progress'))  # Get max progress per lesson
        )

        total_progress = sum(lp['max_progress'] for lp in lesson_progress)

        # Normalize to 100%
        self.progress = min((total_progress / total_lessons) * 100, 100)
        self.save()


    def __str__(self):
        return f"{self.user.username} - {self.course.title}"


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

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.user_module_progress.user_course.user.username} - {self.lesson.title}"
    
class Message(models.Model):
    subject = models.CharField(max_length=255)
    body = models.TextField()
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipients = models.ManyToManyField(User, related_name='received_messages')
    sent_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return self.subject
    
class OrganizationSettings(models.Model):
    # Client Profile
    lms_name = models.CharField(max_length=255, blank=True, null=True, default='LMS Name')
    organization_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Main Contact
    contact_first_name = models.CharField(max_length=255, blank=True, null=True)
    contact_last_name = models.CharField(max_length=255, blank=True, null=True)
    contact_address = models.CharField(max_length=255, blank=True, null=True)
    contact_city = models.CharField(max_length=255, blank=True, null=True)
    contact_state = models.CharField(max_length=255, blank=True, null=True)
    contact_country = models.CharField(max_length=255, blank=True, null=True)
    contact_postal_code = models.CharField(max_length=20, blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)

    # Date & Time Preferences
    date_format = models.CharField(max_length=255, blank=True, null=True)
    time_zone = models.CharField(max_length=255, blank=True, null=True)

    # User settings
    on_login_course = models.BooleanField(default=False, blank=True, null=True)
    on_login_course_id = models.PositiveIntegerField(blank=True, null=True)
    profile_customization = models.BooleanField(default=False, blank=True, null=True)

    # Course Settings 
    default_course_thumbnail = models.BooleanField(default=False, blank=True, null=True)
    default_course_thumbnail_image = models.ImageField(upload_to='thumbnails/', blank=True, null=True)
    default_certificate = models.BooleanField(default=False, blank=True, null=True)
    default_certificate_image = models.ImageField(upload_to='certificates/', blank=True, null=True)

    # Portal
    portal_favicon = models.ImageField(upload_to='logos/', blank=True, null=True)

    def __str__(self):
        return self.lms_name
    
class TimeZone(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
    
class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Assuming you want to log the user as well
    action_performer = models.CharField(max_length=150)  # Changed from ForeignKey to CharField
    action_target = models.CharField(max_length=150)  # Changed from ForeignKey to CharField
    action = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)
    user_groups = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'activitylog'

    def __str__(self):
        return f"{self.action_performer} performed '{self.action}' on {self.action_target} at {self.timestamp}"
