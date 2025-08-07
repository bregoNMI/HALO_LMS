import datetime
import json
import mimetypes
import os
import random
import uuid
from django.utils import timezone
from shlex import quote
from django.utils.timezone import now
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import rsa
import re
from django.utils.encoding import iri_to_uri
from client_admin.utils import get_formatted_datetime
from urllib.parse import quote, unquote, unquote_plus
from client_admin.models import Profile, UserCourse, UserModuleProgress, UserLessonProgress, UserAssignmentProgress
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.conf import settings
from botocore.exceptions import ClientError
from content.models import Course, Module, Lesson, UploadedFile, Upload
from content.models import Course, EssayQuestion, FITBQuestion, Module, Lesson, Question, QuestionMedia, QuestionOrder, TFQuestion, UploadedFile, QuizConfig, Quiz
from authentication.python.views import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, get_secret
from django.views.decorators.csrf import csrf_exempt
import boto3 
from django.views.decorators.http import require_GET
from django.contrib.auth.decorators import login_required
import base64
from django.shortcuts import render
import boto3
from rsa import PrivateKey
from botocore.exceptions import NoCredentialsError
from course_player.models import LessonProgress, LessonSession, SCORMTrackingData, QuizResponse
from halo_lms.settings import AWS_S3_REGION_NAME, AWS_STORAGE_BUCKET_NAME
from collections import defaultdict

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
    user_course.update_progress()

    return JsonResponse({"status": "success"})

