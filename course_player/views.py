import datetime
import json
import mimetypes
import os
import random
from django.urls import resolve
import uuid
from uuid import uuid4
from django.utils import timezone
from django.db.models import Max, Q
from shlex import quote
from django.utils.timezone import now
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import rsa
import re, unicodedata
import random
from typing import Optional
from django.utils.encoding import iri_to_uri
from client_admin.utils import get_formatted_datetime
from urllib.parse import quote, unquote, unquote_plus
from client_admin.models import Profile, UserCourse, UserModuleProgress, UserLessonProgress, UserAssignmentProgress, QuizAttempt
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.conf import settings
from botocore.exceptions import ClientError
from content.models import Course, Module, Lesson, UploadedFile, Upload
from content.models import Course, EssayQuestion, FITBQuestion, Module, Lesson, Question, QuestionMedia, QuestionOrder, TFQuestion, UploadedFile, QuizConfig, Quiz, QuizTemplate, TemplateQuestion, EssayPrompt, EssayAnswer
from authentication.python.views import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, get_secret
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
import boto3 
from django.views.decorators.http import require_GET, require_POST
from django.contrib.auth.decorators import login_required
import base64
from django.shortcuts import render
import boto3
from rsa import PrivateKey
from botocore.exceptions import NoCredentialsError
from course_player.models import LessonProgress, LessonSession, SCORMTrackingData, QuizResponse
from halo_lms.settings import AWS_S3_REGION_NAME, AWS_STORAGE_BUCKET_NAME
from collections import defaultdict
from typing import List
from django.middleware.csrf import get_token

secret_name = "COGNITO_SECRET"
secrets = get_secret(secret_name)

def parse_iso_duration(duration):
    """
    Convert ISO 8601 duration string (e.g., PT1H15M30S) to total seconds.
    """
    pattern = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")
    match = pattern.match(duration)
    if not match:
        return 0
    hours, minutes, seconds = match.groups()
    return int(hours or 0) * 3600 + int(minutes or 0) * 60 + int(seconds or 0)

def format_iso_duration(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    return f"PT{hours}H{minutes}M{seconds}S"


def generate_presigned_url(key, expiration=86400):
    # Get AWS credentials from Secrets Manager
    secret_name = "COGNITO_SECRET"
    secrets = get_secret(secret_name)

    if not secrets:
        print("Failed to retrieve secrets.")
        return None

    aws_access_key_id = secrets.get('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = secrets.get('AWS_SECRET_ACCESS_KEY')

    if aws_access_key_id is None or aws_secret_access_key is None:
        print("AWS credentials are not found in the secrets.")
        return None

    # Ensure the key is correct and uses forward slashes only
    key = key.replace("\\", "/")

    # Create the boto3 S3 client using the credentials
    s3_client = boto3.client(
        's3',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=AWS_S3_REGION_NAME
    )

    content_type, _ = mimetypes.guess_type(key)
    if not content_type:
        content_type = "application/octet-stream"  # fallback

    # Create the presigned URL for the given key in S3
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': AWS_STORAGE_BUCKET_NAME,
                'Key': key,
                'ResponseContentType': content_type  # Set the Content-Type to text/html
            },
            ExpiresIn=expiration,
            HttpMethod='GET'
        )
    except s3_client.exceptions.NoSuchKey:
        print(f"The specified key does not exist: {key}")
        response = None

    return response

@csrf_exempt
@login_required
def mark_lesson_complete(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    data = json.loads(request.body)
    lesson_id = data.get("lesson_id")

    if not lesson_id:
        return JsonResponse({"error": "Missing lesson_id"}, status=400)

    lesson = get_object_or_404(Lesson, pk=lesson_id)
    user = request.user
    course = lesson.module.course

    # Create tracking record to trigger update_progress
    SCORMTrackingData.objects.update_or_create(
        user=user,
        lesson=lesson,
        defaults={"progress": 1.0, "completion_status": "completed"},
    )

    user_course, _ = UserCourse.objects.get_or_create(user=user, course=course)
    ump, _ = UserModuleProgress.objects.get_or_create(user_course=user_course, module=lesson.module)
    ulp, _ = UserLessonProgress.objects.get_or_create(
        user_module_progress=ump, lesson=lesson,
        defaults={'order': getattr(lesson, 'order', 0) or 0, 'completion_status': 'incomplete'},
    )
    _update_ulp_from_status(ulp, 'completed', require_passing=None)

    user_course.update_progress()

    return JsonResponse({"status": "success"})

def proxy_scorm_absolute(request, file_path):
    """
    Serves absolute SCORM asset paths like /scormcontent/lib/...
    by prepending the dynamic folder from session.
    """
    folder = request.session.get("active_scorm_folder")
    if not folder:
        print("❌ No SCORM folder found in session.")
        raise Http404("SCORM folder not set")

    # Combine dynamic folder + asset path
    full_path = f"{folder}/scormcontent/{file_path}"
    print(f"🔄 Rewriting absolute asset path to: {full_path}")

    # Reuse the existing proxy logic
    return proxy_scorm_file(request, full_path)

def proxy_scorm_file(request, file_path):
    """
    Proxy SCORM file from S3 through the LMS domain.

    Handles:
      - URLs that accidentally include "index.html/" before asset folders
      - Absolute paths like:  <folder>/scormcontent/...
      - Relative paths like:  assets/... , lib/... , css/... (resolved under scormcontent/)
      - Prevents double-prepending the active folder
    """
    from urllib.parse import unquote_plus

    decoded = unquote_plus((file_path or "").strip())
    print(f"🔍 Incoming SCORM request: {decoded}")

    # --- Normalize "index.html/" quirks --------------------------------------
    if decoded.endswith("index.html/"):
        decoded = decoded.rstrip("/")
        print(f"🧹 Trimmed trailing slash after index.html → {decoded}")

    if "index.html/" in decoded:
        before = decoded
        decoded = decoded.replace("index.html/", "")
        print(f"🧹 Removed 'index.html/' segment → {before} → {decoded}")

    # Some packages nest fonts oddly: lib/icomoon.css/fonts/... -> lib/fonts/...
    if "lib/icomoon.css/fonts/" in decoded:
        decoded = decoded.replace("lib/icomoon.css/fonts/", "lib/fonts/")
        print(f"🧼 Normalized font path → {decoded}")

    # Uniform leading slash handling
    if decoded.startswith("/"):
        decoded = decoded.lstrip("/")

    # Resolve against the active SCORM folder
    folder = request.session.get("active_scorm_folder")
    if not folder:
        print("❌ No SCORM folder in session")
        raise Http404("SCORM folder not set")

    # If the incoming path already starts with the dynamic folder, strip it
    # so we don’t double-prefix below.
    path_after_folder = decoded
    folder_prefix = f"{folder}/"
    if decoded.startswith(folder_prefix):
        path_after_folder = decoded[len(folder_prefix):]
        print(f"🔧 Stripped leading folder prefix: {decoded} → {path_after_folder}")

    # Now decide how to join:
    RELATIVE_ROOTS = ("assets/", "lib/", "scripts/", "images/", "img/", "css/", "js/", "fonts/")
    if path_after_folder.startswith("scormcontent/"):
        # Absolute within the package; just prefix the folder once.
        resolved_path = f"{folder}/{path_after_folder}"
    elif path_after_folder.startswith(RELATIVE_ROOTS) or path_after_folder == "" or path_after_folder == "index.html":
        # Relative asset or bare/entry reference → under scormcontent/
        resolved_path = f"{folder}/scormcontent/{path_after_folder}"
    else:
        # Fallback: treat as a relative asset living under scormcontent/
        resolved_path = f"{folder}/scormcontent/{path_after_folder}"

    s3_key = f"media/default/uploads/{resolved_path}".replace("\\", "/").strip()
    print(f"📂 Final S3 Key: {s3_key}")

    # --- Fetch from S3 -------------------------------------------------------
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_S3_REGION_NAME,
    )

    try:
        s3_response = s3_client.get_object(Bucket=AWS_STORAGE_BUCKET_NAME, Key=s3_key)
        file_body = s3_response["Body"]

        # Prefer S3 metadata, else guess, then normalize
        content_type = (
            s3_response.get("ContentType")
            or mimetypes.guess_type(s3_key)[0]
            or "application/octet-stream"
        )

        # Normalize common web types
        lower = s3_key.lower()
        if lower.endswith(".html"):
            content_type = "text/html"
        elif lower.endswith(".css"):
            content_type = "text/css"
        elif lower.endswith(".js"):
            content_type = "application/javascript"
        elif lower.endswith(".svg"):
            content_type = "image/svg+xml"
        elif lower.endswith(".json"):
            content_type = "application/json"
        elif lower.endswith(".woff2"):
            content_type = "font/woff2"
        elif lower.endswith(".woff"):
            content_type = "font/woff"
        elif lower.endswith(".ttf"):
            content_type = "font/ttf"
        elif lower.endswith(".otf"):
            content_type = "font/otf"
        elif lower.endswith(".map"):
            content_type = "application/json"
        elif lower.endswith(".png"):
            content_type = "image/png"
        elif lower.endswith(".jpg") or lower.endswith(".jpeg"):
            content_type = "image/jpeg"
        elif lower.endswith(".gif"):
            content_type = "image/gif"
        elif lower.endswith(".webp"):
            content_type = "image/webp"

        return FileResponse(file_body, content_type=content_type)

    except ClientError as e:
        print(f"❌ Error fetching {s3_key} from S3: {e}")
        raise Http404("SCORM file not found")



