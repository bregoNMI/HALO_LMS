from django.contrib import admin
from content.models import Course, Module, Lesson, SCORMContent, VideoContent, StorylineQuizContent, TextContent, Category

# Register Course, Module, Lesson, and content types
admin.site.register(Course)
admin.site.register(Module)
admin.site.register(Lesson)
admin.site.register(SCORMContent)
admin.site.register(VideoContent)
admin.site.register(StorylineQuizContent)
admin.site.register(TextContent)
admin.site.register(Category)