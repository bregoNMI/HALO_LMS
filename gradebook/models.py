from client_admin import models
from content.models import Course
from django.contrib.auth.models import User


class GradingCategory(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='grading_categories')
    name = models.CharField(max_length=100)
    weight = models.FloatField(help_text="Percentage of total grade this category counts for (e.g. 25 for 25%)")

    class Meta:
        unique_together = ('course', 'name')  # Prevent duplicates per course

    def __str__(self):
        return f'{self.name} ({self.course.title})'

class Assignment(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    category = models.ForeignKey(GradingCategory, on_delete=models.PROTECT, related_name='assignments')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    max_score = models.FloatField(default=100)

    def __str__(self):
        return f'{self.title} ({self.course.title})'

class Grade(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE)
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.FloatField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    feedback = models.TextField(blank=True)

    def percentage(self):
        return (self.score / self.assignment.max_score) * 100

    def __str__(self):
        return f'{self.student.username} - {self.assignment.title}: {self.score}'
    
class Attendance(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    date = models.DateField()
    status = models.CharField(max_length=10, choices=[
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    ])

    def __str__(self):
        return f'{self.date} - {self.student.username} - {self.status}'

def calculate_student_final_grade(student, course):
    categories = course.grading_categories.all()
    total_weighted_score = 0
    total_weight = 0

    for category in categories:
        grades = Grade.objects.filter(student=student, assignment__category=category)
        if not grades.exists():
            continue

        total_score = sum(g.score for g in grades)
        total_max = sum(g.assignment.max_score for g in grades)

        if total_max == 0:
            continue

        category_percentage = total_score / total_max
        weighted_score = category_percentage * (category.weight / 100)

        total_weighted_score += weighted_score
        total_weight += category.weight

    final_percentage = total_weighted_score if total_weight == 100 else 0
    return round(final_percentage * 100, 2)
