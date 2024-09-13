from django.apps import AppConfig
from django.db.models.signals import post_migrate

def create_default_models(sender, **kwargs):
    from .models import Header, Footer
    if not Header.objects.exists():
        Header.objects.create()

    if not Footer.objects.exists():
        Footer.objects.create()

class CustomDashboardConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "custom_templates"

    def ready(self):
        post_migrate.connect(create_default_models, sender=self)
