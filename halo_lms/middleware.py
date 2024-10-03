# halo_lms/middleware.py

from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import redirect
from django.http import JsonResponse
from django.contrib import messages

class ImpersonateMiddleware(MiddlewareMixin):
    def __call__(self, request):
        request.is_impersonating = False
        impersonate_user_id = request.session.get('impersonate_user_id', None)

        if impersonate_user_id:
            request.is_impersonating = True
            
            # Forbid any data modification
            if request.method in ['POST', 'PUT', 'DELETE']:
                messages.error(request, "You do not have permission to modify data while impersonating")
                return redirect(request.META.get('HTTP_REFERER', '/'))  # Redirect to the referring page
                
        response = self.get_response(request)
        return response