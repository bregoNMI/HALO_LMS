# Generated by Django 3.2.10 on 2022-01-13 13:12

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('course_metadata', '0266_auto_20210624_1831'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='course',
            name='slug',
        ),
    ]
