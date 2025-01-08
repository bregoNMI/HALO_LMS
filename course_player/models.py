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
    lesson = models.ForeignKey('content.Lesson', on_delete=models.CASCADE)
    cmi_data = models.JSONField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    completion_status = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"Tracking Data for User {self.user} - Lesson {self.lesson}"