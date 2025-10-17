from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Lesson, Module, Course
from client_admin.models import UserCourse

@receiver(post_save, sender=Lesson)
def update_progress_on_lesson_save(sender, instance, **kwargs):
    module = instance.module
    module_progress = module.calculate_progress()
    print(f'Module {module.title} progress: {module_progress}%')

    course = instance.module.course
    user_courses = UserCourse.objects.filter(course=course)

    for user_course in user_courses:
        user_course.update_progress()

@receiver(post_delete, sender=Lesson)
def update_progress_on_lesson_delete(sender, instance, **kwargs):
    module = instance.module
    module_progress = module.calculate_progress()
    print(f'Module {module.title} progress: {module_progress}%')

    course = instance.module.course
    user_courses = UserCourse.objects.filter(course=course)

    for user_course in user_courses:
        user_course.update_progress()