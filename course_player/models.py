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
    cmi_data = models.JSONField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)
    lesson_location = models.TextField(blank=True, null=True)
    scroll_position = models.IntegerField(default=0)
    completion_status = models.CharField(
        max_length=50,
        choices=[
            ('completed', 'Completed'),
            ('incomplete', 'Incomplete'),
            ('failed', 'Failed'),
            ('passed', 'Passed'),
        ]
    )
    session_time = models.CharField(max_length=32, default="PT0H0M0S")
    progress = models.FloatField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'lesson')  # Ensure one tracking entry per user+lesson

    def __str__(self):
        return f"Tracking Data for User {self.user} - Lesson {self.lesson}"
    
class LessonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)  # Link to Lesson model
    mini_lesson_index = models.IntegerField(null=True, blank=True)  # New field
    progress = models.CharField(max_length=20)  # Example: "Completed", "99% Completed"
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'lesson', 'mini_lesson_index')  # Prevents duplicate entries for the same user & lesson

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} - {self.progress}"
    
class LessonSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    user_course = models.ForeignKey('client_admin.UserCourse', null=True, blank=True, on_delete=models.CASCADE, related_name='lesson_sessions')

    session_id = models.CharField(max_length=64, unique=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    progress = models.FloatField(default=0.0)
    completion_status = models.CharField(max_length=32, default="incomplete")
    session_time = models.CharField(max_length=32, default="PT0H0M0S")
    scroll_position = models.IntegerField(default=0)
    score = models.FloatField(null=True, blank=True)
    lesson_location = models.TextField(blank=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    cmi_data = models.JSONField(default=dict)

    def save(self, *args, **kwargs):
        from client_admin.models import UserCourse
        if not self.user_course:
            course = self.lesson.module.course
            self.user_course = UserCourse.objects.filter(user=self.user, course=course).first()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} - {self.lesson} @ {self.start_time}"