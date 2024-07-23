from django import template

register = template.Library()

@register.filter(name='pretty_name')
def pretty_name(value):
    return value.replace('_', ' ').title()