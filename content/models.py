import os
import zipfile
import uuid
from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from django.contrib.contenttypes.fields import GenericRelation
from halo_lms import settings
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    parent_category = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories')
    name = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True, max_length=2000)

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
        
class EventDateMixin:

    def calculate_event_date(self, event, enrollment_date):
        offset = event.from_enrollment or {}

        def safe_int(value):
            try:
                return int(value)
            except (ValueError, TypeError):
                return 0

        years = safe_int(offset.get('years'))
        months = safe_int(offset.get('months'))
        days = safe_int(offset.get('days'))

        return enrollment_date + relativedelta(years=years, months=months) + timedelta(days=days)

    def get_event_date(self, event_type, enrollment_date=None):
        event = self.event_dates.filter(type=event_type).first()
        if not event:
            return None
        if enrollment_date and event.from_enrollment:
            return self.calculate_event_date(event, enrollment_date)
        return event.date

# Define a Course model
class Course(models.Model, EventDateMixin):
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
    description = models.TextField(blank=True, max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=20, choices=COURSE_TYPES, default='bundle')
    status = models.CharField(max_length=20, choices=STATUS_TYPES, default='Inactive')
    thumbnail = models.ForeignKey('Media', on_delete=models.SET_NULL, null=True, blank=True, related_name='course_thumbnail')
    credential = models.ForeignKey('Credential', on_delete=models.SET_NULL, null=True, blank=True, related_name='course_credential')
    upload_instructions = models.TextField(blank=True, max_length=5000)
    locked = models.BooleanField(default=False)
    estimated_completion_time = models.DurationField(null=True, blank=True, help_text="Estimated time to complete the course (e.g., 3 hours)")
    terms_and_conditions = models.BooleanField(default=False)
    must_complete = models.CharField(
        max_length=20, choices=MUST_COMPLETE_CHOICES, default='any_order'
    )
    referencesEnabled = models.BooleanField(default=False)
    uploadsEnabled = models.BooleanField(default=False)
    event_dates = GenericRelation('EventDate')

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
class Credential(models.Model, EventDateMixin):
    CREDENTIAL_TYPES = [
        ('certificate', 'Certificate'),
        # Add more types as needed
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='credentials')
    type = models.CharField(max_length=20, choices=CREDENTIAL_TYPES)
    title = models.CharField(max_length=200, blank=True)  # Title for the credential
    source_title = models.CharField(max_length=200, blank=True)
    source = models.URLField(max_length=500, blank=True)  # URL or file path to the credential
    event_dates = GenericRelation('EventDate')

    def __str__(self):
        return f'{self.get_type_display()} for {self.course.title}'
    
class EventDate(models.Model):
    EVENT_TYPES = [
        ('start_date', 'Start Date'),
        ('expiration_date', 'Expiration Date'),
        ('due_date', 'Due Date'),
        ('certificate_expiration_date', 'Certificate Expiration Date')
    ]

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    type = models.CharField(max_length=50, choices=EVENT_TYPES)
    date = models.DateField(blank=True, null=True)
    time = models.TimeField(blank=True, null=True)
    from_enrollment = models.JSONField(blank=True, null=True)  # {'years': 0, 'months': 0, 'days': 0}

    def __str__(self):
        return f"{self.get_type_display()} for {self.content_object}"
    
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
    description = models.TextField(blank=True, max_length=2000)
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
    url = models.URLField(max_length=500, blank=True)
    file_type = models.CharField(max_length=200, blank=True, null=True)
    file_title = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, max_length=2000)

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
    description = models.TextField(blank=True, max_length=2000)
    order = models.PositiveIntegerField()
    content_type = models.CharField(max_length=200, default='file')
    file = models.ForeignKey(File, on_delete=models.CASCADE, null=True, blank=True)
    uploaded_file = models.ForeignKey(UploadedFile, on_delete=models.CASCADE, null=True, blank=True)
    scorm_id = models.CharField(max_length=255, null=True, blank=True)

    CREATE_FROM_CHOICES = [
        ('create_quiz_from1', 'Quiz Template'),
        ('create_quiz_from2', 'Quiz'),
    ]
    create_quiz_from = models.CharField(
        max_length=50, choices=CREATE_FROM_CHOICES, null=True, blank=True
    )
    quiz_template_id = models.PositiveIntegerField(null=True, blank=True)
    selected_quiz_template_name = models.CharField(max_length=255, null=True, blank=True)  # ✅ NEW
    quiz_id = models.PositiveIntegerField(null=True, blank=True)
    selected_quiz_name = models.CharField(max_length=255, null=True, blank=True)  # ✅ NEW
    assignment_toggle = models.BooleanField(default=False)
    assignments = models.ManyToManyField('Upload', related_name='lessons', blank=True)

    class Meta:
        ordering = ['order']

    def save(self, *args, **kwargs):
        if self.content_type.lower() == 'scorm' and not self.uploaded_file:
            uploaded_files = UploadedFile.objects.all()
            if uploaded_files.exists():
                self.uploaded_file = uploaded_files.first()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
    
