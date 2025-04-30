from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from .models import Course, StudentEnrollment, Grade, calculate_student_final_grade

@login_required
def teacher_gradebook_view(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    students = StudentEnrollment.objects.filter(course=course)

    gradebook = []
    for enrollment in students:
        student = enrollment.student
        final_grade = calculate_student_final_grade(student, course)
        gradebook.append({
            'student': student,
            'final_grade': final_grade
        })

    context = {
        'course': course,
        'gradebook': gradebook,
    }
    return render(request, 'gradebook/teacher_view.html', context)

@login_required
def student_grade_view(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    student = request.user

    category_grades = []
    for category in course.grading_categories.all():
        assignments = category.assignments.all()
        grades = Grade.objects.filter(student=student, assignment__in=assignments)

        total_score = sum(g.score for g in grades)
        total_max = sum(g.assignment.max_score for g in grades)
        percentage = (total_score / total_max * 100) if total_max else 0

        category_grades.append({
            'category': category.name,
            'weight': category.weight,
            'percentage': round(percentage, 2)
        })

    final_grade = calculate_student_final_grade(student, course)

    context = {
        'course': course,
        'category_grades': category_grades,
        'final_grade': final_grade,
    }
    return render(request, 'gradebook/student_view.html', context)

