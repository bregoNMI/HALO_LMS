from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth import get_user_model

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5, name="emails.send_generic")
def send_user_email(self, user_id: int = None, to_email: str = None, subject: str = "", text_body: str = "", html_body: str = None):
    if not user_id and not to_email:
        raise ValueError("Either user_id or to_email must be provided.")

    if user_id:
        User = get_user_model()
        user = User.objects.get(pk=user_id)
        to_email = user.email

    if not to_email:
        raise ValueError("Recipient email address is empty.")

    subject = subject or "(no subject)"
    text_body = text_body or ""

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "SERVER_EMAIL", None)
    if not from_email:
        raise ValueError("DEFAULT_FROM_EMAIL (or SERVER_EMAIL) must be set in settings.")

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email,
        to=[to_email],
    )
    if html_body:
        msg.attach_alternative(html_body, "text/html")
    msg.send()

    # optional: keep for dev only, or switch to logging
    print("SENDING EMAIL:", subject, "->", to_email)

    return f"sent to {to_email}"