class QuizConfig(models.Model):
    lesson = models.OneToOneField('Lesson', on_delete=models.CASCADE, related_name='quiz_config')
    
    quiz_type = models.CharField(max_length=50, null=True, blank=True)
    passing_score = models.PositiveIntegerField(null=True, blank=True)
    require_passing = models.BooleanField(default=False)
    quiz_duration = models.PositiveIntegerField(null=True, blank=True)
    quiz_attempts = models.CharField(max_length=20, default='Unlimited', null=True, blank=True)
    maximum_warnings = models.PositiveIntegerField(null=True, blank=True)
    randomize_order = models.BooleanField(default=False)
    reveal_answers = models.BooleanField(default=False)

    def __str__(self):
        return f"QuizConfig for {self.lesson.title}"
    
# Define a Question model
class Question(models.Model):
    """
    Base class for all question types.
    Shared properties placed here.
    """

    category = models.ForeignKey(
        'Category',
        verbose_name=_("Category"),
        blank=True,
        null=True,
        on_delete=models.CASCADE
    )

    tags = models.CharField(max_length=128, blank=True)

    urlField = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('IFrame for Exercises.')
    )
    content = models.CharField(
        max_length=1000,
        help_text=_("Enter the question text that you want displayed"),
        verbose_name=_('Question')
    )
    explanation = models.TextField(
        max_length=2000,
        blank=True,
        help_text=_("Explanation to be shown after the question has been answered."),
        verbose_name=_('Explanation')
    )
    randomize_answer_order = models.BooleanField(
        default=False,
        verbose_name=_("Randomize Answer Order"),
        help_text=_("Display the answers in a random order when the question is shown.")
    )
    allows_multiple = models.BooleanField(default=False)

    def __str__(self):
        return self.content
    
class QuestionMedia(models.Model):
    question = models.ForeignKey('Question', related_name='media_items', on_delete=models.CASCADE, null=True, blank=True)
    file = models.FileField(upload_to='question_media/')
    source_type = models.CharField(max_length=20, choices=[('upload', 'Upload'), ('library', 'Library'), ('embed', 'Embed')])
    title = models.CharField(max_length=255, blank=True)
    embed_code = models.TextField(blank=True, null=True)
    input_type = models.TextField(blank=True, null=True)
    url_from_library = models.URLField(max_length=500, blank=True)  # For storing a URL to the image from library
    type_from_library = models.CharField(max_length=255, blank=True)
    