def get_scorm_progress(request, lesson_id):
    user = request.user
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    tracking = SCORMTrackingData.objects.filter(user=user, lesson=lesson).first()
    raw_suspend_data = ""
    try:
        cmi_data = tracking.cmi_data if isinstance(tracking.cmi_data, dict) else json.loads(tracking.cmi_data or "{}")
        raw_suspend_data = cmi_data.get("suspend_data", "")
    except Exception as e:
        print(f"[get_scorm_progress] Failed to parse SCORM suspend_data: {e}")

    suspend_data = {}
    try:
        suspend_data = json.loads(raw_suspend_data) if raw_suspend_data else {}
    except Exception as e:
        print(f"[get_scorm_progress] Failed to parse suspend_data JSON: {e}")

    # ✅ Inject miniObjectives from LMS database
    progress_qs = LessonProgress.objects.filter(user=user, lesson=lesson)
    mini_objectives = []
    for obj in progress_qs:
        if obj.mini_lesson_index is not None:
            mini_objectives.append({
                "mini_lesson_index": obj.mini_lesson_index,
                "progress": obj.progress
            })

    suspend_data["miniObjectives"] = mini_objectives

    print(f"[get_scorm_progress] Rebuilt suspend_data with LMS progress: {suspend_data}")
    return JsonResponse({"suspend_data": json.dumps(suspend_data)})

    print(f"[get_scorm_progress] Error parsing cmi_data: {e}")
    return JsonResponse({"suspend_data": ""}, status=500)

def _get_or_create_ulp(request, lesson):
    user_course = (UserCourse.objects
                   .filter(user=request.user, course=lesson.module.course)
                   .order_by('-id')               # <- pick the most recent enrollment deterministically
                   .first())
    module_progress, _ = UserModuleProgress.objects.get_or_create(
        user_course=user_course,
        module=lesson.module,
        defaults={"order": lesson.module.order}
    )
    ulp, _ = UserLessonProgress.objects.get_or_create(
        user_module_progress=module_progress,
        lesson=lesson,
        defaults={"order": lesson.order}
    )
    return ulp

def _pick_attempt(ulp: UserLessonProgress, *, want_new: bool) -> QuizAttempt:
    open_attempt = ulp.quiz_attempts.filter(
        status__in=[QuizAttempt.Status.ACTIVE, QuizAttempt.Status.PENDING]
    ).first()
    latest_any   = ulp.quiz_attempts.first()
    if want_new or not latest_any:
        attempt = QuizAttempt.objects.create(user_lesson_progress=ulp, status=QuizAttempt.Status.ACTIVE)
        ulp.attempts = (ulp.attempts or 0) + 1
        ulp.save(update_fields=['attempts'])
        return attempt
    return open_attempt or latest_any

@login_required
@require_POST
def save_quiz_progress(request):
    print("💾 save_quiz_progress hit", request.path)
    try:
        data = json.loads(request.body or "{}")
    except Exception as e:
        return JsonResponse({"error": "bad_json", "detail": str(e)}, status=400)

    try:
        match = resolve(request.path_info)
        print(f"💾 save_quiz_progress hit {request.path} (url_name={match.url_name}) "
              f"Referer={request.META.get('HTTP_REFERER')} UA={request.META.get('HTTP_USER_AGENT')}")
    except Exception:
        print(f"💾 save_quiz_progress hit {request.path} (resolve failed) "
              f"Referer={request.META.get('HTTP_REFERER')}")

    attempt_id = (data.get("session_id") or request.session.get("current_attempt_id") or "").strip()
    if not attempt_id:
        return JsonResponse({"error": "missing_attempt_id"}, status=400)

    pos   = int(data.get("position") or 0)
    total = int(data.get("total_questions") or 0)
    done  = bool(data.get("is_finished"))

    # ---- primary: QuizAttempt path
    attempt = QuizAttempt.objects.filter(
        attempt_id=attempt_id,
        user_lesson_progress__user_module_progress__user_course__user=request.user
    ).first()

    if attempt:
        updates = []
        if total and total != (attempt.total_questions or 0):
            attempt.total_questions = total; updates.append("total_questions")
        if pos != (attempt.last_position or 0):
            attempt.last_position = pos; updates.append("last_position")
        if done and attempt.status != QuizAttempt.Status.PENDING and attempt.status not in (QuizAttempt.Status.PASSED, QuizAttempt.Status.FAILED):
            attempt.status = QuizAttempt.Status.PENDING
            attempt.finished_at = timezone.now()
            updates += ["status", "finished_at"]
        if updates:
            attempt.save(update_fields=updates)
        return JsonResponse({"ok": True, "session_id": attempt.attempt_id, "last_position": attempt.last_position})

    # ---- legacy fallback: LessonSession path (this is your 404 source today)
    legacy = LessonSession.objects.filter(
        session_id=attempt_id,
        user=request.user
    ).first()
    if not legacy:
        return JsonResponse({"error": "attempt_not_found"}, status=404)

    updates = []
    if total and total != (legacy.total_questions or 0):
        legacy.total_questions = total; updates.append("total_questions")
    if pos != (legacy.last_position or 0):
        legacy.last_position = pos; updates.append("last_position")
    if done and legacy.status != "pending":
        legacy.status = "pending"
        legacy.finished_at = timezone.now()
        updates += ["status", "finished_at"]
    if updates:
        legacy.save(update_fields=updates)

    return JsonResponse({"ok": True, "session_id": legacy.session_id, "last_position": legacy.last_position})

@login_required
@require_GET
def get_quiz_score(request):
    attempt_id = request.GET.get("attempt_id")
    session_id = request.GET.get("session_id")  # legacy
    # If only attempt_id was provided, also try it as a legacy session id
    legacy_candidate = session_id or attempt_id

    lesson = None
    responses = None
    used_mode = None  # for debugging

    # --- Prefer QuizAttempt if present ---
    attempt = None
    if attempt_id:
        attempt = (QuizAttempt.objects
                   .select_related("user_lesson_progress__user_module_progress__user_course",
                                   "user_lesson_progress__lesson")
                   .filter(attempt_id=attempt_id,
                           user_lesson_progress__user_module_progress__user_course__user=request.user)
                   .first())
    if attempt:
        lesson = attempt.user_lesson_progress.lesson
        # if you added FK QuizResponse.quiz_attempt, default related name is quizresponse_set
        responses = getattr(attempt, "quizresponse_set", None) or attempt.responses
        used_mode = "attempt"
    else:
        # --- Legacy fallback: LessonSession by session_id (or attempt_id reused as session_id) ---
        if not legacy_candidate:
            return JsonResponse({"error": "Missing attempt_id or session_id"}, status=400)

        session = (LessonSession.objects
                   .select_related("lesson")
                   .filter(session_id=legacy_candidate, user=request.user)
                   .first())
        if not session:
            # keep the old error text so your logs remain familiar
            return JsonResponse({"error": "Attempt not found"}, status=404)

        lesson = session.lesson
        responses = session.quizresponse_set.all()
        used_mode = "session"

    # ---- Resolve quiz-like container (unchanged) ----
    try:
        quiz_like, _ = _resolve_question_ids_for_lesson(request, lesson)
    except Exception as e:
        return JsonResponse(
            {"error": f"resolve_failed: {e.__class__.__name__}", "detail": str(e)},
            status=500
        )

    gradable = responses.exclude(is_correct=None)
    total_answered = responses.count()
    total_graded   = gradable.count()
    correct        = gradable.filter(is_correct=True).count()
    percent        = int((correct / total_graded) * 100) if total_graded > 0 else 0
    pending_review = responses.filter(is_correct=None).exists()

    cfg = getattr(lesson, "quiz_config", None)
    pass_mark = int(cfg.passing_score) if (cfg and cfg.passing_score is not None) else int(getattr(quiz_like, "pass_mark", 0) or 0)
    passed = (not pending_review) and (percent >= pass_mark)

    # ---- Write back to whichever object we used ----
    if used_mode == "attempt":
        attempt.status = (QuizAttempt.Status.PENDING if pending_review
                        else (QuizAttempt.Status.PASSED if passed else QuizAttempt.Status.FAILED))
        attempt.score_percent = percent
        attempt.passed = None if pending_review else passed
        if not attempt.finished_at:
            attempt.finished_at = timezone.now()
        attempt.save(update_fields=["status", "score_percent", "passed", "finished_at"])
        ulp = attempt.user_lesson_progress
    else:
        # legacy session parity (optional)
        session.status = ("pending" if pending_review else ("passed" if passed else "failed"))
        session.score_percent = percent
        session.passed = None if pending_review else passed
        if not session.finished_at:
            session.finished_at = timezone.now()
        session.save(update_fields=["status", "score_percent", "passed", "finished_at"])
        ulp = (UserLessonProgress.objects
           .select_related('lesson__quiz_config', 'user_module_progress__user_course')
           .filter(lesson=lesson, user_module_progress__user_course__user=request.user)
           .first())
        
    if ulp:
        cfg = getattr(lesson, 'quiz_config', None)
        require_passing = bool(getattr(cfg, 'require_passing', False))
        # Promote frontend state into a lesson-level status:
        lesson_status = 'pending' if pending_review else ('passed' if passed else 'failed')
        _update_ulp_from_status(ulp, lesson_status, require_passing=require_passing)

    # (Keep your SCORMTrackingData/UserLessonProgress no-downgrade updates here)

    success_text = getattr(quiz_like, "success_text", "") or "You passed!"
    fail_text    = getattr(quiz_like, "fail_text", "") or "Your quiz is under review."

    return JsonResponse({
        "total_answered": total_answered,
        "total_graded": total_graded,
        "correct_answers": correct,
        "score_percent": percent,
        "passed": passed,
        "pending_review": pending_review,
        "success_text": success_text,
        "fail_text": fail_text,
        "passing_score": pass_mark,
    })

def _norm_fitb_text(text, strip_ws=True, case_sensitive=False):
    s = "" if text is None else str(text)
    s = unicodedata.normalize("NFKC", s)
    if strip_ws:
        s = re.sub(r"\s+", " ", s.strip())
    return s if case_sensitive else s.casefold()

