from django.contrib import admin
from .models import GradingCategory, Assignment, Grade

class GradingCategoryInline(admin.TabularInline):
    model = GradingCategory
    extra = 1

@admin.register(GradingCategory)
class GradingCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'weight')
    list_filter = ('course',)
    search_fields = ('name', 'course__title')

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'category', 'due_date', 'max_score')
    list_filter = ('course', 'category')
    search_fields = ('title', 'course__title')

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('assignment', 'student', 'score', 'submitted_at')
    list_filter = ('assignment__course',)
    search_fields = ('student__username', 'assignment__title')
