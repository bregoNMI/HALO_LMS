import datetime
import json
import mimetypes
import os
import uuid
from django.utils import timezone
from shlex import quote
from django.utils.timezone import now
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import rsa
import re
from django.utils.encoding import iri_to_uri
from urllib.parse import quote, unquote, unquote_plus
from client_admin.models import Profile, UserCourse
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.conf import settings
from botocore.exceptions import ClientError
from content.models import Course, Lesson, UploadedFile
from authentication.python.views import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, get_secret
from django.views.decorators.csrf import csrf_exempt
import boto3 
import base64
from django.shortcuts import render
import boto3
from rsa import PrivateKey
from botocore.exceptions import NoCredentialsError
from course_player.models import LessonProgress, LessonSession, SCORMTrackingData
from halo_lms.settings import AWS_S3_REGION_NAME, AWS_STORAGE_BUCKET_NAME

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

def proxy_scorm_file(request, file_path):
    """
    Proxy SCORM file from S3 to serve it through the LMS domain.
    """
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
    
@login_required
def get_scorm_progress(request, lesson_id):
    user = request.user
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    tracking = SCORMTrackingData.objects.filter(user=user, lesson=lesson).first()
    suspend_data = ""
    if tracking:
        try:
            cmi_data = json.loads(tracking.cmi_data or "{}")
            suspend_data = cmi_data.get("suspend_data", "")
        except Exception as e:
            print(f"Error parsing cmi_data: {e}")

    return JsonResponse({"suspend_data": suspend_data})

    
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