@login_required
@require_POST
def submit_question(request):
    data = json.loads(request.body or "{}")
    user = request.user
    question_id = data.get("question_id")
    lesson_id   = data.get("lesson_id")
    answer      = data.get("answer")

    question = get_object_or_404(
        Question.objects.select_related("mcquestion","tfquestion","fitbquestion","essayquestion"),
        id=question_id
    )
    lesson = get_object_or_404(Lesson, id=lesson_id)

    # Prefer attempt; fall back to legacy session
    attempt = QuizAttempt.objects.filter(
        attempt_id=request.session.get("current_attempt_id"),
        user_lesson_progress__lesson=lesson,
        user_lesson_progress__user_module_progress__user_course__user=user,
    ).first()
    lesson_session = None
    if not attempt:
        lesson_session = LessonSession.objects.filter(
            session_id=request.session.get("current_lesson_session_id"),
            user=user, lesson=lesson
        ).first()

    seen_index = None
    try:
        if data.get("position") is not None:
            seen_index = int(data["position"])
    except Exception:
        seen_index = None

    qtype = detect_question_type(question)
    is_correct = False
    correct_answers = []
    correct_answer_ids = []

    if qtype == "TFQuestion":
        tf = getattr(question, "tfquestion", None)
        if tf is not None:
            sval = str(answer).strip().lower()
            truth = sval in ("true", "1", "t", "yes", "y")
            is_correct = (tf.correct == truth)
            correct_answers = ["True" if tf.correct else "False"]
            if not question.answers.exists():
                correct_answer_ids = ["true"] if tf.correct else ["false"]
            else:
                want = "true" if tf.correct else "false"
                ans = question.answers.filter(text__iexact=want).first()
                if ans:
                    correct_answer_ids = [str(ans.id)]

    elif qtype in ("MCQuestion", "MRQuestion"):
        submitted = {str(x) for x in (answer if isinstance(answer, list) else [answer])}
        correct_qs = question.answers.filter(is_correct=True)
        correct_ids = {str(a.id) for a in correct_qs}
        is_correct = (submitted == correct_ids) if qtype == "MRQuestion" else (next(iter(submitted), None) in correct_ids)
        correct_answers = [a.text for a in correct_qs]
        correct_answer_ids = [str(i) for i in correct_qs.values_list("id", flat=True)]

    elif qtype == "FITBQuestion":
        fitb = getattr(question, "fitbquestion", None)
        if fitb is not None:
            val = answer
            if isinstance(val, dict) and "text" in val:
                val = val.get("text")
            elif isinstance(val, (list, tuple)):
                val = " ".join(str(x) for x in val if x is not None)
            strip_ws = True if fitb.strip_whitespace is None else bool(fitb.strip_whitespace)
            case_sens = bool(fitb.case_sensitive)
            ans_norm = _norm_fitb_text(val, strip_ws, case_sens)
            matched = any(ans_norm == _norm_fitb_text(a.content, strip_ws, case_sens)
                          for a in fitb.acceptable_answers.all())
            is_correct = matched
            correct_answers = [a.content for a in fitb.acceptable_answers.all()]

    elif qtype == "EssayQuestion":
        is_correct = None
        correct_answers = []
        if isinstance(answer, list):
            for item in answer:
                pid = str(item.get("prompt_id", "")).strip()
                text = (item.get("text") or "").strip()
                if not pid or not text:
                    continue
                try:
                    prompt = EssayPrompt.objects.get(id=pid, question=question.essayquestion)
                except EssayPrompt.DoesNotExist:
                    continue
                EssayAnswer.objects.create(
                    prompt=prompt, question_id=question.id, answer_text=text, sitting_id=None
                )

    payload_text = json.dumps(answer) if isinstance(answer, (list, dict)) else str(answer)

    # Use the new FK if you added it to QuizResponse
    QuizResponse.objects.create(
        user=user,
        lesson=lesson,
        question=question,
        quiz_attempt=attempt,              # may be None
        lesson_session=lesson_session,     # legacy fallback
        user_answer=json.dumps(answer) if isinstance(answer,(list,dict)) else str(answer),
        is_correct=is_correct,
        seen_index=seen_index,
    )

    try:
        pos = data.get("position", None)
        if pos is not None:
            p = int(pos)
            if attempt and p > (attempt.last_position or 0):
                attempt.last_position = p
                attempt.save(update_fields=["last_position"])
    except Exception:
        pass

    return JsonResponse({
        "status": "success",
        "is_correct": is_correct,
        "correct_answers": correct_answers,
        "correct_answer_ids": correct_answer_ids,
        "question_type": qtype,
    })

def _deepest_category(selection):
    return (selection.sub_category3
            or selection.sub_category2
            or selection.sub_category1
            or selection.category)

def _sample_qids_for_template(template, *, unique=True):
    chosen, chosen_set = [], set()
    for sel in template.category_selections.all():
        cat = _deepest_category(sel)
        n = max(int(sel.num_questions or 0), 0)
        if not cat or n <= 0:
            continue
        qs = Question.objects.filter(category=cat).values_list("id", flat=True)
        if unique and chosen_set:
            qs = qs.exclude(id__in=chosen_set)
        pool = list(qs)
        if not pool:
            continue
        random.shuffle(pool)
        pick = pool[:min(n, len(pool))]
        chosen.extend(pick)
        if unique:
            chosen_set.update(pick)
    return chosen

def _ensure_quiz_container_for_template(lesson, template):
    quiz = Quiz.objects.filter(id=lesson.quiz_id).first()
    if quiz:
        return quiz
    return SimpleNamespace(
        id=f"template-{template.id}",
        title=f"Template: {template.title}",
        category=None,
        quiz_material="",
        pass_mark=0,
        answers_at_end=True,
        success_text="",
        fail_text="",
    )

def _resolve_question_ids_for_lesson(request, lesson):
    """
    Returns (quiz_like, ordered_qids) and persists order per *attempt*.
    """
    attempt_id = request.session.get("current_attempt_id") or str(lesson.id)

    # Template
    if lesson.create_quiz_from == "create_quiz_from1" and lesson.quiz_template_id:
        template = get_object_or_404(QuizTemplate, id=lesson.quiz_template_id)
        quiz_like = _ensure_quiz_container_for_template(lesson, template)
        order_key = f"tpl_qids_{attempt_id}"
        qids = request.session.get(order_key)
        if not qids:
            qids = _sample_qids_for_template(template, unique=True)
            cfg = getattr(lesson, "quiz_config", None)
            if cfg and getattr(cfg, "randomize_order", False):
                random.shuffle(qids)
            request.session[order_key] = qids
            request.session.modified = True
        if not qids:
            raise Http404("No questions available for this template.")
        return quiz_like, qids

    # Concrete quiz
    if lesson.quiz_id:
        quiz = get_object_or_404(Quiz, id=lesson.quiz_id)
        base_ids = list(
            QuestionOrder.objects.filter(quiz=quiz).order_by("order").values_list("question_id", flat=True)
        ) or list(
            quiz.questions.all().order_by("id").values_list("id", flat=True)
        )
        order_key = f"quiz_qids_{attempt_id}"
        qids = request.session.get(order_key)
        if not qids:
            qids = base_ids[:]
            cfg = getattr(lesson, "quiz_config", None)
            if cfg and getattr(cfg, "randomize_order", False):
                random.shuffle(qids)
            request.session[order_key] = qids
            request.session.modified = True
        return quiz, qids

    raise Http404("Lesson has no quiz or template assigned.")

