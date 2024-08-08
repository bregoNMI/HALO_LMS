import os
from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class Category(models.Model):
    name = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.name
    
class File(models.Model):
    FILE_TYPE_CHOICES = [
        ('image', 'Image'),
        ('document', 'Document'),
        ('video', 'Video'),
        ('audio', 'Audio'),
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
        if not self.file_type or self.file_type == 'other':
            self.file_type = self.determine_file_type()
        super().save(*args, **kwargs)

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
        else:
            return 'other'

# Define a Course model
class Course(models.Model):
    COURSE_TYPES = [
        ('bundle', 'Course Bundle'),
        ('in_person', 'In Person Course'),
        ('online', 'Online Course'),
    ]

    STATUS_TYPES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, default=1)
    type = models.CharField(max_length=20, choices=COURSE_TYPES, default='bundle')

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

    file = models.ForeignKey(File, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['order']

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