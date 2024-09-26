from django import forms
from .models import OrganizationSettings

class OrganizationSettingsForm(forms.ModelForm):
    class Meta:
        model = OrganizationSettings
        fields = '__all__'