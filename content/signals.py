from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Lesson, Module, Course

@receiver(post_save, sender=Lesson)
def update_progress_on_lesson_save(sender, instance, **kwargs):
    module = instance.module
    module_progress = module.calculate_progress()
    print(f'Module {module.title} progress: {module_progress}%')

    course = module.course
    course_progress = course.calculate_progress()
    print(f'Course {course.title} progress: {course_progress}%')

@receiver(post_delete, sender=Lesson)
def update_progress_on_lesson_delete(sender, instance, **kwargs):
    module = instance.module
    module_progress = module.calculate_progress()
    print(f'Module {module.title} progress: {module_progress}%')

    course = module.course
    course_progress = course.calculate_progress()
    print(f'Course {course.title} progress: {course_progress}%')