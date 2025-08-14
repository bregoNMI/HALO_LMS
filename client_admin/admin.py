from django.contrib import admin
from .models import Profile, Message, UserCourse, UserModuleProgress, UserLessonProgress, OrganizationSettings, TimeZone, ActivityLog, GeneratedCertificate, EnrollmentKey, UserAssignmentProgress, FacialVerificationLog

class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'email', 'photoid', 'passportphoto')
    readonly_fields = ('user',)
    fields = ('user', 'first_name', 'last_name', 'email', 'photoid', 'passportphoto')

@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(admin.ModelAdmin):
    list_display = ('lms_name', 'organization_name', 'contact_first_name', 'contact_email')

admin.site.register(Profile)
admin.site.register(Message)
admin.site.register(UserCourse)
admin.site.register(UserModuleProgress)
admin.site.register(UserLessonProgress)
admin.site.register(TimeZone)
admin.site.register(ActivityLog)
admin.site.register(EnrollmentKey)
admin.site.register(FacialVerificationLog)

@admin.register(GeneratedCertificate)
class GeneratedCertificateAdmin(admin.ModelAdmin):
    list_display = ('user_course', 'issued_at', 'file')
    readonly_fields = ('issued_at',)

@admin.register(UserAssignmentProgress)
class UserAssignmentProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'assignment', 'status', 'completed_at', 'reviewed_by')
    list_filter = ('status',)
    search_fields = ('user__username', 'assignment__title')
    readonly_fields = ('completed_at',)