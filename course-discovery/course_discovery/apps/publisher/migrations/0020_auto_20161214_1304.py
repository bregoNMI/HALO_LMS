# Generated by Django 1.9.11 on 2016-12-14 12:21


import django.db.models.deletion
import django_extensions.db.fields
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('course_metadata', '0039_programtype_logo_image'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('auth', '0007_alter_validators_add_error_messages'),
        ('publisher', '0019_create_user_groups'),
    ]

    operations = [
        migrations.CreateModel(
            name='HistoricalOrganizationExtension',
            fields=[
                ('id', models.IntegerField(auto_created=True, blank=True, db_index=True, verbose_name='ID')),
                ('created', django_extensions.db.fields.CreationDateTimeField(auto_now_add=True, verbose_name='created')),
                ('modified', django_extensions.db.fields.ModificationDateTimeField(auto_now=True, verbose_name='modified')),
                ('history_id', models.AutoField(primary_key=True, serialize=False)),
                ('history_date', models.DateTimeField()),
                ('history_type', models.CharField(choices=[('+', 'Created'), ('~', 'Changed'), ('-', 'Deleted')], max_length=1)),
                ('group', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to='auth.Group')),
                ('history_user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to='course_metadata.Organization')),
            ],
            options={
                'ordering': ('-history_date', '-history_id'),
                'get_latest_by': 'history_date',
                'verbose_name': 'historical organization extension',
            },
        ),
        migrations.CreateModel(
            name='OrganizationExtension',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', django_extensions.db.fields.CreationDateTimeField(auto_now_add=True, verbose_name='created')),
                ('modified', django_extensions.db.fields.ModificationDateTimeField(auto_now=True, verbose_name='modified')),
                ('group', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='organization_extension', to='auth.Group')),
                ('organization', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='organization_extension', to='course_metadata.Organization')),
            ],
            options={
                'ordering': ('-modified', '-created'),
                'get_latest_by': 'modified',
                'abstract': False,
            },
        ),
    ]
