from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from insightface.app import FaceAnalysis
import numpy as np
import base64
import cv2
from django.core.files.storage import default_storage
from PIL import Image
import io
from django.contrib.auth.decorators import login_required
from content.models import Course
from client_admin.models import UserCourse, FacialVerificationLog, Lesson
from user_agents import parse as parse_user_agent
import base64, io, numpy as np
from django.core.files.base import ContentFile
from typing import Optional

# Facial Verification
app = FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0)

# I'm not sure if this gets used anywhere
@csrf_exempt
def verify_face(request):
    if request.method == 'POST' and request.user.is_authenticated:
        try:
            # Decode uploaded image
            img_data = base64.b64decode(request.POST['image'].split(',')[1])
            img_np = np.array(Image.open(io.BytesIO(img_data)).convert('RGB'))

            # Get the user's profile photo
            profile = request.user.profile
            headshot_path = profile.passportphoto.path
            headshot_img = np.array(Image.open(headshot_path).convert('RGB'))

            # Run face embedding
            faces_live = app.get(img_np)
            faces_headshot = app.get(headshot_img)

            if not faces_live or not faces_headshot:
                return JsonResponse({'success': False, 'message': 'No face detected in one or both images.'})

            emb_live = faces_live[0].embedding
            emb_passport = faces_headshot[0].embedding

            # Cosine similarity
            similarity = np.dot(emb_live, emb_passport) / (np.linalg.norm(emb_live) * np.linalg.norm(emb_passport))
            threshold = 0.35  # Recommended ~0.3-0.4

            return JsonResponse({'success': similarity > threshold, 'similarity': float(similarity)})

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
        
# Comparing the two images for registration
@csrf_exempt
def compare_faces(request):
    if request.method == 'POST':
        try:
            img1_data = base64.b64decode(request.POST['image1'].split(',')[1])
            img2_data = base64.b64decode(request.POST['image2'].split(',')[1])

            img1_np = np.array(Image.open(io.BytesIO(img1_data)).convert('RGB'))
            img2_np = np.array(Image.open(io.BytesIO(img2_data)).convert('RGB'))

            faces_1 = app.get(img1_np) or []
            faces_2 = app.get(img2_np) or []

            if len(faces_1) == 0:
                return JsonResponse({
                    'success': False,
                    'error_type': 'no_face_live',
                    'message': 'No face detected in the live camera image.'
                })

            if len(faces_2) == 0:
                return JsonResponse({
                    'success': False,
                    'error_type': 'no_face_uploaded',
                    'message': 'No face detected in the uploaded registration photo.'
                })

            emb1 = faces_1[0].embedding
            emb2 = faces_2[0].embedding

            similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
            threshold = 0.35

            if similarity > threshold:
                return JsonResponse({
                    'success': True,
                    'similarity': float(similarity)
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error_type': 'face_mismatch',
                    'similarity': float(similarity),
                    'message': 'Face detected, but not similar enough to be a match.'
                })

        except Exception as e:
            return JsonResponse({
                'success': False,
                'error_type': 'server_error',
                'message': str(e)
            })
        
