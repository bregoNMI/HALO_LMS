import datetime
import json
import os
from shlex import quote
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import rsa
from django.utils.encoding import iri_to_uri
from urllib.parse import quote, unquote
from client_admin.models import Profile
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
from course_player.models import SCORMTrackingData
from halo_lms.settings import AWS_S3_REGION_NAME, AWS_STORAGE_BUCKET_NAME

secret_name = "COGNITO_SECRET"
secrets = get_secret(secret_name)

def generate_presigned_url(key, expiration=3600):
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
        region_name=settings.AWS_S3_REGION_NAME
    )

    # Create the presigned URL for the given key in S3
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': key,
                'ResponseContentType': 'text/html'  # Set the Content-Type to text/html
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
    decoded_file_path = unquote(file_path)
    print(f"Incoming SCORM request: {decoded_file_path}")

    if "index.html/" in decoded_file_path:
        decoded_file_path = decoded_file_path.replace("index.html/", "")

    print(f"Corrected file path: {decoded_file_path}")

    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_S3_REGION_NAME
    )
    bucket_name = AWS_STORAGE_BUCKET_NAME

    try:
        # Fetch the file from S3
        s3_response = s3_client.get_object(Bucket=bucket_name, Key=decoded_file_path)
        print(f"Serving file: {decoded_file_path}")

        # Return the file as an HTTP response
        return FileResponse(
            s3_response['Body'],
            content_type=s3_response['ContentType']
        )
    except ClientError as e:
        print(f"Error fetching file {decoded_file_path} from S3: {e}")
        raise Http404("SCORM file not found")

@login_required
def launch_scorm_file(request, lesson_id):
    print('Lesson ID:', lesson_id)
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    
    # Get the UploadedFile object
    uploaded_file = get_object_or_404(UploadedFile, pk=lesson_id)

    if not uploaded_file.scorm_entry_point:
        return render(request, 'error.html', {'message': 'No valid SCORM entry point found for this file.'})
    
    # Ensure the key uses forward slashes only and is URL-encoded
    scorm_entry_point = uploaded_file.scorm_entry_point.replace("\\", "/")
    print(f"Retrieved SCORM entry point: {scorm_entry_point}")

    proxy_url = f"/scorm-content/{iri_to_uri(scorm_entry_point)}"

    # Debugging output for logging
    print(f"Proxy URL for SCORM entry point: {proxy_url}")

    # Render the SCORM player template with the proxied URL
    return render(request, 'iplayer.html', {
        'lesson': lesson,
        'scorm_index_file_url': proxy_url
    })
    """
    # Generate the pre-signed URL for the S3 object
    try:
        presigned_url = generate_presigned_url(
            key=scorm_entry_point,  # Path to the SCORM entry point in the bucket
            expiration=3600  # Expiration time in seconds (1 hour)
        )
    except Exception as e:
        print(f"Error generating pre-signed URL: {e}")
        return render(request, 'error.html', {'message': 'Unable to generate a link to the SCORM content.'})
    
    if not presigned_url:
        return render(request, 'error.html', {'message': 'Unable to generate a link to the SCORM content.'})

    print(f"Generated SCORM Pre-signed URL: {presigned_url}")

    # Render the SCORM player template with the pre-signed URL for the SCORM content
    return render(request, 'iplayer.html', {'scorm_index_file_url': presigned_url})
    """

"""
@login_required
def launch_scorm_file(request, lesson_id):
    print('Lesson ID:', lesson_id)
    
    # Get the UploadedFile object
    uploaded_file = get_object_or_404(UploadedFile, pk=lesson_id)

    if not uploaded_file.scorm_entry_point:
        return render(request, 'error.html', {'message': 'No valid SCORM entry point found for this file.'})
    
    from urllib.parse import quote
    scorm_entry_point = quote(uploaded_file.scorm_entry_point)  # URL-encode the entry point
    print(f"Retrieved SCORM entry point: {scorm_entry_point}")

    # Retrieve CloudFront keys
    secret_name = "CLOUDFRONT_KEY_PAIR"
    cloudfront_keys = get_cloudfront_keys(secret_name)
    private_key = cloudfront_keys.get('cloudfront_private_key')
    key_pair_id = "KIHDC04PK54LS"

    # Generate the signed CloudFront URL
    cloudfront_url = f"https://d253588t4hyqvi.cloudfront.net/{scorm_entry_point}"
    index_file_url = generate_signed_cloudfront_url(
        cloudfront_url=cloudfront_url,
        key_pair_id=key_pair_id,
        private_key=private_key
    )
    print(f"Generated Signed URL: {index_file_url}")

    if not index_file_url:
        return render(request, 'error.html', {'message': 'Unable to generate a link to the SCORM content.'})

    print(f"Generated SCORM URL: {index_file_url}")

    return render(request, 'iplayer.html', {'scorm_index_file_url': index_file_url})
"""
def get_s3_file_metadata(bucket_name, key):
    """ Retrieve metadata from a specific S3 object """
    secret_name = "COGNITO_SECRET"
    secrets = get_secret(secret_name)

    s3_client = boto3.client(
        's3',
        aws_access_key_id=secrets.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=secrets.get('AWS_SECRET_ACCESS_KEY'),
        region_name=settings.AWS_S3_REGION_NAME
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
            user_id = data.get("user_id")
            lesson_id = data.get("lesson_id")
            parameter = data.get("parameter")
            value = data.get("value")
            action = data.get("action", "update")

            print(f"Tracking Data Received - User ID: {user_id}, Lesson ID: {lesson_id}, Parameter: {parameter}, Value: {value}, Action: {action}")

            # Get user and lesson objects
            profile = get_object_or_404(Profile, pk=user_id)
            lesson = get_object_or_404(Lesson, pk=lesson_id)

            # Save tracking data
            tracking_data, created = SCORMTrackingData.objects.update_or_create(
                user=profile,
                lesson=lesson,
                defaults={"cmi_data": parameter, "score": value, "completion_status": action},
            )

            status = "created" if created else "updated"
            print(f"SCORMTrackingData {status} for User {profile.id} and Lesson {lesson.id}")

            return JsonResponse({"status": "success", "tracking": status})

        except Exception as e:
            print(f"Error processing tracking data: {e}")
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request method"}, status=405)

def generate_cloudfront_url(key):
    # Define the CloudFront domain name
    cloudfront_domain = "https://d253588t4hyqvi.cloudfront.net"
    
    # Make sure the key uses forward slashes and points to the correct SCORM content in the bucket
    key = key.replace("\\", "/")

    # Construct the CloudFront URL
    return f"{cloudfront_domain}/{key}"

# Constants for Secrets Manager
#secret_name = "CLOUDFRONT_KEY_PAIR"
#region_name = "us-east-1"  # Replace with your AWS region, e.g., "us-west-2"
#key_pair_id = "KIHDC04PK54LS"  # Replace this with your actual CloudFront Key Pair ID

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