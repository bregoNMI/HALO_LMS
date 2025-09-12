# halo_lms/celery.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "halo_lms.settings")

app = Celery("halo_lms")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")  # default for host dev
app.conf.broker_url = os.getenv("CELERY_BROKER_URL", f"{REDIS_URL}/0")
app.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND", f"{REDIS_URL}/1")

app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=60,
    task_soft_time_limit=45,
    task_default_queue="default",
)

app.autodiscover_tasks()