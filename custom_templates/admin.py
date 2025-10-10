from django.contrib import admin
from custom_templates.models import Dashboard, Widget, Header, Footer, LoginForm

class HeaderAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not Header.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False  # Prevent deletion

class FooterAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not Footer.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False  # Prevent deletion
    
class LoginFormAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not LoginForm.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False  # Prevent deletion

admin.site.register(Footer, FooterAdmin)
admin.site.register(Header, HeaderAdmin)
admin.site.register(Dashboard)
admin.site.register(Widget)
admin.site.register(LoginForm, LoginFormAdmin)