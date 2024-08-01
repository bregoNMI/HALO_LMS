from django.contrib import admin
from .models import Profile, UserCourse, UserModuleProgress, UserLessonProgress

class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'email', 'photoid', 'passportphoto')
    readonly_fields = ('user',)
    fields = ('user', 'first_name', 'last_name', 'email', 'photoid', 'passportphoto')

admin.site.register(Profile, ProfileAdmin)
admin.site.register(UserCourse)
admin.site.register(UserModuleProgress)
admin.site.register(UserLessonProgress)