def _question_to_json(q: Question):
    answers = list(q.answers.all().order_by("order").values("id", "text"))
    if hasattr(q, "tfquestion") and not answers:
        answers = [{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]

    media_items = [{
        "source_type": m.source_type,
        "title": m.title or "",
        "file_url": (m.file.url if m.file else None),
        "url_from_library": m.url_from_library or None,
        "type_from_library": m.type_from_library or "",
        "embed_code": m.embed_code or "",
    } for m in q.media_items.all()]

    essay_instructions = None
    essay_rubric = None
    prompts = []
    if hasattr(q, "essayquestion"):
        eq = q.essayquestion
        essay_instructions = eq.instructions
        essay_rubric = eq.rubric
        prompts = [
            {"id": p.id, "prompt_text": p.prompt_text, "rubric": p.rubric or ""}
            for p in eq.prompts.all().order_by("order")
        ]

    fitb = getattr(q, "fitbquestion", None)
    fitb_meta = None
    if fitb:
        fitb_meta = {
            "case_sensitive": fitb.case_sensitive,
            "strip_whitespace": fitb.strip_whitespace
        }

    return {
        "id": q.id,
        "question_type": detect_question_type(q),
        "randomize_answer_order": q.randomize_answer_order,
        "content": q.content,
        "allows_multiple": bool(getattr(q, "allows_multiple", False)),
        "answers": answers,
        "has_media": q.media_items.exists(),
        "media_items": media_items,
        "has_embed": any(mi["embed_code"] for mi in media_items),
        "essay_prompts": prompts,
        "fitb_meta": fitb_meta,
        "essay_instructions": essay_instructions,
        "essay_rubric": essay_rubric,
    }

# utils/questions.py (or near your views)
def detect_question_type(q):
    """
    Return one of: 'MCQuestion', 'MRQuestion', 'TFQuestion',
                   'FITBQuestion', 'EssayQuestion', or 'Question'.
    """
    # MC vs MR (allows_multiple lives on the base Question in your models)
    if hasattr(q, "mcquestion"):
        return "MRQuestion" if getattr(q, "allows_multiple", False) else "MCQuestion"
    if hasattr(q, "tfquestion"):
        return "TFQuestion"
    if hasattr(q, "fitbquestion"):
        return "FITBQuestion"
    if hasattr(q, "essayquestion"):
        return "EssayQuestion"
    # Fallback: if plain Question has allows_multiple, treat as MRQuestion
    if getattr(q, "allows_multiple", False):
        return "MRQuestion"
    return "Question"

# ---------- page shell (kept) ----------

def get_or_build_qid_order(request, lesson, quiz):
    """
    Returns a stable list of question IDs for the current LessonSession.
    If randomize_order is enabled, shuffles once and stores in session.
    """
    session_id = request.session.get("current_lesson_session_id") or lesson.id
    order_key = f"quiz_order_{session_id}"

    qid_order = request.session.get(order_key)
    if qid_order:
        return qid_order

    # Base order from QuestionOrder; fallback to quiz.questions order
    base_ids = list(
        QuestionOrder.objects
        .filter(quiz=quiz)
        .order_by("order")
        .values_list("question_id", flat=True)
    ) or list(
        quiz.questions.all()
        .order_by("id")
        .values_list("id", flat=True)
    )

    cfg = getattr(lesson, "quiz_config", None)
    if cfg and cfg.randomize_order:
        random.shuffle(base_ids)

    request.session[order_key] = base_ids
    request.session.modified = True
    return base_ids

def _prepare_quiz_attempt_context(request, lesson, *, want_new: bool):
    """
    Creates or reuses a QuizAttempt tied to the user's UserLessonProgress,
    resolves question IDs using the attempt-id as the session key, and
    returns a ready-to-render context dict for quizzes/quiz_player.html.
    """
    # 1) ULP + attempt
    ulp = _get_or_create_ulp(request, lesson)
    attempt = _pick_attempt(ulp, want_new=want_new)  # creates row on first visit / explicit retry
    request.session['current_attempt_id'] = attempt_id_str

    # 2) Resolve questions for this attempt (order is keyed by attempt_id inside the resolver)
    quiz_like, qids = _resolve_question_ids_for_lesson(request, lesson)
    total_qs = len(qids)
    if attempt.total_questions != total_qs:
        attempt.total_questions = total_qs
        attempt.save(update_fields=['total_questions'])

    # 3) Reveal answers (same semantics you already used)
    cfg = getattr(lesson, "quiz_config", None)
    reveal = bool(getattr(cfg, "reveal_answers", False))
    if not cfg:
        reveal = not bool(getattr(quiz_like, "answers_at_end", True))

    # 4) Resume payload consumed by quiz_player.js
    resume = {
        "session_id": attempt.attempt_id,       # stable across refresh
        "status": attempt.status,               # 'active' | 'pending' | 'completed' | 'abandoned'
        "last_position": attempt.last_position or 0,
        "total": total_qs,
    }

    return {
        "lesson": lesson,
        "quiz": quiz_like,
        "total_questions": total_qs,
        "reveal_answers": reveal,
        "attempt": attempt,
        "resume_json": json.dumps(resume),
    }

# ---------- JSON question fetch ----------

@login_required
@require_GET
def quiz_question_json(request, lesson_id, position):
    lesson = get_object_or_404(Lesson, id=lesson_id)
    quiz_like, qids = _resolve_question_ids_for_lesson(request, lesson)

    total = len(qids)
    if position < 0 or position >= total:
        raise Http404("No such question")

    q = get_object_or_404(Question, id=qids[position])

    payload = {
        "question": _question_to_json(q),
        "meta": {
            "position": position,
            "display_index": position + 1,
            "total": total,
            "is_last": position == total - 1,
            "quiz_id": getattr(quiz_like, "id", None),
        }
    }
    return JsonResponse(payload)

# @login_required
# def launch_scorm(request, course_id):
#     course = get_object_or_404(Course, pk=course_id)
#     user = request.user

#     # Get all lessons ordered across modules
#     lessons = Lesson.objects.filter(module__course=course).order_by("module__order", "order")

#     for lesson in lessons:
#         tracking = SCORMTrackingData.objects.filter(user=user, lesson=lesson).first()
#         if not tracking or tracking.completion_status != "completed":
#             return redirect("launch_scorm_file", lesson_id=lesson.id)

#     # Fallback if all lessons are completed — open last
#     if lessons.exists():
#         return redirect("launch_scorm_file", lesson_id=lessons.last().id)

#     return render(request, "error.html", {"message": "No lessons available in this course."})

def get_question_type(ordered_links, randomize_answers=False):
    questions = []

    for link in ordered_links:
        question = link.question
        q_type = 'Question'
        answer_list = []
        correct_answers = []  # ✅ Ensure it's always defined
        allows_multiple = False
        case_sensitive = False
        strip_whitespace = False
        instructions = None
        rubric = None

        if hasattr(question, 'mcquestion'):
            mc = question.mcquestion
            allows_multiple = getattr(mc, 'allows_multiple', False)
            q_type = 'MRQuestion' if allows_multiple else 'MCQuestion'
            answers = list(question.answers.all())
            if randomize_answers:
                random.shuffle(answers)
            else:
                answers.sort(key=lambda a: a.order)

            answer_list = answers
            correct_answers = list(question.answers.filter(is_correct=True).values_list('text', flat=True))

        elif hasattr(question, 'tfquestion'):
            tf = question.tfquestion
            q_type = 'TFQuestion'
            correct_value = tf.correct
            correct_answers = ['True' if correct_value else 'False']
            answer_list = [
                {'id': 'true', 'text': 'True'},
                {'id': 'false', 'text': 'False'}
            ]

        elif hasattr(question, 'fitbquestion'):
            fitb = question.fitbquestion
            q_type = 'FITBQuestion'
            case_sensitive = getattr(fitb, 'case_sensitive', False)
            strip_whitespace = getattr(fitb, 'strip_whitespace', False)
            answers = [
                {'id': a.id, 'text': a.content}
                for a in fitb.acceptable_answers.all().order_by('order')
            ]
            correct_answers = [a['text'] for a in answers]  # optional

        elif hasattr(question, 'essayquestion'):
            essay = question.essayquestion
            q_type = 'EssayQuestion'
            instructions = essay.instructions
            rubric = essay.rubric
            answers = [
                {'id': p.id, 'text': p.prompt_text, 'rubric': p.rubric}
                for p in essay.prompts.all().order_by('order')
            ]
            correct_answers = []  # ✅ explicitly clear here too

        question.correct_answers = correct_answers
        question.question_type = q_type
        question.answer_list = answer_list
        question.allows_multiple = allows_multiple

        questions.append(question)

    return questions

def _to_pct(val):
    """Convert SCORM progress to an int percent, handling None and mixed scales."""
    try:
        v = float(val if val is not None else 0.0)
    except (TypeError, ValueError):
        v = 0.0
    # If stored as 0..1 → convert to %
    if v <= 1.0:
        return int(round(v * 100))
    # If already 0..100 → clamp
    return int(round(max(0.0, min(v, 100.0))))

def _resolve_user_course(user, lesson):
    from client_admin.models import UserCourse
    return (UserCourse.objects
            .filter(user=user, course=lesson.module.course)
            .order_by('-id')
            .first())

def _client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')

def ensure_lesson_session(request, lesson, *, force_new=False):
    """
    Ensure exactly one LessonSession for this page load.
    - Reuse ID in request.session if valid.
    - Else reuse an open (active/pending) one unless force_new.
    - Else create a fresh row with fully-populated fields.
    """
    sid = request.session.get('current_lesson_session_id')
    if sid:
        s = LessonSession.objects.filter(session_id=sid,
                                         user=request.user,
                                         lesson=lesson).first()
        if s:
            return s

    if not force_new:
        s = (LessonSession.objects
             .filter(user=request.user,
                     lesson=lesson,
                     status__in=['active', 'pending'])
             .order_by('-start_time')
             .first())
        if s:
            request.session['current_lesson_session_id'] = s.session_id
            return s

    s = LessonSession.objects.create(
        user=request.user,
        lesson=lesson,
        user_course=_resolve_user_course(request.user, lesson),
        session_id=str(uuid.uuid4()),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:1024],
        ip_address=_client_ip(request),
        progress=0.0,
        completion_status="incomplete",
        session_time="PT0H0M0S",
        scroll_position=0,
        score=None,
        lesson_location="",
        cmi_data={},
        status='active',
        last_position=0,
        total_questions=0,
        attempt_index=1,
        start_time=timezone.now(),     # <-- init
        end_time=timezone.now(),       # <-- init
        finished_at=None,
    )
    request.session['current_lesson_session_id'] = s.session_id
    return s

_PT_RE = re.compile(r'^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$')

def _pt_to_seconds(pt: str) -> int:
    """
    Parse a minimal ISO-8601 'PT#H#M#S' duration string to whole seconds.
    Returns 0 on parse failure.
    """
    if not pt:
        return 0
    m = _PT_RE.match(str(pt).strip().upper())
    if not m:
        return 0
    h = int(m.group(1) or 0)
    m_ = int(m.group(2) or 0)
    s = float(m.group(3) or 0)
    return int(round(h * 3600 + m_ * 60 + s))

def _seconds_to_pt(seconds: int) -> str:
    """
    Render whole seconds as ISO-8601 'PT#H#M#S' (no fractional).
    """
    seconds = max(int(seconds or 0), 0)
    h, rem = divmod(seconds, 3600)
    m, s   = divmod(rem, 60)
    return f"PT{h}H{m}M{s}S"

def _safe_json_dict(x):
    if isinstance(x, dict):
        return x
    if x in (None, "", "null"):
        return {}
    try:
        return json.loads(x)
    except Exception:
        return {}
    
def _canon_url(u: str) -> str:
    if not u: return u
    return u.replace("index.html/", "index.html")

