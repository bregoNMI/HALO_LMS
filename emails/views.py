from django.http import JsonResponse
from .tasks import send_welcome_email
from django.contrib.auth import get_user_model

def trigger_test_email(request):
    to = request.GET.get("to", "test@example.com")
    User = get_user_model()
    user, _ = User.objects.get_or_create(username="test_user_for_email", defaults={"email": to})
    task = send_welcome_email.delay(user.id)
    return JsonResponse({"queued": True, "task_id": task.id, "to": to})
