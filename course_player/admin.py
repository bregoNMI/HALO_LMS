from django.contrib import admin
from course_player.models import LessonSession, SCORMTrackingData, LessonProgress, QuizResponse
from client_admin.models import QuizAttempt

# Register Course, Module, Lesson, and content types
admin.site.register(LessonSession)
admin.site.register(SCORMTrackingData)
admin.site.register(LessonProgress)
admin.site.register(QuizResponse)
admin.site.register(QuizAttempt)