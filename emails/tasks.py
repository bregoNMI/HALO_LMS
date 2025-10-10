from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth import get_user_model

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5, name="emails.send_welcome")
def send_welcome_email(self, user_id: int):
    User = get_user_model()
    user = User.objects.get(pk=user_id)

    subject = "Welcome to the LMS"
    text = f"Hi {user.first_name or user.username}, welcome aboard."
    html = f"<p>Hi <strong>{user.first_name or user.username}</strong>, welcome aboard.</p>"

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    msg.attach_alternative(html, "text/html")
    msg.send()
    return "sent"