@login_required
def launch_scorm_file(request, lesson_id):
    print('Lesson ID:', lesson_id)
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    course = lesson.module.course
    profile = get_object_or_404(Profile, user=request.user)
    user_course = UserCourse.objects.filter(user=request.user, course=course).first()

    # ✅ Always create a NEW LessonSession on page load / refresh
    session = ensure_lesson_session(request, lesson, force_new=True)
    request.session['current_lesson_session_id'] = session.session_id

    # Fetch all modules with their lessons for the course
    modules_with_lessons = Module.objects.filter(course=course).order_by('order').prefetch_related('lessons')

    # Identify current lesson's module and determine nav context
    all_lessons = list(
        Lesson.objects.filter(module__course=course)
        .select_related('module')
        .order_by('module__order', 'order')
    )

    current_index = all_lessons.index(lesson) if lesson in all_lessons else -1
    next_lesson = all_lessons[current_index + 1] if current_index + 1 < len(all_lessons) else None
    prev_lesson = all_lessons[current_index - 1] if current_index > 0 else None
    is_last_lesson = next_lesson is None

    # Assignments
    full_course_assignments = Upload.objects.filter(course=course, lessons__isnull=True)
    lesson_assignments = Upload.objects.filter(course=course, lessons__isnull=False).prefetch_related('lessons').distinct()

    # Lock logic
    course_locked = course.locked
    if course_locked and prev_lesson:
        prev_completed = UserLessonProgress.objects.filter(
            user_module_progress__user_course=user_course,
            lesson=prev_lesson,
            completed=True
        ).exists()

        prev_scorm = SCORMTrackingData.objects.filter(user=request.user, lesson=prev_lesson).first()
        prev_status = (prev_scorm.completion_status.lower() if prev_scorm and prev_scorm.completion_status else None)

        prev_has_pending = QuizResponse.objects.filter(
            user=request.user, lesson=prev_lesson, is_correct=None
        ).exists()

        allow_unlock = (
            prev_completed
            or (prev_status in ("completed", "passed", "pending"))
            or prev_has_pending
        )

        if not allow_unlock:
            return render(request, 'error.html', {
                'message': 'You must finish or submit the previous lesson (or await review) before proceeding.'
            })

    mini_lesson_progress = list(LessonProgress.objects.filter(
        user=request.user,
        lesson=lesson
    ).values("mini_lesson_index", "progress"))

    # Progress tracking (sidebar)
    lesson_progress_data = []
    previous_lesson_completed = True

    for module in modules_with_lessons:
        for module_lesson in module.lessons.all().order_by("order"):
            scorm_entry = SCORMTrackingData.objects.filter(user=request.user, lesson=module_lesson).first()
            progress_pct = _to_pct(scorm_entry.progress if scorm_entry and scorm_entry.progress is not None else 0)

            lesson_progress = UserLessonProgress.objects.filter(
                user_module_progress__user_course=user_course,
                lesson=module_lesson
            ).first()

            is_completed = lesson_progress.completed if lesson_progress else False
            locked_status = course_locked and not previous_lesson_completed

            has_pending_review = QuizResponse.objects.filter(
                user=request.user,
                lesson=module_lesson,
                is_correct=None
            ).exists()

            status_str = (scorm_entry.completion_status if scorm_entry else None)
            raw_status = (status_str.lower() if status_str else None) or ("pending" if has_pending_review else "incomplete")
            norm_status = "complete" if raw_status in ("passed", "completed") else raw_status
            if norm_status in ("complete", "pending"):
                locked_status = False

            print('scorm_entry.completion_status:', status_str)

            lesson_progress_data.append({
                "id": module_lesson.id,
                "title": module_lesson.title,
                "completed": is_completed,
                "locked": locked_status,
                "progress": progress_pct,
                "module_id": module.id,
                "module_title": module.title,
                "pending_review": has_pending_review,
                "completion_status": norm_status,
                "status_str": status_str,
            })

            previous_lesson_completed = (norm_status in ("complete", "pending"))

    lesson_locked_map = {l['id']: l['locked'] for l in lesson_progress_data}

    progress_qs = UserAssignmentProgress.objects.filter(user=request.user)

    completed_assignment_ids = set(
        UserAssignmentProgress.objects.filter(
            user=request.user,
            status__in=['submitted', 'approved']
        ).values_list('assignment_id', flat=True)
    )

    assignment_status_map = {}
    for progress in progress_qs:
        key = f"{progress.assignment_id}-{progress.lesson_id}" if progress.lesson_id else str(progress.assignment_id)
        assignment_status_map[key] = {"status": progress.status, "locked": False}

    for assignment in full_course_assignments:
        key = str(assignment.id)
        assignment.status = assignment_status_map.get(key, {}).get('status', 'pending')

    for assignment in lesson_assignments:
        for attached_lesson in assignment.lessons.all():
            key = f"{assignment.id}-{attached_lesson.id}"
            lesson_locked = lesson_locked_map.get(attached_lesson.id, False)
            if key in assignment_status_map:
                assignment_status_map[key]["locked"] = lesson_locked
            else:
                assignment_status_map[key] = {"status": "pending", "locked": lesson_locked}

    ordered_lessons = Lesson.objects.filter(module__course=course).select_related('module').order_by('module__order', 'order')
    ordered_lesson_assignment_pairs = []
    for lsn in ordered_lessons:
        for assign in lsn.assignments.all():
            key = f"{assign.id}-{lsn.id}"
            ordered_lesson_assignment_pairs.append({
                'lesson': lsn,
                'assignment': assign,
                'locked': assignment_status_map.get(key, {}).get('locked', False),
                'status': assignment_status_map.get(key, {}).get('status', 'pending'),
                'key': key,
            })

    # SCORM Entry Point / File Launch
    entry_key = None
    proxy_url = None
    saved_progress = SCORMTrackingData.objects.filter(user=request.user, lesson=lesson).first()
    lesson_location = saved_progress.lesson_location if saved_progress and saved_progress.lesson_location else ""
    if lesson_location.endswith("/None"):
        lesson_location = ""

    if lesson_location.endswith("index.html/"):
        lesson_location = lesson_location.rstrip("/")
    elif "index.html/" in lesson_location:
        lesson_location = lesson_location.replace("index.html/", "index.html")

    scroll_position = saved_progress.scroll_position if saved_progress else 0

    lesson_assignment_map = defaultdict(list)
    for pair in ordered_lesson_assignment_pairs:
        lesson_assignment_map[pair["lesson"].id].append(pair)

    if lesson.content_type in ['SCORM2004', 'SCORM1.2']:
        if lesson.uploaded_file and lesson.uploaded_file.scorm_entry_point:
            entry_key = lesson.uploaded_file.scorm_entry_point.replace("\\", "/")
            
            request.session["active_scorm_folder"] = entry_key.split("/")[0]
            proxy_url = _canon_url(f"/scorm-content/{iri_to_uri(entry_key)}")
        else:
            return render(request, 'error.html', {'message': 'No valid SCORM entry point found for this lesson.'})

    elif lesson.file and lesson.file.file:
        file_key = lesson.file.file.name
        if file_key.startswith("tenant/"):
            file_key = file_key.replace("tenant/", "", 1)
        entry_key = file_key.replace("\\", "/").lstrip("/")
        proxy_url = generate_presigned_url(entry_key)

    elif lesson.content_type == 'quiz':
        print("[LAUNCH] launch_scorm_file hit for lesson", lesson_id)
        print('lesson.content_type:', lesson.content_type)

        quiz_config = getattr(lesson, 'quiz_config', None)
        if not quiz_config:
            return render(request, 'error.html', {'message': 'No quiz configuration found for this lesson.'})

        using_template = (lesson.create_quiz_from == 'create_quiz_from1' and lesson.quiz_template_id)
        using_quiz     = (lesson.create_quiz_from == 'create_quiz_from2' and lesson.quiz_id)

        # 1) Attempt (QuizAttempt)
        want_new = request.GET.get('new_attempt') in ('1', 'true', 'yes')
        ulp = _get_or_create_ulp(request, lesson)
        attempt = _pick_attempt(ulp, want_new=want_new)
        attempt_id_str = str(attempt.attempt_id)
        request.session['current_attempt_id'] = attempt_id_str

        # 2) Resolve question ids / quiz container
        base_ids = []
        quiz = None

        if using_quiz:
            try:
                quiz = Quiz.objects.get(pk=lesson.quiz_id)
            except Quiz.DoesNotExist:
                return render(request, 'error.html', {'message': 'Quiz not found.'})
            ordered_links = list(
                QuestionOrder.objects.filter(quiz=quiz).select_related('question').order_by('order')
            )
            base_ids = [l.question_id for l in ordered_links]

        elif using_template:
            template = get_object_or_404(QuizTemplate, id=lesson.quiz_template_id)
            base_ids = list(TemplateQuestion.objects.filter(template=template).values_list('question_id', flat=True))
            quiz = (Quiz.objects.filter(id=lesson.quiz_id).first()
                    or Quiz.objects.filter(url=f"template-{template.id}").first())
            if not quiz:
                quiz = Quiz.objects.create(
                    title=f"Template: {template.title}",
                    description=f"Derived from template {template.id}",
                    url=f"template-{template.id}"
                )
                lesson.quiz_id = quiz.id
                lesson.save(update_fields=['quiz_id'])
        else:
            if lesson.quiz_id:
                try:
                    quiz = Quiz.objects.get(pk=lesson.quiz_id)
                except Quiz.DoesNotExist:
                    return render(request, 'error.html', {'message': 'Quiz not found.'})
                ordered_links = list(
                    QuestionOrder.objects.filter(quiz=quiz).select_related('question').order_by('order')
                )
                base_ids = [l.question_id for l in ordered_links]
            elif lesson.quiz_template_id:
                template = get_object_or_404(QuizTemplate, id=lesson.quiz_template_id)
                quiz = (Quiz.objects.filter(url=f"template-{template.id}").first()
                        or Quiz.objects.create(
                            title=f"Template: {template.title}",
                            description=f"Derived from template {template.id}",
                            url=f"template-{template.id}"
                        ))
                if not lesson.quiz_id:
                    lesson.quiz_id = quiz.id
                    lesson.save(update_fields=['quiz_id'])
                base_ids = list(TemplateQuestion.objects.filter(template=template).values_list('question_id', flat=True))
            else:
                return render(request, 'error.html', {'message': 'No quiz or template set for this lesson.'})

        if not base_ids:
            return render(request, 'error.html', {'message': 'This quiz has no questions yet.'})

        # 3) Per-ATTEMPT order (key by attempt id)
        order_key = f'quiz_order_{attempt_id_str}'
        qid_order = request.session.get(order_key)
        if not qid_order:
            qid_order = base_ids[:]
            if quiz_config and quiz_config.randomize_order:
                import random
                random.shuffle(qid_order)
            request.session[order_key] = qid_order
            request.session.modified = True

        # 4) Prefetch questions
        questions_qs = Question.objects.filter(id__in=qid_order).select_related(
            'mcquestion', 'tfquestion', 'fitbquestion', 'essayquestion'
        )
        questions_map = {q.id: q for q in questions_qs}
        questions = [questions_map[qid] for qid in qid_order if qid in questions_map]

        for q in questions:
            media_items = list(QuestionMedia.objects.filter(question_id=q.id))
            q.media_items_list = media_items
            q.has_media = any(
                m.source_type in ["upload", "library"] and (m.file or m.url_from_library)
                for m in media_items
            )
            q.has_embed = any(m.embed_code for m in media_items)

        quiz_type = quiz_config.quiz_type or 'standard_quiz'
        total_qs = len(qid_order)
        if session.total_questions != total_qs:
            session.total_questions = total_qs
            session.save(update_fields=['total_questions'])
        if attempt.total_questions != total_qs:
            attempt.total_questions = total_qs
            attempt.save(update_fields=['total_questions'])

        reveal = bool(getattr(getattr(lesson, "quiz_config", None), "reveal_answers", False))
        if not getattr(lesson, "quiz_config", None):
            reveal = not bool(getattr(quiz, "answers_at_end", True))

        resume = {
            "session_id": attempt_id_str,
            "status": attempt.status,
            "last_position": attempt.last_position or 0,
            "total": total_qs,
        }
        resume_json = json.dumps(resume)

        return render(request, 'quizzes/quiz_player.html', {
            'lesson': lesson,
            'course_title': course.title,
            'saved_progress': saved_progress.progress if saved_progress else 0,
            'lesson_location': lesson_location,
            'quiz_type': quiz_type,
            'quiz_config': quiz_config,
            'quiz': quiz,
            'questions': questions,
            'total_questions': total_qs,
            'reveal_answers': reveal,
            'user_course': user_course,
            'profile_id': profile.id,
            'lesson_progress_data': json.dumps(lesson_progress_data),
            'mini_lesson_progress': json.dumps(mini_lesson_progress),
            'course_locked': course_locked,
            'next_lesson': next_lesson,
            'prev_lesson': prev_lesson,
            'is_last_lesson': is_last_lesson,
            'modules_with_lessons': modules_with_lessons,
            'full_course_assignments': full_course_assignments,
            'ordered_lesson_assignment_pairs': ordered_lesson_assignment_pairs,
            'assignment_status_map': assignment_status_map,
            'lesson_assignment_map': lesson_assignment_map,
            'completed_assignment_ids': completed_assignment_ids,
            'lesson_session': session,       # expose for legacy template bits
            'resume_json': resume_json,
        })

    # Non-quiz launch
    return render(request, 'iplayer.html', {
        'lesson': lesson,
        'course_title': course.title,
        'scorm_index_file_url': proxy_url,
        'saved_progress': saved_progress.progress if saved_progress else 0,
        'lesson_location': lesson_location,
        'saved_scroll_position': scroll_position,
        'profile_id': profile.id,
        'lesson_progress_data': json.dumps(lesson_progress_data),
        'mini_lesson_progress': json.dumps(mini_lesson_progress),
        'user_course': user_course,
        'course_locked': course_locked,
        'next_lesson': next_lesson,
        'prev_lesson': prev_lesson,
        'is_last_lesson': is_last_lesson,
        'modules_with_lessons': modules_with_lessons,
        'full_course_assignments': full_course_assignments,
        'ordered_lesson_assignment_pairs': ordered_lesson_assignment_pairs,
        'assignment_status_map': assignment_status_map,
        'lesson_assignment_map': lesson_assignment_map,
        'completed_assignment_ids': completed_assignment_ids,
        'lesson_session': session,
    })

