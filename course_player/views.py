import datetime
import json
import os

import rsa
from client_admin.models import Profile
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.conf import settings
from botocore.exceptions import ClientError
from content.models import Course, Lesson, UploadedFile
from authentication.python.views import get_secret
from django.views.decorators.csrf import csrf_exempt
import boto3 
import base64
from django.shortcuts import render
import boto3
from botocore.exceptions import NoCredentialsError
from course_player.models import SCORMTrackingData

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
"""
@login_required
def launch_scorm_file(request, file_id):
    # Get the UploadedFile object by file_id
    uploaded_file = get_object_or_404(UploadedFile, pk=file_id)

    # Check if the SCORM file has a valid entry point
    if not uploaded_file.scorm_entry_point:
        return render(request, 'error.html', {'message': 'No valid SCORM entry point found for this file.'})

    # Retrieve the scorm_entry_point
    scorm_entry_point = uploaded_file.scorm_entry_point
    print(f"Retrieved scorm_entry_point: {scorm_entry_point}")

     # Retrieve CloudFront keys from AWS Secrets Manager
    secret_name = "CLOUDFRONT_KEY_PAIR"
    cloudfront_keys = get_cloudfront_keys(secret_name)

    # Retrieve the private key
    private_key = cloudfront_keys.get('cloudfront_private_key')
    key_pair_id = "KIHDC04PK54LS"  # Replace this with your actual key pair ID

    # Generate the signed CloudFront URL using the private key
    index_file_url = generate_signed_cloudfront_url(
        cloudfront_url=f"https://d253588t4hyqvi.cloudfront.net/{scorm_entry_point}",
        key_pair_id=key_pair_id,
        private_key=private_key
    )

    if not index_file_url:
        # Handle the case where the presigned URL couldn't be generated
        return render(request, 'error.html', {'message': 'Unable to generate a link to the SCORM content.'})
    print("launch file")
    # Render the SCORM player template with the presigned URL
    print('bye 2')
    return render(request, 'iplayer.html', {'scorm_index_file_url': index_file_url})
"""
@login_required
def launch_scorm_file(request, file_id):
    # Get the UploadedFile object by file_id
    uploaded_file = get_object_or_404(UploadedFile, pk=file_id)

    # Check if the SCORM file has a valid entry point
    if not uploaded_file.scorm_entry_point:
        return render(request, 'error.html', {'message': 'No valid SCORM entry point found for this file.'})

    # Retrieve the scorm_entry_point
    scorm_entry_point = uploaded_file.scorm_entry_point
    print(f"Retrieved scorm_entry_point: {scorm_entry_point}")

    # Retrieve CloudFront keys from AWS Secrets Manager
    secret_name = "CLOUDFRONT_KEY_PAIR"
    cloudfront_keys = get_cloudfront_keys(secret_name)
    print(f"Retrieved CloudFront private key: {private_key}")
    # Retrieve the private key from the secret
    private_key = cloudfront_keys.get('cloudfront_private_key')
    key_pair_id = "KIHDC04PK54LS"  # Replace this with your actual key pair ID

    # Generate the signed CloudFront URL using the scorm_entry_point as the resource path
    try:
        cloudfront_url = f"https://d253588t4hyqvi.cloudfront.net/{scorm_entry_point}"
        signed_url = generate_signed_cloudfront_url(
            cloudfront_url=cloudfront_url,
            key_pair_id=key_pair_id,
            private_key=private_key
        )
    except ValueError as e:
        print(f"Error generating signed URL: {e}")
        return render(request, 'error.html', {'message': 'Unable to generate a link to the SCORM content.'})

    if not signed_url:
        # Handle the case where the signed URL couldn't be generated
        return render(request, 'error.html', {'message': 'Unable to generate a link to the SCORM content.'})

    # Render the SCORM player template with the signed URL for the SCORM content
    return render(request, 'iplayer.html', {'scorm_index_file_url': signed_url})

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
    print("track_scorm_data view accessed")
    if request.method == 'POST':
        print("Received POST request for SCORM tracking data.")
        data = json.loads(request.body)
        user_id = data.get('user_id')
        lesson_id = data.get('lesson_id')
        cmi_data = data.get('cmi_data')
        score = data.get('score')
        completion_status = data.get('completion_status')

        print(f"user_id: {user_id}, lesson_id: {lesson_id}, cmi_data: {cmi_data}, score: {score}, completion_status: {completion_status}")

        # Retrieve user and lesson instances using their IDs
        profile = get_object_or_404(Profile, pk=user_id)
        lesson = get_object_or_404(Lesson, pk=lesson_id)

        # Save or update the SCORM tracking data
        tracking_data, created = SCORMTrackingData.objects.update_or_create(
            user=profile,
            lesson=lesson,
            defaults={
                'cmi_data': cmi_data,
                'score': score,
                'completion_status': completion_status
            }
        )

        action = "created" if created else "updated"
        print(f"SCORMTrackingData {action} for user: {profile}, lesson: {lesson}")

        return JsonResponse({'status': 'success'})
    return JsonResponse({'error': 'Invalid request method'}, status=400)

