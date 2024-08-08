# Generated by Django 5.0.6 on 2024-08-08 12:32

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0002_category_course_type_alter_course_description_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='File',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='user_files/')),
                ('title', models.CharField(default='Untitled', max_length=255)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.DeleteModel(
            name='SCORMContent',
        ),
        migrations.DeleteModel(
            name='StorylineQuizContent',
        ),
        migrations.DeleteModel(
            name='TextContent',
        ),
        migrations.DeleteModel(
            name='VideoContent',
        ),
        migrations.RemoveField(
            model_name='lesson',
            name='content_type',
        ),
        migrations.RemoveField(
            model_name='lesson',
            name='object_id',
        ),
        migrations.AddField(
            model_name='lesson',
            name='file',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='content.file'),
        ),
    ]
