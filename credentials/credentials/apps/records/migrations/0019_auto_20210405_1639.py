# Generated by Django 2.2.17 on 2021-04-05 16:39

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("records", "0018_change_learners_course_run"),
    ]

    operations = [
        migrations.AlterField(
            model_name="programcertrecord",
            name="program",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="catalog.Program"),
        ),
        migrations.AlterField(
            model_name="usercreditpathway",
            name="pathway",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="catalog.Pathway"),
        ),
        migrations.AlterField(
            model_name="usergrade",
            name="course_run",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="catalog.CourseRun"),
        ),
    ]
