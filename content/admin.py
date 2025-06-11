from django.contrib import admin
from content.models import (
    Course, Module, Lesson, Category, File, Credential,
    EventDate, Media, Upload, Resources, UploadedFile,
    Quiz, Question, QuestionOrder, Answer, MCQuestion, TFQuestion, FITBQuestion, FITBAnswer, EssayQuestion, EssayPrompt, QuestionMedia, QuizReference
)

# Register basic models
admin.site.register(Category)
admin.site.register(Course)
admin.site.register(Module)
admin.site.register(Lesson)
admin.site.register(File)
admin.site.register(Credential)
admin.site.register(EventDate)
admin.site.register(Media)
admin.site.register(Upload)
admin.site.register(Resources)
admin.site.register(UploadedFile)
admin.site.register(Answer)
admin.site.register(MCQuestion)
admin.site.register(TFQuestion)
admin.site.register(FITBQuestion)
admin.site.register(FITBAnswer)
admin.site.register(EssayQuestion)
admin.site.register(EssayPrompt)
admin.site.register(QuestionMedia)
admin.site.register(QuizReference)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    search_fields = ['content', 'tags']  # Required for autocomplete

class QuestionOrderInline(admin.TabularInline):
    model = QuestionOrder
    extra = 1
    autocomplete_fields = ['question']

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    inlines = [QuestionOrderInline]
    list_display = ['title', 'category', 'duration']
    search_fields = ['title', 'description']