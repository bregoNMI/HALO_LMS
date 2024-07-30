
print("Loading models...")
from django.contrib import admin
from django.contrib.auth.models import User
from client_admin.models import Course, Module, Lesson, UserCourse, Quiz, Question, Answer, Profile

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at', 'updated_at')
    search_fields = ('title', 'description')

@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order')
    search_fields = ('title', 'description')
    list_filter = ('course',)

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'order')
    search_fields = ('title', 'content')
    list_filter = ('module',)

@admin.register(UserCourse)
class UserCourseAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'progress')
    search_fields = ('user__username', 'course__title')
    list_filter = ('course',)

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'lesson')
    search_fields = ('title', 'description')
    list_filter = ('lesson',)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'quiz')
    search_fields = ('text',)
    list_filter = ('quiz',)

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('text', 'question', 'is_correct')
    search_fields = ('text',)
    list_filter = ('question', 'is_correct')

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'email', 'first_name', 'last_name', 'associate_school', 'archived', 'role')
    search_fields = ('user__username', 'email', 'first_name', 'last_name')
    list_filter = ('associate_school', 'archived', 'role')

    def save_model(self, request, obj, form, change):
        if not obj.user_id:
            obj.user = User.objects.create(username=obj.username, email=obj.email)
        obj.save()