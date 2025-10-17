# emails/models.py
from django.db import models

class EmailTemplate(models.Model):
    key = models.SlugField(max_length=150)  # e.g. "account_creation", "user_enrollment"
    locale = models.CharField(max_length=10, blank=True, default="")  # "" = default
    subject_template = models.CharField(max_length=255)
    text_template = models.TextField(blank=True)
    html_template = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    # optional but handy for ordering/updates:
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("key", "locale", "version")]
        indexes = [
            models.Index(fields=["key", "locale", "is_active"]),
        ]

    def __str__(self):
        loc = self.locale or "default"
        return f"{self.key} [{loc}] v{self.version}"