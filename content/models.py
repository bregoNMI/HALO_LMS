from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class Content(models.Model):
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True

class SCORMContent(Content):
    file = models.FileField(upload_to='scorm/')

class VideoContent(Content):
    video_url = models.URLField()

class StorylineQuizContent(Content):
    file = models.FileField(upload_to='storyline_quizzes/')

class TextContent(Content):
    text = models.TextField()

# Define a Course model
class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_progress(self):
        modules = self.modules.all()
        total_modules = modules.count()
        if total_modules == 0:
            return 0
        module_progress = sum(module.calculate_progress() for module in modules) / total_modules
        return module_progress

    def __str__(self):
        return self.title

# Define a Module model
class Module(models.Model):
    course = models.ForeignKey(Course, related_name='modules', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()

    def calculate_progress(self):
        lessons = self.lessons.all()
        total_lessons = lessons.count()
        completed_lessons = lessons.filter(is_completed=True).count()
        if total_lessons == 0:
            return 0
        return (completed_lessons / total_lessons) * 100

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

# Update the Lesson model to be associated with a Module
class Lesson(models.Model):
    module = models.ForeignKey(Module, related_name='lessons', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField()
    is_completed = models.BooleanField(default=False)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

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