def get_s3_file_metadata(bucket_name, key):
    """ Retrieve metadata from a specific S3 object """
    secret_name = "COGNITO_SECRET"
    secrets = get_secret(secret_name)

    s3_client = boto3.client(
        's3',
        aws_access_key_id=secrets.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=secrets.get('AWS_SECRET_ACCESS_KEY'),
        region_name=AWS_S3_REGION_NAME
    )
    
    try:
        response = s3_client.head_object(Bucket=bucket_name, Key=key)
        metadata = response.get('Metadata', {})
        
        # Print success message with metadata details
        if metadata:
            print(f"Successfully retrieved metadata for {key}: {metadata}")
        else:
            print(f"No metadata found for {key}.")
        
        return metadata
    except ClientError as e:
        print(f"Error retrieving metadata for {key}: {e}")
        return {}
    
def parse_iso8601_duration(duration_str):
    """
    Parse a simplified ISO 8601 duration string (e.g., 'PT1H2M3S') into seconds.
    """
    pattern = r'^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$'
    match = re.match(pattern, duration_str)
    if not match:
        return 0

    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0

    return hours * 3600 + minutes * 60 + seconds

def format_iso8601_duration(total_seconds):
    """
    Convert total seconds to ISO 8601 duration string (e.g., 3723 → 'PT1H2M3S').
    """
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"PT{hours}H{minutes}M{seconds}S"

def accumulate_time(existing, new):
    try:
        existing_sec = parse_iso8601_duration(existing or "PT0H0M0S")
        new_sec = parse_iso8601_duration(new or "PT0H0M0S")
        return format_iso8601_duration(existing_sec + new_sec)
    except Exception as e:
        print("⚠️ Error in accumulate_time:", e)
        return existing or "PT0H0M0S"

@login_required
def available_lessons(request):
    # Get all lessons regardless of scorm_entry_point to debug
    lessons = Lesson.objects.all()

    scorm_files = []

    # Prepare the SCORM lessons to pass to the template
    for lesson in lessons:
        if lesson.uploaded_file and lesson.uploaded_file.scorm_entry_point:
            scorm_files.append({
                'id': lesson.id,
                'title': lesson.title,
                'url': generate_cloudfront_url(lesson.uploaded_file.scorm_entry_point)
            })
        else:
            # Add logging to understand why a lesson might be missing
            print(f"Lesson ID {lesson.id} - Missing SCORM Entry Point or Uploaded File")

    # Render the template with the available SCORM lessons
    return render(request, 'available_lessons.html', {
        'scorm_files': scorm_files
    })

def _norm_progress_in(p):
    """Accepts 0..1 or 0..100 or None; returns float 0..1."""
    try:
        v = float(p)
    except (TypeError, ValueError):
        return 0.0
    if v > 1.0:     # treat as percent
        v = v / 100.0
    return max(0.0, min(v, 1.0))

def _normalize_status(s: str) -> str:
    if not s:
        return "incomplete"
    s = s.lower()
    return {"complete": "completed"}.get(s, s)

def _status_rank(s: str) -> int:
    """
    Lower rank = worse. We disallow downgrades.
    incomplete(0) < pending(1) < failed(1) < passed(2) == completed(2)
    """
    s = _normalize_status(s)
    table = {
        "incomplete": 0,
        "pending":    1,
        "failed":     1,
        "passed":     2,
        "completed":  2,
    }
    return table.get(s, 0)

def _update_ulp_from_status(ulp, new_status, *, require_passing: Optional[bool] = None) -> None:
    """
    require_passing=True  -> complete only on 'passed' (or 'completed')
    require_passing=False -> complete on 'pending', 'failed', or 'passed' (or 'completed')
    require_passing=None  -> default: complete on 'passed' or 'completed'

    Special rule: if new_status == 'pending', ALWAYS set status to 'pending' (override rank guard).
    """
    new_s = _normalize_status(new_status)
    old_s = _normalize_status(ulp.completion_status or 'incomplete')

    fields = []

    # --- STATUS: allow normal upgrade OR force 'pending' even if it looks like a downgrade ---
    if new_s == 'pending':
        if old_s != 'pending':
            ulp.completion_status = 'pending'
            fields.append('completion_status')
    else:
        # Only upgrade; never downgrade for non-pending
        if _status_rank(new_s) >= _status_rank(old_s) and new_s != old_s:
            ulp.completion_status = new_s
            fields.append('completion_status')

    # --- COMPLETION FLAG: per your rules ---
    if require_passing is True:
        should_complete = new_s in ('passed', 'completed')
    elif require_passing is False:
        should_complete = new_s in ('pending', 'failed', 'passed', 'completed')
    else:
        should_complete = new_s in ('passed', 'completed')

    if should_complete and not ulp.completed:
        now = timezone.now()
        ulp.completed = True
        if not ulp.completed_on_date:
            ulp.completed_on_date = now.date()
            fields.append('completed_on_date')
        if not ulp.completed_on_time:
            ulp.completed_on_time = now.time().replace(microsecond=0)
            fields.append('completed_on_time')
        fields.append('completed')

    if fields:
        ulp.save(update_fields=fields)