def generate_cloudfront_url(key):
    # Define the CloudFront domain name
    cloudfront_domain = "https://d253588t4hyqvi.cloudfront.net"
    
    # Make sure the key uses forward slashes and points to the correct SCORM content in the bucket
    key = key.replace("\\", "/")

    # Construct the CloudFront URL
    return f"{cloudfront_domain}/{key}"

# Constants for Secrets Manager
secret_name = "CLOUDFRONT_KEY_PAIR"
region_name = "us-east-1"  # Replace with your AWS region, e.g., "us-west-2"
key_pair_id = "KIHDC04PK54LS"  # Replace this with your actual CloudFront Key Pair ID

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
                secret_dict['cloudfront_private_key'] = secret_dict['cloudfront_private_key'].replace('\\n', '\n')

            return secret_dict
        else:
            # Decode binary secret using base64 if it's stored in binary form
            decoded_binary_secret = base64.b64decode(get_secret_value_response['SecretBinary'])
            secret_dict = json.loads(decoded_binary_secret)

            # Correctly handle new lines for private key
            if 'cloudfront_private_key' in secret_dict:
                secret_dict['cloudfront_private_key'] = secret_dict['cloudfront_private_key'].replace('\\n', '\n')

            return secret_dict

    except ClientError as e:
        print(f"Unable to retrieve secret: {e}")
        raise e


def generate_signed_cloudfront_url(cloudfront_url, key_pair_id, private_key, expiration_hours=1):
    """
    Generate a signed CloudFront URL using private key.

    :param cloudfront_url: The CloudFront URL for the content.
    :param key_pair_id: The CloudFront key pair ID.
    :param private_key: The private key as a string.
    :param expiration_hours: Expiration time in hours for the signed URL.
    :return: The signed URL.
    """
    # Set the expiration time (in Unix epoch format)
    private_key = private_key.replace(" ", "\n", 1).replace(" -----END RSA PRIVATE KEY-----", "\n-----END RSA PRIVATE KEY-----")
    print("Fixed Private Key:")
    print(private_key)
    private_key = private_key.strip()
    with open('private_key.pem', 'r', encoding='utf-8') as key_file:
        private_key = key_file.read()

    private_key_obj = rsa.PrivateKey.load_pkcs1(private_key.encode('utf-8'))
    expiration_time = int((datetime.datetime.utcnow() + datetime.timedelta(hours=expiration_hours)).timestamp())

    # Create the policy for the signed URL
    policy = """{
    "Statement": [
        {
            "Resource": "%s",
            "Condition": {
                "DateLessThan": {
                    "AWS:EpochTime": %d
                }
            }
        }
    ]
    }""" % (cloudfront_url, expiration_time)

    # Sign the policy with the private key
    private_key_obj = rsa.PrivateKey.load_pkcs1(private_key.encode('utf-8'))
    signature = rsa.sign(policy.encode('utf-8'), private_key_obj, 'SHA-1')
    signature_encoded = base64.urlsafe_b64encode(signature).decode('utf-8').replace('=', '')

    # Construct the signed URL
    signed_url = (
        f"{cloudfront_url}?Policy={policy}&Signature={signature_encoded}&Key-Pair-Id={key_pair_id}"
        f"&Signature={signature_encoded}&Key-Pair-Id={key_pair_id}"
    )

    return signed_url

    #print("Temporarily bypassing the signed URL generation.")
    #return f"{cloudfront_url}?placeholder=true"

secret_name = "CLOUDFRONT_KEY_PAIR"
cloudfront_keys = get_cloudfront_keys(secret_name)

# Retrieve the private key
private_key = cloudfront_keys.get('cloudfront_private_key')
key_pair_id = "KIHDC04PK54LS"  # Replace this with your actual CloudFront key pair ID

# Generate the signed URL
signed_url = generate_signed_cloudfront_url(
    cloudfront_url="https://d253588t4hyqvi.cloudfront.net/{path/to/resource}",
    key_pair_id=key_pair_id,
    private_key=private_key
) 