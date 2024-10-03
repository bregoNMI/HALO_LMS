from django import template
import os
import datetime

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

@register.filter
def format_time(estimated_time):
    # Check if estimated_time is None
    if not estimated_time:
        return "N/A"  # Return a placeholder if time is not set
    
    # Ensure it's a timedelta object before formatting
    if isinstance(estimated_time, datetime.timedelta):
        total_seconds = int(estimated_time.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{hours}h {minutes}m"

    # In case it's already a string, return as is (if needed)
    return str(estimated_time)