from django.contrib import admin
from content.models import Course, Module, Lesson, Category, File

# Register Course, Module, Lesson, and content types
admin.site.register(Category)
admin.site.register(Course)
admin.site.register(Module)
admin.site.register(Lesson)
admin.site.register(File)