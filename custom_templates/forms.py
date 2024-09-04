from django import forms
from .models import Dashboard, Widget

class DashboardForm(forms.ModelForm):
    class Meta:
        model = Dashboard
        fields = ['name', 'layout']

class WidgetForm(forms.ModelForm):
    class Meta:
        model = Widget
        fields = ['type']
