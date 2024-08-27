from django.utils.deprecation import MiddlewareMixin
from client_admin.models import Tenant

class TenantMiddleware(MiddlewareMixin):
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response

    def __call__(self, request):
        # Your middleware logic here

        response = self.get_response(request)
        return response
