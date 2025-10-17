from typing import Optional, Dict, Any
from django.template import Template, Context
from .models import EmailTemplate

def _render_string(tmpl: str, ctx: Dict[str, Any]) -> str:
    return Template(tmpl or "").render(Context(ctx)).strip()

def _resolve_template(key: str, locale: Optional[str] = None) -> Optional[EmailTemplate]:
    """
    Try the full locale, then its base language (en from en-US), then default "".
    Highest version wins.
    """
    qs = EmailTemplate.objects.filter(key=key, is_active=True).order_by("-version", "-updated_at")
    locales_to_try = []
    if locale:
        locales_to_try.append(locale)
        if "-" in locale:
            locales_to_try.append(locale.split("-")[0])
    locales_to_try.append("")  # default

    for loc in locales_to_try:
        hit = qs.filter(locale=loc).first()
        if hit:
            return hit
    return None