# Define a Quiz model
class Quiz(models.Model):

    uuid = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)

    questions = models.ManyToManyField(
        Question,
        through='QuestionOrder',
        related_name='quizzes',
        blank=True
    )

    title = models.CharField(
        verbose_name=_("Title"),
        max_length=200, blank=False)

    description = models.TextField(
        verbose_name=_("Description"),
        blank=True, help_text=_("a description of the quiz"))

    duration = models.SmallIntegerField(
        blank=True, default=30,
        verbose_name=_("Duration"),
        help_text=_("Minutes to take the exam."))

    url = models.SlugField(
        max_length=60, blank=False,
        help_text=_("a user friendly url"),
        verbose_name=_("user friendly url"),
        unique=True)

    category = models.ForeignKey(
        Category, null=True, blank=True,
        verbose_name=_("Category"), on_delete=models.CASCADE)

    random_order = models.BooleanField(
        blank=False, default=True,
        verbose_name=_("Random Order"),
        help_text=_("Display the questions in "
                    "a random order or as they "
                    "are set?"))

    ai_grade_essay = models.BooleanField(
        blank=True, default=False, null=True,
        verbose_name=_("AI Essay Grading"),
        help_text=_("Use AI to grade essays?"))

    max_questions = models.IntegerField(
        blank=True, null=True, verbose_name=_("Max Questions"),
        help_text=_("Number of questions to be answered on each attempt."))

    answers_at_end = models.BooleanField(
        blank=False, default=False,
        help_text=_("Correct answer is NOT shown after question."
                    " Answers displayed at the end."),
        verbose_name=_("Answers at end"))

    exam_paper = models.BooleanField(
        blank=False, default=False,
        help_text=_("If yes, the result of each"
                    " attempt by a user will be"
                    " stored. Necessary for marking."),
        verbose_name=_("Exam Paper"))

    quiz_material = models.TextField(
        verbose_name=_("Quiz Materials"),
        blank=True, help_text=_("Specify any external resources the test-taker is allowed to use during the quiz. Please separate each quiz material by a comma."))

    ai_grade_rubric = models.TextField(
        verbose_name=_("AI Grading Rubric"),
        blank=True, null=True, help_text=_("Rubric to be used by the grading AI"))

    single_attempt = models.BooleanField(
        blank=False, default=False,
        help_text=_("If yes, only one attempt by"
                    " a user will be permitted."
                    " Non users cannot sit this exam."),
        verbose_name=_("Single Attempt"))

    pass_mark = models.SmallIntegerField(
        blank=True, default=70,
        verbose_name=_("Pass Mark(%)"),
        help_text=_("Percentage required to pass exam."))

    success_text = models.TextField(
        blank=True, help_text=_("Displayed if user passes."),
        default="Congratulations! You've successfully passed the quiz.",
        verbose_name=_("Success Text"))

    singular_quiz_rules = models.TextField(
        verbose_name=_("singular_quiz_rules"),
        blank=True, help_text=_("a set of rules for a specific quiz."))

    fail_text = models.TextField(
        verbose_name=_("Fail Text"),
        default="You didn’t pass this time. Review the material and try again.",
        blank=True, help_text=_("Displayed if user fails."))

    draft = models.BooleanField(
        blank=True, default=False,
        verbose_name=_("Draft"),
        help_text=_("If yes, the quiz is not displayed"
                    " in the quiz list and can only be"
                    " taken by users who can edit"
                    " quizzes."))

    total_attempts = models.SmallIntegerField(
        default=1,
        verbose_name=_("Total Number of Attempts"),
        help_text=_("Maximum number of attempts the user can attempt."))

    attempts_taken = models.SmallIntegerField(
        default=1,
        verbose_name=_("Number of attempts taken"),
        help_text=_("Number of attempts the current user has taken."))

    total_warnings = models.IntegerField(default=25, blank=False, verbose_name=_("Number of warnings before exam shut down:"),
                        help_text=_("Total number of warnings allowed for this quiz. Unlimited if 0."))

    allow_restart = models.BooleanField(default=True, blank=False,
                                   verbose_name=_("Do you want the user to restart the exam once started?"))

    author = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                               verbose_name=_('Exam author'), related_name='quiz_author')

    archived = models.BooleanField(default=False, blank=True)

    def __str__(self):
        return self.title
    
class QuizReference(models.Model):
    quiz = models.ForeignKey('Quiz', related_name='references', on_delete=models.CASCADE, null=True, blank=True)
    file = models.FileField(upload_to='quiz_references/', blank=True, null=True)
    source_type = models.CharField(
        max_length=20,
        choices=[('upload', 'Upload'), ('library', 'Library')],
        default='upload'
    )
    title = models.CharField(max_length=255, blank=True)
    url_from_library = models.URLField(max_length=500, blank=True)
    type_from_library = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.title or f'Reference for {self.quiz}'

    def get_file_url(self):
        if self.source_type == 'upload' and self.file:
            return self.file.url
        elif self.source_type == 'library':
            return self.url_from_library
        return ''

