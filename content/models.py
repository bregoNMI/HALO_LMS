import os
import zipfile
from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from halo_lms import settings

class Category(models.Model):
    name = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.name
    
# The lesson files that originally get uploaded
class UploadedFile(models.Model):
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='uploads/', null=True, blank=True)  # For uploaded files
    url = models.URLField(max_length=200, null=True, blank=True)  # For URLs
    scorm_entry_point = models.CharField(max_length=512, null=True, blank=True)

    def __str__(self):
        return self.title
    
class File(models.Model):
    FILE_TYPE_CHOICES = [
        ('image', 'Image'),
        ('document', 'Document'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('scorm', 'SCORM'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='user_files/')
    title = models.CharField(max_length=255, default='Untitled')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_type = models.CharField(max_length=50, choices=FILE_TYPE_CHOICES, default='other')

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        from authentication.python.views import get_secret
        import boto3
        from botocore.exceptions import ClientError
        print('here')
        # Save the model instance and upload the file
        super().save(*args, **kwargs)

        secret_name = "COGNITO_SECRET"
        secrets = get_secret(secret_name)

        if not secrets:
            print("Failed to retrieve secrets.")
            return

        aws_access_key_id = secrets.get('AWS_ACCESS_KEY_ID')
        aws_secret_access_key = secrets.get('AWS_SECRET_ACCESS_KEY')

        if aws_access_key_id is None or aws_secret_access_key is None:
            print("AWS credentials are not found in the secrets.")
            return

        s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=settings.AWS_S3_REGION_NAME
        )

        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        key = self.file.name  # This is the path where the file is stored in the bucket
        print(key)
        # Update the file metadata in S3

        # Upload the file to S3 manually
        try:
            print(f"Uploading file to S3: {key}")
            self.file.seek(0)  # Ensure pointer is at beginning
            s3_client.upload_fileobj(self.file.file, bucket_name, key)
            print(f"Upload successful: {key}")
        except Exception as e:
            print(f"Error uploading file to S3: {e}")
            return

        try:
            print(f"Attempting to add metadata for file: {key}")
            s3_client.copy_object(
                Bucket=bucket_name,
                CopySource={'Bucket': bucket_name, 'Key': key},
                Key=key,
                MetadataDirective='REPLACE',
                Metadata={
                    'file_id': str(self.id),
                    'title': self.title,
                }
            )
            print(f"Metadata updated for file: {key}")
        except Exception as e:
            print(f"Error updating metadata for {key}: {e}")
            return

        # Retrieve and print metadata to verify it was saved correctly
        try:
            response = s3_client.head_object(Bucket=bucket_name, Key=key)
            metadata = response.get('Metadata', {})
            if metadata:
                print(f"Successfully retrieved metadata for {key}: {metadata}")
            else:
                print(f"No metadata found for {key}.")
        except ClientError as e:
            print(f"Error retrieving metadata for {key}: {e}")

    def determine_file_type(self):
        # Automatically determine the file type based on the file extension
        ext = os.path.splitext(self.file.name)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png', '.gif']:
            return 'image'
        elif ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt']:
            return 'document'
        elif ext in ['.mp4', '.mkv', '.mov']:
            return 'video'
        elif ext in ['.mp3', '.wav']:
            return 'audio'
        elif ext == '.zip':
            if self.is_scorm_package():
                return 'scorm'
        return 'other'

    def is_scorm_package(self):
        # Check if the ZIP file contains SCORM-specific files
        if not self.file:
            return False

        # Extract the ZIP file to a temporary location
        temp_dir = os.path.join('/tmp', 'scorm_temp')
        os.makedirs(temp_dir, exist_ok=True)
        with zipfile.ZipFile(self.file, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Check for SCORM-specific file
        imsmanifest_path = os.path.join(temp_dir, 'imsmanifest.xml')
        is_scorm = os.path.isfile(imsmanifest_path)

        # Clean up
        for root, dirs, files in os.walk(temp_dir, topdown=False):
            for name in files:
                os.remove(os.path.join(root, name))
            for name in dirs:
                os.rmdir(os.path.join(root, name))
        os.rmdir(temp_dir)

        return is_scorm

    def clean(self):
        # Ensure that SCORM files are validated
        if self.file_type == 'scorm' and not self.is_scorm_package():
            raise ValidationError("The uploaded file is not a valid SCORM package.")


# Define a Course model
class Course(models.Model):
    COURSE_TYPES = [
        ('bundle', 'Course Bundle'),
        ('in_person', 'In Person Course'),
        ('online', 'Online Course'),
    ]

    STATUS_TYPES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]

    MUST_COMPLETE_CHOICES = [
        ('any_order', 'All lessons, in any order'),
        ('by_chapter', 'All lessons, in order by chapter'),
    ]

    scorm_id = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True)
    type = models.CharField(max_length=20, choices=COURSE_TYPES, default='bundle')
    status = models.CharField(max_length=20, choices=STATUS_TYPES, default='Inactive')
    thumbnail = models.ForeignKey('Media', on_delete=models.SET_NULL, null=True, blank=True, related_name='course_thumbnail')
    credential = models.OneToOneField('Credential', on_delete=models.SET_NULL, null=True, blank=True, related_name='course_credential')
    upload_instructions = models.TextField(blank=True)
    locked = models.BooleanField(default=False)
    estimated_completion_time = models.DurationField(null=True, blank=True, help_text="Estimated time to complete the course (e.g., 3 hours)")
    terms_and_conditions = models.BooleanField(default=False)
    must_complete = models.CharField(
        max_length=20, choices=MUST_COMPLETE_CHOICES, default='any_order'
    )
    referencesEnabled = models.BooleanField(default=False)
    uploadsEnabled = models.BooleanField(default=False)

    def calculate_event_date(self, event, enrollment_date):
        """Helper function to calculate the event date relative to enrollment_date."""
        if event.from_enrollment:
            offset = event.from_enrollment
            years = offset.get('years', 0)
            months = offset.get('months', 0)
            days = offset.get('days', 0)
            
            # Add years and months using relativedelta for accurate month/year handling
            relative_date = enrollment_date + relativedelta(years=years, months=months) + timedelta(days=days)
            return relative_date
        return event.date

    def get_event_date(self, event_type, enrollment_date=None):
        """Retrieve the event date, considering 'from_enrollment' if applicable."""
        event = self.event_dates.filter(type=event_type).first()
        if not event:
            return None
        
        # If there's an enrollment_date and from_enrollment is defined, calculate it
        if enrollment_date and event.from_enrollment:
            return self.calculate_event_date(event, enrollment_date)
        
        # Otherwise, return the static date
        return event.date

    def __str__(self):
        return self.title
    
    def get_expiration_date(self, enrollment_date=None):
        event = self.event_dates.filter(type='expiration_date').first()
        if not event:
            return None
        
        if enrollment_date and event.from_enrollment:
            return self.calculate_event_date(event, enrollment_date)
        
        return event.date

    def get_due_date(self, enrollment_date=None):
        event = self.event_dates.filter(type='due_date').first()
        if not event:
            return None

        if enrollment_date and event.from_enrollment:
            return self.calculate_event_date(event, enrollment_date)
        
        return event.date

    def get_start_date(self, enrollment_date=None):
        event = self.event_dates.filter(type='start_date').first()
        if not event:
            return None

        if enrollment_date and event.from_enrollment:
            return self.calculate_event_date(event, enrollment_date)
        
        return event.date
        
    def get_lesson_count(self):
        return Lesson.objects.filter(module__course=self).count()