@csrf_exempt
@login_required
def facial_verification_check(request):
    if request.method == 'POST':
        verification_type = request.GET.get('type', 'in_session')
        lesson_id = request.POST.get('lesson_id')
        user_course_id = request.POST.get('user_course_id')
        course_id = request.POST.get('course_id')

        user_course = None
        course = None
        lesson = None

        # Get user_course
        if user_course_id:
            try:
                user_course = UserCourse.objects.select_related('course').get(id=user_course_id, user=request.user)
                course = user_course.course
            except UserCourse.DoesNotExist:
                pass

        # Fallback: course
        if not course and course_id:
            try:
                course = Course.objects.get(id=course_id)
            except Course.DoesNotExist:
                pass

        # Lesson
        if lesson_id and lesson_id != 'null':
            try:
                lesson = Lesson.objects.get(id=lesson_id)
            except Lesson.DoesNotExist:
                lesson = None

        try:
            img1_data = base64.b64decode(request.POST['image1'].split(',')[1])
            img1_np = np.array(Image.open(io.BytesIO(img1_data)).convert('RGB'))

            passport_photo = request.user.profile.passportphoto
            if not passport_photo:
                return log_and_respond(request, request.user, verification_type, 'failure', 'no_passport_photo', user_course, course, lesson)

            with passport_photo.open('rb') as f:
                img2_data = f.read()
            img2_np = np.array(Image.open(io.BytesIO(img2_data)).convert('RGB'))

            faces_1 = app.get(img1_np) or []
            faces_2 = app.get(img2_np) or []

            if len(faces_1) == 0:
                return log_and_respond(request, request.user, verification_type, 'failure', 'no_face_live', user_course, course, lesson)

            if len(faces_2) == 0:
                return log_and_respond(request, request.user, verification_type, 'failure', 'no_face_uploaded', user_course, course, lesson)

            emb1 = faces_1[0].embedding
            emb2 = faces_2[0].embedding
            similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
            threshold = 0.35

            if similarity > threshold:
                log_verification_attempt(request, request.user, verification_type, 'success', 'verified', user_course, course, lesson, similarity)
                return JsonResponse({'success': True, 'similarity': float(similarity)})
            else:
                return log_and_respond(request, request.user, verification_type, 'failure', 'face_mismatch', user_course, course, lesson, similarity)

        except Exception as e:
            return log_and_respond(request, request.user, verification_type, 'failure', 'server_error', user_course, course, lesson, None, str(e))

    return JsonResponse({'success': False, 'error': 'Invalid request method'})

def _contentfile_from_dataurl(data_url: str, fallback_name: str) -> Optional[ContentFile]:
    if not data_url or ',' not in data_url:
        return None
    header, b64 = data_url.split(',', 1)
    ext = 'png'
    if 'image/jpeg' in header:
        ext = 'jpg'
    try:
        raw = base64.b64decode(b64)
    except Exception:
        return None
    return ContentFile(raw, name=f"{fallback_name}.{ext}")

@login_required
@require_POST
def finalize_account(request):
    profile = request.user.profile
    headshot = request.FILES.get('passportphoto')
    photoid  = request.FILES.get('photoid')

    if not headshot or not photoid:
        return JsonResponse({'success': False, 'message': 'Both images are required.'}, status=400)

    # quick sanity check
    try:
        Image.open(headshot).verify(); headshot.seek(0)
        Image.open(photoid).verify();  photoid.seek(0)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Invalid image(s).'}, status=400)

    profile.passportphoto.save(headshot.name, headshot, save=False)
    profile.photoid.save(photoid.name, photoid, save=False)
    profile.save(update_fields=['passportphoto', 'photoid'])
    return JsonResponse({'success': True})

def log_verification_attempt(
    request,
    user,
    verification_type,
    status,
    error_type=None,
    user_course=None,
    course=None,
    lesson=None,
    similarity=None
):
    ua_string = request.META.get("HTTP_USER_AGENT", "")
    user_agent = parse_user_agent(ua_string)
    device_type = 'mobile' if user_agent.is_mobile else 'tablet' if user_agent.is_tablet else 'desktop'
    browser = user_agent.browser.family

    FacialVerificationLog.objects.create(
        user=user,
        course=course or (user_course.course if user_course else None),
        user_course=user_course,
        lesson=lesson,
        verification_type=verification_type,
        status=status,
        error_type=error_type,
        similarity_score=similarity,
        device_type=device_type,
        browser=browser,
        metadata={
            'user_agent': ua_string,
            'ip': request.META.get("REMOTE_ADDR"),
        }
    )

def log_and_respond(
    request,
    user,
    verification_type,
    status,
    error_type,
    user_course=None,
    course=None,
    lesson=None,
    similarity=None,
    error_msg=None
):
    log_verification_attempt(
        request,
        user,
        verification_type,
        status,
        error_type=error_type,
        user_course=user_course,
        course=course,
        lesson=lesson,
        similarity=similarity,
    )
    return JsonResponse({
        'success': False,
        'error_type': error_type,
        'similarity': float(similarity) if similarity else None,
        'message': error_msg or get_default_error_message(error_type),
    })

def get_default_error_message(error_type):
    return {
        'no_passport_photo': 'No passport photo found on your profile.',
        'no_face_live': 'No face detected in the live camera image.',
        'no_face_uploaded': 'No face detected in your passport photo.',
        'face_mismatch': 'Face does not match the passport photo.',
        'server_error': 'An internal error occurred.',
    }.get(error_type, 'An unknown error occurred.')