@csrf_exempt
@require_POST
def track_scorm_data(request):
    """
    Receives pings from scorm_player.js.
    - Treats session_time as TOTAL for the current browser session (session_id).
    - Stores absolute time on LessonSession (no accumulation).
    - Accumulates time on SCORMTrackingData by adding only the delta for this session_id.
    - Creates a new LessonSession only on launch; here we upsert by session_id to avoid gaps.
    """

    try:
        data = json.loads(request.body or "{}")
    except Exception as e:
        return JsonResponse({"error": "bad_json", "detail": str(e)}, status=400)

    try:
        print("🧪 Incoming tracking payload: ", data)

        # ---- payload ----
        profile_id        = data.get("user_id")
        lesson_id         = data.get("lesson_id")
        raw_progress      = data.get("progress")
        progress          = _norm_progress_in(raw_progress)  # 0..1 float
        completion_status = _normalize_status(data.get("completion_status", "incomplete"))
        session_time_in   = data.get("session_time", "PT0H0M0S")
        score             = data.get("score")
        lesson_location   = (data.get("lesson_location", "") or "")
        scroll_position   = int(data.get("scroll_position") or 0)
        session_id        = data.get("session_id") or request.session.get("current_lesson_session_id")
        is_final_ping     = bool(data.get("final"))

        if not lesson_id:
            return JsonResponse({"error": "missing_lesson_id"}, status=400)

        # ---- identify lesson & user ----
        lesson = get_object_or_404(Lesson, pk=lesson_id)

        if request.user.is_authenticated:
            user = request.user
        else:
            profile = get_object_or_404(Profile, pk=profile_id)
            user = profile.user

        user_course, _ = UserCourse.objects.get_or_create(user=user, course=lesson.module.course)

        # ---- sanitize lesson_location quirks ----
        if lesson_location.endswith("index.html/"):
            lesson_location = lesson_location.rstrip("/")
            print(f"🧹 Cleaned lesson_location path → {lesson_location}")
        elif "index.html/" in lesson_location:
            lesson_location = lesson_location.replace("index.html/", "index.html")
            print(f"🧹 Cleaned broken index.html subpath → {lesson_location}")
        if lesson_location.lower().endswith(".pdf") and "X-Amz-Signature" in lesson_location:
            print("🔒 Stripping signed PDF URL from lesson_location")
            lesson_location = ""

        # =====================================================================
        # 1) LESSON SESSION: upsert by session_id (created on launch).
        #     We STORE ABSOLUTE time for this session (no accumulation).
        # =====================================================================
        if not session_id:
            # Safety: mint one if the client forgot to send it (rare).
            session = ensure_lesson_session(request, lesson, force_new=True)
            session_id = session.session_id
        else:
            session, _created = LessonSession.objects.get_or_create(
                session_id=session_id,
                defaults={
                    "user": user,
                    "lesson": lesson,
                    "user_course": user_course,
                    "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                    "ip_address": request.META.get("REMOTE_ADDR", ""),
                    "completion_status": "incomplete",
                    "progress": 0.0,
                    "start_time": timezone.now(),   # <-- init
                    "end_time": timezone.now(),     # <-- init
                    "finished_at": None,
                },
            )

        request.session["current_lesson_session_id"] = session_id

        # Rank-guard status on the session
        old_s = _normalize_status(session.completion_status or "incomplete")
        new_s = completion_status
        if _status_rank(new_s) >= _status_rank(old_s) and new_s != old_s:
            session.completion_status = new_s

        # Map to lesson-session lifecycle
        if new_s in ("completed", "passed", "failed"):
            session.status = "completed"
        elif new_s == "pending":
            session.status = "pending"
        else:
            session.status = "active"

        # Progress: monotonic (except explicit 0 while incomplete)
        if new_s == "incomplete" and (session.progress or 0.0) == 0.0 and (progress is None or progress == 0):
            session.progress = 0.0
        elif progress is not None and float(progress) > float(session.progress or 0.0):
            session.progress = float(progress)

        # Basic fields
        session.scroll_position = scroll_position
        session.lesson_location = lesson_location
        session.user_agent      = request.META.get("HTTP_USER_AGENT", "")
        session.ip_address      = request.META.get("REMOTE_ADDR", "")

        # Score (keep best)
        if score is not None:
            try:
                s = float(score)
                if session.score is None or s > float(session.score):
                    session.score = s
            except (TypeError, ValueError):
                pass

        # >>> TIME: store absolute per-session total (no addition) <<<
        curr_sec  = _pt_to_seconds(session_time_in)
        sess_cmi  = _safe_json_dict(session.cmi_data)
        last_rep  = int(sess_cmi.get("last_reported_sec", 0))
        # Clamp to monotonic within this browser session
        abs_sec   = max(curr_sec, last_rep)
        session.session_time = _seconds_to_pt(abs_sec)
        sess_cmi["last_reported_sec"] = abs_sec
        session.cmi_data = sess_cmi

        # Touch timestamps
        session.end_time = timezone.now()
        if is_final_ping or new_s in ("completed", "passed", "failed"):
            session.finished_at = session.finished_at or timezone.now()

        session.save()

        # =====================================================================
        # 2) SCORMTrackingData: accumulate across all sessions by DELTA.
        #    We keep a per-session ledger in cmi_data["sessions"][session_id].
        # =====================================================================
        tracking, created = SCORMTrackingData.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={
                "progress": 1.0 if new_s in ("completed", "passed") else (progress or 0.0),
                "completion_status": new_s,
                # We'll assign session_time below using the accumulator
                "session_time": "PT0H0M0S",
                "scroll_position": scroll_position,
                "lesson_location": lesson_location,
                "score": score,
                "cmi_data": {},  # seed; we'll merge below
            },
        )

        t_cmi = _safe_json_dict(tracking.cmi_data)
        incoming_cmi = _safe_json_dict(data.get("cmi_data"))

        # Keep last raw payload (optional)
        t_cmi["raw"] = incoming_cmi

        sessions_map = _safe_json_dict(t_cmi.get("sessions"))
        if not isinstance(sessions_map, dict):
            sessions_map = {}

        prev_for_this = int(sessions_map.get(session_id, 0))
        # How much NEW time did we see for this session id?
        delta = max(abs_sec - prev_for_this, 0)

        total_prev = int(t_cmi.get("total_accumulated_sec", _pt_to_seconds(tracking.session_time or "PT0H0M0S")))
        total_new  = total_prev + delta

        # Update the ledger
        sessions_map[session_id] = abs_sec
        t_cmi["sessions"] = sessions_map
        t_cmi["total_accumulated_sec"] = total_new

        # Rank-guarded status and progress
        old_ts = _normalize_status(tracking.completion_status or "incomplete")
        if _status_rank(new_s) >= _status_rank(old_ts) and new_s != old_ts:
            tracking.completion_status = new_s

        if new_s in ("completed", "passed"):
            if (tracking.progress or 0.0) < 1.0:
                tracking.progress = 1.0
        elif progress is not None and float(progress) > float(tracking.progress or 0.0):
            tracking.progress = float(progress)

        if tracking.lesson_location != lesson_location:
            tracking.lesson_location = lesson_location

        # Update misc
        tracking.scroll_position = scroll_position
        tracking.score = score
        tracking.session_time = _seconds_to_pt(total_new)
        tracking.cmi_data = t_cmi
        tracking.save()
        
        try:
            # Find the ULP for this user/course/lesson
            ump = (UserModuleProgress.objects
                   .select_related('user_course')
                   .get(user_course=user_course, module=lesson.module))
        except UserModuleProgress.DoesNotExist:
            # If somehow missing, create one so progress stays consistent
            ump = UserModuleProgress.objects.create(
                user_course=user_course,
                module=lesson.module,
                order=getattr(lesson.module, 'order', 0) or 0,
            )

        ulp, _ = UserLessonProgress.objects.get_or_create(
            user_module_progress=ump,
            lesson=lesson,
            defaults={'order': getattr(lesson, 'order', 0) or 0, 'completion_status': 'incomplete'},
        )

        # SCORM lessons usually don't use require_passing; pass None to use default rule:
        _update_ulp_from_status(ulp, new_s, require_passing=None)

        # Normalize: treat 'complete' like 'completed'
        mark_complete = new_s in ('complete', 'completed', 'passed')
        if mark_complete and not ulp.completed:
            now = timezone.now()
            ulp.completed = True
            ulp.completed_on_date = now.date()
            ulp.completed_on_time = now.time().replace(microsecond=0)
            ulp.save(update_fields=['completed', 'completed_on_date', 'completed_on_time'])

        # Keep course progress fresh
        user_course.update_progress()

        return JsonResponse({
            "status": "success" if new_s in ("completed", "passed") else ("pending" if new_s == "pending" else "incomplete"),
            "lesson_completed": new_s in ("completed", "passed"),
            "session_id": session_id,
            "course_progress": user_course.progress,
        })

    except Exception as e:
        print(f"🚨 Error in track_scorm_data: {e}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def track_mini_lesson_progress(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            lesson_progress_list = data.get("lesson_progress", [])

            if not user_id or not isinstance(lesson_progress_list, list):
                return JsonResponse({"error": "Invalid data structure"}, status=400)

            profile = get_object_or_404(Profile, pk=user_id)

            for mini_lesson in lesson_progress_list:
                lesson_id = mini_lesson.get("lesson_id")
                mini_lesson_index = mini_lesson.get("mini_lesson_index")  # Unique for each mini-lesson
                progress = mini_lesson.get("progress")

                if not lesson_id or progress is None:
                    continue

                try:
                    lesson = Lesson.objects.get(pk=lesson_id)
                except Lesson.DoesNotExist:
                    continue
                
                print('PROGRESS:', progress)
                # Use `mini_lesson_index` to ensure uniqueness
                LessonProgress.objects.update_or_create(
                    user=profile.user,
                    lesson=lesson,
                    mini_lesson_index=mini_lesson_index,
                    defaults={
                        "progress": progress,
                        "last_updated": timezone.now(),
                    }
                )

            return JsonResponse({"status": "success"})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)

def generate_cloudfront_url(key):
    # Define the CloudFront domain name
    cloudfront_domain = "https://d253588t4hyqvi.cloudfront.net"
    
    # Make sure the key uses forward slashes and points to the correct SCORM content in the bucket
    key = key.replace("\\", "/")

    # Construct the CloudFront URL
    return f"{cloudfront_domain}/{key}"