# Define an Answer model
class Answer(models.Model):
    question = models.ForeignKey(Question, related_name='answers', on_delete=models.CASCADE)
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.text
    
    class Meta:
        ordering = ['order']

class QuestionOrder(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('quiz', 'question')
        ordering = ['order']

class MCQuestion(Question):

    answer_order = models.CharField(
        default='none',
        max_length=30, null=True, blank=True,
        help_text=_("The order in which multichoice "
                    "answer options are displayed "
                    "to the user"),
        verbose_name=_("Answer Order")
        )

    def check_if_correct(self, guess):
        answer = Answer.objects.get(id=guess)

        if answer.correct is True:
            return True
        else:
            return False

    def order_answers(self, queryset):
        if self.answer_order == 'content':
            return queryset.order_by('content')
        if self.answer_order == 'random':
            return queryset.order_by('?')
        if self.answer_order == 'none':
            return queryset.order_by('id')
        return queryset

    def get_answers(self):
        return self.order_answers(Answer.objects.filter(question=self))

    def get_answer_for_the_question(self):
        queryset = self.get_answers().filter(correct=True)
        return queryset.first()

    def get_answers_list(self):
        return [(answer.id, answer.content) for answer in
                self.order_answers(Answer.objects.filter(question=self))]

    def answer_choice_to_string(self, guess):
        return Answer.objects.get(id=guess).content

    def correct(self):
        count = 0
        for answer in self.get_answers():
            if answer.correct:
                count = count + answer.times_picked
        return count

    def incorrect(self):
        count = 0
        for answer in self.get_answers():
            if not answer.correct:
                count = count + answer.times_picked
        return count

    def total(self):
        return self.correct() + self.incorrect()

    def correctpercentage(self):
        if self.correct() == 0:
            return 0
        rawscore = self.correct() / (self.correct() + self.incorrect())
        return round((rawscore * 100), 2)

    @property
    def prop_get_answers_list(self):
        return [(answer.id, answer.content) for answer in
                self.order_answers(Answer.objects.filter(question=self))]

    class Meta:
        verbose_name = _("Multiple Choice Question")
        verbose_name_plural = _("Multiple Choice Questions")

    def __str__(self):
        return f'{self.id} - {self.content}'

class TFQuestion(Question):
    """
    Subtype of Question for True/False questions.
    Stores the correct boolean answer.
    """

    correct = models.BooleanField(
        verbose_name=_("Correct Answer"),
        help_text=_("Select 'True' if the correct answer is True, else 'False'.")
    )

    def check_if_correct(self, guess: bool) -> bool:
        """
        Check if the user's guess matches the correct answer.
        """
        return self.correct == guess

    def correct_label(self) -> str:
        """
        Returns the label (string) version of the correct answer.
        """
        return _("True") if self.correct else _("False")

    def get_answers_list(self):
        """
        Returns the options as a tuple for form choice fields.
        """
        return [(True, _("True")), (False, _("False"))]

    def __str__(self):
        return f"{self.id} - {self.content}"

    class Meta:
        verbose_name = _("True/False Question")
        verbose_name_plural = _("True/False Questions")

class FITBAnswer(models.Model):
    question = models.ForeignKey(
        'FITBQuestion',
        related_name='acceptable_answers',
        on_delete=models.CASCADE
    )
    content = models.CharField(
        max_length=255,
        verbose_name=_("Acceptable Answer")
    )
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.content
    
    class Meta:
        ordering = ['order']

class FITBQuestion(Question):
    """
    Subtype for fill-in-the-blank questions with multiple acceptable answers.
    """
    case_sensitive = models.BooleanField(
        default=False,
        verbose_name=_("Case Sensitive"),
        help_text=_("If enabled, answers must match exactly including case.")
    )

    strip_whitespace = models.BooleanField(
        default=True,
        verbose_name=_("Strip Whitespace"),
        help_text=_("Trim leading/trailing whitespace before checking answer.")
    )

class EssayQuestion(Question):
    """
    A subtype of Question for manually or AI-graded multipart essay questions.
    """

    instructions = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Instructions"),
        help_text=_("General instructions for answering this essay question.")
    )

    rubric = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Rubric"),
        help_text=_("Detailed grading rubric for instructors or AI.")
    )

    answer_type = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name=_("Answer Type"),
        help_text=_("Optional classification or guidance for the expected answer.")
    )

    def get_prompts(self):
        return self.prompts.all()

    def get_prompts_with_ids(self):
        return [
            {
                'id': str(prompt.id),
                'prompt_text': prompt.prompt_text,
                'rubric': prompt.rubric
            }
            for prompt in self.prompts.all()
        ]

    @property
    def is_gradable(self):
        # Essay questions are gradable if they have prompts and a rubric
        return self.prompts.exists()

    def __str__(self):
        return f"Essay Question: {self.content}"

    class Meta:
        verbose_name = _("Essay Question (Manual/AI Graded)")
        verbose_name_plural = _("Essay Questions (Manual/AI Graded)")

