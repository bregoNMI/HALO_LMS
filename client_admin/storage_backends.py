from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings

class TenantS3Boto3Storage(S3Boto3Storage):
    location = 'media'  # Base directory for media files

    def _save(self, name, content):
        tenant_name = getattr(settings, 'CURRENT_TENANT', 'default')
        name = f"{tenant_name}/{name}"  # Prefix file name with tenant folder
        return super()._save(name, content)
