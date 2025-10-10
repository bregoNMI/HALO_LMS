from uuid import uuid4
from django.db import models
from django.contrib.auth.models import User
from content.models import Course, Module, Lesson, Question
from django.db.models.signals import post_save
from django.dispatch import receiver
from PIL import Image
from django.utils.translation import gettext_lazy as _
from io import BytesIO
from django.core.files.base import ContentFile
from datetime import datetime
from pytz import all_timezones
import uuid
from django.db.models import Sum, JSONField
from halo_lms import settings

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
            ('pending', 'Pending'),
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
    progress = models.CharField(max_length=20, default='0.0')  # Example: "Completed", "99% Completed"
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'lesson', 'mini_lesson_index')  # Prevents duplicate entries for the same user & lesson

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} - {self.progress}"
    
def new_session_id():
    return uuid.uuid4().hex
    
class LessonSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    user_course = models.ForeignKey(
        'client_admin.UserCourse',
        null=True, blank=True, on_delete=models.CASCADE,
        related_name='lesson_sessions'
    )

    session_id = models.CharField(max_length=64, unique=True, default=new_session_id, editable=False)
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

    last_position   = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    attempt_index   = models.PositiveIntegerField(default=1)

    status = models.CharField(
        max_length=16,
        default='active',
        choices=[
            ('active', 'Active'),
            ('pending', 'Pending'),
            ('completed', 'Completed'),
            ('abandoned', 'Abandoned'),
        ],
        db_index=True,
    )

    finished_at     = models.DateTimeField(null=True, blank=True)
    score_percent   = models.IntegerField(null=True, blank=True)
    passed          = models.BooleanField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.session_id:
            self.session_id = new_session_id()
        from client_admin.models import UserCourse
        if not self.user_course:
            course = self.lesson.module.course
            self.user_course = UserCourse.objects.filter(user=self.user, course=course).first()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} - {self.lesson} @ {self.start_time}"
    
class QuizResponse(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, null=True, blank=True)

    # NEW (nullable so you can backfill slowly)
    quiz_attempt = models.ForeignKey(
        'client_admin.QuizAttempt',
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='responses',
    )

    # legacy (keep if you still need it)
    lesson_session = models.ForeignKey(
        'LessonSession',
        on_delete=models.CASCADE,
        null=True, blank=True,
        verbose_name=_("Lesson Session"),
    )

    user_answer = models.TextField()
    is_correct = models.BooleanField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    seen_index = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    score_points = models.IntegerField(null=True, blank=True)
    max_points   = models.IntegerField(null=True, blank=True)

class EssayPromptGrade(models.Model):
    response    = models.ForeignKey(QuizResponse,
                                    on_delete=models.CASCADE,
                                    related_name='essay_grades')
    prompt      = models.ForeignKey('content.EssayPrompt',
                                    on_delete=models.CASCADE)

    is_correct  = models.BooleanField(null=True, blank=True)

    score_points = models.IntegerField(default=0)
    max_points   = models.IntegerField(default=1)

    feedback    = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('response', 'prompt')