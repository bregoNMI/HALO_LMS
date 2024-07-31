# Generated by Django 5.0.6 on 2024-07-31 13:25

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserCourse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('progress', models.PositiveIntegerField(default=0)),
            ],
        ),
        migrations.CreateModel(
            name='UserLessonProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('completed', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='UserModuleProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('progress', models.PositiveIntegerField(default=0)),
                ('completed', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.CharField(blank=True, max_length=30, verbose_name='Username')),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='email address')),
                ('first_name', models.CharField(blank=True, max_length=30, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=30, verbose_name='last name')),
                ('name_on_cert', models.CharField(blank=True, max_length=64, verbose_name='name on certificate')),
                ('associate_school', models.CharField(default='NMI / NEMO', max_length=30)),
                ('archived', models.BooleanField(default=False)),
                ('role', models.CharField(default='Student', max_length=30)),
                ('birth_date', models.DateField(blank=True, null=True)),
                ('address_1', models.CharField(max_length=256)),
                ('address_2', models.CharField(blank=True, max_length=256, null=True)),
                ('city', models.CharField(max_length=64)),
                ('state', models.CharField(max_length=64, verbose_name='State/Province')),
                ('code', models.CharField(max_length=15, verbose_name='Postal Code')),
                ('country', models.CharField(max_length=256)),
                ('citizenship', models.CharField(max_length=256)),
                ('phone', models.CharField(default='9999999999', max_length=18)),
                ('sex', models.CharField(blank=True, max_length=30)),
                ('delivery_method', models.CharField(blank=True, max_length=64)),
                ('referral', models.CharField(blank=True, max_length=512)),
                ('initials', models.CharField(default='ABC', max_length=5)),
                ('photoid', models.ImageField(upload_to='')),
                ('passportphoto', models.ImageField(upload_to='')),
                ('date_joined', models.DateTimeField(auto_now_add=True, verbose_name='date joined')),
                ('user', models.OneToOneField(editable=False, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]