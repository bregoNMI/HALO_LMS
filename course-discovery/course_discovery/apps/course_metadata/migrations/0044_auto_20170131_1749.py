# Generated by Django 1.9.11 on 2017-01-31 17:49


import taggit_autosuggest.managers
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('taggit', '0002_auto_20150616_2121'),
        ('course_metadata', '0043_courserun_course_overridden'),
    ]

    operations = [
        migrations.AddField(
            model_name='courserun',
            name='tags',
            field=taggit_autosuggest.managers.TaggableManager(blank=True, help_text='Pick a tag from the suggestions. To make a new tag, add a comma after the tag name.', through='taggit.TaggedItem', to='taggit.Tag', verbose_name='Tags'),
        ),
        migrations.AlterField(
            model_name='organization',
            name='tags',
            field=taggit_autosuggest.managers.TaggableManager(blank=True, help_text='Pick a tag from the suggestions. To make a new tag, add a comma after the tag name.', through='taggit.TaggedItem', to='taggit.Tag', verbose_name='Tags'),
        ),
    ]