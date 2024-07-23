<<<<<<< HEAD
from django import template

register = template.Library()

@register.filter(name='pretty_name')
def pretty_name(value):
=======
from django import template

register = template.Library()

@register.filter(name='pretty_name')
def pretty_name(value):
>>>>>>> origin/main
    return value.replace('_', ' ').title()