def get_cloudfront_keys(secret_name):
    """
    Retrieve CloudFront public and private keys from AWS Secrets Manager.
    :param secret_name: The name of the secret in AWS Secrets Manager.
    :return: A dictionary containing the private key and public key.
    """
    region_name = "us-east-1"  # e.g., "us-west-2"

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)

        # Decrypts secret using the associated KMS key.
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            secret_dict = json.loads(secret)

            # Correctly handle new lines for private key
            if 'cloudfront_private_key' in secret_dict:
                secret_dict['cloudfront_private_key'] = secret_dict['cloudfront_private_key'].replace('\\n', '\n').strip()

            return secret_dict
        else:
            # Decode binary secret using base64 if it's stored in binary form
            decoded_binary_secret = base64.b64decode(get_secret_value_response['SecretBinary'])
            secret_dict = json.loads(decoded_binary_secret)

            # Correctly handle new lines for private key
            if 'cloudfront_private_key' in secret_dict:
                secret_dict['cloudfront_private_key'] = secret_dict['cloudfront_private_key'].replace('\\n', '\n').strip()

            return secret_dict

    except ClientError as e:
        print(f"Unable to retrieve secret: {e}")
        raise e

def reformat_private_key(key):
    # Remove extra spaces and ensure correct structure
    key = key.strip()
    
    # Fix the header and footer if they are not on their own lines
    if "-----BEGIN RSA PRIVATE KEY-----" in key and not key.startswith("-----BEGIN RSA PRIVATE KEY-----\n"):
        key = key.replace("-----BEGIN RSA PRIVATE KEY-----", "-----BEGIN RSA PRIVATE KEY-----\n")
    if "-----END RSA PRIVATE KEY-----" in key and not key.endswith("\n-----END RSA PRIVATE KEY-----"):
        key = key.replace("-----END RSA PRIVATE KEY-----", "\n-----END RSA PRIVATE KEY-----")

    # Extract the body and reformat it into 64-character lines
    lines = key.splitlines()
    if len(lines) > 2:
        body = "".join(lines[1:-1])  # Combine all lines of the body
        body = "\n".join([body[i:i+64] for i in range(0, len(body), 64)])  # Split into 64-character lines
        return f"{lines[0]}\n{body}\n{lines[-1]}"
    return key

def load_private_key(private_key):
    """
    Load a private key that may be in either PKCS#1 or PKCS#8 format.
    :param private_key: The private key string.
    :return: RSA private key object.
    """
    try:
        # Detect key type
        if "-----BEGIN PRIVATE KEY-----" in private_key:
            # PKCS#8 format: Convert it to PKCS#1
            private_key_obj = serialization.load_pem_private_key(
                private_key.encode("utf-8"),
                password=None,
                backend=default_backend()
            )
            # Export the key in PKCS#1 format
            private_key_pkcs1 = private_key_obj.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,  # PKCS#1
                encryption_algorithm=serialization.NoEncryption()
            )
            # Load the key with rsa module
            private_key_rsa = rsa.PrivateKey.load_pkcs1(private_key_pkcs1)
        elif "-----BEGIN RSA PRIVATE KEY-----" in private_key:
            # PKCS#1 format: Load it directly
            private_key_rsa = rsa.PrivateKey.load_pkcs1(private_key.encode("utf-8"))
        else:
            raise ValueError("Unsupported private key format.")
        return private_key_rsa
    except Exception as e:
        print("Error loading private key:", e)
        return None

def validate_encoded_policy(policy_encoded):
    try:
        # Decode the policy
        decoded_policy = base64.urlsafe_b64decode(policy_encoded + "===")
        policy_json = json.loads(decoded_policy.decode('utf-8'))
        #print("Decoded Policy:", json.dumps(policy_json, indent=4))
        return True
    except Exception as e:
        print("Invalid Policy Encoded:", e)
        return False
    
def validate_signature(policy_encoded, sig_encoded, private_key):
    try:
        # Decode the policy
        decoded_policy = base64.urlsafe_b64decode(policy_encoded + "===")
        # Decode the signature
        decoded_signature = base64.urlsafe_b64decode(sig_encoded + "===")

        # Load the private key
        private_key_obj = rsa.PrivateKey.load_pkcs1(reformat_private_key(private_key).encode('utf-8'))

        # Re-sign the policy and compare signatures
        expected_signature = rsa.sign(decoded_policy, private_key_obj, 'SHA-1')

        if decoded_signature == expected_signature:
            print("Signature is valid!")
            return True
        else:
            print("Signature is invalid.")
            return False
    except Exception as e:
        print("Error validating signature:", e)
        return False

def generate_signed_cloudfront_url(cloudfront_url, key_pair_id, private_key, expiration_hours=1):
    """
    Generate a signed CloudFront URL using private key.

    :param cloudfront_url: The CloudFront URL for the content.
    :param key_pair_id: The CloudFront key pair ID.
    :param private_key: The private key as a string.
    :param expiration_hours: Expiration time in hours for the signed URL.
    :return: The signed URL or None if an error occurs.
    """
    try:
        # Reformat and load the private key
        formatted_key = reformat_private_key(private_key)
        private_key_obj = rsa.PrivateKey.load_pkcs1(formatted_key.encode('utf-8'))
    except Exception as e:
        print("Error loading private key:", e)
        return None

    # Set the expiration time
    expiration_time = int((datetime.datetime.utcnow() + datetime.timedelta(hours=expiration_hours)).timestamp())

    # Create the policy
    policy = {
        "Statement": [
            {
                "Resource": cloudfront_url,
                "Condition": {
                    "DateLessThan": {"AWS:EpochTime": expiration_time}
                }
            }
        ]
    }

    try:
        # Serialize and compact the policy JSON
        policy_json = json.dumps(policy, separators=(',', ':'))
        # Sign the policy
        signature = rsa.sign(policy_json.encode('utf-8'), private_key_obj, 'SHA-1')
    except Exception as e:
        print("Error signing the policy:", e)
        return None

    try:
        # Encode the policy and signature for the URL
        policy_encoded = base64.urlsafe_b64encode(policy_json.encode()).decode().rstrip("=")
        validate_encoded_policy(policy_encoded)
        signature_encoded = base64.urlsafe_b64encode(signature).decode().rstrip("=")
        validate_signature(policy_encoded, signature_encoded, private_key)
        # Sanitize the CloudFront URL
        encoded_policy = quote(policy_encoded, safe="")
        encoded_signature = quote(signature_encoded, safe="")
        sanitized_url = quote(cloudfront_url, safe="/:")

        encoded_signature = encoded_signature.strip()


        # Construct the signed URL
        signed_url = (
            f"{sanitized_url}?Policy={encoded_policy}&Signature={encoded_signature}&Key-Pair-Id={key_pair_id}"
        )

        print("Decoded Policy:", json.dumps(json.loads(policy_json), indent=4))
        print("Policy Encoded:", encoded_policy)
        print("Sig Encoded:", encoded_signature)
        print("Generated Signed URL:", signed_url)

        return signed_url
    except Exception as e:
        print("Error constructing signed URL:", e)
        return None
    
@login_required
def get_assignment_detail(request, assignment_id):
    lesson_id = request.GET.get('lesson_id')  # pull from query params
    assignment = get_object_or_404(Upload, id=assignment_id)

    # Fetch progress tied to *both* the assignment and the lesson (if given)
    progress = None
    if lesson_id:
        progress = UserAssignmentProgress.objects.filter(
            user=request.user,
            assignment=assignment,
            lesson_id=lesson_id
        ).first()
    else:
        # fallback: full-course assignments (not lesson-bound)
        progress = UserAssignmentProgress.objects.filter(
            user=request.user,
            assignment=assignment,
            lesson__isnull=True
        ).first()

    return JsonResponse({
        "id": assignment.id,
        "title": assignment.title,
        "description": assignment.description,
        "file_type": assignment.file_type,
        "file_title": assignment.file_title,
        "url": assignment.url,
        "status": progress.status if progress and progress.status else "",
        "review_notes": progress.review_notes if progress and progress.review_notes else "",
        "formatted_reviewed_at": get_formatted_datetime(progress.reviewed_at) if progress and progress.reviewed_at else "",
        "completed": progress.status in ['submitted', 'approved', 'rejected'] if progress else False,
        "completed_at": progress.completed_at.isoformat() if progress and progress.completed_at else None,
        "formatted_completed_at": get_formatted_datetime(progress.completed_at) if progress and progress.completed_at else "",
        "lesson": progress.lesson.title if progress and progress.lesson else None,
        "lesson_id": progress.lesson.id if progress and progress.lesson else None,
    })

@login_required
def submit_assignment(request):
    assignment_id = request.POST.get('assignment_id')
    course_id = request.POST.get('course_id')
    lesson_id = request.POST.get('lesson_id')
    student_notes = request.POST.get('student_notes')
    uploaded_file = request.FILES.get('file')

    assignment = get_object_or_404(Upload, id=assignment_id)
    course = get_object_or_404(Course, id=course_id)
    lesson = Lesson.objects.filter(id=lesson_id).first() if lesson_id else None

    # Determine the status based on approval_type
    if assignment.approval_type is None or assignment.approval_type == 'None':
        status = 'approved'
    else:
        status = 'submitted'

    # Save or update progress
    progress, created = UserAssignmentProgress.objects.update_or_create(
        user=request.user,
        assignment=assignment,
        lesson=lesson,  # 🔐 ensure lesson-specific tracking
        defaults={
            'course': course,
            'lesson': lesson,
            'file': uploaded_file,
            'student_notes': student_notes,
            'status': status,
            'completed_at': timezone.now(),
        }
    )

    return JsonResponse({
        "status": "ok",
        "filename": uploaded_file.name,
        "submitted": True,
        "created": created,
        "final_status": status,
    })