# Generated by Django 4.2.13 on 2024-08-01 19:34

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0004_alter_course_category"),
    ]

    operations = [
        migrations.AlterField(
            model_name="category",
            name="name",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AlterField(
            model_name="course",
            name="category",
            field=models.ForeignKey(
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="courses",
                to="content.category",
            ),
        ),
        migrations.AlterField(
            model_name="course", name="description", field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="course",
            name="status",
            field=models.CharField(
                blank=True,
                choices=[("active", "Active"), ("inactive", "Inactive")],
                default="inactive",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="course",
            name="type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("bundle", "Course Bundle"),
                    ("in_person", "In Person Course"),
                    ("online", "Online Course"),
                ],
                default="online",
                max_length=20,
            ),
        ),
    ]