class EssayPrompt(models.Model):
    question = models.ForeignKey(
        EssayQuestion, related_name="prompts",
        on_delete=models.CASCADE,
        verbose_name=_("Related Essay Question")
    )

    prompt_text = models.TextField(
        verbose_name=_("Prompt Text"),
        help_text=_("The question or prompt for the essay response.")
    )

    rubric = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Rubric"),
        help_text=_("Optional grading guidance for this specific prompt.")
    )

    order = models.PositiveIntegerField(default=0)

    @property
    def is_gradable(self):
        return True  # Always gradable by human/AI

    def __str__(self):
        return self.prompt_text

    class Meta:
        verbose_name = _("Essay Prompt")
        verbose_name_plural = _("Essay Prompts")

class EssayAnswer(models.Model):
    prompt = models.ForeignKey(
        EssayPrompt,
        related_name="answers",
        on_delete=models.CASCADE,
        verbose_name=_("Prompt")
    )

    question_id = models.IntegerField(blank=True, null=True, verbose_name=_("Question ID"))

    answer_text = models.TextField(
        verbose_name=_("Answer Text"),
        help_text=_("Student's essay response.")
    )

    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Submitted At"))
    sitting_id = models.IntegerField(blank=True, null=True, verbose_name=_("Sitting ID"))

    ai_feedback = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("AI Feedback"),
        help_text=_("AI-generated feedback or scoring.")
    )

    def __str__(self):
        return f"Essay Response to Prompt ID {self.prompt.id}"

    class Meta:
        verbose_name = _("Essay Answer")
        verbose_name_plural = _("Essay Answers")  

# Quiz Templates and Questions
class QuizTemplate(models.Model):
    title = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    total_questions = models.PositiveIntegerField(default=0)
    last_edited = models.DateTimeField(auto_now=True)
    description = models.TextField(blank=True, help_text="Optional notes or guidance for using this template.")

    # Useful if templates are meant to be shared or reused
    is_public = models.BooleanField(default=False, help_text="Allow other educators to view or copy this template.")

    def __str__(self):
        return self.title 
    
class TemplateCategorySelection(models.Model):
    template = models.ForeignKey(QuizTemplate, on_delete=models.CASCADE, related_name='category_selections')

    # Five category levels (based on your UI and `Category` model)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='template_category')
    sub_category1 = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='template_sub_category1')
    sub_category2 = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='template_sub_category2')
    sub_category3 = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='template_sub_category3')

    num_questions = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.template.title}: {self.category}, {self.sub_category1}, {self.sub_category2}, {self.sub_category3}"

class TemplateQuestion(models.Model):
    template = models.ForeignKey(QuizTemplate, on_delete=models.CASCADE, related_name='questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    # You can optionally store the category filter that added it
    filter_source = models.ForeignKey(TemplateCategorySelection, null=True, blank=True, on_delete=models.SET_NULL)


class Classroom(models.Model):
    name = models.CharField(max_length=100)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='classrooms')
    teachers = models.ManyToManyField(User, related_name='teaching_classrooms')
    students = models.ManyToManyField(User, related_name='student_classrooms')
    schedule = models.TextField(blank=True, help_text="Optional notes like 'M/W/F at 10am'")
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return f"{self.name} ({self.course.title})"

    def is_active(self):
        today = datetime.today().date()
        return self.start_date <= today <= self.end_date