@login_required
def launch_scorm_file(request, lesson_id):
    print('Lesson ID:', lesson_id)
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    course = lesson.module.course
    profile = get_object_or_404(Profile, user=request.user)
    uploaded_file = lesson.uploaded_file
    user_course = UserCourse.objects.filter(user=request.user, course=course).first()

    entry_key = None

    # Create session
    session = LessonSession.objects.create(
        user=request.user,
        lesson=lesson,
        session_id=str(uuid.uuid4()),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        ip_address=request.META.get('REMOTE_ADDR', ''),
    )

    # Store the session_id in session or pass to template
    request.session['current_lesson_session_id'] = session.session_id

    if lesson.content_type == 'SCORM2004':
        if lesson.uploaded_file and lesson.uploaded_file.scorm_entry_point:
            entry_key = lesson.uploaded_file.scorm_entry_point.replace("\\", "/")
            proxy_url = f"/scorm-content/{iri_to_uri(entry_key)}"
        else:
            return render(request, 'error.html', {'message': 'No valid SCORM entry point found for this lesson.'})
    elif lesson.file and lesson.file.file:
        file_key = lesson.file.file.name  # Get actual S3 key
        print("📁 Raw file.name:", file_key)

        if file_key.startswith("tenant/"):
            file_key = file_key.replace("tenant/", "", 1)

        entry_key = file_key.replace("\\", "/").lstrip("/")
        proxy_url = generate_presigned_url(entry_key)
    else:
        return render(request, 'error.html', {'message': 'No valid file found for this lesson.'})

    print(f"Entry Key for Proxy: {entry_key}")
    print("▶ Proxy URL:", proxy_url)

    saved_progress = SCORMTrackingData.objects.filter(user=request.user, lesson=lesson).first()
    lesson_location = ""
    if lesson.content_type == "SCORM2004" and saved_progress:
        lesson_location = saved_progress.lesson_location or ""
    scroll_position = saved_progress.scroll_position if saved_progress else 0

    module_lessons = Lesson.objects.filter(module=lesson.module).order_by("order")
    all_lessons = list(module_lessons)
    current_index = all_lessons.index(lesson) if lesson in all_lessons else -1
    next_lesson = all_lessons[current_index + 1] if current_index + 1 < len(all_lessons) else None
    prev_lesson = all_lessons[current_index - 1] if current_index > 0 else None
    is_last_lesson = next_lesson is None

    course_locked = course.locked
    if course_locked and prev_lesson:
        prev_lesson_progress = SCORMTrackingData.objects.filter(
            user=request.user,
            lesson=prev_lesson,
            completion_status="completed"
        ).exists()
        if not prev_lesson_progress:
            return render(request, 'error.html', {'message': 'You must complete the previous lesson before proceeding.'})

    mini_lesson_progress = list(LessonProgress.objects.filter(
        user=request.user,
        lesson=lesson
    ).values("mini_lesson_index", "progress"))

    lesson_progress_data = []
    previous_lesson_completed = not course_locked

    for module_lesson in module_lessons:
        progress_entry = SCORMTrackingData.objects.filter(user=request.user, lesson=module_lesson).first()
        is_completed = progress_entry.completion_status == "completed" if progress_entry else False
        locked_status = course_locked and not previous_lesson_completed
        progress_value = progress_entry.progress if progress_entry else 0
        lesson_progress_data.append({
            "id": module_lesson.id,
            "title": module_lesson.title,
            "completed": is_completed,
            "locked": locked_status,
            "progress": int(progress_value * 100)
        })

        previous_lesson_completed = is_completed

    print(f"📦 SCORM Entry Key: {entry_key}")
    #print(f"⚠️ Raw lesson.file.file.url: {lesson.file.file.url}")
    #print(f"⚠️ Full file object: {lesson.file.file}")

    return render(request, 'iplayer.html', {
        'lessons': all_lessons,
        'lesson': lesson,
        'scorm_index_file_url': proxy_url,  # Used by iframe
        'saved_progress': saved_progress.progress if saved_progress else 0,
        'lesson_location': lesson_location,
        'saved_scroll_position': scroll_position,
        'profile_id': profile.id,
        'lesson_progress_data': json.dumps(lesson_progress_data),
        'mini_lesson_progress': json.dumps(mini_lesson_progress),
        'all_lessons': all_lessons,
        'user_course': user_course,
        'course_locked': course_locked,
        'next_lesson': next_lesson,
        'prev_lesson': prev_lesson,
        'is_last_lesson': is_last_lesson,
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
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            profile_id = data.get("user_id")
            lesson_id = data.get("lesson_id")
            progress = data.get("progress", 0)
            completion_status = data.get("completion_status", "incomplete")
            session_time = data.get("session_time", "PT0H0M0S")
            score = data.get("score")
            lesson_location = data.get("lesson_location", "")
            scroll_position = data.get("scroll_position", 0)
 
            if not profile_id or not lesson_id:
                return JsonResponse({"error": "Missing required fields"}, status=400)
           
            if lesson_location.lower().endswith(".pdf") and "X-Amz-Signature" in lesson_location:
                # Don't store the full URL — just leave it empty or store the fragment
                lesson_location = ""
 
            profile = get_object_or_404(Profile, pk=profile_id)
            lesson = get_object_or_404(Lesson, pk=lesson_id)
 
            # ✅ Only updating SCORM tracking data
            SCORMTrackingData.objects.update_or_create(
                user=profile.user,
                lesson=lesson,
                defaults={
                    "progress": float(progress),
                    "completion_status": completion_status,
                    "session_time": session_time,
                    "scroll_position": scroll_position,
                    "lesson_location": lesson_location,
                    "score": score,
                    "cmi_data": data.get("cmi_data", "{}"),  # ✅ Store cmi_data as JSON
                },
            )
 
             # Update UserCourse progress
            user_course, _ = UserCourse.objects.get_or_create(user=profile.user, course=lesson.module.course)
            user_course.update_progress()
            print('HERE')
 
            return JsonResponse({"status": "success"})
 
        except Exception as e:
            print(f"🚨 Error in track_scorm_data: {e}")
            return JsonResponse({"error": str(e)}, status=500)
 
    return JsonResponse({"error": "Invalid request method"}, status=405)

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
                
                print("Mini Lesson: ", mini_lesson)
                # ✅ Use `mini_lesson_index` to ensure uniqueness
                LessonProgress.objects.update_or_create(
                    user=profile.user,
                    lesson=lesson,
                    mini_lesson_index=mini_lesson_index,
                    defaults={
                        "progress": progress,
                        "last_updated": timezone.now(),
                    }
                )
                print(f"✅ Saved progress for Mini Lesson Index: {mini_lesson_index}, Progress: {progress}")

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