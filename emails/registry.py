# emails/registry.py
from dataclasses import dataclass
from typing import Optional
from .models import EmailTemplate

EMAIL_KEYS = {
    "account_creation": "Account Creation",
    "user_enrollment": "User Enrollment",
    # add keys here
}

def resolve_template(key: str, organization=None, locale: Optional[str] = None) -> Optional[EmailTemplate]:
    qs = EmailTemplate.objects.filter(key=key, is_active=True).order_by("-version", "-id")
    org_id = getattr(organization, "pk", None)
    for (o, l) in ((org_id, locale or ""), (org_id, ""), (None, locale or ""), (None, "")):
        hit = qs.filter(organization_id=o, locale=l).first()
        if hit:
            return hit
    return None

@dataclass
class TemplateHandle:
    key: str
    organization: object = None
    locale: Optional[str] = None

    @property
    def subject(self):
        tpl = resolve_template(self.key, self.organization, self.locale)
        return tpl.subject_template if tpl else ""

    @property
    def text(self):
        tpl = resolve_template(self.key, self.organization, self.locale)
        return tpl.text_template if tpl else ""

    @property
    def html(self):
        tpl = resolve_template(self.key, self.organization, self.locale)
        return tpl.html_template if tpl else ""

class Templates:
    @staticmethod
    def account_creation(org=None, locale=None): return TemplateHandle("account_creation", org, locale)
    @staticmethod
    def user_enrollment(org=None, locale=None): return TemplateHandle("user_enrollment", org, locale)
    # add more accessors as you add keys
