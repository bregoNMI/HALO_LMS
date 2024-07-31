# Generated by Django 5.0.6 on 2024-07-31 13:25

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('client_admin', '0001_initial'),
        ('content', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='usercourse',
            name='course',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='content.course'),
        ),
        migrations.AddField(
            model_name='usercourse',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='userlessonprogress',
            name='lesson',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='content.lesson'),
        ),
        migrations.AddField(
            model_name='usermoduleprogress',
            name='module',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='content.module'),
        ),
        migrations.AddField(
            model_name='usermoduleprogress',
            name='user_course',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='module_progresses', to='client_admin.usercourse'),
        ),
        migrations.AddField(
            model_name='userlessonprogress',
            name='user_module_progress',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lesson_progresses', to='client_admin.usermoduleprogress'),
        ),
    ]