"""
def proxy_scorm_file(request, file_path):

    # Proxy SCORM file from S3 to serve it through the LMS domain.

    decoded_file_path = unquote_plus(file_path).strip()
    print(f"🔍 Incoming SCORM request: {decoded_file_path}")

    # Fix cases where "index.html/" is mistakenly inserted in asset URLs
    if "index.html/" in decoded_file_path:
        decoded_file_path = decoded_file_path.replace("index.html/", "")

    # Ensure correct S3 key format
    s3_key = f"media/default/uploads/{decoded_file_path}".replace("\\", "/").strip()
    print(f"📂 Updated file path for S3 fetch: {s3_key}")

    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_S3_REGION_NAME
    )
    bucket_name = AWS_STORAGE_BUCKET_NAME

    try:
        # Fetch the file from S3
        s3_response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        file_data = s3_response['Body']

        # **Determine the correct Content-Type**
        content_type = s3_response.get('ContentType', None)
        if not content_type:
            content_type, _ = mimetypes.guess_type(s3_key)
            if not content_type:
                content_type = "application/octet-stream"  # Default

        # **Force correct MIME types for HTML, JS, and CSS**
        if s3_key.endswith(".html"):
            content_type = "text/html"
        elif s3_key.endswith(".css"):
            content_type = "text/css"
        elif s3_key.endswith(".js"):
            content_type = "application/javascript"

        #print(f"✅ Serving file from S3: {s3_key} with Content-Type: {content_type}")

        return FileResponse(file_data, content_type=content_type)

    except ClientError as e:
        print(f"❌ Error fetching file {decoded_file_path} from S3: {e}")
        raise Http404("SCORM file not found")
"""
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
    Proxy SCORM file from S3 to serve it through the LMS domain.
    """
    from urllib.parse import unquote_plus

    decoded_file_path = unquote_plus(file_path).strip()
    print(f"🔍 Incoming SCORM request: {decoded_file_path}")

    # 🧹 Normalize anything weird about index.html
    if decoded_file_path.endswith("index.html/"):
        decoded_file_path = decoded_file_path.rstrip("/")
        print(f"🧹 Removed trailing slash after index.html → {decoded_file_path}")
    if "index.html/" in decoded_file_path:
        decoded_file_path = decoded_file_path.replace("index.html/", "")
        print(f"🧹 Removed 'index.html/' from path → {decoded_file_path}")

    # 🧼 Fix nested font path bug: "lib/icomoon.css/fonts/icomoon.woff" → "lib/fonts/icomoon.woff"
    if "lib/icomoon.css/fonts/" in decoded_file_path:
        decoded_file_path = decoded_file_path.replace("lib/icomoon.css/fonts/", "lib/fonts/")
        print(f"🧼 Normalized font path from CSS: {decoded_file_path}")

    # Only prepend folder if path is truly absolute (starts with just "scormcontent/...")
    if "scormcontent/" in decoded_file_path and not decoded_file_path.startswith("gmdss-"):
        folder = request.session.get("active_scorm_folder")
        if not folder:
            print("❌ No SCORM folder in session for absolute path")
            raise Http404("SCORM folder not set")
        decoded_file_path = f"{folder}/{decoded_file_path}"

    # Final key
    s3_key = f"media/default/uploads/{decoded_file_path}".replace("\\", "/").strip()
    print(f"📂 Final S3 Key: {s3_key}")

    # S3 fetch
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_S3_REGION_NAME
    )

    try:
        s3_response = s3_client.get_object(Bucket=AWS_STORAGE_BUCKET_NAME, Key=s3_key)
        file_data = s3_response['Body']
        content_type = s3_response.get('ContentType') or mimetypes.guess_type(s3_key)[0] or "application/octet-stream"

        # Normalize common types
        if s3_key.endswith(".html"):
            content_type = "text/html"
        elif s3_key.endswith(".css"):
            content_type = "text/css"
        elif s3_key.endswith(".js"):
            content_type = "application/javascript"

        return FileResponse(file_data, content_type=content_type)

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
    
@require_GET
@login_required
def get_quiz_score(request):
    session_id = request.GET.get("session_id")
    if not session_id:
        return JsonResponse({"error": "Missing session_id"}, status=400)

    session = LessonSession.objects.filter(session_id=session_id, user=request.user).first()
    if not session:
        return JsonResponse({"error": "Session not found"}, status=404)

    lesson = session.lesson
    quiz = Quiz.objects.filter(id=lesson.quiz_id).first()  # ✅ Quiz, not QuizConfig

    responses = session.quizresponse_set.all()
    gradable = responses.exclude(is_correct=None)
    
    total_answered = responses.count()  # ✅ includes essays
    total_graded = gradable.count()     # ✅ excludes essays
    correct = gradable.filter(is_correct=True).count()

    percent = int((correct / total_graded) * 100) if total_graded > 0 else 0

    pending_review = responses.filter(is_correct=None).exists()

    passed = False
    success_text = ""
    fail_text = ""

    if quiz:
        pass_mark = quiz.pass_mark or 0
        if not pending_review:
            passed = percent >= pass_mark
        success_text = quiz.success_text or ""
        fail_text = quiz.fail_text or "Your quiz is under review."

    return JsonResponse({
        "total_answered": total_answered,
        "total_graded": total_graded,
        "correct_answers": correct,
        "score_percent": percent,
        "passed": passed,
        "pending_review": pending_review,
        "success_text": success_text,
        "fail_text": fail_text,
    })

@csrf_exempt
@login_required
def submit_question(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    data = json.loads(request.body)
    user = request.user
    question_id = data.get("question_id")
    answer = data.get("answer")
    question_type = data.get("question_type")
    lesson_id = data.get("lesson_id")

    # Fetch question and correct answer(s)
    try:
        question = Question.objects.get(id=question_id)
    except Question.DoesNotExist:
        return JsonResponse({"error": "Invalid question ID"}, status=404)

    is_correct = False
    correct_answers = []

    if question_type == "TFQuestion":
        tf = getattr(question, 'tfquestion', None)
        if tf:
            is_correct = (str(tf.correct).lower() == str(answer).lower())
            correct_answers = ["True" if tf.correct else "False"]

    elif question_type in ("MCQuestion", "MRQuestion"):
        correct_answers_qs = question.answers.filter(is_correct=True)
        correct_ids = set(str(a.id) for a in correct_answers_qs)
        is_correct = str(answer) in correct_ids
        correct_answers = [a.text for a in correct_answers_qs]

    elif question_type == "EssayQuestion":
        # Assume always accepted
        is_correct = None
        correct_answers = []

    elif question_type == "FITBQuestion":
        fitb = getattr(question, 'fitbquestion', None)
        if fitb:
            accepted = fitb.acceptable_answers.all()
            for ans in accepted:
                text = ans.content
                if fitb.strip_whitespace:
                    answer = answer.strip()
                    text = text.strip()
                if not fitb.case_sensitive:
                    answer = answer.lower()
                    text = text.lower()
                if answer == text:
                    is_correct = True
                    break
            correct_answers = [a.content for a in accepted]

    # (Optional) Save the user's answer to your UserAnswer model here
    # Save the user's answer
    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return JsonResponse({"error": "Invalid lesson ID"}, status=404)

    session_id = request.session.get("current_lesson_session_id")
    lesson_session = LessonSession.objects.filter(session_id=session_id).first()

    QuizResponse.objects.create(
        user=user,
        lesson=lesson,
        lesson_session=lesson_session,  # ✅ New link to LessonSession
        question=question,
        user_answer=answer,
        is_correct=is_correct
    )

    return JsonResponse({
        "status": "success",
        "is_correct": is_correct,
        "correct_answers": correct_answers,
    })

@login_required
def launch_scorm(request, course_id):
    course = get_object_or_404(Course, pk=course_id)
    user = request.user

    # Get all lessons ordered across modules
    lessons = Lesson.objects.filter(module__course=course).order_by("module__order", "order")

    for lesson in lessons:
        tracking = SCORMTrackingData.objects.filter(user=user, lesson=lesson).first()
        if not tracking or tracking.completion_status != "completed":
            return redirect("launch_scorm_file", lesson_id=lesson.id)

    # Fallback if all lessons are completed — open last
    if lessons.exists():
        return redirect("launch_scorm_file", lesson_id=lessons.last().id)

    return render(request, "error.html", {"message": "No lessons available in this course."})

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

@login_required
def launch_scorm_file(request, lesson_id):
    print('Lesson ID:', lesson_id)
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    course = lesson.module.course
    profile = get_object_or_404(Profile, user=request.user)
    user_course = UserCourse.objects.filter(user=request.user, course=course).first()
 
    # Fetch all modules with their lessons for the course
    modules_with_lessons = Module.objects.filter(course=course).order_by('order').prefetch_related('lessons')
 
    # Identify current lesson's module and determine nav context
    all_lessons = Lesson.objects.filter(
        module__course=course
    ).select_related('module').order_by('module__order', 'order')

    all_lessons = list(all_lessons)
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
        if not prev_completed:
            return render(request, 'error.html', {'message': 'You must complete the previous lesson before proceeding.'})


    mini_lesson_progress = list(LessonProgress.objects.filter(
        user=request.user,
        lesson=lesson
    ).values("mini_lesson_index", "progress"))

    # Progress tracking
    lesson_progress_data = []
    previous_lesson_completed = True

    for module in modules_with_lessons:
        for module_lesson in module.lessons.all().order_by("order"):
            # Get SCORM data for progress % and location
            scorm_entry = SCORMTrackingData.objects.filter(user=request.user, lesson=module_lesson).first()
            progress_value = scorm_entry.progress if scorm_entry else 0

            # Get actual completion status from UserLessonProgress
            lesson_progress = UserLessonProgress.objects.filter(
                user_module_progress__user_course=user_course,
                lesson=module_lesson
            ).first()

            is_completed = lesson_progress.completed if lesson_progress else False
            locked_status = course_locked and not previous_lesson_completed

            # Debug logging (optional)
            print(f"🧪 Lesson {module_lesson.id} — SCORM progress: {progress_value}, Completed?: {is_completed}")

            # Check if lesson has any ungraded essay responses
            has_pending_review = QuizResponse.objects.filter(
                user=request.user,
                lesson=module_lesson,
                is_correct=None
            ).exists()
            print(f"[🧪 DEBUG] Lesson {module_lesson.id} pending_review: {has_pending_review}")
            lesson_progress_data.append({
                "id": module_lesson.id,
                "title": module_lesson.title,
                "completed": is_completed,
                "locked": locked_status,
                "progress": int(progress_value * 100),
                "module_id": module.id,
                "module_title": module.title,
                "pending_review": has_pending_review,  # ✅ inject the flag
            })
 
            previous_lesson_completed = is_completed

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
        assignment_status_map[key] = {
            "status": progress.status,
            "locked": False  # Set this separately below
        }

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
                assignment_status_map[key] = {
                    "status": "pending",
                    "locked": lesson_locked
                }

    # Build ordered lesson-assignment pairs
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

    # Start session
    session = LessonSession.objects.create(
        user=request.user,
        lesson=lesson,
        session_id=str(uuid.uuid4()),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        ip_address=request.META.get('REMOTE_ADDR', ''),
    )
    request.session['current_lesson_session_id'] = session.session_id

    # SCORM Entry Point
    entry_key = None
    proxy_url = None
    saved_progress = SCORMTrackingData.objects.filter(user=request.user, lesson=lesson).first()
    lesson_location = saved_progress.lesson_location if saved_progress and saved_progress.lesson_location else ""
    if lesson_location.endswith("/None"):
        lesson_location = ""

    # Clean broken index.html paths
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

            # ✅ Now safe to split
            folder_name = entry_key.split("/")[0]
            request.session["active_scorm_folder"] = folder_name

            #proxy_url = f"/scorm-content/{iri_to_uri(entry_key)}"
            proxy_url = f"/scorm-content/{iri_to_uri(entry_key)}".rstrip("/")


        else:
            return render(request, 'error.html', {'message': 'No valid SCORM entry point found for this lesson.'})
 
    elif lesson.file and lesson.file.file:
        file_key = lesson.file.file.name
        if file_key.startswith("tenant/"):
            file_key = file_key.replace("tenant/", "", 1)
        entry_key = file_key.replace("\\", "/").lstrip("/")
        proxy_url = generate_presigned_url(entry_key)

    elif lesson.content_type == 'quiz':
        quiz_config = getattr(lesson, 'quiz_config', None)
        quiz_id = lesson.quiz_id
        if not quiz_config:
            return render(request, 'error.html', {'message': 'No quiz configuration found for this lesson.'})
        
        if not quiz_id:
            return render(request, 'error.html', {'message': 'No quiz ID found for this lesson.'})
        
        try:
            quiz = Quiz.objects.get(pk=quiz_id)
        except Quiz.DoesNotExist:
            return render(request, 'error.html', {'message': 'Quiz not found.'})
        
        # ✅ Get ordered questions and prefetch their answers
        ordered_links = QuestionOrder.objects.filter(quiz=quiz).select_related('question').order_by('order')
        questions = get_question_type(
            ordered_links,
            randomize_answers=quiz_config.randomize_order if quiz_config else False
        )
        
        for q in questions:
            q.media_items_list = list(QuestionMedia.objects.filter(question_id=q.id))
            q.has_media = bool(q.media_items)

        quiz_type = quiz_config.quiz_type or 'standard_quiz'

        return render(request, 'quizzes/quiz_player.html', {
            'lesson': lesson,
            'course_title': course.title,
            'saved_progress': saved_progress.progress if saved_progress else 0,
            'lesson_location': lesson_location,
            'quiz_type': quiz_type,
            'quiz_config': quiz_config,
            'quiz': quiz,
            'questions': questions,  # ✅ pass question list
            'reveal_answers': quiz_config.reveal_answers if quiz_config else False,
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
            'completed_assignment_ids': completed_assignment_ids
        })

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
        'completed_assignment_ids': completed_assignment_ids
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

@csrf_exempt
def track_scorm_data(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=405)

    try:
        data = json.loads(request.body)
        print("🧪 Incoming tracking payload:", data)

        profile_id = data.get("user_id")
        lesson_id = data.get("lesson_id")
        progress = float(data.get("progress", 0))
        completion_status = data.get("completion_status", "incomplete").lower()
        session_time = data.get("session_time", "PT0H0M0S")
        score = data.get("score")
        lesson_location = data.get("lesson_location", "")
        scroll_position = data.get("scroll_position", 0)

        # 🧼 Fix broken trailing slash on index.html
        if lesson_location.endswith("index.html/"):
            lesson_location = lesson_location.rstrip("/")
            print(f"🧹 Cleaned lesson_location path → {lesson_location}")
        elif "index.html/" in lesson_location:
            lesson_location = lesson_location.replace("index.html/", "index.html")
            print(f"🧹 Cleaned broken index.html subpath → {lesson_location}")


        if not profile_id or not lesson_id:
            print("❌ Missing profile_id or lesson_id")
            return JsonResponse({"error": "Missing required fields"}, status=400)

        if lesson_location.lower().endswith(".pdf") and "X-Amz-Signature" in lesson_location:
            print("🔒 Stripping signed PDF URL from lesson_location")
            lesson_location = ""

        profile = get_object_or_404(Profile, pk=profile_id)
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        user = profile.user
        user_course, _ = UserCourse.objects.get_or_create(user=user, course=lesson.module.course)

        lesson_marked_complete = False

        # ✅ Check assignment gating
        if completion_status == "complete":
            lesson_assignments = lesson.assignments.all()
            allowed_statuses = ['completed', 'submitted', 'approved']
            missing_or_invalid = set()

            if lesson_assignments.exists():
                print('lesson_assignments:', lesson_assignments)
                valid_progress_ids = set(UserAssignmentProgress.objects.filter(
                    user=user,
                    lesson=lesson,
                    assignment__in=lesson_assignments,
                    status__in=allowed_statuses
                ).values_list('assignment_id', flat=True))
                print('valid_progress_ids:', valid_progress_ids)

                expected_ids = set(lesson_assignments.values_list('id', flat=True))
                missing_or_invalid = expected_ids - valid_progress_ids

                if missing_or_invalid:
                    print(f"🛑 Incomplete assignments: {missing_or_invalid}")
                    SCORMTrackingData.objects.update_or_create(
                        user=user,
                        lesson=lesson,
                        defaults={
                            "progress": 0.0,
                            "completion_status": "incomplete",
                            "session_time": session_time,
                            "scroll_position": scroll_position,
                            "lesson_location": lesson_location,
                            "score": score,
                            "cmi_data": data.get("cmi_data", "{}"),
                        }
                    )
                    return JsonResponse({
                        "status": "incomplete",
                        "message": "Progress saved, but lesson not marked as complete.",
                        "lesson_completed": False,
                        "course_progress": user_course.progress
                    })

            # ✅ No blockers — mark lesson complete
            try:
                module_progress, _ = UserModuleProgress.objects.get_or_create(
                    user_course=user_course,
                    module=lesson.module,
                    defaults={"order": lesson.module.order}
                )

                lesson_progress_qs = UserLessonProgress.objects.filter(
                    user_module_progress=module_progress,
                    lesson=lesson,
                )

                if lesson_progress_qs.exists():
                    lesson_progress = lesson_progress_qs.first()
                else:
                    lesson_progress = UserLessonProgress.objects.create(
                        user_module_progress=module_progress,
                        lesson=lesson,
                        order=lesson.order,
                        completed=True,
                        completed_on_date=timezone.now().date(),
                        completed_on_time=timezone.now().time(),
                        attempts=1,
                    )

                if not lesson_progress.completed:
                    lesson_progress.completed = True
                    lesson_progress.completed_on_date = timezone.now().date()
                    lesson_progress.completed_on_time = timezone.now().time()
                    lesson_progress.attempts += 1
                    lesson_progress.save()

                lesson_marked_complete = True
                print(f"✅ Lesson marked complete: {lesson_progress.id}")

            except Exception as e:
                print(f"⚠️ Error marking lesson complete: {e}")

        # ✅ Ensure SCORMTrackingData is correct (prevent regressions)
        existing_tracking, created = SCORMTrackingData.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={
                "progress": 1.0 if lesson_marked_complete else progress,
                "completion_status": "completed" if lesson_marked_complete else completion_status,
                "session_time": session_time,
                "scroll_position": scroll_position,
                "lesson_location": lesson_location,
                "score": score,
                "cmi_data": data.get("cmi_data", "{}"),
            }
        )

        if not created:
            updated = False
            fields_to_update = {}

            if lesson_marked_complete:
                if existing_tracking.progress < 1.0:
                    fields_to_update["progress"] = 1.0
                    updated = True
                if existing_tracking.completion_status != "completed":
                    fields_to_update["completion_status"] = "completed"
                    updated = True
            else: 
                if completion_status == "incomplete" and existing_tracking.progress == 0:
                    fields_to_update["progress"] = 0.0
                    updated = True

                    try:
                        module_progress = UserModuleProgress.objects.get(
                            user_course=user_course,
                            module=lesson.module
                        )

                        lesson_progress = UserLessonProgress.objects.filter(
                            user_module_progress=module_progress,
                            lesson=lesson,
                        ).first()

                        if lesson_progress and lesson_progress.completed:
                            lesson_progress.completed = False
                            lesson_progress.completed_on_date = None
                            lesson_progress.completed_on_time = None
                            lesson_progress.save()
                            print(f"🔄 Lesson progress reset: {lesson_progress.id}")

                    except UserModuleProgress.DoesNotExist:
                        print("⚠️ Module progress not found — skipping lesson progress reset")

                elif progress > existing_tracking.progress:
                    fields_to_update["progress"] = progress
                    updated = True

                if completion_status != existing_tracking.completion_status:
                    fields_to_update["completion_status"] = completion_status
                    updated = True

            if lesson_location != existing_tracking.lesson_location:
                fields_to_update["lesson_location"] = lesson_location
                updated = True

            if updated:
                fields_to_update.update({
                    "session_time": accumulate_time(existing_tracking.session_time, session_time),
                    "scroll_position": scroll_position,
                    "lesson_location": lesson_location,
                    "score": score,
                    "cmi_data": data.get("cmi_data", "{}"),
                })
                for field, value in fields_to_update.items():
                    setattr(existing_tracking, field, value)
                existing_tracking.save()
                print("🔁 SCORMTrackingData updated")
            else:
                print("⏩ SCORMTrackingData unchanged")

        # 📈 Update course-level progress
        user_course.update_progress()
        

        session_id = data.get("session_id")
        print("🔍 Trying to update LessonSession for:", session_id)
        if session_id:
            try:
                session = LessonSession.objects.get(session_id=session_id)
                session.end_time = timezone.now()
                session.session_time = session_time
                session.save()
                print(f"⏱️ LessonSession updated: {session.session_id} with {session_time}")
            except LessonSession.DoesNotExist:
                print(f"⚠️ LessonSession not found for session_id: {session_id}")

        return JsonResponse({
            "status": "success" if lesson_marked_complete else "incomplete",
            "lesson_completed": lesson_marked_complete,
            "message": (
                "Lesson marked as complete ✅"
                if lesson_marked_complete else
                "Tracking saved, but lesson not marked complete ❌"
            ),
            "course_progress": user_course.progress
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