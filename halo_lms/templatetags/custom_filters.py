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

    return str(estimated_time)

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)

@register.filter
def format_session_time(value):
    """
    Converts 'PT0H1M0S' to '1m 0s', removing hours if 0.
    """
    if not value.startswith('PT'):
        return value  # Return as-is if format is unexpected

    time_str = value[2:]  # Remove 'PT'
    hours, minutes, seconds = 0, 0, 0

    if 'H' in time_str:
        hours_part, time_str = time_str.split('H')
        hours = int(hours_part)
    if 'M' in time_str:
        minutes_part, time_str = time_str.split('M')
        minutes = int(minutes_part)
    if 'S' in time_str:
        seconds_part = time_str.replace('S', '')
        seconds = int(seconds_part)

    result = ""
    if hours > 0:
        result += f"{hours}h "
    result += f"{minutes}m {seconds}s"
    return result.strip()

@register.filter
def get_assignment_status(assignment_status_map, key):
    return assignment_status_map.get(key)
