from django.db import models
from django.contrib.auth.models import User
from content.models import Course, Module, Lesson
from django.db.models.signals import post_save
from django.dispatch import receiver
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from datetime import datetime

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
    
class Tenant(models.Model):
    name = models.CharField(max_length=100, unique=True)  # Unique identifier for the tenant, like a name or subdomain
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
# Combined Applicant and Profile
class Profile(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    user = models.OneToOneField(User, on_delete=models.CASCADE, editable=False)
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

    def __str__(self):
        return f"{self.user.username} - {self.course.title}"

class UserModuleProgress(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    user_course = models.ForeignKey(UserCourse, related_name='module_progresses', on_delete=models.CASCADE)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    progress = models.PositiveIntegerField(default=0)  # percentage of the module completed by the user
    completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user_course.user.username} - {self.module.title}"

class UserLessonProgress(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    user_module_progress = models.ForeignKey(UserModuleProgress, related_name='lesson_progresses', on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user_module_progress.user_course.user.username} - {self.lesson.title}"