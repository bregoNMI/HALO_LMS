# Generated by Django 1.9.13 on 2017-05-18 10:17


from django.db import migrations

from course_discovery.apps.publisher.constants import LEGAL_TEAM_GROUP_NAME


def create_legal_team_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.get_or_create(name=LEGAL_TEAM_GROUP_NAME)


def remove_legal_team_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name=LEGAL_TEAM_GROUP_NAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('publisher', '0048_auto_20170511_1059'),
    ]

    operations = [
        migrations.RunPython(create_legal_team_group, remove_legal_team_group)
    ]
