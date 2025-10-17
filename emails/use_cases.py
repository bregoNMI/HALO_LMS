from .services import _resolve_template, _render_string
from .tasks import send_user_email  # your existing task

def send_account_creation_email(user, *, organization=None, locale=""):
    tpl = _resolve_template("account_creation", organization=organization, locale=locale)
    # sensible defaults if not configured
    subj_src = tpl.subject_template if tpl else "Welcome to the LMS"
    text_src = tpl.text_template if tpl else "Hi {{ first_name }}, your account is ready."
    html_src = tpl.html_template if tpl else "<p>Hi <strong>{{ first_name }}</strong>, your account is ready.</p>"

    ctx = {
        "user": user,
        "first_name": user.first_name or user.username,
        "dashboard_url": "/learner/dashboard/",
    }

    subject = _render_string(subj_src, ctx)
    text = _render_string(text_src, ctx)
    html = _render_string(html_src, ctx)

    return send_user_email.delay(user_id=user.id, subject=subject, text_body=text, html_body=html)
