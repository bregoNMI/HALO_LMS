# Generated by Django 1.11.3 on 2018-01-31 19:56


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('course_metadata', '0076_auto_20171219_1841'),
    ]

    operations = [
        migrations.AlterField(
            model_name='course',
            name='short_description',
            field=models.CharField(blank=True, default=None, max_length=350, null=True),
        ),
    ]