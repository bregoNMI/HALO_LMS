import json
from .tasks import send_user_email
from django.contrib.auth import get_user_model
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import Http404
from functools import wraps

from .models import EmailTemplate
from .services import _resolve_template, _render_string

EMAIL_KEYS = {
    "account_creation": "Account Creation Email",
    "user_enrollment": "User Enrollment Email",
    # add more keys as you introduce them
}

# Optional: show different helper variables per template
EMAIL_ALLOWED_VARS = {
    "account_creation": ["{{ first_name }}", "{{ user.email }}", "{{ dashboard_url }}"],
    "user_enrollment": ["{{ first_name }}", "{{ user.email }}", "{{ course.title }}", "{{ enroll_url }}"],
}

DEFAULT_TEMPLATES = {
    "account_creation": {
        "subject": "Welcome to the LMS",
        "text": "Hi {{ first_name }}, your account is ready. Visit {{ dashboard_url }}",
        "html": "<p>Hi <strong>{{ first_name }}</strong>, your account is ready.</p>"
                "<p><a href='{{ dashboard_url }}'>Go to your dashboard</a></p>",
    },
    "user_enrollment": {
        "subject": "You’ve been enrolled in {{ course.title }}",
        "text": "Hi {{ first_name }}, you’re enrolled. Start here: {{ enroll_url }}",
        "html": "<p>Hi <strong>{{ first_name }}</strong>, you’re enrolled in "
                "<strong>{{ course.title }}</strong>.</p><p><a href='{{ enroll_url }}'>Start course</a></p>",
    },
}

def validate_key(view):
    @wraps(view)
    def _wrapped(request, key, *args, **kwargs):
        if key not in EMAIL_KEYS:
            raise Http404("Unknown email template key")
        return view(request, key, *args, **kwargs)
    return _wrapped

@login_required
def templates_hub(request):
    # Pick a default key to load on first render
    default_key = next(iter(EMAIL_KEYS.keys()))
    return render(
        request,
        "html/email_templates_hub.html",
        {
            "email_keys_json": json.dumps(EMAIL_KEYS),
            "allowed_vars_map_json": json.dumps(EMAIL_ALLOWED_VARS),
            "default_key": default_key,
        },
    )

@login_required
@require_http_methods(["GET"])
def trigger_test_email(request):
    to = request.GET.get("to") or request.user.email
    if not to:
        return HttpResponseBadRequest("Provide ?to=<email> or make sure your user has an email.")

    key = request.GET.get("key") or "account_creation"
    if key not in EMAIL_KEYS:
        return HttpResponseBadRequest("Unknown email template key")

    locale = request.GET.get("locale", "")
    tpl = _resolve_template(key=key, locale=locale)
    defaults = DEFAULT_TEMPLATES.get(key, {})

    subj_src = tpl.subject_template if tpl else defaults.get("subject", f"Test: {key}")
    text_src = tpl.text_template    if tpl else defaults.get("text", "Hi {{ first_name }}, this is a test.")
    html_src = tpl.html_template    if tpl else defaults.get("html", "<p>Hi <strong>{{ first_name }}</strong>, this is a test.</p>")

    ctx = {
        "user": request.user,
        "first_name": request.user.first_name or request.user.username,
        "dashboard_url": "/learner/dashboard/",
    }

    subject = _render_string(subj_src, ctx)
    text    = _render_string(text_src, ctx)
    html    = _render_string(html_src, ctx)

    task = send_user_email.delay(to_email=to, subject=subject, text_body=text, html_body=html)
    return JsonResponse({"queued": True, "task_id": task.id, "to": to, "key": key})

@login_required
def edit_email_template(request, key):
    if key not in EMAIL_KEYS:
        raise Http404("Unknown email template key")
    context = {
        "key": key,
        "title": EMAIL_KEYS[key],
        "allowed_vars": ["{{ first_name }}", "{{ user.email }}", "{{ dashboard_url }}"],
    }
    return render(request, "emails/template_editor.html", context)

@login_required
@require_http_methods(["GET"])
@validate_key
def get_email_template(request, key):
    locale = request.GET.get("locale") or ""
    tpl = _resolve_template(key=key, locale=locale)
    defaults = DEFAULT_TEMPLATES.get(key, {})

    subject_src = tpl.subject_template if tpl else defaults.get("subject", "")
    text_src    = tpl.text_template    if tpl else defaults.get("text", "")
    html_src    = tpl.html_template    if tpl else defaults.get("html", "")

    return JsonResponse({
        "key": key,
        "locale": locale,
        "subject_template": subject_src,
        "text_template": text_src,
        "html_template": html_src,
        "version": getattr(tpl, "version", 1),
        "exists": bool(tpl),
        "is_default": not bool(tpl),  # <- helpful for UI banners
    })

@login_required
@require_http_methods(["POST"])
def save_email_template(request, key):
    locale = request.POST.get("locale", "")
    subject = (request.POST.get("subject_template") or "").strip()
    text = (request.POST.get("text_template") or "").strip()
    html = (request.POST.get("html_template") or "").strip()

    if not subject and not html and not text:
        return HttpResponseBadRequest("At least one of subject/html/text is required.")

    existing = _resolve_template(key=key, locale=locale)
    if existing:
        existing.subject_template = subject or existing.subject_template
        existing.text_template = text
        existing.html_template = html
        # If your model HAS updated_at:
        # existing.save(update_fields=["subject_template", "text_template", "html_template", "updated_at"])
        # If NOT:
        existing.save(update_fields=["subject_template", "text_template", "html_template"])
        tpl = existing
    else:
        tpl = EmailTemplate.objects.create(
            key=key, locale=locale,
            subject_template=subject, text_template=text, html_template=html,
            is_active=True, version=1
        )

    return JsonResponse({
        "ok": True,
        "template": {
            "key": tpl.key,
            "locale": tpl.locale,
            "subject_template": tpl.subject_template,
            "text_template": tpl.text_template,
            "html_template": tpl.html_template,
            "version": tpl.version,
        }
    })

@login_required
@require_http_methods(["POST"])
def preview_email_template(request, key):
    locale = request.POST.get("locale", "")
    subject_src = request.POST.get("subject_template", "")
    text_src = request.POST.get("text_template", "")
    html_src = request.POST.get("html_template", "")

    ctx = {
        "user": request.user,
        "first_name": request.user.first_name or request.user.username,
        "dashboard_url": "/learner/dashboard/",
    }

    subject = _render_string(subject_src, ctx) if subject_src else ""
    text = _render_string(text_src, ctx) if text_src else ""
    html = _render_string(html_src, ctx) if html_src else ""

    return JsonResponse({"subject": subject, "text": text, "html": html})