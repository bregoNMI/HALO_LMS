from django.contrib import admin
from client_admin.models import Profile, UserCourse, UserModuleProgress, UserLessonProgress

# Register Profile and other models
admin.site.register(Profile)
admin.site.register(UserCourse)
admin.site.register(UserModuleProgress)
admin.site.register(UserLessonProgress)