from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from insightface.app import FaceAnalysis
import numpy as np
import base64
import cv2
from django.core.files.storage import default_storage
from PIL import Image
import io

app = FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0)

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