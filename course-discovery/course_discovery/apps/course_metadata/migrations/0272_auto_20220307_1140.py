# Generated by Django 3.2.11 on 2022-03-07 11:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('course_metadata', '0271_additionalmetadata_lead_capture_form_url'),
    ]

    operations = [
        migrations.AlterField(
            model_name='historicalmode',
            name='certificate_type',
            field=models.CharField(blank=True, choices=[('honor', 'Honor'), ('credit', 'Credit'), ('verified', 'Verified'), ('professional', 'Professional'), ('executive-education', 'Executive Education'), ('paid-executive-education', 'Paid Executive Education'), ('unpaid-executive-education', 'Unpaid Executive Education')], help_text='Certificate type granted if this mode is eligible for a certificate, or blank if not.', max_length=64),
        ),
        migrations.AlterField(
            model_name='mode',
            name='certificate_type',
            field=models.CharField(blank=True, choices=[('honor', 'Honor'), ('credit', 'Credit'), ('verified', 'Verified'), ('professional', 'Professional'), ('executive-education', 'Executive Education'), ('paid-executive-education', 'Paid Executive Education'), ('unpaid-executive-education', 'Unpaid Executive Education')], help_text='Certificate type granted if this mode is eligible for a certificate, or blank if not.', max_length=64),
        ),
    ]
