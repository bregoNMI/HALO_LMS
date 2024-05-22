# Generated by Django 3.2.22 on 2023-10-12 12:11
from django.db import migrations

TELUGU_LANG_TAG = ('Telugu', 'te')

def add_telugu_language_tag(apps, schema_editor):  # pylint: disable=unused-argument
    LanguageTag = apps.get_model('ietf_language_tags', 'LanguageTag')
    LanguageTagTranslation = apps.get_model('ietf_language_tags', 'LanguageTagTranslation')
    
    LanguageTag.objects.update_or_create(code=TELUGU_LANG_TAG[1], defaults={'name': TELUGU_LANG_TAG[0]})
    LanguageTagTranslation.objects.update_or_create(
        master=LanguageTag.objects.get(code=TELUGU_LANG_TAG[1]),
        language_code='en',
        defaults={'name_t': TELUGU_LANG_TAG[0]}
    )

class Migration(migrations.Migration):
    dependencies = [
        ('ietf_language_tags', '0004_auto_20200804_1401'),
    ]

    operations = [
        migrations.RunPython(add_telugu_language_tag, migrations.RunPython.noop),
    ]