# New Credential model for managing course credentials like certificates
class Credential(models.Model):
    CREDENTIAL_TYPES = [
        ('certificate', 'Certificate'),
        # Add more types as needed
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='credentials')
    type = models.CharField(max_length=20, choices=CREDENTIAL_TYPES)
    title = models.CharField(max_length=200, blank=True)  # Title for the credential
    source_title = models.CharField(max_length=200, blank=True)
    source = models.URLField(max_length=500, blank=True)  # URL or file path to the credential

    def __str__(self):
        return f'{self.get_type_display()} for {self.course.title}'
    
class EventDate(models.Model):
    EVENT_TYPES = [
        ('start_date', 'Start Date'),
        ('expiration_date', 'Expiration Date'),
        ('due_date', 'Due Date'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='event_dates')
    type = models.CharField(max_length=20, choices=EVENT_TYPES)
    date = models.DateField(blank=True, null=True)  # Use DateField for actual dates
    time = models.TimeField(blank=True, null=True)  # Use TimeField for optional times
    from_enrollment = models.JSONField(blank=True, null=True)  # Store enrollment offset in years, months, days

    def __str__(self):
        return f'{self.get_type_display()} for {self.course.title}'
    
class Media(models.Model):
    MEDIA_TYPES = [
        ('thumbnail', 'Thumbnail'),
        # Add more types as needed
    ]
    type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='media')
    thumbnail_link = models.URLField(max_length=500, blank=True)  # For storing a URL to the image
    thumbnail_image = models.ImageField(upload_to='thumbnails/', blank=True)  # For storing the uploaded image

    def __str__(self):
        return f'Media for {self.course.title}'
    
class Resources(models.Model):
    RESOURCE_TYPES = [
        ('reference', 'Reference'),
        # Add more types as needed
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='resources')
    type = models.CharField(max_length=20, choices=RESOURCE_TYPES)
    title = models.CharField(max_length=200, blank=True)
    url = models.URLField(max_length=500, blank=True)
    file_type = models.CharField(max_length=200, blank=True, null=True)
    file_title = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f'Resource for {self.course.title}'
    
class Upload(models.Model):
    APPROVAL_CHOICES = [
        (None, 'None'),
        ('instructor', 'Instructor'),
        ('admin', 'Admin'),
        ('other', 'Other'),  # Add 'Other' as an option
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='uploads')
    approval_type = models.CharField(max_length=30, choices=APPROVAL_CHOICES, default=None, null=True, blank=True)
    approvers = models.ManyToManyField(User, blank=True)  # Users who approve the upload, relevant when 'other' is selected
    title = models.CharField(max_length=255, default='title')

    def __str__(self):
        return self.title

# Define a Module model
class Module(models.Model):
    course = models.ForeignKey(Course, related_name='modules', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

# Update the Lesson model to be associated with a Module
class Lesson(models.Model):
    module = models.ForeignKey(Module, related_name='lessons', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField()
    content_type = models.CharField(max_length=200, default='file')
    file = models.ForeignKey(File, on_delete=models.CASCADE, null=True, blank=True)
    uploaded_file = models.ForeignKey(UploadedFile, on_delete=models.CASCADE, null=True, blank=True)
    scorm_id = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        ordering = ['order']

    def save(self, *args, **kwargs):
        # Automatically link an uploaded file if content_type is 'scorm' and no file is already linked
        if self.content_type.lower() == 'scorm' and not self.uploaded_file:
            uploaded_files = UploadedFile.objects.all()
            if uploaded_files.exists():
                self.uploaded_file = uploaded_files.first()  # Assign the first available uploaded file
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
    
# Define a Quiz model
class Quiz(models.Model):
    lesson = models.ForeignKey(Lesson, related_name='quizzes', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.title

# Define a Question model
class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()

    def __str__(self):
        return self.text

# Define an Answer model
class Answer(models.Model):
    question = models.ForeignKey(Question, related_name='answers', on_delete=models.CASCADE)
    text = models.TextField()
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text
    
