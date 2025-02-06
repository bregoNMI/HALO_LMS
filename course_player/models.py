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

class SCORMTrackingData(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    cmi_data = models.JSONField()  # Store raw SCORM interaction data in JSON format
    score = models.FloatField(null=True, blank=True)
    lesson_location = models.TextField(blank=True, null=True)
    scroll_position = models.IntegerField(default=0)
    completion_status = models.CharField(max_length=50, choices=[('completed', 'Completed'), ('incomplete', 'Incomplete'), ('failed', 'Failed'), ('passed', 'Passed')])
    session_time = models.DurationField(null=True, blank=True)
    progress = models.FloatField(null=True, blank=True)  # Percentage
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tracking Data for User {self.user} - Lesson {self.lesson}"
    
class LessonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)  # Link to Lesson model
    mini_lesson_index = models.IntegerField(null=True, blank=True)  # New field
    progress = models.CharField(max_length=20)  # Example: "Completed", "99% Completed"
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'lesson')  # Prevents duplicate entries for the same user & lesson

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} - {self.progress}"
    
