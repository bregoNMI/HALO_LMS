from django.contrib import admin
from .models import Profile, Message, UserCourse, UserModuleProgress, UserLessonProgress, OrganizationSettings, TimeZone, ActivityLog

class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'email', 'photoid', 'passportphoto')
    readonly_fields = ('user',)
    fields = ('user', 'first_name', 'last_name', 'email', 'photoid', 'passportphoto')

@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(admin.ModelAdmin):
    list_display = ('lms_name', 'organization_name', 'contact_first_name', 'contact_email')

admin.site.register(Profile, ProfileAdmin)
admin.site.register(Message)
admin.site.register(UserCourse)
admin.site.register(UserModuleProgress)
admin.site.register(UserLessonProgress)
admin.site.register(TimeZone)
admin.site.register(ActivityLog)