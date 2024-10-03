import pytz
from django.utils import timezone

def display_user_time(user, utc_datetime):
    user_tz = pytz.timezone(user.profile.timezone)
    return timezone.localtime(utc_datetime, user_tz)