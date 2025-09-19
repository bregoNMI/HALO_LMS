from dataclasses import dataclass
from typing import Tuple, Optional
from datetime import time, date, timedelta
from datetime import time as _time
from django.utils import timezone
from django.utils.timezone import localtime
from django.db.models import Max
from client_admin.models import UserCourse, UserLessonProgress, QuizAttempt, ActivityLog, FacialVerificationLog
from django.db.models.functions import TruncDate

@dataclass
class BadgeProgress:
    current: int
    target: int
    percent: int
    achieved: bool
    awarded: bool
    claimable: bool
    credits: int
    reason: Optional[str] = None

# ----------------- helpers -----------------

def _int(v, default=0) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default

def _credits_from(ob, crit: dict) -> int:
    # Prefer OrgBadge.credit_value later; for now, read from criteria
    return _int((crit or {}).get("reward", {}).get("credits"), 0)

def _parse_timerange(s: str) -> Tuple[time, time]:
    """'22:00-06:00' -> (time(22,0), time(6,0))"""
    start_s, end_s = s.split("-", 1)
    sh, sm = [int(x) for x in start_s.split(":")]
    eh, em = [int(x) for x in end_s.split(":")]
    return time(sh, sm), time(eh, em)

def _tod_in_range(t: time, start: time, end: time) -> bool:
    """True if time-of-day t is within [start,end], supporting wrap over midnight."""
    if start <= end:  # normal range
        return start <= t <= end
    # crosses midnight: e.g. 22:00–06:00
    return t >= start or t <= end

# ----------------- real data queries -----------------

def count_courses_completed(user) -> int:
    return UserCourse.objects.filter(user=user, is_course_completed=True).count()

def count_quizzes_at_least(user, min_score: int) -> int:
    """
    Count distinct lessons with a best attempt >= min_score.
    Path: QuizAttempt -> user_lesson_progress -> user_module_progress -> user_course -> user
    """
    qs = (QuizAttempt.objects
          .filter(
              user_lesson_progress__user_module_progress__user_course__user=user,
              score_percent__isnull=False,
          )
          .values('user_lesson_progress__lesson_id')
          .annotate(best=Max('score_percent'))
          .filter(best__gte=min_score))
    return qs.count()

def _login_dates_from_activitylog(user):
    """
    Return a set of *local* dates when the user logged in.
    """
    tz = timezone.get_current_timezone()
    rows = (ActivityLog.objects
            .filter(user=user, action_type='user_login')
            .annotate(d=TruncDate('timestamp', tzinfo=tz))  # <-- use timestamp
            .values_list('d', flat=True)
            .distinct())
    return set(rows)

def login_count(user) -> int:
    # distinct days with a login
    return len(_login_dates_from_activitylog(user))

def login_streak_days(user) -> int:
    dset = _login_dates_from_activitylog(user)
    if not dset:
        # optional fallback: last_login gives at most 1 day
        return 1 if (getattr(user, 'last_login', None) and user.last_login.date() == date.today()) else 0

    cur = date.today()
    streak = 0
    while cur in dset:
        streak += 1
        cur -= timedelta(days=1)
    return streak

def lessons_completed(user) -> int:
    # Generic lesson completions (if you use this for non-time-window lesson badges)
    return (UserLessonProgress.objects
            .filter(user_module_progress__user_course__user=user, completed=True)
            .count())

def lessons_completed_in_timerange(user, start: time, end: time) -> int:
    """
    Count lesson completions whose time-of-day (completed_on_time) is within [start,end],
    supporting ranges that cross midnight (e.g., 22:00–06:00).
    """
    qs = (UserLessonProgress.objects
          .filter(
              user_module_progress__user_course__user=user,
              completed=True,
              completed_on_time__isnull=False,   # <-- use your existing field
          )
          .values_list('completed_on_time', flat=True))

    def in_range(t: _time):
        # t is already a time object from the DB
        if start <= end:
            return start <= t <= end
        # wrap over midnight
        return t >= start or t <= end

    return sum(1 for t in qs if t and in_range(t))

def count_facial_verifications(user) -> int:
    """
    Count successful verifications for a user.
    Only count logs with status='success' AND error_type='verified'.
    """
    return (FacialVerificationLog.objects
            .filter(
                user=user,
                status='success',
                error_type='verified'
            )
            .count())

# ----------------- main -----------------

def compute_progress(user, org_badge, already_awarded: bool) -> BadgeProgress:
    crit = org_badge.criteria or {}
    event = crit.get("event")
    current, target = 0, 1
    reason = None

    if event == "course_complete":
        target = max(1, _int(crit.get("count"), 1))
        current = min(count_courses_completed(user), target)
        reason = "Courses completed"

    elif event == "quiz_complete":
        min_score = _int(crit.get("min_score"), 100)
        # if you ever add "count" for multiple quizzes, respect it; default 1
        wanted_count = 1 if crit.get("count") is None else max(1, _int(crit["count"], 1))
        current = min(count_quizzes_at_least(user, min_score), wanted_count)
        target = wanted_count
        reason = f"Quizzes ≥{min_score}%"

    elif event == "user_login":
        if "streak_days" in crit:
            target = max(1, _int(crit["streak_days"], 1))
            current = min(login_streak_days(user), target)
            reason = "Consecutive login days"
        else:
            target = max(1, _int(crit.get("count"), 1))
            current = min(login_count(user), target)
            reason = "Logins"

    elif event == "lesson_complete":
        tr = crit.get("time_range")
        if tr:
            start, end = _parse_timerange(tr)
            current = 1 if lessons_completed_in_timerange(user, start, end) > 0 else 0
            target = 1
            reason = f"Lesson between {tr}"
        else:
            target = max(1, _int(crit.get("count"), 1))
            current = min(lessons_completed(user), target)
            reason = "Lessons completed"

    elif event == "facial_verification":
        target = max(1, _int(crit.get("count"), 1))
        current = min(count_facial_verifications(user), target)
        reason = "Verifications completed"

    else:
        # Unknown event -> treat as not achievable
        current, target = 0, 1
        reason = "Unknown badge event"

    # finalize
    percent = int(round((current / target) * 100)) if target else 0
    achieved = current >= target
    credits = _credits_from(org_badge, crit)
    claimable = achieved and (not already_awarded)

    return BadgeProgress(
        current=current,
        target=target,
        percent=percent,
        achieved=achieved,
        awarded=already_awarded,
        claimable=claimable,
        credits=credits,
        reason=reason,
    )