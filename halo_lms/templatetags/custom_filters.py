from django import template
import os

register = template.Library()

@register.filter(name='pretty_name')
def pretty_name(value):
    return value.replace('_', ' ').title()

@register.filter
def render_template(value, context=None):
    """
    Renders the given value as a Django template string.
    """
    if context is None:
        context = {}
    return Template(value).render(Context(context))

@register.filter(name='first_letter')
def first_letter(value):
    if value and isinstance(value, str):
        return value[0].lower()  # Get the first letter and lowercase it
    return ''

@register.filter
def filename(value):
    return os.path.basename(value)

@register.filter(name='split')
def split(value, key):
    """
    Splits the value by the given key.
    """
    return value.split(key)