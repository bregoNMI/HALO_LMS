from django import template

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