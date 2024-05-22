# Generated by Django 2.2.14 on 2020-08-04 14:01

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('publisher', '0001_squashed_0089_drop_tables'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='organizationextension',
            options={'get_latest_by': 'modified', 'permissions': (('publisher_edit_course', 'Can edit course'), ('publisher_edit_course_run', 'Can edit course run'), ('publisher_view_course', 'Can view course'), ('publisher_view_course_run', 'Can view the course run'))},
        ),
    ]
